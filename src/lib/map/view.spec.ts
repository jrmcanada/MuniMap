import { describe, it, expect } from 'vitest';
import { FULL_VIEW, MAX_ZOOM, panBy, wheelFactor, zoomAt } from './view.js';

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
