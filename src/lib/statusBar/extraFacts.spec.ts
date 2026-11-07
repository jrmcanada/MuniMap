import { describe, it, expect } from 'vitest';
import type { MunicipalityFacts } from '#lib/data/facts.js';
import { municipalityFacts } from '#lib/data/facts.js';
import { municipalities } from '#lib/data/municipalities.js';
import { office } from '#lib/data/office.js';
import officeTrips from '#lib/data/office-trips.json';
import type { RoadEvent } from '#lib/roads/events.js';
import type { CurrentConditions, SiteWeather } from '#lib/weather/types.js';
import { clockChangeFact, greetingFact, holidayFact } from './calendarFacts.js';
import type { FactInputs } from './facts.js';
import {
	belowFreezingFact,
	busiestRoadFact,
	calmestFact,
	feelsLikeFact,
	freshnessFact,
	mostHumidFact,
	radarDryDistrictFact,
	radarOfficeFact,
	windDirectionFact
} from './liveFacts.js';
import {
	andNamesFact,
	commonLetterFact,
	districtAreaFact,
	districtGrowthFact,
	districtPopulationFact,
	largestVsTorontoFact,
	peiFact,
	shortestNameFact,
	sunsetGapFact,
	timeZoneFact,
	windingFact
} from './placeFacts.js';

const NOW = Date.parse('2026-11-03T20:00:00Z');

/** The real municipalities and office, with nothing live, at a chosen moment. */
const real = (extra: Partial<FactInputs> = {}, now = NOW): FactInputs => ({
	municipalities,
	office,
	landmarks: [],
	trips: officeTrips,
	random: () => 0,
	facts: municipalityFacts,
	peekWeather: () => null,
	roadEvents: null,
	roadSections: null,
	weatherMix: null,
	radar: null,
	trivia: [],
	officeSiteId: 'on-40',
	customMessages: [],
	now,
	...extra
});

/** Ten sites, one municipality each, with the readings given for each site. */
function readings(
	make: (index: number) => Partial<CurrentConditions>,
	extra: Partial<FactInputs> = {}
) {
	const names = Array.from({ length: 10 }, (_, index) => `Town ${index}`);
	const weather = (index: number): SiteWeather => ({
		current: {
			observedAt: '2026-11-03T19:50:00Z',
			temperatureC: 5,
			...make(index)
		},
		forecast: [],
		warnings: [],
		fetchedAt: NOW - 4 * 60_000
	});
	return real({
		municipalities: names.map((name) => ({ name, longitude: -80, latitude: 46 })),
		facts: Object.fromEntries(
			names.map((name, index) => [
				name,
				{ ...municipalityFacts.Baldwin, siteId: `s${index}`, siteName: `Site ${index}` }
			])
		),
		peekWeather: (siteId) => weather(Number(siteId.slice(1))),
		...extra
	});
}

describe('temperature, wind and humidity lines', () => {
	it('counts the stations below freezing, and says when none are', () => {
		expect(belowFreezingFact(readings((i) => ({ temperatureC: i < 3 ? -2 : 4 })))!.text).toBe(
			'3 of our 10 weather stations are below freezing right now.'
		);
		expect(
			belowFreezingFact(readings((i) => ({ temperatureC: i === 0 ? -1 : 4 })))!.text
		).toContain('1 of our 10 weather stations is below freezing');
		expect(belowFreezingFact(readings(() => ({ temperatureC: 0 })))!.text).toBe(
			'None of our weather stations is below freezing right now.'
		);
	});

	it('is skipped with too few readings, and ignores readings over two hours old', () => {
		expect(belowFreezingFact(real())).toBeNull();
		const old = readings(() => ({ observedAt: '2026-11-03T17:00:00Z' }));
		expect(belowFreezingFact(old)).toBeNull();
	});

	it('names the calmest spot, counting "calm" as no wind', () => {
		expect(calmestFact(readings((i) => ({ windSpeedKmh: i + 3 })))!.text).toBe(
			'Calmest spot right now: Site 0, with winds at 3 km/h.'
		);
		expect(calmestFact(readings((i) => ({ windSpeedKmh: i === 4 ? 'calm' : i + 3 })))!.text).toBe(
			'Calmest spot right now: Site 4, with no wind.'
		);
	});

	it('names the most humid spot', () => {
		expect(mostHumidFact(readings((i) => ({ humidityPercent: 50 + i })))!.text).toBe(
			'Most humid spot right now: Site 9, at 59% humidity.'
		);
		expect(mostHumidFact(readings(() => ({})))).toBeNull();
	});

	it('names the direction most stations report the wind from, leaving out calm stations', () => {
		const direction = (i: number): Partial<CurrentConditions> =>
			i < 6
				? { windDirection: 'W', windSpeedKmh: 10 }
				: i < 8
					? { windDirection: 'WSW', windSpeedKmh: 10 }
					: i === 8
						? { windDirection: 'N', windSpeedKmh: 10 }
						: { windDirection: 'W', windSpeedKmh: 'calm' };
		expect(windDirectionFact(readings(direction))!.text).toBe(
			'Winds are mostly from the west at 8 of 9 weather stations.'
		);
	});

	it('says how much colder it feels than it reads, only when the gap is worth saying', () => {
		const text = feelsLikeFact(
			readings((i) => ({ temperatureC: i === 3 ? 0 : 5, feelsLikeC: i === 3 ? -9 : 4 }))
		)!.text;
		expect(text).toBe('It feels 9° colder than it reads in Site 3: 0°, feels like −9°.');
		expect(feelsLikeFact(readings(() => ({ temperatureC: 5, feelsLikeC: 4 })))).toBeNull();
	});
});

