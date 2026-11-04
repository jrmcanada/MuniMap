<script lang="ts">
	import {
		CONDITION_KINDS,
		type ConditionKind,
		type ConditionMix
	} from '#lib/weather/conditionMix.js';

	/** How many municipalities there are in all, so the caption says how many are in the pie. */
	let { mix, total }: { mix: ConditionMix; total: number } = $props();

	const LABELS: Record<ConditionKind, string> = {
		rain: 'Rain',
		snow: 'Snow',
		clear: 'Clear',
		other: 'Cloud, mist, fog'
	};
	const CENTRE = 50;
	const RADIUS = 46;

	const point = (turns: number) => {
		const angle = turns * 2 * Math.PI - Math.PI / 2;
		return `${CENTRE + RADIUS * Math.cos(angle)} ${CENTRE + RADIUS * Math.sin(angle)}`;
	};

	/** One wedge per kind that has any municipalities, clockwise from the top in the fixed order. */
	const slices = $derived.by(() => {
		let from = 0;
		return CONDITION_KINDS.filter((kind) => mix.counts[kind] > 0).map((kind) => {
			const share = mix.counts[kind] / mix.reporting;
			const to = from + share;
			const path =
				share === 1
					? null
					: `M${CENTRE} ${CENTRE} L${point(from)} A${RADIUS} ${RADIUS} 0 ${share > 0.5 ? 1 : 0} 1 ${point(to)} Z`;
			from = to;
			return { kind, path };
		});
	});
</script>

<div class="mix">
	<svg viewBox="0 0 100 100" role="img" aria-label="Weather across the municipalities">
		{#each slices as { kind, path } (kind)}
			{#if path}
				<path class={kind} d={path} />
			{:else}
				<circle class={kind} cx={CENTRE} cy={CENTRE} r={RADIUS} />
			{/if}
		{/each}
	</svg>
	<div>
		<p class="title">Weather now</p>
		<ul>
			{#each CONDITION_KINDS as kind (kind)}
				<li class:none={mix.counts[kind] === 0}>
					<span class="swatch {kind}"></span>{LABELS[kind]}<b>{mix.counts[kind]}</b>
				</li>
			{/each}
		</ul>
		<p class="caption">{mix.reporting} of {total} municipalities reporting</p>
	</div>
</div>

<style>
	.mix {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.3rem 0.5rem;
		border-radius: 0.3rem;
		background: var(--map-label-halo);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--map-caption);
	}

	svg {
		flex: none;
		width: 4.5rem;
		height: 4.5rem;
	}

	/* A gap in the surface colour between wedges, so neighbours never rely on hue alone. */
	path,
	circle {
		stroke: var(--panel-background);
		stroke-width: 2;
	}

	p {
		margin: 0;
	}

	.title {
		color: var(--panel-text);
	}

	ul {
		margin: 0.15rem 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	li b {
		margin-left: auto;
		padding-left: 0.5rem;
		color: var(--panel-text);
	}

	.none {
		opacity: 0.55;
	}

	.swatch {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 50%;
	}

	.rain {
		fill: var(--mix-rain);
		background: var(--mix-rain);
	}

	.snow {
		fill: var(--mix-snow);
		background: var(--mix-snow);
	}

	.clear {
		fill: var(--mix-clear);
		background: var(--mix-clear);
	}

	.other {
		fill: var(--mix-other);
		background: var(--mix-other);
	}

	.caption {
		font-weight: 400;
	}
</style>
