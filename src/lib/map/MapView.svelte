<script lang="ts">
	import { onMount } from 'svelte';
	import highwayData from '#lib/data/highways.json';
	import { office } from '#lib/data/office.js';
	import ontarioMap from '#lib/data/ontario-map.json';
	import { beat } from '#lib/kiosk/heartbeat.js';
	import { radarRequestSize } from '#lib/kiosk/radarSize.js';
	import { nearestPin } from './hit.js';
	import { RadarFeed } from '#lib/radar/feed.js';
	import { formatRadarTime } from '#lib/radar/format.js';
	import { echoesAt, type RadarCoverage } from '#lib/radar/coverage.js';
	import { RadarPlayer } from '#lib/radar/player.js';
	import { canvasBbox } from '#lib/radar/wms.js';
	import { municipalities } from '#lib/data/municipalities.js';
	import type { ConditionMix } from '#lib/weather/conditionMix.js';
	import { toEvents, type RoadEvent, type RoadEventSnapshot } from '#lib/roads/events.js';
	import { startRoadFeed } from '#lib/roads/feed.js';
	import {
		toSegments,
		type RoadSegment,
		type RoadSegmentSnapshot
	} from '#lib/roads/roadConditions.js';
	import { fetchRoadConditions, fetchRoadEvents, roadSourceLabel } from '#lib/roads/source.js';
	import {
		drawBase,
		drawEvents,
		drawOffice,
		drawHighlight,
		drawPins,
		drawRadar,
		readColors,
		readRadarOpacity
	} from './draw.js';
	import type { GeoProjection } from 'd3-geo';
	import RoadEventCard from './RoadEventCard.svelte';
	import RoadLegend from './RoadLegend.svelte';
	import WeatherMix from './WeatherMix.svelte';
	import { createProjection, projectPlaces, zoomProjection } from './projection.js';
	import type { HighwayData, MapColors, MapData, PinPoint } from './types.js';
	import { FULL_VIEW, panBy, pinchView, wheelFactor, zoomAt, type View } from './view.js';

	/** How close a click or tap has to land to a pin to count, in CSS pixels. */
	const HIT_RADIUS = 16;
	/** How long after the last wheel turn the map returns to the full view. */
	const ZOOM_RESET_MS = 30_000;
	/** How far the pointer must travel while pressed before a click becomes a drag, in CSS pixels. */
	const DRAG_THRESHOLD = 4;

	let {
		highlight = null,
		onSelect,
		onRoadEvents,
		onRoadConditions,
		onRadarCoverage,
		weatherMix = null
	}: {
		/** Name of the municipality to ring and label, or null for none. */
		highlight?: string | null;
		/** Called with the name of the municipality whose pin was clicked, or of the office. */
		onSelect?: (name: string) => void;
		/** Called with the road events each time a refresh from Ontario 511 succeeds. */
		onRoadEvents?: (snapshot: RoadEventSnapshot) => void;
		/** Called with the road segments each time a refresh from Ontario 511 succeeds. */
		onRoadConditions?: (snapshot: RoadSegmentSnapshot) => void;
		/** Called with which municipalities have precipitation over them, when a newer radar frame arrives. */
		onRadarCoverage?: (coverage: RadarCoverage) => void;
		/** What the weather is across the municipalities, for the bar above the road legend. */
		weatherMix?: ConditionMix | null;
	} = $props();

	// ontario-map.json: Natural Earth (public domain) 50m provinces and states plus 10m lakes,
	// cut to the Ontario region, coordinates rounded to 2 decimals, minified.
	// The JSON import types geometry as plain strings; the file is built to the MapData shape.
	const mapData = ontarioMap as unknown as MapData;
	// highways.json: Natural Earth (public domain) major highways, built by scripts/build-highways.mjs.
	const highways = highwayData as unknown as HighwayData;

	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;

	let ctx: CanvasRenderingContext2D;
	let colors: MapColors;
	let radarOpacity = 0;
	let motionQuery: MediaQueryList;
	let pins: PinPoint[] = [];
	let officePin: PinPoint = { x: NaN, y: NaN };
	let base: HTMLCanvasElement | null = null;
	let width = 0;
	let height = 0;
	let frame = 0;
	let resizeTimer: ReturnType<typeof setTimeout>;
	let zoomResetTimer: ReturnType<typeof setTimeout>;
	let baseProjection: GeoProjection;
	let ratio = 1;
	let view: View = FULL_VIEW;
	let baseStale = false;
	let drag: { x: number; y: number } | null = null;
	let dragMoved = false;
	/** Every finger or button held down on the map, in the order they went down, in screen pixels. */
	let pressed: { id: number; x: number; y: number }[] = [];

	let radarTime = $state<string | null>(null);
	let roads: RoadSegment[] = [];
	let events: RoadEvent[] = [];
	let eventPins: PinPoint[] = [];
	let eventTimer: ReturnType<typeof setTimeout>;
	/** The road event whose card is open, with where its symbol sits on the map. */
	let openEvent = $state<{
		event: RoadEvent;
		x: number;
		y: number;
		/** Which side of the symbol has room for the card. */
		left: boolean;
		up: boolean;
	} | null>(null);
	let hasRoadData = $state(false);

	let coverageTime = '';
	/** Reads the newest radar frame at each municipality, once per frame, for the ticker. */
	function reportRadarCoverage() {
		const newest = feed.frames().at(-1);
		if (!newest || newest.time === coverageTime || !baseProjection) return;
		coverageTime = newest.time;
		const { image } = newest;
		const scratch = new OffscreenCanvas(image.width, image.height).getContext('2d')!;
		scratch.drawImage(image, 0, 0);
		const pixels = scratch.getImageData(0, 0, image.width, image.height).data;
		// The frame is held at a capped size and drawn stretched to the canvas.
		const scale = image.width / width;
		// The office is read too, after the municipalities.
		const points = projectPlaces(baseProjection, [...municipalities, office]).map(({ x, y }) => ({
			x: x * scale,
			y: y * scale
		}));
		const wet = echoesAt(pixels, image.width, image.height, points);
		onRadarCoverage?.({
			wet: municipalities.filter((_, index) => wet[index]).map(({ name }) => name),
			officeWet: wet[municipalities.length],
			observedAt: newest.time
		});
	}

	const feed = new RadarFeed(() => {
		reportRadarCoverage();
		// A still frame has no loop to pick up new radar, so it redraws itself.
		if (motionQuery.matches) draw(0, false);
	});
	const player = new RadarPlayer(
		() => feed.frames(),
		() => feed.releaseRetired()
	);

	function layout() {
		const rect = container.getBoundingClientRect();
		// One rounded size feeds the projection, the radar request and the canvas, so they line up.
		width = Math.round(rect.width);
		height = Math.round(rect.height);
		ratio = window.devicePixelRatio || 1;
		canvas.width = Math.round(width * ratio);
		canvas.height = Math.round(height * ratio);
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

		closeEvent();
		baseProjection = createProjection(width, height, municipalities);
		clearTimeout(zoomResetTimer);
		view = FULL_VIEW;
		base = document.createElement('canvas');
		base.width = canvas.width;
		base.height = canvas.height;
		renderBase();

		feed.stop();
		player.reset();
		// Frames are fetched, decoded and held at a capped size, then drawn stretched to the canvas.
		// They always cover the full view; zooming enlarges them rather than fetching again.
		const request = radarRequestSize(width, height);
		feed.start({
			bbox: canvasBbox(baseProjection, width, height),
			width: request.width,
			height: request.height
		});
		start();
	}

	/** Redraws the land and pin positions for the current view. Land never animates, so this runs only on a change. */
	function renderBase() {
		const projection = zoomProjection(baseProjection, view);
		pins = projectPlaces(projection, municipalities);
		[officePin] = projectPlaces(projection, [office]);
		eventPins = projectPlaces(projection, events);
		const baseCtx = base!.getContext('2d')!;
		baseCtx.setTransform(1, 0, 0, 1, 0, 0);
		baseCtx.clearRect(0, 0, base!.width, base!.height);
		baseCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
		drawBase(baseCtx, mapData, highways, projection, colors, roads);
		baseStale = false;
	}

	function zoom(event: WheelEvent) {
		// Stops the browser zooming the whole page on ctrl + wheel or a trackpad pinch.
		event.preventDefault();
		const rect = canvas.getBoundingClientRect();
		const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
		changeView(zoomAt(view, point, wheelFactor(event.deltaY), { width, height }));
	}

	function changeView(next: View) {
		closeEvent();
		view = next;
		baseStale = true;
		// A wall display has nobody to zoom back out, so the full view returns after a quiet spell.
		clearTimeout(zoomResetTimer);
		zoomResetTimer = setTimeout(resetZoom, ZOOM_RESET_MS);
		if (motionQuery.matches) draw(0, false);
	}

	function resetZoom() {
		closeEvent();
		view = FULL_VIEW;
		baseStale = true;
		if (motionQuery.matches) draw(0, false);
	}

	function draw(seconds: number, animate: boolean) {
		if (!base) return;
		if (baseStale) renderBase();
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.drawImage(base, 0, 0);
		ctx.restore();

		const now = Date.now();
		const radar = animate ? player.frameAt(seconds, now) : player.newestFrame(now);
		if (radar) {
			ctx.save();
			ctx.translate(view.x, view.y);
			ctx.scale(view.k, view.k);
			drawRadar(ctx, radar.image, width, height, radarOpacity);
			ctx.restore();
		}
		const time = radar ? formatRadarTime(radar.time) : null;
		if (time !== radarTime) radarTime = time;

		drawEvents(ctx, events, eventPins, colors);
		drawPins(ctx, pins, colors, seconds, animate);
		drawOffice(ctx, officePin, colors);

		const marked = municipalities.findIndex((municipality) => municipality.name === highlight);
		if (marked >= 0) {
			const { name } = municipalities[marked];
			drawHighlight(ctx, pins[marked], name, colors, { width, height }, seconds, animate);
		} else if (highlight === office.name) {
			drawHighlight(ctx, officePin, office.name, colors, { width, height }, seconds, animate);
		}
	}

	function pointOf(event: MouseEvent): PinPoint {
		const rect = canvas.getBoundingClientRect();
		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	}

	/** The name of the office or municipality under the pointer, or null for open map. */
	function targetAt(event: MouseEvent): string | null {
		const point = pointOf(event);
		if (nearestPin([officePin], point, HIT_RADIUS) >= 0) return office.name;
		const index = nearestPin(pins, point, HIT_RADIUS);
		return index >= 0 ? municipalities[index].name : null;
	}

	/** How long a road event card stays up when nobody closes it. */
	const EVENT_CARD_MS = 30_000;

	function closeEvent() {
		clearTimeout(eventTimer);
		openEvent = null;
	}

	function select(event: MouseEvent) {
		// A drag ends in a click too; only a real click picks a pin.
		if (dragMoved) return;
		const name = targetAt(event);
		if (name) {
			closeEvent();
			onSelect?.(name);
			return;
		}
		const index = nearestPin(eventPins, pointOf(event), HIT_RADIUS);
		if (index < 0) {
			closeEvent();
			return;
		}
		const { x, y } = eventPins[index];
		openEvent = { event: events[index], x, y, left: x > width / 2, up: y > height * 0.6 };
		clearTimeout(eventTimer);
		eventTimer = setTimeout(closeEvent, EVENT_CARD_MS);
	}

	function startDrag(event: PointerEvent) {
		pressed.push({ id: event.pointerId, x: event.clientX, y: event.clientY });
		canvas.setPointerCapture(event.pointerId);
		// A second finger turns the drag into a pinch, and a pinch is never a click.
		dragMoved = pressed.length > 1;
		drag = pressed.length > 1 ? null : { x: event.clientX, y: event.clientY };
	}

	function endDrag(event: PointerEvent) {
		pressed = pressed.filter((finger) => finger.id !== event.pointerId);
		if (pressed.length === 1) {
			// One finger is left after a pinch: carry on dragging from where it is.
			drag = { x: pressed[0].x, y: pressed[0].y };
		} else if (pressed.length === 0) {
			drag = null;
			canvas.style.cursor = '';
		}
	}

	/** Zooms and pans with the first two fingers down; `before` is where the one that moved was. */
	function pinch(moved: PinPoint, before: PinPoint) {
		const rect = canvas.getBoundingClientRect();
		const local = (point: PinPoint) => ({ x: point.x - rect.left, y: point.y - rect.top });
		const fingers = pressed.slice(0, 2);
		const now = fingers.map(local) as [PinPoint, PinPoint];
		const earlier = fingers.map((finger) => local(finger === moved ? before : finger)) as [
			PinPoint,
			PinPoint
		];
		changeView(pinchView(view, earlier, now, { width, height }));
	}

	function movePointer(event: PointerEvent) {
		const finger = pressed.find(({ id }) => id === event.pointerId);
		if (finger) {
			const before = { x: finger.x, y: finger.y };
			finger.x = event.clientX;
			finger.y = event.clientY;
			if (pressed.length > 1) {
				pinch(finger, before);
				return;
			}
		}
		if (!drag) {
			const overSymbol = targetAt(event) || nearestPin(eventPins, pointOf(event), HIT_RADIUS) >= 0;
			canvas.style.cursor = overSymbol ? 'pointer' : view.k > 1 ? 'grab' : '';
			return;
		}
		const dx = event.clientX - drag.x;
		const dy = event.clientY - drag.y;
		// Small jitter during a click must not count as a drag.
		if (!dragMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
		dragMoved = true;
		canvas.style.cursor = 'grabbing';
		drag = { x: event.clientX, y: event.clientY };
		changeView(panBy(view, dx, dy, { width, height }));
	}

	let drawFailed = false;

	function loop(time: number) {
		// The next frame is booked first, so one bad draw can't stop the map for good.
		frame = requestAnimationFrame(loop);
		try {
			draw(time / 1000, true);
			beat();
		} catch (error) {
			// Logged once, not 60 times a second. With no heartbeat the kiosk watchdog reloads the page.
			if (!drawFailed) console.error('Map draw failed', error);
			drawFailed = true;
		}
	}

	/** Animates, or draws one still frame when the visitor prefers reduced motion. */
	function start() {
		cancelAnimationFrame(frame);
		if (motionQuery.matches) draw(0, false);
		else frame = requestAnimationFrame(loop);
	}

	// The loop picks up a new highlight on its own; a still frame has to be redrawn.
	$effect(() => {
		void highlight;
		if (motionQuery?.matches) draw(0, false);
	});

	onMount(() => {
		ctx = canvas.getContext('2d')!;
		colors = readColors(container);
		radarOpacity = readRadarOpacity(container);
		motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		motionQuery.addEventListener('change', start);
		layout();
		// The land is only redrawn on a change, so new road conditions mark it stale.
		const roadsChanged = () => {
			hasRoadData = roads.length > 0 || events.length > 0;
			baseStale = true;
			if (motionQuery.matches) draw(0, false);
		};
		const stopRoads = startRoadFeed(fetchRoadConditions, toSegments, (segments) => {
			roads = segments;
			onRoadConditions?.({ segments, loadedAt: Date.now() });
			roadsChanged();
		});
		const stopEvents = startRoadFeed(fetchRoadEvents, toEvents, (found) => {
			events = found;
			onRoadEvents?.({ events: found, loadedAt: Date.now() });
			roadsChanged();
		});
		// Not passive, so zoom() can stop the page zooming too.
		canvas.addEventListener('wheel', zoom, { passive: false });

		// The observer also fires once on attach, when nothing has changed.
		const observer = new ResizeObserver(() => {
			const rect = container.getBoundingClientRect();
			if (Math.round(rect.width) === width && Math.round(rect.height) === height) return;
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(layout, 150);
		});
		observer.observe(container);

		return () => {
			stopRoads();
			stopEvents();
			clearTimeout(eventTimer);
			cancelAnimationFrame(frame);
			clearTimeout(resizeTimer);
			clearTimeout(zoomResetTimer);
			canvas.removeEventListener('wheel', zoom);
			motionQuery.removeEventListener('change', start);
			observer.disconnect();
			feed.dispose();
		};
	});
</script>

<div class="map">
	<div
		class="surface"
		bind:this={container}
		role="img"
		aria-label="Map of client municipalities in Ontario"
	>
		<!-- Pointer only: the panel already steps through every municipality without any input. -->
		<canvas
			bind:this={canvas}
			aria-hidden="true"
			onclick={select}
			onpointerdown={startDrag}
			onpointermove={movePointer}
			onpointerup={endDrag}
			onpointercancel={endDrag}
		></canvas>
	</div>
	{#if openEvent}
		<div
			class="event-card"
			class:left={openEvent.left}
			class:up={openEvent.up}
			style:left="{openEvent.x}px"
			style:top="{openEvent.y}px"
		>
			<RoadEventCard event={openEvent.event} onClose={closeEvent} />
		</div>
	{/if}
	{#if weatherMix?.reporting || hasRoadData}
		<div class="key">
			{#if weatherMix?.reporting}<WeatherMix mix={weatherMix} total={municipalities.length} />{/if}
			{#if hasRoadData}<RoadLegend source={roadSourceLabel()} />{/if}
		</div>
	{/if}
	{#if radarTime}<p class="caption">{radarTime}</p>{/if}
</div>

<style>
	.map {
		position: relative;
		width: 100%;
		height: 100%;
		background: var(--map-background);
	}

	.surface {
		width: 100%;
		height: 100%;
	}

	canvas {
		touch-action: none;
		display: block;
		width: 100%;
		height: 100%;
	}

	/* The weather bar above the road legend, in the lower left corner. */
	.key {
		position: absolute;
		left: 0.75rem;
		bottom: 0.5rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.35rem;
		pointer-events: none;
	}

	/* Anchored beside the symbol, on whichever side has room. */
	.event-card {
		position: absolute;
		transform: translate(1rem, -1rem);
	}

	.event-card.left {
		transform: translate(calc(-100% - 1rem), -1rem);
	}

	.event-card.up {
		transform: translate(1rem, calc(-100% + 1rem));
	}

	.event-card.left.up {
		transform: translate(calc(-100% - 1rem), calc(-100% + 1rem));
	}

	.caption {
		position: absolute;
		right: 0.75rem;
		bottom: 0.5rem;
		margin: 0;
		pointer-events: none;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--map-caption);
	}
</style>
