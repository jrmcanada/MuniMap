import type { SunTimes } from './sun.js';

/** The half ellipse the sun travels along, in the sun arc drawing's own units. */
export const SUN_ARC = {
	left: 20,
	right: 280,
	baseline: 80,
	centreX: 150,
	radiusX: 130,
	radiusY: 62
};

export interface SunPosition {
	x: number;
	y: number;
}

/** Where the sun sits on the arc at `now`, or null when it is below the horizon. */
export function sunPosition(now: Date, sun: SunTimes): SunPosition | null {
	const start = sun.sunrise.getTime();
	const progress = (now.getTime() - start) / (sun.sunset.getTime() - start);
	if (!(progress >= 0 && progress <= 1)) return null;

	const angle = Math.PI * progress;
	return {
		x: SUN_ARC.centreX - SUN_ARC.radiusX * Math.cos(angle),
		y: SUN_ARC.baseline - SUN_ARC.radiusY * Math.sin(angle)
	};
}
