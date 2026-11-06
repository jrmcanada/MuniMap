import { describe, it, expect } from 'vitest';
import type { MunicipalityFacts } from '#lib/data/facts.js';
import { municipalityFacts } from '#lib/data/facts.js';
import { municipalities } from '#lib/data/municipalities.js';
import { office } from '#lib/data/office.js';
import officeTrips from '#lib/data/office-trips.json';
import { ontarioFacts } from '#lib/data/ontarioFacts.js';
import type { RoadEvent } from '#lib/roads/events.js';
import type { RoadSegment } from '#lib/roads/roadConditions.js';
import type { RoadStatus } from '#lib/roads/status.js';
import type { SiteWeather } from '#lib/weather/types.js';
import type { FactInputs } from './facts.js';
import {
	districtTemperatureFact,
	forecastPrecipFact,
	officeForecastFact,
	officeWeatherFact
} from './outlookFacts.js';
import {
	biggerThanTorontoFact,
	biggestGainFact,
	busiestStationFact,
	centreFact,
	closestPairFact,
	driveBandFact,
	farthestPairFact,
	medianPopulationFact,
	northSouthDaylightFact,
	shrankCountFact,
	smallestTogetherFact,
	totalChangeFact
} from './peopleFacts.js';
import { collisionsFact, hazardHighwaysFact } from './roadFacts.js';
import { moonriseFact, sunCountdownFact, triviaFact } from './timeFacts.js';

const NOW = Date.parse('2026-11-03T20:00:00Z');

const real = (extra: Partial<FactInputs> = {}, now = NOW): FactInputs => ({
	municipalities,
	office,
	landmarks: [],
	trivia: ontarioFacts,
	officeSiteId: 'on-40',
	trips: officeTrips,
	random: () => 0,
	facts: municipalityFacts,
	peekWeather: () => null,
	roadEvents: null,
	roadSections: null,
	weatherMix: null,
	radar: null,
	customMessages: [],
	now,
	...extra
});

const baseFacts = municipalityFacts.Baldwin;
const info = (over: Partial<MunicipalityFacts>): MunicipalityFacts => ({ ...baseFacts, ...over });

/** Small made-up municipalities, each with its own facts. */
function places(rows: [string, MunicipalityFacts, number?, number?][]) {
	return real({
		municipalities: rows.map(([name, , longitude = -80, latitude = 46]) => ({
			name,
			longitude,
			latitude
		})),
		facts: Object.fromEntries(rows.map(([name, facts]) => [name, facts]))
	});
}

describe('population lines', () => {
	it('gives the median population, for an odd or even number of municipalities', () => {
		const odd = places([
			['A', info({ population: 100 })],
			['B', info({ population: 300 })],
			['C', info({ population: 200 })]
		]);
		expect(medianPopulationFact(odd)!.text).toBe(
			'The median municipality we serve has 200 people.'
		);
		const even = places([
			['A', info({ population: 100 })],
			['B', info({ population: 200 })]
		]);
		expect(medianPopulationFact(even)!.text).toContain('has 150 people');
	});

	it('counts how many of the smallest municipalities together have fewer people than the largest', () => {
		const rows: [string, MunicipalityFacts][] = [
			['A', info({ population: 10 })],
			['B', info({ population: 20 })],
			['C', info({ population: 30 })],
			['D', info({ population: 1000 })]
		];
		expect(smallestTogetherFact(places(rows))!.text).toBe(
			'Our 3 smallest municipalities together have fewer people than D.'
		);
		expect(smallestTogetherFact(places([rows[0], rows[3]]))).toBeNull();
	});

	it('counts the municipalities bigger than Toronto', () => {
		const rows = (areas: number[]) =>
			places(
				areas.map((km, i) => [`T${i}`, info({ landAreaKm2: km })] as [string, MunicipalityFacts])
			);
		expect(biggerThanTorontoFact(rows([700, 800, 100]))!.text).toBe(
			'2 of our municipalities each cover more land than the City of Toronto.'
		);
		expect(biggerThanTorontoFact(rows([700, 100]))!.text).toBe(
			'1 of our municipalities covers more land than the City of Toronto.'
		);
		expect(biggerThanTorontoFact(rows([100, 200]))).toBeNull();
	});
});

