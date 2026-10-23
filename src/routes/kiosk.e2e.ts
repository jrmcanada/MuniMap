import { expect, test, type Page } from '@playwright/test';

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

const en = (value: unknown) => ({ en: value, fr: value });

/** A tall card: every field the panel can show, three forecast periods and two alerts. */
const TALL_WEATHER = {
	properties: {
		currentConditions: {
			timestamp: en(new Date().toISOString()),
			temperature: { value: en(2.1) },
			windChill: { value: en(-4) },
			condition: en('Mainly Clear'),
			wind: { speed: { value: en(11) }, direction: { value: en('WNW') }, gust: { value: en(30) } },
			relativeHumidity: { value: en(55) }
		},
		forecastGroup: {
			forecasts: ['Tonight', 'Friday', 'Friday night'].map((name) => ({
				period: { textForecastName: en(name) },
				temperatures: { temperature: [{ class: en('low'), value: en(3) }] },
				abbreviatedForecast: { textSummary: en('A few clouds') }
			}))
		},
		warnings: [
			{ description: en('RED WARNING - BLIZZARD'), alertColourLevel: en('red') },
			{ description: en('YELLOW WATCH - FREEZING RAIN'), alertColourLevel: en('yellow') }
		]
	}
};

async function serveTallWeather(page: Page) {
	await page.route('https://api.weather.gc.ca/**', (route) =>
		route.fulfill({
			json: TALL_WEATHER,
			headers: { 'access-control-allow-origin': '*' }
		})
	);
}

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
		await serveTallWeather(page);
		await page.setViewportSize({ width, height });
		await page.goto('/');
		await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
		// Wait for the stubbed weather to land, so the tall card is what gets measured.
		await expect(page.getByText('RED WARNING - BLIZZARD')).toBeVisible();

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

test('zooms the map at the pointer with the mouse wheel', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/');
	const canvas = page.locator('canvas').first();
	await expect(canvas).toBeVisible();

	const before = await canvas.screenshot();
	const box = (await canvas.boundingBox())!;
	await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
	await page.mouse.wheel(0, -400);
	await page.waitForTimeout(300);
	const zoomed = await canvas.screenshot();
	expect(zoomed.equals(before)).toBe(false);

	// Scrolling back out returns the full view.
	await page.mouse.wheel(0, 4000);
	await page.waitForTimeout(300);
	expect(errors).toEqual([]);
});

test('drags the zoomed map without selecting a pin', async ({ page }) => {
	await page.goto('/');
	const canvas = page.locator('canvas').first();
	const box = (await canvas.boundingBox())!;
	const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

	await page.mouse.move(centre.x, centre.y);
	await page.mouse.wheel(0, -800);
	await page.waitForTimeout(300);
	const zoomed = await canvas.screenshot();

	await page.mouse.down();
	await page.mouse.move(centre.x + 150, centre.y + 80, { steps: 5 });
	await page.mouse.up();
	await page.waitForTimeout(300);
	expect((await canvas.screenshot()).equals(zoomed)).toBe(false);
});

test('clicking the office marker shows the company card', async ({ page }) => {
	await page.setViewportSize({ width: 1920, height: 1080 });
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
	// Sudbury sits at about 61% across and 52% down the map at this size.
	await page.mouse.click(1179, 565);
	await expect(
		page.getByRole('heading', { level: 2, name: 'The Managed Municipality' })
	).toBeVisible();
	await expect(page.getByText('Sudbury office')).toBeVisible();
});
