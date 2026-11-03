import { describe, it, expect, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { RoadEvent } from '#lib/roads/events.js';
import RoadEventCard from './RoadEventCard.svelte';

const event: RoadEvent = {
	id: 1,
	kind: 'closure',
	roadway: 'HWY 17',
	description: 'Closed west of Wawa.',
	direction: 'Eastbound',
	lanesAffected: 'All lanes',
	updatedAt: Date.UTC(2026, 10, 3, 18, 32),
	plannedEndAt: null,
	longitude: -85.2,
	latitude: 47.99
};

describe('RoadEventCard', () => {
	it('shows what the event is, where, and its details', async () => {
		render(RoadEventCard, { event, onClose: () => {} });
		await expect.element(page.getByText('Road closed')).toBeVisible();
		await expect.element(page.getByText('HWY 17')).toBeVisible();
		await expect.element(page.getByText('Closed west of Wawa.')).toBeVisible();
		await expect.element(page.getByText('Eastbound')).toBeVisible();
		await expect.element(page.getByText('All lanes')).toBeVisible();
		await expect.element(page.getByText('Updated')).toBeVisible();
	});

	it('leaves out details the feed did not give', async () => {
		render(RoadEventCard, {
			event: { ...event, kind: 'roadwork', direction: null, lanesAffected: null, updatedAt: null },
			onClose: () => {}
		});
		await expect.element(page.getByText('Roadwork')).toBeVisible();
		expect(document.body.textContent).not.toContain('Direction');
		expect(document.body.textContent).not.toContain('Lanes');
		expect(document.body.textContent).not.toContain('Expected until');
		expect(document.body.textContent).not.toContain('Updated');
	});

	it('closes from the close button', async () => {
		const onClose = vi.fn();
		render(RoadEventCard, { event, onClose });
		await page.getByRole('button', { name: 'Close' }).click();
		expect(onClose).toHaveBeenCalledOnce();
	});
});
