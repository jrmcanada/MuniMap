<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Municipality } from '#lib/data/municipalities.js';
	import type { SiteWeather } from '#lib/weather/types.js';
	import MunicipalityCard from './MunicipalityCard.svelte';

	const FADE_MS = 400;

	let { municipality, weather }: { municipality: Municipality; weather: SiteWeather | null } =
		$props();

	const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : FADE_MS;
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
		container-type: inline-size;
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
		padding: 3cqw;
	}
</style>
