<script lang="ts">
	import { onMount } from 'svelte';
	import { municipalities } from '#lib/data/municipalities.js';
	import highwayData from '#lib/data/highways.json';
	import { office } from '#lib/data/office.js';
	import ontarioMap from '#lib/data/ontario-map.json';
	import { beat } from '#lib/kiosk/heartbeat.js';
	import { radarRequestSize } from '#lib/kiosk/radarSize.js';
	import { nearestPin } from './hit.js';
	import { RadarFeed } from '#lib/radar/feed.js';
	import { formatRadarTime } from '#lib/radar/format.js';
	import { RadarPlayer } from '#lib/radar/player.js';
	import { canvasBbox } from '#lib/radar/wms.js';
	import {
		drawBase,
		drawOffice,
		drawHighlight,
		drawPins,
		drawRadar,
		readColors,
		readRadarOpacity
	} from './draw.js';
	import type { GeoProjection } from 'd3-geo';
	import { createProjection, projectPlaces, zoomProjection } from './projection.js';
	import type { HighwayData, MapColors, MapData, PinPoint } from './types.js';
	import { FULL_VIEW, panBy, wheelFactor, zoomAt, type View } from './view.js';

	/** How close a click or tap has to land to a pin to count, in CSS pixels. */
	const HIT_RADIUS = 16;
	/** How long after the last wheel turn the map returns to the full view. */
	const ZOOM_RESET_MS = 30_000;
	/** How far the pointer must travel while pressed before a click becomes a drag, in CSS pixels. */
	const DRAG_THRESHOLD = 4;

	let {
		highlight = null,
		onSelect
	}: {
		/** Name of the municipality to ring and label, or null for none. */
		highlight?: string | null;
		/** Called with the name of the municipality whose pin was clicked, or of the office. */
		onSelect?: (name: string) => void;
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

	let radarTime = $state<string | null>(null);

	const feed = new RadarFeed(() => {
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
		const baseCtx = base!.getContext('2d')!;
		baseCtx.setTransform(1, 0, 0, 1, 0, 0);
		baseCtx.clearRect(0, 0, base!.width, base!.height);
		baseCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
		drawBase(baseCtx, mapData, highways, projection, colors);
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
		view = next;
		baseStale = true;
		// A wall display has nobody to zoom back out, so the full view returns after a quiet spell.
		clearTimeout(zoomResetTimer);
		zoomResetTimer = setTimeout(resetZoom, ZOOM_RESET_MS);
		if (motionQuery.matches) draw(0, false);
	}

	function resetZoom() {
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

	/** The name of the office or municipality under the pointer, or null for open map. */
	function targetAt(event: MouseEvent): string | null {
		const rect = canvas.getBoundingClientRect();
		const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
		if (nearestPin([officePin], point, HIT_RADIUS) >= 0) return office.name;
		const index = nearestPin(pins, point, HIT_RADIUS);
		return index >= 0 ? municipalities[index].name : null;
	}

	function select(event: MouseEvent) {
		// A drag ends in a click too; only a real click picks a pin.
		if (dragMoved) return;
		const name = targetAt(event);
		if (name) onSelect?.(name);
	}

	function startDrag(event: PointerEvent) {
		drag = { x: event.clientX, y: event.clientY };
		dragMoved = false;
		canvas.setPointerCapture(event.pointerId);
	}

	function endDrag() {
		drag = null;
		canvas.style.cursor = '';
	}

	function movePointer(event: PointerEvent) {
		if (!drag) {
			canvas.style.cursor = targetAt(event) ? 'pointer' : view.k > 1 ? 'grab' : '';
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
