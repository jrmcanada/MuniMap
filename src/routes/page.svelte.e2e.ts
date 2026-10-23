import { expect, test } from '@playwright/test';

test('shows the client map', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('img', { name: /client municipalities/i })).toBeVisible();
});
