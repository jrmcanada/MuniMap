import { describe, it, expect } from 'vitest';
import { FULL_VIEW, MAX_ZOOM, panBy, pinchView, wheelFactor, zoomAt } from './view.js';

const size = { width: 1000, height: 600 };

describe('zoomAt', () => {
	it('keeps the map point under the pointer where it was', () => {
		const point = { x: 700, y: 200 };
		const view = zoomAt(FULL_VIEW, point, 2, size);
		// The map point that was under the pointer: (point - offset) / k.
		expect((point.x - view.x) / view.k).toBeCloseTo(700);
		expect((point.y - view.y) / view.k).toBeCloseTo(200);
	});

	it('does not zoom out past the full view', () => {
		const zoomed = zoomAt(FULL_VIEW, { x: 500, y: 300 }, 4, size);
		expect(zoomAt(zoomed, { x: 500, y: 300 }, 0.01, size)).toEqual(FULL_VIEW);
	});

	it('stops at the maximum zoom', () => {
		expect(zoomAt(FULL_VIEW, { x: 500, y: 300 }, 100, size).k).toBe(MAX_ZOOM);
	});

	it('keeps the map covering the canvas near a corner', () => {
		const view = zoomAt(FULL_VIEW, { x: 0, y: 0 }, 4, size);
		expect(view).toEqual({ k: 4, x: 0, y: 0 });
		const far = zoomAt(FULL_VIEW, { x: 1000, y: 600 }, 4, size);
		expect(far.x).toBe(-3000);
		expect(far.y).toBe(-1800);
	});
});

describe('panBy', () => {
	const zoomed = { k: 2, x: -500, y: -300 };

	it('moves the map with the drag', () => {
		expect(panBy(zoomed, 100, 50, size)).toEqual({ k: 2, x: -400, y: -250 });
	});

	it('stops at the map edges', () => {
		expect(panBy(zoomed, 5000, 5000, size)).toEqual({ k: 2, x: 0, y: 0 });
		expect(panBy(zoomed, -5000, -5000, size)).toEqual({ k: 2, x: -1000, y: -600 });
	});

	it('does nothing at the full view', () => {
		expect(panBy(FULL_VIEW, 100, 100, size)).toEqual(FULL_VIEW);
	});
});

describe('wheelFactor', () => {
	it('zooms in when scrolling up and out when scrolling down', () => {
		expect(wheelFactor(-100)).toBeGreaterThan(1);
		expect(wheelFactor(100)).toBeLessThan(1);
		expect(wheelFactor(0)).toBe(1);
	});
});

describe('pinchView', () => {
	const apart = (gap: number, y = 300): [{ x: number; y: number }, { x: number; y: number }] => [
		{ x: 500 - gap / 2, y },
		{ x: 500 + gap / 2, y }
	];

	it('zooms by how far the fingers spread, around the midpoint', () => {
		const view = pinchView(FULL_VIEW, apart(100), apart(200), size);
		expect(view.k).toBeCloseTo(2);
		// The map point under the midpoint is still under it.
		expect((500 - view.x) / view.k).toBeCloseTo(500);
		expect((300 - view.y) / view.k).toBeCloseTo(300);
	});

	it('zooms out when the fingers come together, but not past the full view', () => {
		const zoomed = pinchView(FULL_VIEW, apart(100), apart(400), size);
		expect(pinchView(zoomed, apart(400), apart(200), size).k).toBeCloseTo(zoomed.k / 2);
		expect(pinchView(zoomed, apart(400), apart(1), size)).toEqual(FULL_VIEW);
	});

	it('pans with the midpoint when the fingers move together', () => {
		const zoomed = pinchView(FULL_VIEW, apart(100), apart(300), size);
		const moved = pinchView(
			zoomed,
			apart(100),
			[
				{ x: 450, y: 300 },
				{ x: 550, y: 300 }
			].map((point) => ({ x: point.x + 60, y: point.y + 20 })) as [
				{ x: number; y: number },
				{ x: number; y: number }
			],
			size
		);
		expect(moved.k).toBe(zoomed.k);
		expect(moved.x).toBeCloseTo(zoomed.x + 60);
		expect(moved.y).toBeCloseTo(zoomed.y + 20);
	});

	it('does nothing when the fingers start on the same spot', () => {
		expect(pinchView(FULL_VIEW, apart(0), apart(200), size)).toEqual(FULL_VIEW);
	});
});
