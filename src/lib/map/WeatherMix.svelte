<script lang="ts">
	import {
		CONDITION_KINDS,
		type ConditionKind,
		type ConditionMix
	} from '#lib/weather/conditionMix.js';

	/** How many municipalities there are in all, so the caption says how many are in the bar. */
	let { mix, total }: { mix: ConditionMix; total: number } = $props();

	const LABELS: Record<ConditionKind, string> = {
		rain: 'Rain',
		snow: 'Snow',
		clear: 'Clear',
		other: 'Cloud, mist, fog'
	};
	/** A segment this wide or wider has room for its percentage inside it. */
	const LABEL_MIN_SHARE = 0.15;

	/** One segment per kind that has any municipalities, left to right in the fixed order. */
	const segments = $derived(
		CONDITION_KINDS.filter((kind) => mix.counts[kind] > 0).map((kind) => {
			const share = mix.counts[kind] / mix.reporting;
			return {
				kind,
				share,
				percent: Math.round(share * 100),
				labelled: share >= LABEL_MIN_SHARE
			};
		})
	);

	const summary = $derived(
		`Weather across the municipalities: ${CONDITION_KINDS.map((kind) => `${LABELS[kind]} ${mix.counts[kind]}`).join(', ')}`
	);
</script>

<div class="mix">
	<div class="bar" role="img" aria-label={summary}>
		{#each segments as { kind, share, percent, labelled } (kind)}
			<span class="segment {kind}" style:flex-basis="{share * 100}%">
				{#if labelled}{percent}%{/if}
			</span>
		{/each}
	</div>
	<ul>
		{#each CONDITION_KINDS as kind (kind)}
			<li class:none={mix.counts[kind] === 0}>
				<span class="swatch {kind}"></span>{LABELS[kind]}<b>{mix.counts[kind]}</b>
			</li>
		{/each}
	</ul>
	<p class="caption">{mix.reporting} of {total} municipalities reporting</p>
</div>

<style>
	.mix {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		/* As wide as the one-row legend, whatever the screen scale; the bar stretches to match. */
		width: max-content;
		padding: 0.35rem 0.5rem;
		border-radius: 0.3rem;
		background: var(--map-label-halo);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--map-caption);
	}

	/* A 2px gap between segments, so neighbours never rely on hue alone. */
	.bar {
		display: flex;
		gap: 2px;
		height: 1.1rem;
	}

	.segment {
		flex: 0 0 auto;
		min-width: 3px;
		display: flex;
		align-items: center;
		padding-left: 0.4rem;
		border-radius: 0.2rem;
		font-weight: 700;
		color: white;
	}

	ul {
		display: flex;
		gap: 0.7rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		white-space: nowrap;
	}

	li b {
		color: var(--panel-text);
	}

	.none {
		opacity: 0.55;
	}

	.swatch {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
	}

	.rain {
		background: var(--mix-rain);
	}

	.snow {
		background: var(--mix-snow);
	}

	.clear {
		background: var(--mix-clear);
	}

	.other {
		background: var(--mix-other);
	}

	.caption {
		margin: 0;
		font-weight: 400;
	}
</style>
