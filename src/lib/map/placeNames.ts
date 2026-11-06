import type { Place } from '#lib/data/places.js';
import { isClear, type Box } from './label.js';
import type { PinPoint } from './types.js';

const SIZE_RATIO = 0.0105;
const MIN_SIZE = 11;
/** How far a pin's keep-clear box reaches from its centre. */
const PIN_REACH = 8;
const MARGIN = 5;
/** Gap between a place's dot and its name, and the larger gap used beside a pin. */
const DOT_GAP = 5;
const PIN_GAP = 13;
/** A pin this close to a place is that place's own marker. */
const OWN_PIN_DISTANCE = 3;

export interface PlacedName {
	name: string;
	/** Where the place is; the dot is drawn here unless a pin already marks it. */
	x: number;
	y: number;
	hasPin: boolean;
	/** Top left corner of the name. */
	textX: number;
	textY: number;
}

export function placeNameSize(mapWidth: number): number {
	return Math.max(MIN_SIZE, mapWidth * SIZE_RATIO);
}

/**
 * Decides where each place name goes. A name tries the right, left, above and below its place and
 * takes the first spot that is on the map and clear of every pin and name already placed. If none is
 * clear it is dropped, unless the place is marked `keep`, which is then put on the first side that is
 * on the map. A place marked `side: left` takes the left even beside a pin, unless a name is in the
 * way. Places with `keep` are placed first so they get the best spots.
 * `positions[i]` is the screen position of `places[i]`; `pins` are the client and office pins.
 */
export function layoutPlaceNames(
	places: Place[],
	positions: PinPoint[],
	pins: PinPoint[],
	size: { width: number; height: number },
	fontSize: number,
	measure: (text: string) => number
): PlacedName[] {
	const taken: Box[] = pins.map(({ x, y }) => ({
		x: x - PIN_REACH,
		y: y - PIN_REACH,
		width: PIN_REACH * 2,
		height: PIN_REACH * 2
	}));
	/** Names and dots already placed, apart from the pins. */
	const marks: Box[] = [];
	const order = places
		.map((place, index) => ({ place, index }))
		.sort((a, b) => Number(b.place.keep ?? false) - Number(a.place.keep ?? false));
	const placed: PlacedName[] = [];

	for (const { place, index } of order) {
		const { x, y } = positions[index];
		if (!(x > 0 && x < size.width && y > 0 && y < size.height)) continue;
		const ownPin = pins.findIndex((pin) => Math.hypot(pin.x - x, pin.y - y) < OWN_PIN_DISTANCE);
		const others = ownPin >= 0 ? taken.filter((_, i) => i !== ownPin) : taken;
		const width = measure(place.name);
		const gap = ownPin >= 0 ? PIN_GAP : DOT_GAP;
		const across = ownPin >= 0 ? PIN_GAP + 1 : DOT_GAP + 2;
		const right = { x: x + gap, y: y - fontSize / 2 };
		const left = { x: x - gap - width, y: y - fontSize / 2 };
		const spots: PinPoint[] = [
			...(place.side === 'left' ? [left, right] : [right, left]),
			{ x: x - width / 2, y: y - across - fontSize },
			{ x: x - width / 2, y: y + across }
		];
		const box = (spot: PinPoint): Box => ({ ...spot, width, height: fontSize });
		const onMap = (spot: PinPoint) =>
			spot.x >= 0 &&
			spot.x + width <= size.width &&
			spot.y >= 0 &&
			spot.y + fontSize <= size.height;
		const dot: Box = { x: x - 3, y: y - 3, width: 6, height: 6 };
		const clear = (spot: PinPoint) => onMap(spot) && isClear(box(spot), others, MARGIN);

		// A place that asks for the left gets it, even beside a pin, unless another name is in the way.
		const leftWanted = place.side === 'left' && onMap(left) && isClear(box(left), marks, MARGIN);
		const spot = leftWanted
			? left
			: (spots.find(clear) ?? (place.keep ? spots.find(onMap) : undefined));
		if (!spot) continue;
		taken.push(box(spot));
		marks.push(box(spot));
		if (ownPin < 0) {
			taken.push(dot);
			marks.push(dot);
		}
		placed.push({ name: place.name, x, y, hasPin: ownPin >= 0, textX: spot.x, textY: spot.y });
	}
	return placed;
}
