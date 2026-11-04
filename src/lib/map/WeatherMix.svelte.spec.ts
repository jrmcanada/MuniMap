import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import WeatherMix from './WeatherMix.svelte';

const segmentsOf = () => [...document.querySelectorAll('.segment')];

describe('WeatherMix', () => {
	it('lists each kind with its count and says how many municipalities reported', async () => {
		render(WeatherMix, {
			mix: { counts: { rain: 12, snow: 3, clear: 20, other: 5 }, reporting: 40 },
			total: 55
		});
		await expect.element(page.getByText('40 of 55 municipalities reporting')).toBeVisible();
		const rows = [...document.querySelectorAll('li')].map((row) => row.textContent);
		expect(rows).toEqual(['Rain12', 'Snow3', 'Clear20', 'Cloud, mist, fog5']);
		expect(document.querySelector('.bar')!.getAttribute('aria-label')).toBe(
			'Weather across the municipalities: Rain 12, Snow 3, Clear 20, Cloud, mist, fog 5'
		);
	});

	it('keeps all four labels on one row', () => {
		render(WeatherMix, {
			mix: { counts: { rain: 27, snow: 0, clear: 0, other: 7 }, reporting: 34 },
			total: 55
		});
		const tops = [...document.querySelectorAll('li')].map((row) => row.getBoundingClientRect().top);
		expect(new Set(tops).size).toBe(1);
	});

	it('sizes segments by share, in the fixed order, and writes the percentage only where it fits', () => {
		render(WeatherMix, {
			mix: { counts: { rain: 29, snow: 0, clear: 1, other: 9 }, reporting: 39 },
			total: 55
		});
		const segments = segmentsOf();
		// Snow has none, so there is no segment for it; rain comes first.
		expect(
			segments.map((segment) => segment.className.replace('segment', '').trim().split(' ')[0])
		).toEqual(['rain', 'clear', 'other']);
		expect(segments.map((segment) => segment.textContent!.trim())).toEqual(['74%', '', '23%']);
		expect((segments[0] as HTMLElement).style.flexBasis).toMatch(/^74\.3/);
	});

	it('draws one full segment when every municipality has the same weather', () => {
		render(WeatherMix, {
			mix: { counts: { rain: 0, snow: 0, clear: 7, other: 0 }, reporting: 7 },
			total: 55
		});
		expect(segmentsOf()).toHaveLength(1);
		expect((segmentsOf()[0] as HTMLElement).style.flexBasis).toBe('100%');
	});
});