describe('data freshness line', () => {
	it('says when the weather, radar and roads last updated', () => {
		const inputs = readings(() => ({}), {
			radar: { wet: [], officeWet: false, observedAt: '2026-11-03T19:54:00Z' },
			roadSections: { segments: [], loadedAt: NOW - 2 * 60_000 }
		});
		expect(freshnessFact(inputs)!.text).toMatch(
			/^Weather updated 4 minutes ago; radar frame from \d{1,2}:\d{2} [ap]\S*; road conditions updated 2 minutes ago\.$/
		);
	});

	it('leaves out the sources it has nothing for, and is skipped when it has none', () => {
		expect(freshnessFact(readings(() => ({})))!.text).toBe('Weather updated 4 minutes ago.');
		expect(freshnessFact(real())).toBeNull();
	});
});

describe('busiest road line', () => {
	const event = (id: number, roadway: string): RoadEvent => ({
		id,
		kind: 'closure',
		roadway,
		description: '',
		direction: null,
		lanesAffected: null,
		updatedAt: null,
		plannedEndAt: null,
		longitude: -80,
		latitude: 46
	});
	const events = (roads: string[], loadedAt = NOW - 60_000) =>
		real({ roadEvents: { events: roads.map((road, index) => event(index, road)), loadedAt } });

	it('names the road with the most events, when it has at least two', () => {
		expect(busiestRoadFact(events(['HWY 11', 'HWY 17', 'HWY 11']))!.text).toBe(
			'HWY 11 has the most closures, collisions, and road-shutting roadwork reported right now: 2.'
		);
	});

	it('is skipped when no road has two, before the first load, and when the data is old', () => {
		expect(busiestRoadFact(events(['HWY 11', 'HWY 17']))).toBeNull();
		expect(busiestRoadFact(real())).toBeNull();
		expect(busiestRoadFact(events(['HWY 11', 'HWY 11'], NOW - 31 * 60_000))).toBeNull();
	});
});

describe('radar lines for the office and the driest district', () => {
	const radar = (wet: string[], officeWet = false, observedAt = '2026-11-03T19:54:00Z') =>
		real({ radar: { wet, officeWet, observedAt } });

	it('says whether precipitation is over the office', () => {
		expect(radarOfficeFact(radar([], true))!.text).toBe(
			'Radar shows precipitation over our Sudbury office right now.'
		);
		expect(radarOfficeFact(radar([]))!.text).toBe('Radar shows our Sudbury office dry right now.');
		expect(radarOfficeFact(real())).toBeNull();
		expect(radarOfficeFact(radar([], false, '2026-11-03T19:00:00Z'))).toBeNull();
	});

	it('names the biggest district that is dry, and moves on when it is not', () => {
		const algoma = municipalities
			.filter(({ name }) => municipalityFacts[name].district === 'Algoma District')
			.map(({ name }) => name);
		expect(radarDryDistrictFact(radar([]))!.text).toBe(
			'Algoma District is dry on radar right now, with none of its 15 municipalities under precipitation.'
		);
		expect(radarDryDistrictFact(radar(algoma))!.text).toMatch(
			/^(?!Algoma)\w+ District is dry on radar right now, with none of its \d+ municipalities/
		);
	});
});

describe('road, time zone and sun lines', () => {
	it('finds the most winding trip, never one to a place with no road', () => {
		const { text } = windingFact(real())!;
		expect(text).toMatch(
			/^[\w ,.-]+ is the most winding trip from Sudbury: \d+ km by road, [\d.]+ times the \d+ km straight line\.$/
		);
		expect(text).not.toContain('Cockburn');
	});

	it('names the municipalities on Central time', () => {
		expect(timeZoneFact(real())!.text).toBe(
			'Dawson, Ignace, and Lake of the Woods keep Central time, an hour behind Sudbury.'
		);
		const one = real({ municipalities: [{ name: 'Dawson', longitude: -94.5, latitude: 48.7 }] });
		expect(timeZoneFact(one)!.text).toContain('Dawson keeps Central time');
		expect(
			timeZoneFact(
				real({ municipalities: [{ name: 'Baldwin', longitude: -81.7, latitude: 46.3 }] })
			)
		).toBeNull();
	});

	it('says how much earlier the sun sets in the east than in the west', () => {
		expect(sunsetGapFact(real())!.text).toMatch(
			/^The sun sets \d+ (hours?|minutes?)( \d+ minutes?)? earlier in Prescott than in Dawson today\.$/
		);
	});
});

