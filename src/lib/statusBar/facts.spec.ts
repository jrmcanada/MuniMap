import { describe, it, expect } from 'vitest';
import { municipalityFacts, type MunicipalityFacts } from '#lib/data/facts.js';
import { landmarks } from '#lib/data/landmarks.js';
import { municipalities } from '#lib/data/municipalities.js';
import { office } from '#lib/data/office.js';
import officeTrips from '#lib/data/office-trips.json';
import type { SiteWeather } from '#lib/weather/types.js';
import { factSlots, nextSlot, startSlot, type FactInputs } from './facts.js';

const NOW = Date.parse('2026-10-23T03:00:00Z');

const place = (name: string): { name: string; longitude: number; latitude: number } => ({
	name,
	longitude: -80,
	latitude: 46
});
const facts = (
	overrides: Partial<MunicipalityFacts> & Pick<MunicipalityFacts, 'siteId' | 'siteName'>
): MunicipalityFacts => ({
	district: 'Algoma District',
	population: 1000,
	populationChangePercent: 1,
	landAreaKm2: 100,
	densityPerKm2: 10,
	...overrides
});

const weather = (celsius: number, extra: Partial<SiteWeather> = {}): SiteWeather => ({
	current: { observedAt: '2026-10-23T02:50:00Z', temperatureC: celsius },
	forecast: [],
	warnings: [],
	fetchedAt: NOW - 5 * 60_000,
	...extra
});

/** Ten sites, one municipality each, so the temperature fact has enough readings. */
function inputs(readings: (number | null)[], extra: Partial<FactInputs> = {}): FactInputs {
	const names = readings.map((_, i) => `Town ${i}`);
	return {
		municipalities: names.map(place),
		office: { city: 'Sudbury', longitude: -80.99, latitude: 46.49 },
		// Town 0 is 90 km away, Town 1 is 180 km, and so on; driving is worked out at 90 km/h.
		trips: Object.fromEntries(names.map((name, i) => [name, { driveKm: 90 * (i + 1) }])),
		landmarks: [
			{ municipality: 'Town 1', text: 'Town 1 has a giant goose.' },
			{ municipality: 'Town 2', text: 'Town 2 has a giant moose.' }
		],
		random: () => 0,
		facts: Object.fromEntries(
			names.map((name, i) => [
				name,
				facts({ siteId: `s${i}`, siteName: `Site ${i}`, population: 100 * (i + 1) })
			])
		),
		peekWeather: (siteId) => {
			const reading = readings[Number(siteId.slice(1))];
			return reading === null ? null : weather(reading);
		},
		customMessages: [],
		now: NOW,
		...extra
	};
}

const textOf = (slots: ReturnType<typeof factSlots>, id: string) =>
	slots.find((slot) => slot?.id === id)?.text;

describe('factSlots, census facts', () => {
	it('names the largest and smallest municipality', () => {
		const slots = factSlots(inputs(Array(10).fill(5)));
		expect(textOf(slots, 'largest')).toBe(
			'Town 9 is our largest municipality, with 1,000 people in the 2021 census.'
		);
		expect(textOf(slots, 'smallest')).toBe(
			'Town 0 is our smallest, with 100 people in the 2021 census.'
		);
	});

	it('breaks ties by name', () => {
		const flat = inputs(Array(10).fill(5));
		for (const name of Object.keys(flat.facts)) flat.facts[name].population = 500;
		expect(textOf(factSlots(flat), 'largest')).toContain('Town 0 ');
	});

	it('derives the counts from the data and rounds as specified', () => {
		const slots = factSlots(inputs(Array(10).fill(5)));
		expect(textOf(slots, 'reach')).toBe(
			'We serve 10 municipalities across 1 districts and counties, home to 5,500 people.'
		);
	});

	it('matches the real data', () => {
		const slots = factSlots({
			municipalities,
			office,
			landmarks,
			trips: officeTrips,
			random: Math.random,
			facts: municipalityFacts,
			peekWeather: () => null,
			customMessages: [],
			now: NOW
		});
		expect(textOf(slots, 'reach')).toContain(`We serve ${municipalities.length} municipalities`);
		expect(textOf(slots, 'area')).toContain('1,010 km²');
	});
});

