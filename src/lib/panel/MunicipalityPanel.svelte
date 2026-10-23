<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { Municipality } from '#lib/data/municipalities.js';
	import type { SiteWeather } from '#lib/weather/types.js';
	import MunicipalityCard from './MunicipalityCard.svelte';

	const FADE_MS = 400;

	let { municipality, weather }: { municipality: Municipality; weather: SiteWeather | null } =
		$props();

	let duration = $state(FADE_MS);

	onMount(() => {
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => (duration = query.matches ? 0 : FADE_MS);
		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	});
</script>

<aside class="panel" aria-live="off">
	{#key municipality.name}
		<div class="slot" in:fade={{ duration }} out:fade={{ duration }}>
			<MunicipalityCard {municipality} {weather} />
		</div>
	{/key}
</aside>

<style>
	/* Both cards share one grid cell so they cross-fade in place. Content is clipped,
	   so nothing in the panel can change the size of the map beside it. */
	.panel {
		display: grid;
		container-type: size;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		background: var(--panel-background);
		border-left: 1px solid var(--panel-border);
	}

	.slot {
		grid-area: 1 / 1;
		min-width: 0;
		min-height: 0;
		/* One unit for everything in the card: the smaller of the width and height based sizes, so
		   it fits tall, short, wide and ultrawide screens alike. This element must stay a direct child
		   of the panel, and nothing inside may become a container, or these units would change. */
		--u: min(1cqw, 0.38cqh);
		padding: calc(var(--u) * 3);
	}
</style>
