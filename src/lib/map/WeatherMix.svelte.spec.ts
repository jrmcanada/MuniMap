import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import WeatherMix from './WeatherMix.svelte';

type Counts = Record<'rain' | 'snow' | 'clear' | 'cloud' | 'fog', number>;

/** A mix with that many made-up municipalities in each kind, named like "snow 1". */
function mixOf(counts: Counts) {
	const names = Object.fromEntries(
		Object.entries(counts).map(([kind, count]) => [
			kind,
			Array.from({ length: count }, (_, index) => `${kind} ${index + 1}`)
		])
	) as Record<keyof Counts, string[]>;
	return { counts, names, reporting: Object.values(counts).reduce((sum, count) => sum + count, 0) };
}

const segmentsOf = () => [...document.querySelectorAll('.segment')];

describe('WeatherMix', () => {
	it('lists each kind with its count and says how many municipalities reported', async () => {
		render(WeatherMix, {
			mix: mixOf({ rain: 12, snow: 3, clear: 20, cloud: 3, fog: 2 }),
			total: 55
		});
		await expect
			.element(page.getByText('40 of 55 municipalities have current weather'))
			.toBeVisible();
		const rows = [...document.querySelectorAll('li')].map((row) => row.textContent);
		expect(rows).toEqual(['Rain12', 'Snow3', 'Clear20', 'Cloud3', 'Mist, fog2']);
		expect(document.querySelector('.bar')!.getAttribute('aria-label')).toBe(
			'Weather across the municipalities: Rain 12, Snow 3, Clear 20, Cloud 3, Mist, fog 2'
		);
	});

	it('keeps all five labels on one row', () => {
		render(WeatherMix, {
			mix: mixOf({ rain: 27, snow: 0, clear: 0, cloud: 5, fog: 2 }),
			total: 55
		});
		const tops = [...document.querySelectorAll('li')].map((row) => row.getBoundingClientRect().top);
		expect(new Set(tops).size).toBe(1);
	});

	it('sizes segments by share, in the fixed order, and writes the percentage only where it fits', () => {
		render(WeatherMix, {
			mix: mixOf({ rain: 29, snow: 0, clear: 1, cloud: 6, fog: 3 }),
			total: 55
		});
		const segments = segmentsOf();
		// Snow has none, so there is no segment for it; rain comes first.
		expect(
			segments.map((segment) => segment.className.replace('segment', '').trim().split(' ')[0])
		).toEqual(['rain', 'clear', 'cloud', 'fog']);
		expect(segments.map((segment) => segment.textContent!.trim())).toEqual(['74%', '', '15%', '']);
		expect((segments[0] as HTMLElement).style.flexBasis).toMatch(/^74\.3/);
	});

	it('draws one full segment when every municipality has the same weather', () => {
		render(WeatherMix, {
			mix: mixOf({ rain: 0, snow: 0, clear: 7, cloud: 0, fog: 0 }),
			total: 55
		});
		expect(segmentsOf()).toHaveLength(1);
		expect((segmentsOf()[0] as HTMLElement).style.flexBasis).toBe('100%');
	});

	describe('the list of municipalities', () => {
		const counts = { rain: 0, snow: 3, clear: 5, cloud: 0, fog: 0 };
		const listItems = () => [...document.querySelectorAll('.names li')].map((li) => li.textContent);

		it('opens a list of the municipalities in a segment when it is clicked, sorted by name', async () => {
			const mix = mixOf(counts);
			mix.names.snow = ['Wawa', 'Atikokan', 'Nipigon'];
			render(WeatherMix, { mix, total: 55 });
			expect(listItems()).toEqual([]);
			await (segmentsOf()[0] as HTMLElement).click();
			await expect.element(page.getByRole('heading', { name: 'Snow3' })).toBeVisible();
			expect(listItems()).toEqual(['Atikokan', 'Nipigon', 'Wawa']);
		});

		it('switches to another segment, and closes on the same segment, the close button, or Escape', () => {
			render(WeatherMix, { mix: mixOf(counts), total: 55 });
			const [snow, clear] = segmentsOf() as HTMLElement[];
			const act = (action: () => void) => {
				action();
				flushSync();
			};
			act(() => snow.click());
			act(() => clear.click());
			expect(listItems()).toHaveLength(5);
			act(() => clear.click());
			expect(listItems()).toEqual([]);

			act(() => snow.click());
			act(() => document.querySelector<HTMLElement>('.list .close')!.click());
			expect(listItems()).toEqual([]);

			act(() => snow.click());
			act(() => {
				window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
			});
			expect(listItems()).toEqual([]);
		});
	});
});
