<script lang="ts">
	import { litMoonPath } from '#lib/weather/moonShape.js';
	import { SUN_ARC, type SunPosition } from '#lib/weather/sunArc.js';

	interface Moon {
		/** Where the moon is on the arc now. */
		position: SunPosition;
		/** 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
		phase: number;
		/** Moonrise and moonset as clock times, already formatted. */
		rise: string;
		set: string;
	}

	let {
		position,
		sunrise,
		sunset,
		moon = null
	}: {
		/** Where the sun is on the arc now, or null when it is below the horizon. */
		position: SunPosition | null;
		/** Sunrise and sunset as clock times, already formatted. */
		sunrise: string;
		sunset: string;
		/** The moon, shown only while the sun is down and the moon is up. */
		moon?: Moon | null;
	} = $props();

	const { left, right, baseline, radiusX, radiusY } = SUN_ARC;
	const fullArc = `M${left} ${baseline} A${radiusX} ${radiusY} 0 0 1 ${right} ${baseline}`;
	const label = $derived(
		position ? 'The sun is up.' : moon ? 'The sun is down and the moon is up.' : 'The sun is down.'
	);
	const MOON_RADIUS = 9;
</script>

<div class="sun">
	<svg viewBox="0 8 300 76" role="img" aria-label={label}>
		<line class="horizon" x1="10" y1={baseline} x2="290" y2={baseline} />
		<path class="track" d={fullArc} />
		{#if position}
			<path
				class="travelled"
				d={`M${left} ${baseline} A${radiusX} ${radiusY} 0 0 1 ${position.x} ${position.y}`}
			/>
			<circle class="body" cx={position.x} cy={position.y} r="7" />
		{:else if moon}
			<g transform={`translate(${moon.position.x} ${moon.position.y}) scale(${MOON_RADIUS})`}>
				<circle class="moon-dark" r="1" />
				<path class="moon-lit" d={litMoonPath(moon.phase)} />
			</g>
		{:else}
			<text class="night" x="150" y="64" text-anchor="middle">Sun is down</text>
		{/if}
	</svg>
	{#if !position && moon}
		<p class="times"><span>Moonrise {moon.rise}</span><span>Moonset {moon.set}</span></p>
	{:else}
		<p class="times"><span>Sunrise {sunrise}</span><span>Sunset {sunset}</span></p>
	{/if}
</div>

<style>
	.sun {
		display: flex;
		flex-direction: column;
		gap: calc(var(--u) * 0.5);
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.horizon {
		stroke: var(--panel-border);
		stroke-width: 1;
	}

	.track {
		fill: none;
		stroke: var(--panel-border);
		stroke-width: 2;
		stroke-dasharray: 3 5;
	}

	.travelled {
		fill: none;
		stroke: var(--map-pin);
		stroke-width: 2.5;
	}

	.body {
		fill: var(--map-highlight);
	}

	.moon-dark {
		fill: var(--panel-border);
	}

	.moon-lit {
		fill: var(--map-highlight);
	}

	/* In the drawing's own 300 unit space, like the compass letters. */
	.night {
		font-size: 13px;
		fill: var(--panel-muted);
	}

	.times {
		display: flex;
		justify-content: space-between;
		margin: 0;
		font-size: calc(var(--u) * 4.4);
	}
</style>
