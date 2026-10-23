<script lang="ts">
	import { onMount } from 'svelte';
	import { municipalities } from '#lib/data/municipalities.js';
	import ontarioMap from '#lib/data/ontario-map.json';
	import { drawBase, drawPins, readColors } from './draw.js';
	import { createProjection, projectPlaces } from './projection.js';
	import type { MapColors, MapData, PinPoint } from './types.js';

	// ontario-map.json: Natural Earth (public domain) 50m provinces and states plus 10m lakes,
	// cut to the Ontario region, coordinates rounded to 2 decimals, minified.
	// The JSON import types geometry as plain strings; the file is built to the MapData shape.
	const mapData = ontarioMap as unknown as MapData;

	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;

	let ctx: CanvasRenderingContext2D;
	let colors: MapColors;
	let motionQuery: MediaQueryList;
	let pins: PinPoint[] = [];
	let base: HTMLCanvasElement | null = null;
	let frame = 0;
	let resizeTimer: ReturnType<typeof setTimeout>;

	function layout() {
		const { width, height } = container.getBoundingClientRect();
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
		start();
	}

	function draw(seconds: number, pulse: boolean) {
		if (!base) return;
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.drawImage(base, 0, 0);
		ctx.restore();
		drawPins(ctx, pins, colors, seconds, pulse);
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

	onMount(() => {
		ctx = canvas.getContext('2d')!;
		colors = readColors(container);
		motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		motionQuery.addEventListener('change', start);
		layout();

		const observer = new ResizeObserver(() => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(layout, 150);
		});
		observer.observe(container);

		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(resizeTimer);
			motionQuery.removeEventListener('change', start);
			observer.disconnect();
		};
	});
</script>

<div
	class="map"
	bind:this={container}
	role="img"
	aria-label="Map of client municipalities in Ontario"
>
	<canvas bind:this={canvas} aria-hidden="true"></canvas>
</div>

<style>
	.map {
		width: 100%;
		height: 100%;
		background: var(--map-background);
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