describe('growth and decline lines', () => {
	// A grew from 1000 to 1100; B shrank from 1000 to 950.
	const grown = places([
		['A', info({ population: 1100, populationChangePercent: 10 })],
		['B', info({ population: 950, populationChangePercent: -5 })]
	]);

	it('names the biggest gain in people', () => {
		expect(biggestGainFact(grown)!.text).toBe(
			'A added about 100 people between the 2016 and 2021 censuses.'
		);
		const shrinking = places([['A', info({ population: 90, populationChangePercent: -10 })]]);
		expect(biggestGainFact(shrinking)).toBeNull();
	});

	it('counts the municipalities that shrank, and skips the line when none did', () => {
		expect(shrankCountFact(grown)!.text).toBe(
			'1 of our 2 municipalities shrank between the 2016 and 2021 censuses.'
		);
		expect(shrankCountFact(places([['A', info({ populationChangePercent: 4 })]]))).toBeNull();
	});

	it('gives the net change in people, gained or lost', () => {
		expect(totalChangeFact(grown)!.text).toBe(
			'Together our municipalities gained about 50 people between the 2016 and 2021 censuses.'
		);
		const lost = places([['A', info({ population: 900, populationChangePercent: -10 })]]);
		expect(totalChangeFact(lost)!.text).toContain('lost about 100 people');
	});
});

describe('daylight, drive and distance lines', () => {
	it('compares daylight in the northernmost and southernmost municipality', () => {
		expect(northSouthDaylightFact(real())!.text).toMatch(
			/^Today Opasatika in the north gets \d+ hours \d+ minutes of daylight and Ingersoll in the south gets \d+ hours \d+ minutes\.$/
		);
	});

	it('counts the municipalities within a two hour drive', () => {
		const trips = Object.fromEntries(
			[100, 150, 200, 500].map((km, i) => [`T${i}`, { driveKm: km }])
		);
		const inputs = real({
			municipalities: [0, 1, 2, 3].map((i) => ({ name: `T${i}`, longitude: -80, latitude: 46 })),
			trips
		});
		expect(driveBandFact(inputs)!.text).toBe(
			'2 of our 4 municipalities are within a 2 hour drive of Sudbury.'
		);
	});

	const spread = places([
		['A', baseFacts, -80, 46],
		['B', baseFacts, -80, 46.1],
		['C', baseFacts, -90, 49]
	]);

	it('names the closest and the farthest pair of municipalities', () => {
		expect(closestPairFact(spread)!.text).toBe(
			'The two closest of our municipalities are A and B, just 11.1 km apart.'
		);
		expect(farthestPairFact(spread)!.text).toMatch(
			/^The two farthest apart are A and C, \d{3} km in a straight line\.$/
		);
	});

	it('finds the municipality nearest the middle of them all', () => {
		const line = places([
			['West', baseFacts, -82, 46],
			['Middle', baseFacts, -81, 46],
			['East', baseFacts, -80, 46]
		]);
		expect(centreFact(line)!.text).toContain('closest to Middle');
	});

	it('names the weather station that serves the most municipalities', () => {
		const inputs = places([
			['A', info({ siteId: 's1', siteName: 'Big Station' })],
			['B', info({ siteId: 's1', siteName: 'Big Station' })],
			['C', info({ siteId: 's2', siteName: 'Small Station' })]
		]);
		expect(busiestStationFact(inputs)!.text).toBe(
			"Big Station's weather station serves the most of our municipalities: 2."
		);
	});
});

