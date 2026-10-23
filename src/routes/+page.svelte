<script lang="ts">
	import { onMount } from 'svelte';
	import { municipalities } from '#lib/data/municipalities.js';
	import { municipalityFacts } from '#lib/data/facts.js';
	import MapView from '#lib/map/MapView.svelte';
	import MunicipalityPanel from '#lib/panel/MunicipalityPanel.svelte';
	import { Rotation } from '#lib/panel/rotation.js';
	import { WeatherCache } from '#lib/weather/cache.js';
	import type { SiteWeather } from '#lib/weather/types.js';

	const SLOT_MS = 30_000;
	/** The next municipality's weather is fetched this long after the current one appears. */
	const PREFETCH_MS = 25_000;

	const rotation = new Rotation(municipalities.map((municipality) => municipality.name));
	const cache = new WeatherCache();
	// A monotonic clock, so clock changes and daylight saving never skip or repeat a municipality.
	const startedAt = performance.now();

	let slot = $state(0);
	let weather = $state<SiteWeather | null>(null);

	const current = $derived(
		municipalities.find((municipality) => municipality.name === rotation.at(slot))!
	);

	onMount(() => {
		const timer = setInterval(() => {
			slot = Math.floor((performance.now() - startedAt) / SLOT_MS);
		}, 1000);
		return () => clearInterval(timer);
	});

	$effect(() => {
		const siteId = municipalityFacts[current.name].siteId;
		const nextSiteId = municipalityFacts[rotation.at(slot + 1)].siteId;

		weather = cache.peek(siteId);
		let stale = false;
		void cache.load(siteId).then((loaded) => {
			if (!stale) weather = loaded;
		});
		const prefetch = setTimeout(() => void cache.load(nextSiteId), PREFETCH_MS);

		return () => {
			stale = true;
			clearTimeout(prefetch);
		};
	});
</script>

<main class="screen">
	<section class="map-area">
		<MapView highlight={current.name} />
	</section>
	<MunicipalityPanel municipality={current} {weather} />
	<!-- Reserved for the status bar (Phase 4). -->
	<footer class="status-bar"></footer>
</main>

<style>
	/* Fixed tracks: nothing in the panel can resize the map, which would refetch the radar. */
	.screen {
		display: grid;
		grid-template-columns: minmax(0, 75fr) minmax(0, 20fr);
		grid-template-rows: minmax(0, 95fr) minmax(0, 5fr);
		width: 100vw;
		height: 100dvh;
		background: var(--map-background);
	}

	.map-area {
		min-width: 0;
		min-height: 0;
		overflow: hidden;
	}

	.status-bar {
		grid-column: 1 / -1;
		background: var(--panel-background);
		border-top: 1px solid var(--panel-border);
	}
</style>
