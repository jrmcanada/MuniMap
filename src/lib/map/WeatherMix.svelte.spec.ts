import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import WeatherMix from './WeatherMix.svelte';

describe('WeatherMix', () => {
	it('lists each kind with its count and says how many municipalities reported', async () => {
		render(WeatherMix, {
			mix: { counts: { rain: 12, snow: 3, clear: 20, other: 5 }, reporting: 40 },
			total: 55
		});
		await expect.element(page.getByText('40 of 55 municipalities reporting')).toBeVisible();
		const rows = [...document.querySelectorAll('li')].map((row) => row.textContent);
		expect(rows).toEqual(['Rain12', 'Snow3', 'Clear20', 'Cloud, mist, fog5']);
		expect(document.querySelectorAll('svg path')).toHaveLength(4);
	});

	it('draws a whole disc when every municipality has the same weather, and leaves out empty wedges', () => {
		render(WeatherMix, {
			mix: { counts: { rain: 0, snow: 0, clear: 7, other: 0 }, reporting: 7 },
			total: 55
		});
		expect(document.querySelectorAll('svg circle')).toHaveLength(1);
		expect(document.querySelectorAll('svg path')).toHaveLength(0);
	});
});
