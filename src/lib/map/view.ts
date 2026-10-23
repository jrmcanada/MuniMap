/** How far the map is zoomed and where: screen = base position * k + (x, y), in CSS pixels. */
export interface View {
	k: number;
	x: number;
	y: number;
}

export const FULL_VIEW: View = { k: 1, x: 0, y: 0 };
export const MAX_ZOOM = 8;

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

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
