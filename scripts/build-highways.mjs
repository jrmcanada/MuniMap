// Builds src/lib/data/highways.json from Natural Earth's 10m roads (public domain).
// Usage: node scripts/build-highways.mjs <path to ne_10m_roads.geojson>
// Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_roads.geojson
import fs from 'node:fs';

// Longitude and latitude box around Ontario and its neighbours, wider than the pins need.
const BOX = { west: -96, east: -73, south: 41, north: 54 };
const KINDS = new Set(['Major Highway', 'Beltway', 'Bypass']);
// Canada's main routes (Highways 11 and 17, for one) are classed secondary; elsewhere they would clutter the map.
const isWanted = ({ type, sov_a3: country }) =>
	KINDS.has(type) || (type === 'Secondary Highway' && country === 'CAN');

const source = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const round = (n) => Math.round(n * 100) / 100;
const inBox = ([lon, lat]) =>
	lon >= BOX.west && lon <= BOX.east && lat >= BOX.south && lat <= BOX.north;

const lines = [];
for (const feature of source.features) {
	if (!isWanted(feature.properties)) continue;
	const { type, coordinates } = feature.geometry;
	const parts = type === 'LineString' ? [coordinates] : coordinates;
	for (const part of parts) {
		if (part.some(inBox)) lines.push(part.map(([lon, lat]) => [round(lon), round(lat)]));
	}
}

const output = {
	type: 'FeatureCollection',
	features: lines.map((coordinates) => ({
		type: 'Feature',
		properties: {},
		geometry: { type: 'LineString', coordinates }
	}))
};
fs.writeFileSync('src/lib/data/highways.json', JSON.stringify(output));
console.log(`${lines.length} highway lines`);
