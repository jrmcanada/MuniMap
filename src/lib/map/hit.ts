import type { PinPoint } from './types.js';

/**
 * Index of the pin closest to a point, or -1 when none is within `maxDistance`. Where pins
 * crowd together, the nearest one wins.
 */
export function nearestPin(pins: PinPoint[], point: PinPoint, maxDistance: number): number {
	let nearest = -1;
	let best = maxDistance;
	pins.forEach((pin, index) => {
		const distance = Math.hypot(pin.x - point.x, pin.y - point.y);
		if (distance <= best) {
			best = distance;
			nearest = index;
		}
	});
	return nearest;
}