describe('forecast, district and office weather lines', () => {
	/** Ten sites, one municipality each. */
	function sites(
		weatherFor: (index: number) => Partial<SiteWeather> & { current?: SiteWeather['current'] },
		district: (index: number) => string = () => 'Algoma District'
	) {
		const names = Array.from({ length: 10 }, (_, i) => `Town ${i}`);
		const weather = (index: number): SiteWeather => ({
			current: { observedAt: '2026-11-03T19:50:00Z', temperatureC: 5 },
			forecast: [],
			warnings: [],
			fetchedAt: NOW - 3 * 60_000,
			...weatherFor(index)
		});
		return real({
			municipalities: names.map((name) => ({ name, longitude: -80, latitude: 46 })),
			facts: Object.fromEntries(
				names.map((name, i) => [
					name,
					info({ siteId: `s${i}`, siteName: `Site ${i}`, district: district(i) })
				])
			),
			peekWeather: (siteId) => weather(Number(siteId.slice(1)))
		});
	}

	it('counts the stations with rain or snow in the first forecast period', () => {
		const forecast =
			(summary: (i: number) => string, name = 'Tonight') =>
			(i: number) => ({
				forecast: [{ name, summary: summary(i) }]
			});
		const inputs = sites(forecast((i) => (i < 6 ? 'Periods of rain' : 'Cloudy')));
		expect(forecastPrecipFact(inputs, 'rain')!.text).toBe(
			'Rain is in the forecast (Tonight) for 6 of 10 weather stations.'
		);
		expect(forecastPrecipFact(inputs, 'snow')).toBeNull();
		const snowy = sites(forecast((i) => (i < 3 ? 'Flurries' : 'Cloudy')));
		expect(forecastPrecipFact(snowy, 'snow')!.text).toContain(
			'Snow is in the forecast (Tonight) for 3 of 10'
		);
	});

	it('is skipped when too few stations share a forecast period', () => {
		const mixed = sites((i) => ({
			forecast: [{ name: i < 5 ? 'Tonight' : 'Today', summary: 'Rain' }]
		}));
		expect(forecastPrecipFact(mixed, 'rain')).toBeNull();
	});

	it('names the warmest and the coldest district by average temperature', () => {
		const inputs = sites(
			(i) => ({ current: { observedAt: '2026-11-03T19:50:00Z', temperatureC: i < 5 ? 10 : 2 } }),
			(i) => (i < 5 ? 'Alpha District' : 'Beta County')
		);
		expect(districtTemperatureFact(inputs)!.text).toBe(
			'Warmest district right now: Alpha District, averaging 10°. Coldest: Beta County, averaging 2°.'
		);
		const same = sites(
			() => ({}),
			(i) => (i < 5 ? 'Alpha District' : 'Beta County')
		);
		expect(districtTemperatureFact(same)).toBeNull();
	});

	const officeWith = (weather: Partial<SiteWeather> | null) =>
		real({
			peekWeather: (id) =>
				id === 'on-40' && weather
					? { current: null, forecast: [], warnings: [], fetchedAt: NOW - 60_000, ...weather }
					: null
		});

	it('gives the weather at the office right now', () => {
		const now = officeWith({
			current: { observedAt: '2026-11-03T19:50:00Z', temperatureC: 13, condition: 'Mist' }
		});
		expect(officeWeatherFact(now)!.text).toBe('Right now at our Sudbury office: 13°, mist.');
		const bare = officeWith({ current: { observedAt: '2026-11-03T19:50:00Z', temperatureC: -3 } });
		expect(officeWeatherFact(bare)!.text).toBe('Right now at our Sudbury office: −3°.');
		expect(officeWeatherFact(officeWith(null))).toBeNull();
		expect(
			officeWeatherFact(
				officeWith({
					fetchedAt: NOW - 2 * 3_600_000,
					current: { observedAt: '2026-11-03T19:50:00Z', temperatureC: 5 }
				})
			)
		).toBeNull();
	});

	it('gives the office forecast for the next period', () => {
		const inputs = officeWith({
			forecast: [
				{ name: 'Tonight', summary: 'Periods of rain', temperatureC: 6, temperatureKind: 'low' }
			]
		});
		expect(officeForecastFact(inputs)!.text).toBe('Tonight in Sudbury: periods of rain, low 6°.');
		expect(officeForecastFact(officeWith({ forecast: [] }))).toBeNull();
	});
});

