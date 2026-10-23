/** Wider radar frames add memory but no detail: the source is a 1 km grid. */
export const MAX_RADAR_WIDTH = 1600;

/**
 * The size to request radar frames at for a canvas of this size: the same shape, no wider than
 * the cap. The frames are drawn stretched to the canvas, so the map lines up either way.
 */
export function radarRequestSize(width: number, height: number): { width: number; height: number } {
	if (width <= MAX_RADAR_WIDTH) return { width, height };
	const scale = MAX_RADAR_WIDTH / width;
	return { width: MAX_RADAR_WIDTH, height: Math.max(1, Math.round(height * scale)) };
}
