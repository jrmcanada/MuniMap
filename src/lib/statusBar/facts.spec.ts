import { describe, it, expect, vi } from 'vitest';
import { municipalityFacts, type MunicipalityFacts } from '#lib/data/facts.js';
import { landmarks } from '#lib/data/landmarks.js';
import { municipalities } from '#lib/data/municipalities.js';
import { office } from '#lib/data/office.js';
import officeTrips from '#lib/data/office-trips.json';
import type { RoadEvent } from '#lib/roads/events.js';
import type { SiteWeather } from '#lib/weather/types.js';
import { factSlots, shuffledOrder, slotGroups, TickerOrder, type FactInputs } from './facts.js';

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
		roadEvents: null,
		roadSections: null,
		radar: null,
		trivia: [],
		officeSiteId: 'on-40',
		weatherMix: null,
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
			roadEvents: null,
			roadSections: null,
			radar: null,
			trivia: [],
			officeSiteId: 'on-40',
			weatherMix: null,
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

	it('ignores readings observed more than two hours ago', () => {
		const old = inputs(Array(10).fill(5), {
			peekWeather: () =>
				weather(5, { current: { observedAt: '2026-10-23T00:30:00Z', temperatureC: 5 } })
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

	describe('road closures', () => {
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
		const snapshot = (kinds: RoadEvent['kind'][], loadedAt = NOW - 60_000) => ({
			events: kinds.map((kind, index) => event(index, kind)),
			loadedAt
		});
		const closures = (roadEvents: FactInputs['roadEvents']) =>
			textOf(factSlots(inputs(Array(10).fill(5), { roadEvents })), 'road-closures');

		it('counts closures, leaving out roadwork and collisions that leave the road open', () => {
			expect(closures(snapshot(['closure', 'closure', 'roadwork', 'collision']))).toBe(
				'Ontario 511 reports 2 road closures in Ontario right now, apart from roadwork.'
			);
		});

		it('says closure in the singular for one', () => {
			expect(closures(snapshot(['closure']))).toContain('1 road closure in');
		});

		it('says there are none when the feed is fresh and has none', () => {
			expect(closures(snapshot(['roadwork']))).toBe(
				'Ontario 511 reports no road closures in Ontario right now, apart from roadwork.'
			);
		});

		it('is skipped before the first load and when the data is over half an hour old', () => {
			expect(closures(null)).toBeUndefined();
			expect(closures(snapshot(['closure'], NOW - 31 * 60_000))).toBeUndefined();
		});
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
			roadEvents: null,
			roadSections: null,
			radar: null,
			trivia: [],
			officeSiteId: 'on-40',
			weatherMix: null,
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

describe('a failing line', () => {
	it('is skipped without stopping the other lines', () => {
		// With no trips object, the drive, cycle and walk lines throw; everything else still builds.
		const broken = inputs(Array(10).fill(5), { trips: null as never });
		const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
		const slots = factSlots(broken);
		expect(slots.some((slot) => slot?.id === 'largest')).toBe(true);
		expect(slots.some((slot) => slot?.id === 'drive')).toBe(false);
		expect(errors).toHaveBeenCalled();
		errors.mockRestore();
	});
});

describe('slot groups', () => {
	it('gives drive, cycle and walk four slots each, and keeps them in one travel group', () => {
		const slots = factSlots(inputs(Array(10).fill(5)));
		const ids = slots.map((slot) => slot?.id);
		for (const id of ['drive', 'cycle', 'walk'])
			expect(ids.filter((x) => x === id)).toHaveLength(4);
		const groups = slotGroups(0);
		expect(groups).toHaveLength(slots.length - 0);
		expect(groups.filter((group) => group === 'travel')).toHaveLength(12);
	});

	it('has one group for every slot, custom lines included', () => {
		const withCustom = inputs(Array(10).fill(5), { customMessages: ['One', 'Two'] });
		expect(slotGroups(2)).toHaveLength(factSlots(withCustom).length);
	});
});

describe('factSlots, alert lines', () => {
	const alertInputs = (warnings: Record<string, SiteWeather['warnings']>) => {
		const shared = inputs(Array(10).fill(5));
		// Towns 0 and 1 share site s0.
		shared.facts['Town 1'].siteId = 's0';
		shared.facts['Town 1'].siteName = 'Site 0';
		shared.peekWeather = (siteId) => weather(5, { warnings: warnings[siteId] ?? [] });
		return shared;
	};
	const details = (slots: ReturnType<typeof factSlots>) =>
		slots.filter((slot) => slot?.id.startsWith('alert-detail')).map((slot) => slot!.text);

	it('names each warning, worst first, with the municipalities it covers', () => {
		const slots = factSlots(
			alertInputs({
				s0: [
					{ description: 'YELLOW WARNING - RAINFALL', level: 'yellow' },
					{ description: 'RED WARNING - BLIZZARD', level: 'red' }
				]
			})
		);
		expect(details(slots)).toEqual([
			'Red warning - blizzard is in effect near Site 0, covering 2 of our municipalities.',
			'Yellow warning - rainfall is in effect near Site 0, covering 2 of our municipalities.'
		]);
	});

	it('counts forecast areas when more than two have the same alert', () => {
		const rain = [{ description: 'YELLOW WARNING - RAINFALL', level: 'yellow' as const }];
		const slots = factSlots(alertInputs({ s0: rain, s2: rain, s3: rain }));
		expect(details(slots)).toEqual([
			'Yellow warning - rainfall is in effect across 3 forecast areas, covering 4 of our municipalities.'
		]);
	});

	it('leaves out plain statements and has no alert lines when nothing is in effect', () => {
		const statement = [{ description: 'SPECIAL WEATHER STATEMENT', level: 'other' as const }];
		expect(details(factSlots(alertInputs({ s0: statement })))).toEqual([]);
		expect(details(factSlots(alertInputs({})))).toEqual([]);
	});
});

describe('shuffledOrder', () => {
	// A small seeded generator, so a failure can be repeated.
	const seeded = (seed: number) => () => {
		seed = (seed * 1664525 + 1013904223) % 4294967296;
		return seed / 4294967296;
	};
	const groups = slotGroups(0);

	it('uses every slot exactly once', () => {
		const order = shuffledOrder(groups, seeded(1));
		expect([...order].sort((a, b) => a - b)).toEqual(groups.map((_, index) => index));
	});

	it('differs from one shuffle to the next', () => {
		const orders = new Set(
			Array.from({ length: 20 }, (_, seed) => shuffledOrder(groups, seeded(seed)).join(','))
		);
		expect(orders.size).toBe(20);
	});

	it('never puts two slots of one group side by side', () => {
		for (let seed = 0; seed < 200; seed++) {
			const order = shuffledOrder(groups, seeded(seed));
			for (let i = 1; i < order.length; i++) {
				expect(groups[order[i]]).not.toBe(groups[order[i - 1]]);
			}
		}
	});

	it('does not open with the group it was told to avoid', () => {
		for (let seed = 0; seed < 100; seed++) {
			expect(groups[shuffledOrder(groups, seeded(seed), 'travel')[0]]).not.toBe('travel');
		}
	});
});

describe('TickerOrder', () => {
	const fact = (id: string) => ({ id, text: id });
	const seeded = (seed: number) => () => {
		seed = (seed * 1664525 + 1013904223) % 4294967296;
		return seed / 4294967296;
	};

	it('shows every fact once a lap, in a different order each lap', () => {
		const slots = ['a', 'b', 'c', 'd', 'e', 'f'].map(fact);
		const groups = slots.map((slot) => slot.id);
		const order = new TickerOrder(seeded(3));
		const laps = Array.from({ length: 6 }, () =>
			slots.map(() => order.next(slots, groups)!.id).join('')
		);
		for (const lap of laps) expect([...lap].sort().join('')).toBe('abcdef');
		expect(new Set(laps).size).toBeGreaterThan(1);
	});

	it('skips empty slots without losing the rest of the lap', () => {
		const slots = [fact('a'), null, fact('c'), null];
		const groups = ['a', 'b', 'c', 'd'];
		const order = new TickerOrder(seeded(5));
		const shown = Array.from({ length: 4 }, () => order.next(slots, groups)!.id).sort();
		expect(shown).toEqual(['a', 'a', 'c', 'c']);
	});

	it('keeps a group from repeating when an empty slot between two of them is skipped', () => {
		// Two travel lines with an empty slot between them: skipping it must not put them together.
		const slots = [fact('drive'), null, fact('walk'), fact('radar'), fact('north')];
		const groups = ['travel', 'gap', 'travel', 'radar', 'north'];
		for (let seed = 0; seed < 100; seed++) {
			const order = new TickerOrder(seeded(seed));
			const shown = slots
				.filter(Boolean)
				.map(() => groups[slots.indexOf(order.next(slots, groups))]);
			for (let i = 1; i < shown.length; i++) expect(shown[i]).not.toBe(shown[i - 1]);
		}
	});

	it('returns null when no slot has a fact', () => {
		expect(new TickerOrder(Math.random).next([null, null], ['a', 'b'])).toBeNull();
	});

	it('starts a new lap when the number of slots changes', () => {
		const order = new TickerOrder(seeded(9));
		expect(order.next([fact('a'), fact('b')], ['a', 'b'])).not.toBeNull();
		const bigger = [fact('a'), fact('b'), fact('c')];
		const laps = bigger.map(() => order.next(bigger, ['a', 'b', 'c'])!.id).sort();
		expect(laps).toEqual(['a', 'b', 'c']);
	});
});
