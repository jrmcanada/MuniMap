import { describe, it, expect } from 'vitest';
import { FULL_VIEW, MAX_ZOOM, wheelFactor, zoomAt } from './view.js';

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

describe('wheelFactor', () => {
	it('zooms in when scrolling up and out when scrolling down', () => {
		expect(wheelFactor(-100)).toBeGreaterThan(1);
		expect(wheelFactor(100)).toBeLessThan(1);
		expect(wheelFactor(0)).toBe(1);
	});
});
