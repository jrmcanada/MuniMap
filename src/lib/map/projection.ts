import { geoMercator, type GeoProjection } from 'd3-geo';
import type { Municipality } from '#lib/data/municipalities.js';
import type { PinPoint } from './types.js';

const PADDING_RATIO = 0.08;

/**
 * Web Mercator cropped to the area the pins cover. It must stay a plain `geoMercator`
 * (no rotate, no center): the radar bounding box in `#lib/radar/wms.ts` relies on it.
 */
export function createProjection(
	width: number,
	height: number,
	places: Municipality[]
): GeoProjection {
	const pad = Math.min(width, height) * PADDING_RATIO;
	return geoMercator().fitExtent(
		[
			[pad, pad],
			[width - pad, height - pad]
		],
		{
			type: 'MultiPoint',
			coordinates: places.map((place) => [place.longitude, place.latitude])
		}
	);
}

/** Screen position of each place, in the same order as `places`. */
export function projectPlaces(projection: GeoProjection, places: Municipality[]): PinPoint[] {
	return places.map((place) => {
		const [x, y] = projection([place.longitude, place.latitude]) ?? [NaN, NaN];
		return { x, y };
	});
}
