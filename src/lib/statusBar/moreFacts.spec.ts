import { describe, it, expect } from 'vitest';
import { municipalityFacts } from '#lib/data/facts.js';
import { municipalities } from '#lib/data/municipalities.js';
import { office } from '#lib/data/office.js';
import officeTrips from '#lib/data/office-trips.json';
import type { RoadSegment } from '#lib/roads/roadConditions.js';
import type { RoadStatus } from '#lib/roads/status.js';
import type { SiteWeather } from '#lib/weather/types.js';
import type { FactInputs } from './facts.js';
import {
	allTripsFact,
	forecastFact,
	mixFact,
	moonPhaseFact,
	nextMoonFact,
	radarDistrictFact,
	radarMunicipalitiesFact,
	roadHazardFact,
	roadWetFact,
	solsticeFact,
	spanFact,
	sunTimesFact
} from './moreFacts.js';

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
	radar: null,
	weatherMix: null,
	customMessages: [],
	now,
	...extra
});

describe('the sun at the office', () => {
	it('gives sunrise and sunset in the office clock', () => {
		expect(sunTimesFact(real())!.text).toMatch(
			/^The sun rises in Sudbury at \d{1,2}:\d{2} [ap]\.?m\.? and sets at \d{1,2}:\d{2} [ap]\.?m\.? today\.$/
		);
	});

	it('counts the days to the shortest day of the year in autumn', () => {
		const { text } = solsticeFact(real())!;
		expect(text).toMatch(
			/^4[89] days until the shortest day of the year in Sudbury, December 21, with 8 hours \d+ minutes of daylight\.$/
		);
	});

	it('counts the days to the longest day of the year in spring', () => {
		const { text } = solsticeFact(real({}, Date.parse('2026-06-01T16:00:00Z')))!;
		expect(text).toMatch(
			/until the longest day of the year in Sudbury, June 21, with 15 hours \d+ minutes of daylight\.$/
		);
	});
});

describe('the moon', () => {
	it('is full at the full moon and new at the new moon, with how much is lit', () => {
		expect(moonPhaseFact(real({}, Date.parse('2026-10-26T04:12:00Z'))).text).toBe(
			'The moon is full tonight, 100% lit.'
		);
		expect(moonPhaseFact(real({}, Date.parse('2026-10-10T15:50:00Z'))).text).toBe(
			'The moon is new tonight, 0% lit.'
		);
	});

	it('names the stretch of the cycle in between', () => {
		expect(moonPhaseFact(real({}, Date.parse('2026-10-22T00:00:00Z'))).text).toMatch(
			/^The moon is a waxing gibbous tonight, \d+% lit\.$/
		);
	});

	it('finds the next full moon within a day of the real one', () => {
		const { text } = nextMoonFact(real({}, Date.parse('2026-10-20T16:00:00Z')), 'full')!;
		expect(text).toMatch(/^The next full moon is \w+, October 2[56], in [56] days\.$/);
	});

	it('finds the next new moon', () => {
		const { text } = nextMoonFact(real(), 'new')!;
		expect(text).toMatch(/^The next new moon is \w+, November \d+, in \d+ days\.$/);
	});
});

describe('how far it stretches', () => {
	const small = (driveKm: number[]) =>
		real({
			municipalities: driveKm.map((_, index) => ({
				name: `T${index}`,
				longitude: -80,
				latitude: 46
			})),
			trips: Object.fromEntries(driveKm.map((km, index) => [`T${index}`, { driveKm: km }]))
		});

	it('lays every round trip end to end, as part of the way round the Earth', () => {
		expect(allTripsFact(small([1000, 1000]))!.text).toBe(
			'Driving from Sudbury to each of our 2 municipalities and back every time would be 4,000 km, 10% of the way around the Earth.'
		);
	});

	it('says how many times round the Earth once it is more than one', () => {
		expect(allTripsFact(small([20_000, 20_000, 20_000]))!.text).toContain(
			'120,000 km, 3 times around the Earth.'
		);
	});

	it('is skipped when a trip is unknown', () => {
		expect(allTripsFact(real({ trips: {} }))).toBeNull();
	});

	it('measures east to west and north to south between the extreme municipalities', () => {
		const eastWest = spanFact(real(), 'east-west').text;
		expect(eastWest).toMatch(
			/^From Head, Clara, Maria in the east to Dawson in the west, our municipalities stretch about 1,\d{3} km in a straight line\.$/
		);
		const northSouth = spanFact(real(), 'north-south').text;
		expect(northSouth).toMatch(
			/^From Clearview in the south to Opasatika in the north, our municipalities stretch about \d{3} km in a straight line\.$/
		);
	});
});