describe('factSlots, live facts', () => {
	it('names the warmest and coldest sites, with a true minus sign', () => {
		const slots = factSlots(inputs([6, 1, -3, 2, 2, 2, 2, 2, 2, 2]));
		expect(textOf(slots, 'temperatures')).toBe(
			'Warmest reading right now: Site 0, 6°. Coldest: Site 2, −3°.'
		);
	});

	it('breaks a tie for warmest by site name', () => {
		const slots = factSlots(inputs([5, 9, 9, 1, 2, 2, 2, 2, 2, 2]));
		expect(textOf(slots, 'temperatures')).toContain('Warmest reading right now: Site 1, 9°.');
	});

	it('shows a reading that rounds to zero as 0°', () => {
		const slots = factSlots(inputs([2, -0.4, 1, 1, 1, 1, 1, 1, 1, 1]));
		expect(textOf(slots, 'temperatures')).toContain('Coldest: Site 1, 0°.');
	});

	it('is skipped with too few readings, or when every reading is the same', () => {
		expect(
			textOf(factSlots(inputs([6, 1, 2, 2, 2, 2, 2, null, null, null])), 'temperatures')
		).toBeUndefined();
		expect(textOf(factSlots(inputs(Array(10).fill(4))), 'temperatures')).toBeUndefined();
	});

	it('ignores readings observed more than an hour ago', () => {
		const old = inputs(Array(10).fill(5), {
			peekWeather: () =>
				weather(5, { current: { observedAt: '2026-10-23T01:00:00Z', temperatureC: 5 } })
		});
		expect(textOf(factSlots(old), 'temperatures')).toBeUndefined();
	});

	it('counts municipalities with an alert, not alerts', () => {
		const shared = inputs(Array(10).fill(5));
		// Two municipalities share one site; that site has two alerts.
		shared.facts['Town 1'].siteId = 's0';
		shared.facts['Town 1'].siteName = 'Site 0';
		shared.peekWeather = (siteId) =>
			weather(5, {
				warnings:
					siteId === 's0'
						? [
								{ description: 'YELLOW WARNING - SNOW', level: 'yellow' },
								{ description: 'RED WARNING - BLIZZARD', level: 'red' }
							]
						: [{ description: 'SPECIAL WEATHER STATEMENT', level: 'other' }]
			});
		expect(textOf(factSlots(shared), 'alerts')).toBe(
			'Weather alerts are in effect for 2 of our municipalities.'
		);
	});

	it('says there are no alerts only when every site has fresh data', () => {
		expect(textOf(factSlots(inputs(Array(10).fill(5))), 'alerts')).toBe(
			'No weather alerts for any of our municipalities.'
		);
		expect(textOf(factSlots(inputs([5, 5, 5, 5, 5, 5, 5, 5, 5, null])), 'alerts')).toBeUndefined();
	});

	it('keeps the census facts and the radar line when nothing live is available', () => {
		const ids = factSlots(inputs(Array(10).fill(null)))
			.filter(Boolean)
			.map((slot) => slot!.id);
		expect(ids).toEqual(
			expect.arrayContaining(['largest', 'smallest', 'growth', 'area', 'reach', 'radar'])
		);
		expect(ids).toEqual(expect.arrayContaining(['drive', 'cycle', 'walk', 'daylight', 'toronto']));
		expect(ids).not.toContain('temperatures');
		expect(ids).not.toContain('wind');
	});
});

