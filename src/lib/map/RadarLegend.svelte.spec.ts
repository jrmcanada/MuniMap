import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RadarLegend from './RadarLegend.svelte';

describe('RadarLegend', () => {
	it('shows a rain scale in mm/h and a snow scale in cm/h, labelled from light to extreme', () => {
		render(RadarLegend, {});
		const scales = [...document.querySelectorAll('.scale')].map((scale) => ({
			name: scale.querySelector('.name')!.textContent!.replace(/\s+/g, ' ').trim(),
			ticks: [...scale.querySelectorAll('.ticks span')].map((tick) => tick.textContent)
		}));
		expect(scales).toEqual([
			{ name: 'Rain mm/h', ticks: ['0.1', '4', '12', '32', '64', '200'] },
			{ name: 'Snow cm/h', ticks: ['0.1', '0.5', '1', '3', '5', '20'] }
		]);
	});
});
