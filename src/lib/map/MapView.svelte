<script lang="ts">
	import { onMount } from 'svelte';
	import { municipalities } from '#lib/data/municipalities.js';
	import ontarioMap from '#lib/data/ontario-map.json';
	import { RadarFeed } from '#lib/radar/feed.js';
	import { formatRadarTime } from '#lib/radar/format.js';
	import { RadarPlayer } from '#lib/radar/player.js';
	import { canvasBbox } from '#lib/radar/wms.js';
	import {
		drawBase,
		drawHighlight,
		drawPins,
		drawRadar,
		readColors,
		readRadarOpacity
	} from './draw.js';
	import { createProjection, projectPlaces } from './projection.js';
	import type { MapColors, MapData, PinPoint } from './types.js';

	/** Name of the municipality to ring and label, or null for none. */
	let { highlight = null }: { highlight?: string | null } = $props();

	// ontario-map.json: Natural Earth (public domain) 50m provinces and states plus 10m lakes,
	// cut to the Ontario region, coordinates rounded to 2 decimals, minified.
	// The JSON import types geometry as plain strings; the file is built to the MapData shape.
	const mapData = ontarioMap as unknown as MapData;

	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;

	let ctx: CanvasRenderingContext2D;
	let colors: MapColors;
	let radarOpacity = 0;
	let motionQuery: MediaQueryList;
	let pins: PinPoint[] = [];
	let base: HTMLCanvasElement | null = null;
	let width = 0;
	let height = 0;
	let frame = 0;
	let resizeTimer: ReturnType<typeof setTimeout>;

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
		const ratio = window.devicePixelRatio || 1;
		canvas.width = Math.round(width * ratio);
		canvas.height = Math.round(height * ratio);
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

		const projection = createProjection(width, height, municipalities);
		pins = projectPlaces(projection, municipalities);

		// Land never moves, so it is drawn once here and copied each frame.
		base = document.createElement('canvas');
		base.width = canvas.width;
		base.height = canvas.height;
		const baseCtx = base.getContext('2d')!;
		baseCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
		drawBase(baseCtx, mapData, projection, colors);

		feed.stop();
		player.reset();
		feed.start({ bbox: canvasBbox(projection, width, height), width, height });
		start();
	}

	function draw(seconds: number, animate: boolean) {
		if (!base) return;
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.drawImage(base, 0, 0);
		ctx.restore();

		const now = Date.now();
		const radar = animate ? player.frameAt(seconds, now) : player.newestFrame(now);
		if (radar) drawRadar(ctx, radar.image, width, height, radarOpacity);
		const time = radar ? formatRadarTime(radar.time) : null;
		if (time !== radarTime) radarTime = time;

		drawPins(ctx, pins, colors, seconds, animate);

		const marked = municipalities.findIndex((municipality) => municipality.name === highlight);
		if (marked >= 0) {
			const { name } = municipalities[marked];
			drawHighlight(ctx, pins[marked], name, colors, { width, height }, seconds, animate);
		}
	}

	function loop(time: number) {
		draw(time / 1000, true);
		frame = requestAnimationFrame(loop);
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
		<canvas bind:this={canvas} aria-hidden="true"></canvas>
	</div>
	<p class="caption">
		{#if radarTime}<span class="radar-time">{radarTime}</span>{/if}
		Radar: Environment Canada. Open Government Licence, Canada.
	</p>
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
		color: var(--map-caption);
	}

	.radar-time {
		margin-right: 0.5rem;
		font-weight: 600;
	}
</style>