describe('factSlots, travel and place facts', () => {
	const slots = () => factSlots(inputs(Array(10).fill(null)));

	it('works out the drive, cycle and walk from the office to a random municipality', () => {
		// random() of 0 picks Town 0: 90 km by road, so 1 hour at 90 km/h.
		expect(textOf(slots(), 'drive')).toBe(
			"It's about a 1 hour drive from our Sudbury office to Town 0, 90 km by road."
		);
		expect(textOf(slots(), 'cycle')).toBe(
			'Cycling from our Sudbury office to Town 0 would take about 4 hours 30 minutes at 20 km/h, without stopping.'
		);
		expect(textOf(slots(), 'walk')).toBe(
			'Walking from our Sudbury office to Town 0 would take about 18 hours at 5 km/h, without a break.'
		);
	});

	it('picks a different municipality for a different random number', () => {
		const picked = factSlots(inputs(Array(10).fill(null), { random: () => 0.95 }));
		expect(textOf(picked, 'drive')).toContain('to Town 9, 900 km by road');
		expect(textOf(picked, 'drive')).toContain('10 hour drive');
	});

	it('tells very long trips in days', () => {
		const far = inputs(Array(10).fill(null), { random: () => 0.95 });
		expect(textOf(factSlots(far), 'walk')).toContain('about 7.5 days');
	});

	it('names the farthest and closest municipality by road', () => {
		expect(textOf(slots(), 'farthest')).toBe(
			'Town 9 is the farthest of our municipalities from Sudbury: 900 km, about a 10 hour drive.'
		);
		expect(textOf(slots(), 'closest')).toContain('Town 0 is the closest to our Sudbury office');
	});

	it('skips the travel facts when no trips are known', () => {
		const ids = factSlots(inputs(Array(10).fill(null), { trips: {} }))
			.filter(Boolean)
			.map((slot) => slot!.id);
		expect(ids).not.toContain('drive');
		expect(ids).not.toContain('farthest');
	});

	it('gives the daylight in Sudbury and how it changed since yesterday', () => {
		// 23 October: days are getting shorter by a few minutes.
		expect(textOf(slots(), 'daylight')).toMatch(
			/^Sudbury gets 10 hours \d+ minutes of daylight today, \d+ minutes? less than yesterday\.$/
		);
	});

	it('finds the windiest site, only from fresh readings', () => {
		const windy = inputs(Array(10).fill(5), {
			peekWeather: (siteId) =>
				weather(5, {
					current: {
						observedAt: '2026-10-23T02:50:00Z',
						temperatureC: 5,
						windSpeedKmh: siteId === 's3' ? 42 : 10
					}
				})
		});
		expect(textOf(factSlots(windy), 'wind')).toBe(
			'Windiest spot right now: Site 3, with winds at 42 km/h.'
		);
	});

	it('shows a landmark picked at random, and skips them when there are none', () => {
		expect(textOf(slots(), 'landmark-Town 1')).toBe('Town 1 has a giant goose.');
		const second = factSlots(inputs(Array(10).fill(null), { random: () => 0.9 }));
		expect(textOf(second, 'landmark-Town 2')).toBe('Town 2 has a giant moose.');
		const none = factSlots(inputs(Array(10).fill(null), { landmarks: [] }));
		expect(none.some((slot) => slot?.id.startsWith('landmark'))).toBe(false);
	});

	it('adds up the district, growth and name superlatives', () => {
		const text = (id: string) => textOf(slots(), id);
		expect(text('busiest-district')).toBe(
			'Algoma District is home to more of our municipalities than any other: 10 of 10.'
		);
		expect(text('growing')).toBe(
			'10 of our 10 municipalities grew between the 2016 and 2021 censuses.'
		);
		expect(text('size-gap')).toBe('Town 9 has about 10 times the people of Town 0, our smallest.');
		// Every name is the same length, so the first alphabetically wins.
		expect(text('longest-name')).toContain('Town 0 has the longest name');
	});

	it('names the density and shape extremes from the real data', () => {
		const real = factSlots({
			municipalities,
			office,
			landmarks,
			trips: officeTrips,
			random: () => 0,
			facts: municipalityFacts,
			peekWeather: () => null,
			customMessages: [],
			now: NOW
		});
		expect(textOf(real, 'toronto')).toMatch(/times the size of the City of Toronto/);
		expect(textOf(real, 'north')).toMatch(/is our northernmost municipality, at \d+\.\d° N\./);
		expect(textOf(real, 'west')).toMatch(/is our westernmost municipality, at \d+\.\d° W\./);
		expect(textOf(real, 'densest')).toMatch(/people per km²\.$/);
	});
});

describe('custom lines', () => {
	it('come after the built in facts and skip blank lines', () => {
		const slots = factSlots(inputs(Array(10).fill(5), { customMessages: ['  Welcome  ', '  '] }));
		expect(slots.map((slot) => slot?.text ?? null).slice(-2)).toEqual(['Welcome', null]);
		expect(slots[slots.length - 2]?.id).toBe('custom-0');
	});
});

describe('nextSlot', () => {
	const slot = (id: string) => ({ id, text: id });

	it('skips empty slots and wraps round', () => {
		const slots = [slot('a'), null, slot('c'), null];
		expect(nextSlot(slots, 0)).toBe(2);
		expect(nextSlot(slots, 2)).toBe(0);
	});

	it('stays put when only one slot has a fact', () => {
		expect(nextSlot([null, slot('b'), null], 1)).toBe(1);
	});

	it('returns -1 when nothing has a fact', () => {
		expect(nextSlot([null, null], 0)).toBe(-1);
	});
});

describe('startSlot', () => {
	const slot = (id: string) => ({ id, text: id });
	const slots = [slot('a'), null, slot('c'), slot('d')];

	it('starts on the slot the random number points at', () => {
		expect(startSlot(slots, () => 0)).toBe(0);
		expect(startSlot(slots, () => 0.5)).toBe(2);
		expect(startSlot(slots, () => 0.99)).toBe(3);
	});

	it('moves on to the next fact when it lands on an empty slot', () => {
		expect(startSlot(slots, () => 0.3)).toBe(2);
	});

	it('returns -1 when no slot has a fact', () => {
		expect(startSlot([null, null], () => 0.4)).toBe(-1);
	});
});
