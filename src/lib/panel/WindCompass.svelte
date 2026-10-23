<script lang="ts">
	import { bearingOf } from '#lib/weather/compass.js';

	let {
		direction,
		speed,
		gust
	}: {
		direction?: string;
		/** Km/h, or the feed's word for no wind. */
		speed: number | 'calm';
		gust?: number;
	} = $props();

	const calm = $derived(speed === 'calm');
	const bearing = $derived(calm ? null : bearingOf(direction));
	// The arrow shows where the wind is going, half a turn from the side it comes from.
	const heading = $derived((bearing ?? 0) + 180);
	const reading = $derived(calm ? 'Calm' : `${direction ? `${direction} ` : ''}${speed} km/h`);
</script>

<div class="compass">
	<svg viewBox="0 0 84 84" role="img" aria-label={`Wind ${calm ? 'calm' : reading}`}>
		<circle class="ring" cx="42" cy="42" r="38" />
		<text class="point" x="42" y="13" text-anchor="middle">N</text>
		<text class="point" x="42" y="79" text-anchor="middle">S</text>
		<text class="point" x="75" y="46" text-anchor="middle">E</text>
		<text class="point" x="9" y="46" text-anchor="middle">W</text>
		{#if bearing !== null}
			<path
				class="arrow"
				d="M42 18 L49 36 H44 V64 H40 V36 H35 Z"
				transform="rotate({heading} 42 42)"
			/>
		{/if}
	</svg>
	<p class="reading">{reading}</p>
	{#if gust}<p class="gust">gusts {gust}</p>{/if}
</div>

<style>
	.compass {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	svg {
		width: calc(var(--u) * 20);
		height: calc(var(--u) * 20);
	}

	.ring {
		fill: none;
		stroke: var(--panel-border);
		stroke-width: 1.5;
	}

	.point {
		font-size: 11px;
		fill: var(--panel-muted);
	}

	.arrow {
		fill: var(--map-pin);
	}

	.reading,
	.gust {
		margin: 0;
		font-size: calc(var(--u) * 4);
		line-height: 1.3;
	}

	.reading {
		font-weight: 600;
	}

	.gust {
		color: var(--panel-muted);
	}
</style>