describe('district lines', () => {
	const facts = (
		district: string,
		population: number,
		landAreaKm2: number,
		populationChangePercent: number
	): MunicipalityFacts => ({
		...municipalityFacts.Baldwin,
		district,
		population,
		landAreaKm2,
		populationChangePercent,
		densityPerKm2: population / landAreaKm2
	});
	const districts = (rows: [string, MunicipalityFacts][]) =>
		real({
			municipalities: rows.map(([name]) => ({ name, longitude: -80, latitude: 46 })),
			facts: Object.fromEntries(rows)
		});
	const inputs = districts([
		['A1', facts('Alpha District', 100, 10, 10)],
		['A2', facts('Alpha District', 50, 10, -10)],
		['B1', facts('Beta County', 120, 100, 10)]
	]);

	it('names the district with the most people, the most land and the fastest growth', () => {
		expect(districtPopulationFact(inputs)!.text).toBe(
			'Alpha District has the most people of any district or county we serve: 150.'
		);
		expect(districtAreaFact(inputs)!.text).toBe(
			'Beta County covers the most land of any district or county we serve: 100 km².'
		);
		expect(districtGrowthFact(inputs)!.text).toContain('Beta County grew fastest');
	});

	it('skips the growth line when no district grew', () => {
		const shrinking = districts([['A1', facts('Alpha District', 100, 10, -5)]]);
		expect(districtGrowthFact(shrinking)).toBeNull();
	});
});

describe('name and size lines', () => {
	it('counts the names with "and" and names the first', () => {
		const names = municipalities.filter(({ name }) => / and /.test(name)).map(({ name }) => name);
		const { text } = andNamesFact(real())!;
		expect(text).toContain(`${names.length} of our 60 municipalities have "and" in their name`);
		expect(text).toContain('such as Burpee and Mills.');
	});

	it('names the shortest name and the most common first letter', () => {
		expect(shortestNameFact(real())!.text).toBe(
			'Joly has the shortest name of our municipalities, at 4 letters.'
		);
		expect(commonLetterFact(real())!.text).toMatch(
			/^\d+ of our 60 municipalities start with the letter [A-Z], more than any other\.$/
		);
	});

	it('compares our total area with Prince Edward Island, and the largest municipality with Toronto', () => {
		expect(peiFact(real())!.text).toBe(
			'Together our municipalities are about 2.3 times the size of Prince Edward Island.'
		);
		expect(largestVsTorontoFact(real())!.text).toBe(
			'Fauquier-Strickland alone is about 1.6 times the size of the City of Toronto.'
		);
	});
});

describe('calendar lines', () => {
	it('counts the days to the next clock change', () => {
		expect(clockChangeFact(real())!.text).toBe(
			'Clocks go forward in 131 days, on Sunday, March 14, at 2 am.'
		);
		expect(clockChangeFact(real({}, Date.parse('2026-10-20T16:00:00Z')))!.text).toBe(
			'Clocks go back in 12 days, on Sunday, November 1, at 2 am.'
		);
		expect(clockChangeFact(real({}, Date.parse('2026-10-31T20:00:00Z')))!.text).toBe(
			'Clocks go back tonight, at 2 am.'
		);
	});

	it('counts the days to the next holiday and the one after', () => {
		expect(holidayFact(real(), 0)!.text).toBe(
			'8 days until Remembrance Day, Wednesday, November 11.'
		);
		expect(holidayFact(real(), 1)!.text).toBe('52 days until Christmas Day, Friday, December 25.');
	});

	it('says so on the day itself, and looks ahead into the next year', () => {
		expect(holidayFact(real({}, Date.parse('2026-11-11T20:00:00Z')), 0)!.text).toBe(
			'Today is Remembrance Day.'
		);
		const lateDecember = real({}, Date.parse('2026-12-30T20:00:00Z'));
		expect(holidayFact(lateDecember, 0)!.text).toBe(
			"2 days until New Year's Day, Friday, January 1."
		);
		expect(holidayFact(lateDecember, 1)!.text).toContain("Valentine's Day");
	});

	it('greets by the time of day in the office clock, and names the weekday', () => {
		expect(greetingFact(real({}, Date.parse('2026-11-03T15:00:00Z'))).text).toBe(
			'Good morning from Sudbury. Today is Tuesday.'
		);
		expect(greetingFact(real()).text).toBe('Good afternoon from Sudbury. Today is Tuesday.');
		expect(greetingFact(real({}, Date.parse('2026-11-04T01:00:00Z'))).text).toBe(
			'Good evening from Sudbury. Today is Tuesday.'
		);
	});
});
