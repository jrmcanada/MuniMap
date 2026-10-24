<script lang="ts">
	import type { Municipality } from '#lib/data/municipalities.js';
	import { factsFor } from '#lib/data/facts.js';
	import { formatClockTime } from '#lib/radar/format.js';
	import { formatDegrees } from '#lib/weather/format.js';
	import { moonPass, moonPhase } from '#lib/weather/moon.js';
	import { sunTimes } from '#lib/weather/sun.js';
	import { arcPosition, sunPosition } from '#lib/weather/sunArc.js';
	import { localDate, timeZoneAt } from '#lib/weather/timeZone.js';
	import type { SiteWeather } from '#lib/weather/types.js';
	import SunArc from './SunArc.svelte';
	import WindCompass from './WindCompass.svelte';

	let { municipality, weather }: { municipality: Municipality; weather: SiteWeather | null } =
		$props();

	const facts = $derived(factsFor(municipality.name));
	const timeZone = $derived(timeZoneAt(municipality.longitude));
	const current = $derived(weather?.current ?? null);

	// Worked out once per card. A card is short lived, and the sun barely moves in that time.
	const sun = $derived.by(() => {
		const now = new Date();
		const date = localDate(now, timeZone);
		const times = sunTimes(
			municipality.latitude,
			municipality.longitude,
			date.year,
			date.month,
			date.day
		);
		if (!times) return null;

		const position = sunPosition(now, times);
		const pass = position ? null : moonPass(now, municipality.latitude, municipality.longitude);
		const moonPosition = pass && arcPosition(now, pass.rise, pass.set);
		const moon = pass &&
			moonPosition && {
				position: moonPosition,
				phase: moonPhase(now),
				rise: formatClockTime(pass.rise, timeZone),
				set: formatClockTime(pass.set, timeZone)
			};
		return { ...times, position, moon };
	});

	let iconFailed = $state(false);

	const number = new Intl.NumberFormat('en-CA');
	const decimal = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1 });

	const populationChange = $derived(
		facts.populationChangePercent === 0
			? 'no change since 2016'
			: `${facts.populationChangePercent < 0 ? 'down' : 'up'} ${decimal.format(Math.abs(facts.populationChangePercent))}% since 2016`
	);
</script>

