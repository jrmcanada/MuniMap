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

test('shows the status bar with the clock, the count and a ticker fact', async ({ page }) => {
	await page.goto('/');
	const bar = page.locator('footer[aria-label="Status bar"]');
	await expect(bar.getByText('50 municipalities', { exact: true })).toBeVisible();
	await expect(bar.getByText(/\d{1,2}:\d{2} [ap]m/)).toBeVisible();
	await expect(bar.locator('.fact')).not.toBeEmpty();
});
