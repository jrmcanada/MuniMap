import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import SunArc from './SunArc.svelte';

describe('SunArc', () => {
	it('draws the sun and the stretch it has travelled while the sun is up', async () => {
		render(SunArc, { position: { x: 64, y: 33 }, sunrise: '8:03 am', sunset: '6:21 pm' });
		await expect.element(page.getByText('Sunrise 8:03 am')).toBeVisible();
		await expect.element(page.getByText('Sunset 6:21 pm')).toBeVisible();

		expect(document.querySelector('.body')).not.toBeNull();
		expect(document.querySelector('.travelled')).not.toBeNull();
		expect(document.querySelector('.night')).toBeNull();
		expect(document.querySelector('svg')!.getAttribute('aria-label')).toBe('The sun is up.');
	});

	it('says the sun is down at night, with no sun on the arc', async () => {
		render(SunArc, { position: null, sunrise: '8:03 am', sunset: '6:21 pm' });
		await expect.element(page.getByText('Sun is down')).toBeVisible();

		expect(document.querySelector('.body')).toBeNull();
		expect(document.querySelector('.travelled')).toBeNull();
		expect(document.querySelector('svg')!.getAttribute('aria-label')).toBe('The sun is down.');
	});

	it('draws the moon and its times when the sun is down and the moon is up', async () => {
		render(SunArc, {
			position: null,
			sunrise: '8:03 am',
			sunset: '6:21 pm',
			moon: { position: { x: 150, y: 18 }, phase: 0.4, rise: '5:12 pm', set: '4:48 am' }
		});
		await expect.element(page.getByText('Moonrise 5:12 pm')).toBeVisible();
		await expect.element(page.getByText('Moonset 4:48 am')).toBeVisible();

		expect(document.querySelector('.moon-lit')).not.toBeNull();
		expect(document.querySelector('.night')).toBeNull();
		expect(document.querySelector('svg')!.getAttribute('aria-label')).toBe(
			'The sun is down and the moon is up.'
		);
	});

	it('keeps the sun times and no moon while the sun is up', async () => {
		render(SunArc, {
			position: { x: 64, y: 33 },
			sunrise: '8:03 am',
			sunset: '6:21 pm',
			moon: { position: { x: 150, y: 18 }, phase: 0.4, rise: '5:12 pm', set: '4:48 am' }
		});
		await expect.element(page.getByText('Sunrise 8:03 am')).toBeVisible();
		expect(document.querySelector('.moon-lit')).toBeNull();
	});
});