<article class="card">
	<header class="tile heading">
		<h2 class="name">{municipality.name}</h2>
		<p class="district">{facts.district}</p>
	</header>

	{#each weather?.warnings ?? [] as warning, index (index)}
		<p class="warning {warning.level}">{warning.description}</p>
	{/each}

	{#if current}
		<section class="tile current">
			<div class="now">
				<div class="headline">
					{#if current.iconUrl && !iconFailed}
						<img class="icon" src={current.iconUrl} alt="" onerror={() => (iconFailed = true)} />
					{/if}
					<p class="temperature">{formatDegrees(current.temperatureC)}</p>
				</div>
				{#if current.condition}<p class="condition">{current.condition}</p>{/if}
				{#if current.feelsLikeC !== undefined}
					<p class="detail">Feels like {formatDegrees(current.feelsLikeC)}</p>
				{/if}
				{#if current.humidityPercent !== undefined}
					<p class="detail">Humidity {current.humidityPercent}%</p>
				{/if}
			</div>
			{#if current.windSpeedKmh !== undefined}
				<WindCompass
					direction={current.windDirection}
					speed={current.windSpeedKmh}
					gust={current.windGustKmh}
				/>
			{/if}
		</section>
	{/if}

	{#if weather?.forecast.length}
		<ul class="tile forecast">
			{#each weather.forecast as period (period.name)}
				<li class="period">
					<span class="period-name">{period.name}</span>
					{#if period.temperatureC !== undefined}
						<span class="period-temperature">
							{period.temperatureKind === 'low' ? 'Low' : 'High'}
							{formatDegrees(period.temperatureC)}
						</span>
					{/if}
					{#if period.summary}<span class="period-summary">{period.summary}</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if sun}
		<section class="tile">
			<SunArc
				position={sun.position}
				moon={sun.moon}
				sunrise={formatClockTime(sun.sunrise, timeZone)}
				sunset={formatClockTime(sun.sunset, timeZone)}
			/>
		</section>
	{/if}

	<dl class="tile census">
		<div>
			<dt>Population, 2021</dt>
			<dd>{number.format(facts.population)}</dd>
			<dd class="note">{populationChange}</dd>
		</div>
		<div>
			<dt>Land area</dt>
			<dd>{decimal.format(facts.landAreaKm2)} km²</dd>
			<dd class="note">{decimal.format(facts.densityPerKm2)} people per km²</dd>
		</div>
	</dl>

	<footer class="footer">
		{#if weather}
			Weather from {facts.siteName}. Environment Canada.
			{#if current}Observed {formatClockTime(current.observedAt, timeZone)}.{/if}
		{/if}
	</footer>
</article>

<style>
	/* Every size here is a multiple of --u, which MunicipalityPanel sets. Used on its own, the card
	   has no sizes. */
	.card {
		display: flex;
		flex-direction: column;
		gap: calc(var(--u) * 2.2);
		height: 100%;
		overflow: hidden;
		font-size: calc(var(--u) * 4.6);
		color: var(--panel-text);
	}

	.tile {
		margin: 0;
		padding: calc(var(--u) * 2.6) calc(var(--u) * 3.5);
		border-radius: calc(var(--u) * 3.5);
		background: var(--card-background);
		/* A hairline, so it stays 1px rather than scaling with --u. */
		border: 1px solid var(--panel-border);
	}

	.heading {
		display: flex;
		flex-direction: column;
		gap: calc(var(--u) * 0.5);
	}

	.name {
		margin: 0;
		font-size: calc(var(--u) * 8.6);
		line-height: 1.1;
		font-weight: 700;
		overflow-wrap: anywhere;
	}

	.district,
	.footer,
	.note,
	dt {
		margin: 0;
		color: var(--panel-muted);
	}

	.district {
		font-size: calc(var(--u) * 4.8);
	}

	.warning {
		margin: 0;
		padding: calc(var(--u) * 1.5) calc(var(--u) * 2.5);
		border-radius: calc(var(--u) * 2);
		font-weight: 600;
		font-size: calc(var(--u) * 4.4);
		color: var(--warning-text);
		background: var(--warning-other);
	}

	.warning.red {
		background: var(--warning-red);
	}

	.warning.orange {
		background: var(--warning-orange);
	}

	.warning.yellow {
		background: var(--warning-yellow);
	}

	.current {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 0 calc(var(--u) * 2);
	}

	.now {
		display: flex;
		flex-direction: column;
		gap: calc(var(--u) * 0.5);
	}

	.headline {
		display: flex;
		align-items: center;
		gap: calc(var(--u) * 2.5);
	}

	.icon {
		width: calc(var(--u) * 12);
		height: calc(var(--u) * 12);
		object-fit: contain;
	}

	.temperature {
		margin: 0;
		font-size: calc(var(--u) * 16);
		line-height: 1;
		font-weight: 700;
	}

	.now p {
		margin: 0;
	}

	.now .condition {
		margin-top: calc(var(--u) * 1);
		font-weight: 600;
		font-size: calc(var(--u) * 5.4);
	}

	.detail {
		font-size: calc(var(--u) * 4.4);
	}

	.forecast {
		display: flex;
		flex-direction: column;
		gap: calc(var(--u) * 1.8);
		list-style: none;
	}

	.period {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0 calc(var(--u) * 2);
	}

	.period-name {
		font-weight: 600;
	}

	.period-temperature {
		text-align: right;
	}

	.period-summary {
		grid-column: 1 / -1;
		font-size: calc(var(--u) * 4.2);
		color: var(--panel-muted);
	}

	.census {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: calc(var(--u) * 3);
	}

	dd {
		margin: 0;
		font-size: calc(var(--u) * 6.6);
		font-weight: 600;
	}

	.note {
		font-size: calc(var(--u) * 3.8);
		font-weight: 400;
	}

	.footer {
		margin-top: auto;
		/* The page sets --credit-size so the status bar's credits are exactly this size. */
		font-size: var(--credit-size, calc(var(--u) * 4));
	}
</style>
