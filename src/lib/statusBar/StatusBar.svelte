<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import { municipalityFacts } from '#lib/data/facts.js';
	import { municipalities } from '#lib/data/municipalities.js';
	import { tickerMessages } from '#lib/data/tickerMessages.js';
	import { formatClockTime } from '#lib/radar/format.js';
	import type { SiteWeather } from '#lib/weather/types.js';
	import { factSlots, nextSlot } from './facts.js';

	const TIME_ZONE = 'America/Toronto';
	const CLOCK_MS = 1000;
	const TICKER_MS = 8000;
	const FADE_MS = 400;

	/** Weather held for a forecast site, already filtered for age and expired warnings. */
	let { peekWeather }: { peekWeather: (siteId: string) => SiteWeather | null } = $props();

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
			facts: municipalityFacts,
			peekWeather,
			customMessages: tickerMessages,
			now: Date.now()
		});
	}

	let now = $state(new Date());
	// The first fact that has something to say; the ticker then moves on every few seconds.
	const first = currentSlots();
	let cursor = nextSlot(first, -1);
	let fact = $state(first[cursor] ?? null);

	onMount(() => {
		const clock = setInterval(() => (now = new Date()), CLOCK_MS);
		const ticker = setInterval(() => {
			const slots = currentSlots();
			cursor = nextSlot(slots, cursor);
			fact = slots[cursor] ?? null;
		}, TICKER_MS);
		return () => {
			clearInterval(clock);
			clearInterval(ticker);
		};
	});
</script>

<footer class="bar" aria-label="Status bar">
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
		Weather and radar: Environment Canada. Census: Statistics Canada. Map: Natural Earth. Open
		Government Licence, Canada.
	</p>
</footer>

<style>
	/* Sits across both columns of the page grid, in the strip reserved below them. Sizes come
	   from the bar's height, so it stays readable at any screen size. */
	.bar {
		grid-column: 1 / -1;
		container-type: size;
		display: grid;
		grid-template-columns: auto auto minmax(0, 1fr) minmax(0, 30%);
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
		font-size: max(11px, 22cqh);
		line-height: 1.15;
		color: var(--panel-muted);
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
	}
</style>
