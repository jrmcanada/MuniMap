import { describe, it, expect } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import RoadLegend from './RoadLegend.svelte';

describe('RoadLegend', () => {
	it('names each road condition and the source', async () => {
		render(RoadLegend, { source: 'Road conditions: Ontario 511' });
		for (const label of ['Clear', 'Wet', 'Snow covered', 'Icy']) {
			await expect.element(page.getByText(label, { exact: true })).toBeVisible();
		}
		await expect.element(page.getByText('Road conditions: Ontario 511')).toBeVisible();
	});
});
