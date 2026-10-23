import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import WindCompass from './WindCompass.svelte';

describe('WindCompass', () => {
	it('points the arrow where the wind is going, half a turn from where it comes from', async () => {
		render(WindCompass, { direction: 'NW', speed: 11, gust: 30 });
		await expect.element(page.getByText('NW 11 km/h')).toBeVisible();
		await expect.element(page.getByText('gusts 30')).toBeVisible();

		const arrow = document.querySelector('.arrow')!;
		// NW is 315 degrees, so the arrow is turned 495, which is 135 after a full circle.
		expect(arrow.getAttribute('transform')).toBe('rotate(495 42 42)');
	});

	it('shows Calm and no arrow when the wind is calm', async () => {
		render(WindCompass, { direction: 'NW', speed: 'calm' });
		await expect.element(page.getByText('Calm')).toBeVisible();
		expect(document.querySelector('.arrow')).toBeNull();
	});

	it('shows no arrow when the direction is not a compass point', async () => {
		render(WindCompass, { direction: 'VR', speed: 8 });
		await expect.element(page.getByText('VR 8 km/h')).toBeVisible();
		expect(document.querySelector('.arrow')).toBeNull();
	});

	it('leaves out gusts when there are none', async () => {
		render(WindCompass, { direction: 'N', speed: 5 });
		await expect.element(page.getByText('N 5 km/h')).toBeVisible();
		expect(document.querySelector('.gust')).toBeNull();
	});
});
