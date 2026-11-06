/** How far the map is zoomed and where: screen = base position * k + (x, y), in CSS pixels. */
export interface View {
	k: number;
	x: number;
	y: number;
}

export const FULL_VIEW: View = { k: 1, x: 0, y: 0 };
export const MAX_ZOOM = 8;
/** From this zoom on, every municipality is named on the map, not just the chosen towns. */
export const MUNICIPALITY_NAMES_ZOOM = 4;

/** Zoom change for one wheel event; smooth for trackpads, about 16% per notch of a mouse wheel. */
export function wheelFactor(deltaY: number): number {
	return Math.exp(-deltaY * 0.0015);
}

/**
 * Zooms by `factor` keeping the map point under `point` where it is.
 * Never zooms out past the full view, and never lets the map's edge pull inside the canvas.
 */
export function zoomAt(
	view: View,
	point: { x: number; y: number },
	factor: number,
	size: { width: number; height: number }
): View {
	const k = Math.min(MAX_ZOOM, Math.max(1, view.k * factor));
	const ratio = k / view.k;
	return {
		k,
		x: clamp(point.x - (point.x - view.x) * ratio, size.width * (1 - k), 0),
		y: clamp(point.y - (point.y - view.y) * ratio, size.height * (1 - k), 0)
	};
}

/** Drags the map by (dx, dy), keeping it covering the canvas. */
export function panBy(
	view: View,
	dx: number,
	dy: number,
	size: { width: number; height: number }
): View {
	return {
		k: view.k,
		x: clamp(view.x + dx, size.width * (1 - view.k), 0),
		y: clamp(view.y + dy, size.height * (1 - view.k), 0)
	};
}

type Point = { x: number; y: number };

/**
 * A two finger pinch: the map zooms by how much the fingers moved apart or together, and follows
 * the midpoint between them, so the map under the fingers stays under the fingers.
 */
export function pinchView(
	view: View,
	from: [Point, Point],
	to: [Point, Point],
	size: { width: number; height: number }
): View {
	const gap = (fingers: [Point, Point]) =>
		Math.hypot(fingers[0].x - fingers[1].x, fingers[0].y - fingers[1].y);
	const middle = (fingers: [Point, Point]) => ({
		x: (fingers[0].x + fingers[1].x) / 2,
		y: (fingers[0].y + fingers[1].y) / 2
	});
	if (gap(from) === 0) return view;
	const start = middle(from);
	const end = middle(to);
	const zoomed = zoomAt(view, start, gap(to) / gap(from), size);
	return panBy(zoomed, end.x - start.x, end.y - start.y, size);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
