<script lang="ts">
	import { onMount } from 'svelte';
	import { municipalities } from '#lib/data/municipalities.js';
	import { factsFor, municipalityFacts } from '#lib/data/facts.js';
	import { office } from '#lib/data/office.js';
	import Kiosk from '#lib/kiosk/Kiosk.svelte';
	import MapView from '#lib/map/MapView.svelte';
	import MunicipalityPanel from '#lib/panel/MunicipalityPanel.svelte';
	import { Rotation } from '#lib/panel/rotation.js';
	import { PanelSchedule } from '#lib/panel/schedule.js';
	import StatusBar from '#lib/statusBar/StatusBar.svelte';
	import { WeatherCache } from '#lib/weather/cache.js';
	import type { SiteWeather } from '#lib/weather/types.js';

	const SLOT_MS = 20_000;
	/** How long a municipality stays up after someone clicks its pin. */
	const HOLD_MS = 60_000;
	/** The next municipality's weather is fetched this long after the current one appears. */
	const PREFETCH_MS = 15_000;
	/** How often the status bar's weather for every forecast site is topped up. */
	const WARM_UP_MS = 5 * 60_000;

	const rotation = new Rotation(municipalities.map((municipality) => municipality.name));
	const cache = new WeatherCache();
	// A monotonic clock, so clock changes and daylight saving never skip or repeat a municipality.
	const schedule = new PanelSchedule(SLOT_MS, HOLD_MS, performance.now());

	let slot = $state(0);
	let pinned = $state<string | null>(null);
	let weather = $state<SiteWeather | null>(null);

	// The office is never in the rotation; it appears only when its marker is clicked.
	const current = $derived(
		pinned === office.name
			? office
			: municipalities.find((municipality) => municipality.name === (pinned ?? rotation.at(slot)))!
	);

	function syncSchedule() {
		slot = schedule.slot;
		pinned = schedule.pinnedName;
	}

	/** A click on a pin or the office marker: show it now, then carry on with the rotation. */
	function showMunicipality(name: string) {
		schedule.pin(name, performance.now());
		syncSchedule();
	}

	onMount(() => {
		const timer = setInterval(() => {
			schedule.tick(performance.now());
			syncSchedule();
		}, 1000);
		return () => clearInterval(timer);
	});

	// The status bar speaks for every municipality, so it needs weather for every site, not just
	// the one on the panel. Sites are fetched one at a time and only when their copy is old enough
	// (see WeatherCache.load), so a failed site is retried here without hammering the others.
	onMount(() => {
		const siteIds = [
			...new Set(municipalities.map((municipality) => municipalityFacts[municipality.name].siteId))
		];
		let stopped = false;
		let running = false;
		async function warmUp() {
			// A slow pass must not be joined by the next one.
			if (running) return;
			running = true;
			for (const siteId of siteIds) {
				if (stopped) break;
				await cache.load(siteId);
			}
			running = false;
		}
		void warmUp();
		const timer = setInterval(() => void warmUp(), WARM_UP_MS);
		return () => {
			stopped = true;
			clearInterval(timer);
		};
	});

	$effect(() => {
		const siteId = factsFor(current.name).siteId;
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
		<MapView highlight={current.name} onSelect={showMunicipality} />
	</section>
	<MunicipalityPanel municipality={current} {weather} />
	<StatusBar peekWeather={(siteId) => cache.peek(siteId)} />
	<Kiosk busy={pinned !== null} />
</main>

<style>
	/* Fixed tracks: nothing in the panel can resize the map, which would refetch the radar. */
	.screen {
		display: grid;
		grid-template-columns: minmax(0, 75fr) minmax(0, 20fr);
		grid-template-rows: minmax(0, 93fr) minmax(0, 7fr);
		width: 100vw;
		height: 100dvh;
		background: var(--map-background);
		/* The credit text size, shared by the panel's footer and the status bar so the two always match.
		   It is 4 panel units. The panel is 20/95 of the width and 93% of the height, and its unit is the
		   smaller of 1cqw and 0.36cqh (see MunicipalityPanel). Change the grid or the unit, change this. */
		--credit-size: min(calc(1vw * 20 / 95 * 4), calc(1dvh * 93 / 100 * 0.36 * 4));
	}

	.map-area {
		min-width: 0;
		min-height: 0;
		overflow: hidden;
	}
</style>
