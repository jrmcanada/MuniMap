import { expect, test } from '@playwright/test';

test('shows the client map', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('img', { name: /client municipalities/i })).toBeVisible();
});

test('shows a municipality in the panel', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
	await expect(page.getByText(/Population/)).toBeVisible();
});
