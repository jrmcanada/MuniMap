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

test('the logout button sits in the status bar and leads to the sign-in page', async ({ page }) => {
	await page.goto('/');
	const logout = page.getByRole('button', { name: 'Logout' });
	await expect(logout).toHaveAttribute('title', 'Logout');
	await logout.click();
	await expect(page).toHaveURL(/\/login$/);
});

test('shows the status bar with the clock and a ticker fact', async ({ page }) => {
	await page.goto('/');
	const bar = page.locator('footer[aria-label="Status bar"]');
	await expect(bar.getByText('55 municipalities')).toHaveCount(0);
	// The clock only: a ticker message can also contain a time, such as a sunrise.
	await expect(bar.locator('.time')).toHaveText(/^\d{1,2}:\d{2} [ap]m$/);
	await expect(bar.locator('.fact').first()).not.toBeEmpty();
});

test('the arrows beside the ticker step to the next message and back', async ({ page }) => {
	// No fade, so only one message is in the bar at a time.
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	const fact = page.locator('footer[aria-label="Status bar"] .fact');
	await expect(fact).not.toBeEmpty();
	const first = await fact.innerText();

	await page.getByRole('button', { name: 'Next message' }).click();
	await expect(fact).not.toHaveText(first);
	const second = await fact.innerText();

	await page.getByRole('button', { name: 'Previous message' }).click();
	await expect(fact).toHaveText(first);
	await page.getByRole('button', { name: 'Next message' }).click();
	await expect(fact).toHaveText(second);
});
