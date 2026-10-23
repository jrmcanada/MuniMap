import { describe, it, expect } from 'vitest';
import { municipalityFacts, type MunicipalityFacts } from '#lib/data/facts.js';
import { municipalities } from '#lib/data/municipalities.js';
import type { SiteWeather } from '#lib/weather/types.js';
import { factSlots, nextSlot, type FactInputs } from './facts.js';

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
			facts: municipalityFacts,
			peekWeather: () => null,
			customMessages: [],
			now: NOW
		});
		expect(textOf(slots, 'reach')).toContain('We serve 50 municipalities');
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

	it('still has census facts and the radar line when nothing live is available', () => {
		const offline = inputs(Array(10).fill(null));
		const shown = factSlots(offline).filter(Boolean);
		expect(shown.map((slot) => slot!.id)).toEqual([
			'largest',
			'smallest',
			'growth',
			'area',
			'reach',
			'radar'
		]);
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