describe('road sections', () => {
	const segment = (status: RoadStatus): RoadSegment => ({
		roadway: 'HWY 17',
		location: '',
		status,
		coordinates: []
	});
	const sections = (statuses: RoadStatus[], loadedAt = NOW - 60_000) =>
		real({ roadSections: { segments: statuses.map(segment), loadedAt } });

	it('says how many road sections are wet', () => {
		expect(roadWetFact(sections(['wet', 'wet', 'wet', 'clear', 'snow', 'ice']))!.text).toBe(
			'50% of the road sections Ontario 511 reports on are wet right now, 3 of 6.'
		);
		expect(roadWetFact(sections(['clear', 'clear']))!.text).toBe(
			'Ontario 511 shows no wet road sections right now.'
		);
	});

	it('counts snow covered and icy sections, or says there are none', () => {
		expect(roadHazardFact(sections(['wet', 'snow', 'ice']))!.text).toBe(
			'Ontario 511 reports 1 snow covered road section and 1 icy road section right now.'
		);
		expect(roadHazardFact(sections(['wet', 'clear']))!.text).toBe(
			'Ontario 511 reports no snow covered or icy road sections right now.'
		);
	});

	it('is skipped before the first load, with no sections, or when the data is over half an hour old', () => {
		expect(roadWetFact(real())).toBeNull();
		expect(roadHazardFact(sections([]))).toBeNull();
		expect(roadWetFact(sections(['wet'], NOW - 31 * 60_000))).toBeNull();
	});
});

describe('the weather across the municipalities', () => {
	const mix = (counts: { rain: number; snow: number; clear: number; other: number }) =>
		real({
			weatherMix: {
				counts,
				reporting: counts.rain + counts.snow + counts.clear + counts.other
			}
		});

	it('says how many have rain, snow or clear skies', () => {
		const inputs = mix({ rain: 29, snow: 2, clear: 1, other: 7 });
		expect(mixFact(inputs, 'rain')!.text).toBe(
			'29 of the 39 municipalities with a current reading have rain right now.'
		);
		expect(mixFact(inputs, 'snow')!.text).toContain(
			'2 of the 39 municipalities with a current reading have snow'
		);
		// One municipality takes "has", not "have".
		expect(mixFact(inputs, 'clear')!.text).toContain(
			'1 of the 39 municipalities with a current reading has clear skies right now.'
		);
	});

	it('is skipped at zero and before the first load', () => {
		expect(mixFact(mix({ rain: 5, snow: 0, clear: 0, other: 0 }), 'snow')).toBeNull();
		expect(mixFact(real(), 'rain')).toBeNull();
	});
});

describe('forecast extremes', () => {
	/** Ten sites, one municipality each, each forecasting a low tonight and a high tomorrow. */
	function forecastInputs(
		periodNames: (siteIndex: number) => [string, string] = () => ['Tonight', 'Wednesday']
	) {
		const names = Array.from({ length: 10 }, (_, index) => `Town ${index}`);
		const weather = (index: number): SiteWeather => ({
			current: null,
			warnings: [],
			fetchedAt: NOW - 60_000,
			forecast: [
				{ name: periodNames(index)[0], temperatureC: -index, temperatureKind: 'low' },
				{ name: periodNames(index)[1], temperatureC: 10 + index, temperatureKind: 'high' }
			]
		});
		return real({
			municipalities: names.map((name) => ({ name, longitude: -80, latitude: 46 })),
			facts: Object.fromEntries(
				names.map((name, index) => [
					name,
					{ ...municipalityFacts.Baldwin, siteId: `s${index}`, siteName: `Site ${index}` }
				])
			),
			peekWeather: (siteId) => weather(Number(siteId.slice(1)))
		});
	}

	it('names the coldest forecast low and the warmest forecast high, with their periods', () => {
		const inputs = forecastInputs();
		expect(forecastFact(inputs, 'low')!.text).toBe('Coldest forecast low (Tonight): Site 9, −9°.');
		expect(forecastFact(inputs, 'high')!.text).toBe(
			'Warmest forecast high (Wednesday): Site 9, 19°.'
		);
	});

	it('compares only sites forecasting the same period, and needs enough of them', () => {
		const mixed = forecastInputs((index) =>
			index < 5 ? ['Tonight', 'Wednesday'] : ['Today', 'Thursday']
		);
		// Five sites on each period is below the minimum of eight.
		expect(forecastFact(mixed, 'low')).toBeNull();
	});
});

describe('radar coverage', () => {
	const radar = (wet: string[], observedAt = '2026-11-03T19:54:00Z') =>
		real({ radar: { wet, officeWet: false, observedAt } });

	it('says how many municipalities have precipitation over them', () => {
		expect(radarMunicipalitiesFact(radar(['Baldwin', 'Espanola', 'Nairn']))!.text).toBe(
			'Radar shows precipitation over 3 of our 55 municipalities right now.'
		);
		expect(radarMunicipalitiesFact(radar([]))!.text).toBe(
			'Radar shows no precipitation over any of our municipalities right now.'
		);
	});

	it('names the district with the most municipalities under precipitation', () => {
		// Baldwin and Espanola are in Sudbury District; Nairn too. Chapleau is the only one named from elsewhere.
		const { text } = radarDistrictFact(radar(['Baldwin', 'Espanola', 'Nairn', 'Dawson']))!;
		expect(text).toMatch(
			/^The wettest district on radar right now is \w+ District, with \d+ of its \d+ municipalities under precipitation\.$/
		);
		expect(text).toContain('Sudbury District, with 3 of its');
	});

	it('is skipped before the first frame, when the frame is over half an hour old, or when it is dry', () => {
		expect(radarMunicipalitiesFact(real())).toBeNull();
		expect(radarMunicipalitiesFact(radar(['Baldwin'], '2026-11-03T19:00:00Z'))).toBeNull();
		expect(radarDistrictFact(radar([]))).toBeNull();
	});
});