describe('road lines', () => {
	const event = (id: number, kind: RoadEvent['kind']): RoadEvent => ({
		id,
		kind,
		roadway: 'HWY 17',
		description: '',
		direction: null,
		lanesAffected: null,
		updatedAt: null,
		plannedEndAt: null,
		longitude: -80,
		latitude: 46
	});
	const withEvents = (kinds: RoadEvent['kind'][], loadedAt = NOW - 60_000) =>
		real({ roadEvents: { events: kinds.map((k, i) => event(i, k)), loadedAt } });

	it('counts collisions, apart from the ones that shut the road', () => {
		expect(collisionsFact(withEvents(['collision', 'collision', 'closure']))!.text).toBe(
			'Ontario 511 lists 2 collisions right now, apart from any that shut the road.'
		);
		expect(collisionsFact(withEvents(['collision']))!.text).toContain(
			'lists 1 collision right now'
		);
		expect(collisionsFact(withEvents(['closure']))!.text).toContain('lists no collisions');
		expect(collisionsFact(withEvents(['collision'], NOW - 31 * 60_000))).toBeNull();
	});

	const segment = (roadway: string, status: RoadStatus): RoadSegment => ({
		roadway,
		location: '',
		status,
		coordinates: []
	});
	const withSections = (segments: RoadSegment[]) =>
		real({ roadSections: { segments, loadedAt: NOW - 60_000 } });

	it('names the highways with snow covered or icy sections, worst first', () => {
		const inputs = withSections([
			segment('17', 'snow'),
			segment('17', 'snow'),
			segment('QEW', 'ice'),
			segment('11', 'wet')
		]);
		expect(hazardHighwaysFact(inputs)!.text).toBe(
			'Snow covered or icy road sections are on Highway 17 and QEW.'
		);
	});

	it('is skipped when no section has snow or ice', () => {
		expect(hazardHighwaysFact(withSections([segment('17', 'wet')]))).toBeNull();
		expect(hazardHighwaysFact(real())).toBeNull();
	});
});

describe('time lines and Ontario facts', () => {
	it('says when the moon rises, or sets if it is already up', () => {
		const evening = real({}, Date.parse('2026-11-04T01:00:00Z'));
		expect(moonriseFact(evening)!.text).toMatch(
			/^The moon rises in Sudbury tomorrow at \d{1,2}:\d{2} [ap]/
		);
		const smallHours = real({}, Date.parse('2026-11-04T09:00:00Z'));
		expect(moonriseFact(smallHours)!.text).toMatch(
			/^The moon is up over Sudbury now and sets (tomorrow )?at \d{1,2}:\d{2} [ap]/
		);
	});

	it('counts down to sunrise or sunset, or says how long ago the sun set', () => {
		const duration = '(\\d+ hours?( \\d+ minutes?)?|\\d+ minutes?)';
		expect(sunCountdownFact(real())!.text).toMatch(
			new RegExp(`^Sunset in Sudbury is in ${duration}\\.$`)
		);
		expect(sunCountdownFact(real({}, Date.parse('2026-11-03T10:00:00Z')))!.text).toMatch(
			new RegExp(`^Sunrise in Sudbury is in ${duration}\\.$`)
		);
		expect(sunCountdownFact(real({}, Date.parse('2026-11-04T03:00:00Z')))!.text).toMatch(
			new RegExp(`^The sun set in Sudbury ${duration} ago\\.$`)
		);
	});

	it('picks an Ontario fact at random, and is skipped when there are none', () => {
		expect(triviaFact(real())!.text).toBe(ontarioFacts[0].text);
		expect(triviaFact(real({ random: () => 0.99 }))!.id).toBe(`trivia-${ontarioFacts.length - 1}`);
		expect(triviaFact(real({ trivia: [] }))).toBeNull();
	});

	it('keeps every Ontario fact short enough for the status bar', () => {
		for (const { text } of ontarioFacts) {
			expect(text.length).toBeGreaterThan(20);
			expect(text.length).toBeLessThan(120);
		}
	});
});
