import type { PinPoint } from './types.js';

const GAP = 12;
const EDGE = 8;

export interface LabelSize {
	width: number;
	height: number;
}

/**
 * Top left corner for a label beside a pin: to the right, flipped to the left when it
 * would run off the map, and nudged so it stays inside the map.
 */
export function placeLabel(
	pin: PinPoint,
	label: LabelSize,
	mapWidth: number,
	mapHeight: number
): PinPoint {
	const fitsRight = pin.x + GAP + label.width + EDGE <= mapWidth;
	const x = fitsRight ? pin.x + GAP : pin.x - GAP - label.width;
	const y = pin.y - label.height / 2;
	return {
		x: Math.min(Math.max(x, EDGE), mapWidth - label.width - EDGE),
		y: Math.min(Math.max(y, EDGE), mapHeight - label.height - EDGE)
	};
}

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** True when `box`, grown by `margin` on every side, touches none of the `obstacles`. */
export function isClear(box: Box, obstacles: Box[], margin: number): boolean {
	return obstacles.every(
		(other) =>
			box.x + box.width + margin <= other.x ||
			other.x + other.width + margin <= box.x ||
			box.y + box.height + margin <= other.y ||
			other.y + other.height + margin <= box.y
	);
}
