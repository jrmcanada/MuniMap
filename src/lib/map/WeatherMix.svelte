<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		CONDITION_KINDS,
		type ConditionKind,
		type ConditionMix
	} from '#lib/weather/conditionMix.js';

	/** How many places there are in all (the municipalities and the office), so the caption says how many are in the bar. */
	let { mix, total }: { mix: ConditionMix; total: number } = $props();

	const LABELS: Record<ConditionKind, string> = {
		rain: 'Rain',
		snow: 'Snow',
		clear: 'Clear',
		cloud: 'Cloud',
		fog: 'Mist, fog'
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

	/** How long the list stays up when nobody closes it, as for a road event card. */
	const LIST_MS = 30_000;

	let open = $state<ConditionKind | null>(null);
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	let root: HTMLElement;

	/** The open list, sorted by name. It empties, and so closes, if the weather moves on. */
	const listed = $derived(open ? [...mix.names[open]].sort((a, b) => a.localeCompare(b)) : []);

	function close() {
		clearTimeout(closeTimer);
		open = null;
	}

	function toggle(kind: ConditionKind) {
		if (open === kind) return close();
		open = kind;
		clearTimeout(closeTimer);
		closeTimer = setTimeout(close, LIST_MS);
	}

	onDestroy(() => clearTimeout(closeTimer));

	const summary = $derived(
		`Weather across the municipalities: ${CONDITION_KINDS.map((kind) => `${LABELS[kind]} ${mix.counts[kind]}`).join(', ')}`
	);
</script>

<svelte:window
	onkeydown={(event) => event.key === 'Escape' && close()}
	onpointerdown={(event) => !root.contains(event.target as Node) && close()}
/>

<div class="mix" bind:this={root}>
	{#if open && listed.length}
		<section
			class="list"
			style:border-left-color="var(--mix-{open})"
			aria-label="{LABELS[open]} municipalities"
		>
			<header>
				<h3>{LABELS[open]}<b>{listed.length}</b></h3>
				<button type="button" class="close" aria-label="Close" onclick={close}>×</button>
			</header>
			<ul class="names">
				{#each listed as name (name)}<li>{name}</li>{/each}
			</ul>
		</section>
	{/if}
	<div class="bar" role="group" aria-label={summary}>
		{#each segments as { kind, share, percent, labelled } (kind)}
			<button
				type="button"
				class="segment {kind}"
				style:flex-basis="{share * 100}%"
				aria-label="{LABELS[kind]}: list the {mix.counts[kind]} municipalities"
				aria-expanded={open === kind}
				onclick={() => toggle(kind)}
			>
				{#if labelled}{percent}%{/if}
			</button>
		{/each}
	</div>
	<ul>
		{#each CONDITION_KINDS as kind (kind)}
			<li class:none={mix.counts[kind] === 0}>
				<span class="swatch {kind}"></span>{LABELS[kind]}<b>{mix.counts[kind]}</b>
			</li>
		{/each}
	</ul>
	<p class="caption">{mix.reporting} of {total} locations have current weather</p>
</div>

<style>
	.mix {
		position: relative;
		/* The key that holds this card lets pointer events through to the map; the bar and list do not. */
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		/* As wide as the one-row legend, whatever the screen scale; the bar stretches to match. */
		width: max-content;
		padding: 0.35rem 0.5rem;
		/* A solid, lighter card with an edge, so the panel stands out from the map behind it. */
		border: 1px solid var(--map-panel-border);
		border-radius: 0.3rem;
		background: var(--map-panel-background);
		box-shadow: var(--map-panel-shadow);
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
		/* A button, reset so it looks exactly like the plain segment it replaces. */
		margin: 0;
		padding: 0 0 0 0.4rem;
		border-radius: 0.2rem;
		text-align: left;
		font-family: inherit;
		line-height: inherit;
		font-weight: 700;
		font-size: inherit;
		color: white;
		border: 0;
		cursor: pointer;
	}

	.segment:focus-visible {
		outline: 2px solid var(--panel-text);
		outline-offset: 1px;
	}

	/* Opens upward from the bar, which sits low in the corner. */
	.list {
		position: absolute;
		left: 0;
		bottom: calc(100% + 0.35rem);
		width: min(22rem, 90vw);
		max-height: 60vh;
		display: flex;
		flex-direction: column;
		padding: 0.5rem 0.7rem 0.6rem;
		border: 1px solid var(--panel-border);
		border-left: 0.3rem solid var(--panel-border);
		border-radius: 0.5rem;
		background: var(--card-background);
		color: var(--panel-text);
		font-size: 0.9rem;
		box-shadow: 0 0.4rem 1.2rem oklch(0 0 0 / 0.45);
	}

	.list header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	h3 {
		margin: 0;
		font-size: 1rem;
	}

	h3 b {
		margin-left: 0.5rem;
		color: var(--map-caption);
	}

	.close {
		border: 0;
		background: none;
		color: inherit;
		font-size: 1.3rem;
		line-height: 1;
		cursor: pointer;
	}

	.names {
		display: block;
		columns: 2;
		gap: 1rem;
		margin: 0.4rem 0 0;
		overflow-y: auto;
		font-weight: 400;
	}

	.names li {
		display: block;
		white-space: normal;
		break-inside: avoid;
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

	.cloud {
		background: var(--mix-cloud);
	}

	.fog {
		background: var(--mix-fog);
	}

	.caption {
		margin: 0;
		font-weight: 400;
	}
</style>
