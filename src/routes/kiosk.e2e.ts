import { expect, test } from '@playwright/test';

test('hides the cursor after 3 idle seconds and shows it again on movement', async ({ page }) => {
	await page.goto('/');
	const root = page.locator('html');

	await page.mouse.move(200, 200);
	await expect(root).not.toHaveClass(/cursor-hidden/);

	// Real time: the rule is 3 idle seconds, so allow a little more than that.
	await page.waitForTimeout(3500);
	await expect(root).toHaveClass(/cursor-hidden/);

	await page.mouse.move(220, 220);
	await expect(root).not.toHaveClass(/cursor-hidden/);
});

// The panel and status bar must fit whatever screen the display PC has.
const SCREENS = [
	[1024, 768],
	[1280, 720],
	[1366, 768],
	[1920, 1080],
	[1920, 1200],
	[2560, 1080],
	[2560, 1440],
	[3840, 2160]
] as const;

for (const [width, height] of SCREENS) {
	test(`nothing clips at ${width} by ${height}`, async ({ page }) => {
		await page.setViewportSize({ width, height });
		await page.goto('/');
		await expect(page.getByRole('heading', { level: 2 })).toBeVisible();

		const clipped = await page.evaluate(() => {
			const fits = (selector: string) => {
				const element = document.querySelector(selector)!;
				return element.scrollHeight <= element.clientHeight + 1;
			};
			const bar = document.querySelector('footer[aria-label="Status bar"]')!;
			return {
				card: !fits('.card'),
				barSideways: bar.scrollWidth > bar.clientWidth + 1,
				page: document.documentElement.scrollHeight > innerHeight
			};
		});
		expect(clipped).toEqual({ card: false, barSideways: false, page: false });
	});
}
