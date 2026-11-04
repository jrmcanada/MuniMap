/** An echo this opaque or more counts as precipitation; fainter pixels are only soft edges. */
const MIN_ALPHA = 64;

/** Where the radar shows precipitation, as the names of the places it lies over. */
export interface RadarCoverage {
	/** Names of the municipalities with precipitation over them. */
	wet: string[];
	/** The radar frame's own time, as an ISO string. */
	observedAt: string;
}

/**
 * Whether each point lies on a pixel of precipitation. `pixels` is RGBA, as from getImageData;
 * points outside the image have none.
 */
export function echoesAt(
	pixels: Uint8ClampedArray,
	width: number,
	height: number,
	points: { x: number; y: number }[]
): boolean[] {
	return points.map(({ x, y }) => {
		const column = Math.round(x);
		const row = Math.round(y);
		if (column < 0 || row < 0 || column >= width || row >= height) return false;
		return pixels[(row * width + column) * 4 + 3] >= MIN_ALPHA;
	});
}
