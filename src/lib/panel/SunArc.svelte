<script lang="ts">
	import { SUN_ARC, type SunPosition } from '#lib/weather/sunArc.js';

	let {
		position,
		sunrise,
		sunset
	}: {
		/** Where the sun is on the arc now, or null when it is below the horizon. */
		position: SunPosition | null;
		/** Sunrise and sunset as clock times, already formatted. */
		sunrise: string;
		sunset: string;
	} = $props();

	const { left, right, baseline, radiusX, radiusY } = SUN_ARC;
	const fullArc = `M${left} ${baseline} A${radiusX} ${radiusY} 0 0 1 ${right} ${baseline}`;
	const label = $derived(position ? 'The sun is up.' : 'The sun is down.');
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
		{:else}
			<text class="night" x="150" y="64" text-anchor="middle">Sun is down</text>
		{/if}
	</svg>
	<p class="times"><span>Sunrise {sunrise}</span><span>Sunset {sunset}</span></p>
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
