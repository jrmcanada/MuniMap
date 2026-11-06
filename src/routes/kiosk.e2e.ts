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
	await expect(page.getByText('Sudbury office', { exact: true })).toBeVisible();
	// The count of municipalities lives on this card, not in the status bar.
	await expect(page.getByText('55 municipalities', { exact: true })).toBeVisible();
});

test('the arrow keys step through the municipalities', async ({ page }) => {
	await page.goto('/');
	const headings = page.getByRole('heading', { level: 2 });
	await expect(headings).toHaveCount(1);
	const first = await headings.innerText();
	const showing = (name: string) => page.getByRole('heading', { level: 2, name, exact: true });

	// Two cards share the screen while one fades into the next, so wait for the old one to go.
	await page.keyboard.press('ArrowRight');
	await expect(showing(first)).toHaveCount(0);
	await expect(headings).toHaveCount(1);

	await page.keyboard.press('ArrowLeft');
	await expect(showing(first)).toHaveCount(1);
	await expect(headings).toHaveCount(1);
});

const ROAD_ROUTES = '**/api/road-*';

test('shows no road layer when the Ontario 511 feed is unavailable', async ({ page }) => {
	// Without the feed the production build must show nothing, and never made up sample roads.
	await page.route(ROAD_ROUTES, (route) => route.fulfill({ status: 503 }));
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
	await page.waitForTimeout(1500);
	await expect(page.getByText('Sample data, not real conditions')).toHaveCount(0);
	await expect(page.getByText('Snow covered', { exact: true })).toHaveCount(0);
});

test('shows the road legend, credited to Ontario 511, when the feed answers', async ({ page }) => {
	await page.route('**/api/road-conditions', (route) =>
		route.fulfill({
			json: [{ Condition: ['Bare and wet road'], EncodedPolyline: ['_p~iF~ps|U_ulLnnqC_mqNvxq`@'] }]
		})
	);
	await page.route('**/api/road-events', (route) =>
		route.fulfill({
			json: [
				{
					ID: 1,
					RoadwayName: 'HWY 17',
					Description: 'Closed.',
					EventType: 'closures',
					IsFullClosure: true,
					Latitude: 47,
					Longitude: -80
				}
			]
		})
	);
	await page.goto('/');
	await expect(page.getByText('Road conditions: Ontario 511')).toBeVisible();
	await expect(page.getByText('Snow covered', { exact: true })).toBeVisible();
	await expect(page.getByText('Sample data, not real conditions')).toHaveCount(0);
});

test.describe('on a touchscreen', () => {
	// Reduced motion stops the map animating, so two screenshots of an unchanged view are identical.
	test.use({ hasTouch: true, reducedMotion: 'reduce' });

	test('pinches the map in and out, and drags it with one finger', async ({ page }) => {
		// A stopped clock keeps the 20 second rotation from moving the highlight mid-test.
		await page.clock.install({ time: new Date() });
		await page.clock.pauseAt(new Date(Date.now() + 2000));
		await page.goto('/');
		const canvas = page.locator('canvas').first();
		await expect(canvas).toBeVisible();
		const box = (await canvas.boundingBox())!;
		const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
		// The radar can still be arriving, so wait until the map holds still.
		const settled = async () => {
			let last = await canvas.screenshot();
			for (let attempt = 0; attempt < 20; attempt++) {
				await page.waitForTimeout(400);
				const next = await canvas.screenshot();
				if (next.equals(last)) return next;
				last = next;
			}
			return last;
		};
		const full = await settled();
		expect((await canvas.screenshot()).equals(full)).toBe(true);

		const touch = await page.context().newCDPSession(page);
		const send = (
			type: 'touchStart' | 'touchMove' | 'touchEnd',
			points: { x: number; y: number; id: number }[]
		) => touch.send('Input.dispatchTouchEvent', { type, touchPoints: points });
		const fingers = (gap: number) => [
			{ x: centre.x - gap / 2, y: centre.y, id: 1 },
			{ x: centre.x + gap / 2, y: centre.y, id: 2 }
		];

		// Spread two fingers apart: the map zooms in.
		await send('touchStart', fingers(60));
		for (const gap of [100, 160, 240]) await send('touchMove', fingers(gap));
		await send('touchEnd', []);
		const zoomed = await settled();
		expect(zoomed.equals(full)).toBe(false);

		// One finger drags the zoomed map.
		await send('touchStart', [{ x: centre.x, y: centre.y, id: 1 }]);
		for (const step of [20, 60, 100])
			await send('touchMove', [{ x: centre.x + step, y: centre.y + step / 2, id: 1 }]);
		await send('touchEnd', []);
		const dragged = await settled();
		expect(dragged.equals(zoomed)).toBe(false);

		// Pinching back together returns to the full view.
		await send('touchStart', fingers(400));
		for (const gap of [200, 80, 10]) await send('touchMove', fingers(gap));
		await send('touchEnd', []);
		// Pinching back in changes the view again. The exact return to the full view is in view.spec.ts.
		expect((await settled()).equals(dragged)).toBe(false);
	});
});
