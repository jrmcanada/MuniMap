import { describe, it, expect } from 'vitest';
import { municipalities } from '#lib/data/municipalities.js';
import { createProjection } from '#lib/map/projection.js';
import { buildGetMapUrl, canvasBbox } from './wms.js';

const EARTH_RADIUS = 6378137;

describe('canvasBbox', () => {
	it('puts a known place on the same pixel as the projection does', () => {
		const width = 1000;
		const height = 800;
		const projection = createProjection(width, height, municipalities);
		const bbox = canvasBbox(projection, width, height);

		const [longitude, latitude] = [-80.99, 46.49]; // Sudbury
		const x = EARTH_RADIUS * ((longitude * Math.PI) / 180);
		const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));
		const pixelX = ((x - bbox.minX) / (bbox.maxX - bbox.minX)) * width;
		const pixelY = ((bbox.maxY - y) / (bbox.maxY - bbox.minY)) * height;

		const [expectedX, expectedY] = projection([longitude, latitude])!;
		expect(pixelX).toBeCloseTo(expectedX, 3);
		expect(pixelY).toBeCloseTo(expectedY, 3);
	});
});

describe('buildGetMapUrl', () => {
	it('asks for one transparent PNG layer in Web Mercator', () => {
		const url = new URL(
			buildGetMapUrl({
				layer: 'RADAR_1KM_RRAI',
				time: '2026-10-23T02:48:00Z',
				bbox: { minX: -10, minY: 20, maxX: 30, maxY: 40 },
				width: 1440,
				height: 1080
			})
		);
		expect(url.origin + url.pathname).toBe('https://geo.weather.gc.ca/geomet');
		expect(Object.fromEntries(url.searchParams)).toMatchObject({
			request: 'GetMap',
			layers: 'RADAR_1KM_RRAI',
			crs: 'EPSG:3857',
			bbox: '-10,20,30,40',
			width: '1440',
			height: '1080',
			time: '2026-10-23T02:48:00Z',
			transparent: 'true'
		});
	});
});
