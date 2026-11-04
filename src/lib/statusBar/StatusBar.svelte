<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import logo from '#lib/assets/tmm-logo.png';
	import { municipalityFacts } from '#lib/data/facts.js';
	import { landmarks } from '#lib/data/landmarks.js';
	import { municipalities } from '#lib/data/municipalities.js';
	import { office } from '#lib/data/office.js';
	import officeTrips from '#lib/data/office-trips.json';
	import { tickerMessages } from '#lib/data/tickerMessages.js';
	import { formatClockTime } from '#lib/radar/format.js';
	import type { RadarCoverage } from '#lib/radar/coverage.js';
	import type { RoadEventSnapshot } from '#lib/roads/events.js';
	import type { RoadSegmentSnapshot } from '#lib/roads/roadConditions.js';
	import type { ConditionMix } from '#lib/weather/conditionMix.js';
	import type { SiteWeather } from '#lib/weather/types.js';
	import { factSlots, slotGroups, TickerOrder } from './facts.js';

	const TIME_ZONE = 'America/Toronto';
	const CLOCK_MS = 1000;
	const TICKER_MS = 8000;
	const FADE_MS = 400;

	/** Weather held for a forecast site, already filtered for age and expired warnings. */
	let {
		peekWeather,
		peekRoadEvents,
		peekRoadSections,
		peekWeatherMix,
		peekRadarCoverage
	}: {
		peekWeather: (siteId: string) => SiteWeather | null;
		/** The latest road events, read each time the ticker builds its facts. */
		peekRoadEvents: () => RoadEventSnapshot | null;
		/** The latest road conditions, read the same way. */
		peekRoadSections: () => RoadSegmentSnapshot | null;
		/** What the weather is across the municipalities, read the same way. */
		peekWeatherMix: () => ConditionMix | null;
		/** Where the radar shows precipitation, read the same way. */
		peekRadarCoverage: () => RadarCoverage | null;
	} = $props();

	const dateFormat = new Intl.DateTimeFormat('en-US', {
		timeZone: TIME_ZONE,
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
	const reducedMotion = new MediaQuery('prefers-reduced-motion: reduce');
	const duration = $derived(reducedMotion.current ? 0 : FADE_MS);

	function currentSlots() {
		return factSlots({
			municipalities,
			office,
			landmarks,
			trips: officeTrips,
			random: Math.random,
			facts: municipalityFacts,
			peekWeather,
			roadEvents: peekRoadEvents(),
			roadSections: peekRoadSections(),
			weatherMix: peekWeatherMix(),
			radar: peekRadarCoverage(),
			customMessages: tickerMessages,
			now: Date.now()
		});
	}

	let now = $state(new Date());
	// Every lap is a fresh random order, so the ticker never repeats a pattern.
	const groups = slotGroups(tickerMessages.length);
	const order = new TickerOrder(Math.random);
	let fact = $state(order.next(currentSlots(), groups));

	onMount(() => {
		const clock = setInterval(() => (now = new Date()), CLOCK_MS);
		const ticker = setInterval(() => {
			fact = order.next(currentSlots(), groups);
		}, TICKER_MS);
		return () => {
			clearInterval(clock);
			clearInterval(ticker);
		};
	});
</script>

<footer class="bar" aria-label="Status bar">
	<img class="logo" src={logo} alt="The Managed Municipality" />

	<div class="clock">
		<span class="date">{dateFormat.format(now)}</span>
		<span class="time">{formatClockTime(now, TIME_ZONE)}</span>
	</div>

	<p class="count">{municipalities.length} municipalities</p>

	<div class="ticker" aria-live="off">
		{#key fact?.id}
			<p class="fact" in:fade={{ duration }} out:fade={{ duration }}>{fact?.text ?? ''}</p>
		{/key}
	</div>

	<p class="credits">
		<span>Weather and radar: Environment Canada. Census: Statistics Canada.</span>
		<span>Map: Natural Earth. Open Government Licence, Canada.</span>
	</p>
</footer>

<style>
	/* Sits across both columns of the page grid, in the strip reserved below them. Sizes come
	   from the bar's height, so it stays readable at any screen size. */
	.bar {
		grid-column: 1 / -1;
		container-type: size;
		display: grid;
		grid-template-columns: auto auto auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0 2.5vw;
		padding: 0 1.5vw;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		color: var(--panel-text);
		background: var(--panel-background);
		border-top: 1px solid var(--panel-border);
	}

	p {
		margin: 0;
	}

	/* The lower left corner of the screen. It is part of the strip below the map, so it never
	   sits on the map, its borders or the radar. */
	.logo {
		height: 80cqh;
		width: auto;
	}

	.clock {
		display: flex;
		flex-direction: column;
		line-height: 1.1;
		white-space: nowrap;
	}

	.date {
		font-size: max(11px, 26cqh);
		color: var(--panel-muted);
	}

	.time {
		font-size: max(14px, 42cqh);
		font-weight: 700;
	}

	.count {
		font-size: max(13px, 36cqh);
		font-weight: 600;
		white-space: nowrap;
	}

	/* Facts can use two lines; anything longer, including your own lines, is cut off. */
	.ticker {
		display: grid;
		min-width: 0;
	}

	.fact {
		grid-area: 1 / 1;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
		font-size: max(12px, 32cqh);
		line-height: 1.15;
	}

	.credits {
		/* The same size as the credit line at the foot of the panel, set once on the page. */
		font-size: var(--credit-size, 11px);
		line-height: 1.15;
		color: var(--panel-muted);
		white-space: nowrap;
	}

	/* The line break goes before "Map". */
	.credits span {
		display: block;
	}
</style>
