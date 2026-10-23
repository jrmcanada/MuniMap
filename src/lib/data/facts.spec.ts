import { describe, it, expect } from 'vitest';
import { municipalityFacts, factsFor, totalCensus } from './facts.js';
import { office } from './office.js';

describe('totalCensus', () => {
	it('adds population and land area, and weights the change by size', () => {
		const total = totalCensus([
			{ population: 1100, populationChangePercent: 10, landAreaKm2: 50, densityPerKm2: 22 },
			{ population: 900, populationChangePercent: -10, landAreaKm2: 50, densityPerKm2: 18 }
		]);
		expect(total.population).toBe(2000);
		expect(total.landAreaKm2).toBe(100);
		expect(total.densityPerKm2).toBe(20);
		// 1000 and 1000 in 2016, 2000 now would be 0%; 1100 / 1.1 + 900 / 0.9 = 2000.
		expect(total.populationChangePercent).toBe(0);
	});
});

describe('factsFor', () => {
	it('gives the office the totals for every municipality', () => {
		const total = Object.values(municipalityFacts).reduce(
			(sum, entry) => sum + entry.population,
			0
		);
		expect(factsFor(office.name).population).toBe(total);
	});

	it('gives a municipality its own facts', () => {
		expect(factsFor('Baldwin')).toBe(municipalityFacts['Baldwin']);
	});
});
