// Builds src/lib/data/office-trips.json: the driving distance from the Sudbury office to
// each client municipality, for the status bar's travel facts. Rerun when municipalities change.
//
//   node scripts/build-office-trips.mjs
//
// Routing: the public OSRM demo server (https://router.project-osrm.org), using OpenStreetMap data
// (c) OpenStreetMap contributors, ODbL. Only municipality centre points are sent, never addresses.
import { readFileSync, writeFileSync } from 'node:fs';

const OUTPUT = 'src/lib/data/office-trips.json';

// Read the TypeScript data files as text; they hold plain object literals.
const read = (path) => readFileSync(path, 'utf8');
const places = [
	...read('src/lib/data/municipalities.ts').matchAll(
		/name: '([^']+)', longitude: (-?[\d.]+), latitude: (-?[\d.]+)/g
	)
].map(([, name, longitude, latitude]) => ({
	name,
	longitude: Number(longitude),
	latitude: Number(latitude)
}));
const [, officeLongitude, officeLatitude] =
	read('src/lib/data/office.ts').match(/longitude: (-?[\d.]+),\s*latitude: (-?[\d.]+)/) ?? [];
if (!places.length || !officeLongitude) throw new Error('Could not read the data files');

const points = [
	{ longitude: Number(officeLongitude), latitude: Number(officeLatitude) },
	...places
];
const coordinates = points.map((point) => `${point.longitude},${point.latitude}`).join(';');
const url = `https://router.project-osrm.org/table/v1/driving/${coordinates}?sources=0&annotations=distance`;

const response = await fetch(url);
if (!response.ok) throw new Error(`OSRM answered ${response.status}`);
const table = await response.json();
if (table.code !== 'Ok') throw new Error(`OSRM: ${table.code}`);

const trips = {};
places.forEach(({ name }, index) => {
	const metres = table.distances[0][index + 1];
	if (metres == null) throw new Error(`No route to ${name}`);
	trips[name] = { driveKm: Math.round(metres / 100) / 10 };
});
writeFileSync(OUTPUT, JSON.stringify(trips));
console.log(`${Object.keys(trips).length} trips written`);
