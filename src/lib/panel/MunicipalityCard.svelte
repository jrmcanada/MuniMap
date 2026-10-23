<script lang="ts">
	import type { Municipality } from '#lib/data/municipalities.js';
	import { municipalityFacts } from '#lib/data/facts.js';
	import { formatClockTime } from '#lib/radar/format.js';
	import { sunTimes } from '#lib/weather/sun.js';
	import { localDate, timeZoneAt } from '#lib/weather/timeZone.js';
	import type { SiteWeather } from '#lib/weather/types.js';

	let { municipality, weather }: { municipality: Municipality; weather: SiteWeather | null } =
		$props();

	const facts = $derived(municipalityFacts[municipality.name]);
	const timeZone = $derived(timeZoneAt(municipality.longitude));
	const current = $derived(weather?.current ?? null);

	const sun = $derived.by(() => {
		const date = localDate(new Date(), timeZone);
		return sunTimes(municipality.latitude, municipality.longitude, date.year, date.month, date.day);
	});

	let iconFailed = $state(false);

	const degrees = (celsius: number) => `${Math.round(celsius)}°`;
	const number = new Intl.NumberFormat('en-CA');
	const decimal = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1 });

	const wind = $derived.by(() => {
		if (!current || current.windSpeedKmh === undefined) return null;
		if (current.windSpeedKmh === 'calm') return 'Wind calm';
		const direction = current.windDirection ? `${current.windDirection} ` : '';
		const gust = current.windGustKmh ? `, gusts ${current.windGustKmh}` : '';
		return `Wind ${direction}${current.windSpeedKmh} km/h${gust}`;
	});

	const populationChange = $derived(
		`${facts.populationChangePercent < 0 ? 'down' : 'up'} ${decimal.format(Math.abs(facts.populationChangePercent))}% since 2016`
	);
</script>

<article class="card">
	<header class="heading">
		<h2 class="name">{municipality.name}</h2>
		<p class="district">{facts.district}</p>
	</header>

	{#each weather?.warnings ?? [] as warning (warning.description)}
		<p class="warning {warning.level}">{warning.description}</p>
	{/each}

	{#if current}
		<section class="current">
			{#if current.iconUrl && !iconFailed}
				<img class="icon" src={current.iconUrl} alt="" onerror={() => (iconFailed = true)} />
			{/if}
			<p class="temperature">{degrees(current.temperatureC)}</p>
			<div class="details">
				{#if current.condition}<p class="condition">{current.condition}</p>{/if}
				{#if current.feelsLikeC !== undefined}
					<p>Feels like {degrees(current.feelsLikeC)}</p>
				{/if}
				{#if wind}<p>{wind}</p>{/if}
				{#if current.humidityPercent !== undefined}
					<p>Humidity {current.humidityPercent}%</p>
				{/if}
			</div>
		</section>
	{/if}

	{#if weather?.forecast.length}
		<ul class="forecast">
			{#each weather.forecast as period (period.name)}
				<li class="period">
					<span class="period-name">{period.name}</span>
					{#if period.temperatureC !== undefined}
						<span class="period-temperature">
							{period.temperatureKind === 'low' ? 'Low' : 'High'}
							{degrees(period.temperatureC)}
						</span>
					{/if}
					{#if period.summary}<span class="period-summary">{period.summary}</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if sun}
		<p class="sun">
			<span>Sunrise {formatClockTime(sun.sunrise, timeZone)}</span>
			<span>Sunset {formatClockTime(sun.sunset, timeZone)}</span>
		</p>
	{/if}

	<dl class="census">
		<div>
			<dt>Population</dt>
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
	.card {
		display: flex;
		flex-direction: column;
		gap: 3.5cqw;
		height: 100%;
		overflow: hidden;
		font-size: 5.2cqw;
		color: var(--panel-text);
	}

	.heading {
		display: flex;
		flex-direction: column;
		gap: 0.5cqw;
	}

	.name {
		margin: 0;
		font-size: 9.5cqw;
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
		font-size: 5.4cqw;
	}

	.warning {
		margin: 0;
		padding: 1.5cqw 2.5cqw;
		border-radius: 1.5cqw;
		font-weight: 600;
		font-size: 4.7cqw;
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
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 0 3cqw;
	}

	.icon {
		grid-row: span 2;
		width: 16cqw;
		height: 16cqw;
		object-fit: contain;
	}

	.temperature {
		margin: 0;
		font-size: 20cqw;
		line-height: 1;
		font-weight: 700;
	}

	.details {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		gap: 0.5cqw;
	}

	.details p {
		margin: 0;
	}

	.condition {
		font-weight: 600;
		font-size: 6.1cqw;
	}

	.forecast {
		display: flex;
		flex-direction: column;
		gap: 1.5cqw;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.period {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0 2cqw;
	}

	.period-name {
		font-weight: 600;
	}

	.period-temperature {
		text-align: right;
	}

	.period-summary {
		grid-column: 1 / -1;
		color: var(--panel-muted);
	}

	.sun {
		display: flex;
		justify-content: space-between;
		margin: 0;
	}

	.census {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 3cqw;
		margin: 0;
	}

	dd {
		margin: 0;
		font-size: 7cqw;
		font-weight: 600;
	}

	.note {
		font-size: 4.2cqw;
		font-weight: 400;
	}

	.footer {
		margin-top: auto;
		font-size: 4cqw;
	}
</style>
