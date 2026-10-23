import type { GeoProjection } from 'd3-geo';
import { GEOMET_URL } from './capabilities.js';

/** EPSG:3857 extent in metres, in WMS 1.3.0 order for that CRS: x then y. */
export interface Bbox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

const EARTH_RADIUS = 6378137;

/**
 * The Web Mercator extent of the whole canvas. Only valid for a `geoMercator` with no
 * rotate and no center, where pixel x = k * longitude + tx and y = ty - k * mercatorY.
 */
export function canvasBbox(projection: GeoProjection, width: number, height: number): Bbox {
	const k = projection.scale();
	const [tx, ty] = projection.translate();
	return {
		minX: (EARTH_RADIUS * (0 - tx)) / k,
		maxX: (EARTH_RADIUS * (width - tx)) / k,
		minY: (EARTH_RADIUS * (ty - height)) / k,
		maxY: (EARTH_RADIUS * ty) / k
	};
}

export interface GetMapRequest {
	layer: string;
	time: string;
	bbox: Bbox;
	width: number;
	height: number;
}

export function buildGetMapUrl({ layer, time, bbox, width, height }: GetMapRequest): string {
	const params = new URLSearchParams({
		service: 'WMS',
		version: '1.3.0',
		request: 'GetMap',
		layers: layer,
		styles: '',
		format: 'image/png',
		transparent: 'true',
		crs: 'EPSG:3857',
		bbox: `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`,
		width: String(width),
		height: String(height),
		time
	});
	return `${GEOMET_URL}?${params}`;
}
