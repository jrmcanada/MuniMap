// Builds src/lib/data/municipality-facts.json: census figures and the nearest Environment
// Canada forecast site for each client municipality. Rerun when municipalities.ts changes.
//
//   1. Download https://www150.statcan.gc.ca/n1/tbl/csv/98100002-eng.zip and unzip it.
//   2. node scripts/build-municipality-data.mjs path/to/98100002.csv
//
// Census data: Statistics Canada, 2021 Census, table 98-10-0002-01.
// Forecast sites: Environment Canada citypageweather-realtime.
// Both are published under the Open Government Licence - Canada.
import { readFileSync, writeFileSync } from 'node:fs';

const CSV_PATH = process.argv[2];
if (!CSV_PATH) throw new Error('Usage: node scripts/build-municipality-data.mjs <98100002.csv>');

const SITES_URL =
	'https://api.weather.gc.ca/collections/citypageweather-realtime/items?f=json&lang=en&limit=2000';
const OUTPUT = 'src/lib/data/municipality-facts.json';
const MAX_SITE_KM = 100;

// Census names that differ from the names in municipalities.ts.
const CENSUS_NAME = {
	'Hilton Township': 'Hilton',
	'MacDonald, Meredith and Aberdeen': 'Macdonald, Meredith and Aberdeen Additional',
	Nairn: 'Nairn and Hyman',
	Plummer: 'Plummer Additional',
	Tarbutt: 'Tarbutt and Tarbutt Additional',
	'Gordon-Barrie Island': 'Gordon/Barrie Island',
	'Head, Clara, Maria': 'Head, Clara and Maria'
};
const ONTARIO_DISTRICTS = new Set([
	'Algoma',
	'Cochrane',
	'Kenora',
	'Manitoulin',
	'Nipissing',
	'Parry Sound',
	'Rainy River',
	'Sudbury',
	'Thunder Bay',
	'Timiskaming'
]);

const normalise = (name) =>
	name
		.toLowerCase()
		.replace(/[.']/g, '')
		.replace(/[/,-]/g, ' ')
		.replace(/ and /g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

function parseCsvLine(line) {
	return line
		.match(/("([^"]*)"|[^,]*)(,|$)/g)
		.map((cell) => cell.replace(/,$/, '').replace(/^"|"$/g, ''));
}

function readMunicipalityNames() {
	const source = readFileSync('src/lib/data/municipalities.ts', 'utf8');
	return [...source.matchAll(/name: '([^']+)'/g)].map((match) => match[1]);
}

function distanceKm([lon1, lat1], [lon2, lat2]) {
	const rad = Math.PI / 180;
	const a =
		Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
		Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
	return 12742 * Math.asin(Math.sqrt(a));
}

function readMunicipalityCoordinates() {
	const source = readFileSync('src/lib/data/municipalities.ts', 'utf8');
	return new Map(
		[...source.matchAll(/name: '([^']+)', longitude: (-?[\d.]+), latitude: (-?[\d.]+)/g)].map(
			(match) => [match[1], [Number(match[2]), Number(match[3])]]
		)
	);
}

// Column positions in the census CSV: each value is followed by a symbol column.
const COLUMN = { population: 4, change: 8, landArea: 22, density: 24 };
const EXPECTED_HEADERS = {
	[COLUMN.population]: 'Population, 2021',
	[COLUMN.change]: 'Population percentage change, 2016 to 2021',
	[COLUMN.landArea]: 'Land area in square kilometres, 2021',
	[COLUMN.density]: 'Population density per square kilometre, 2021'
};

const lines = readFileSync(CSV_PATH, 'utf8').split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(lines[0]);
for (const [index, title] of Object.entries(EXPECTED_HEADERS)) {
	if (!header[index]?.includes(title)) {
		throw new Error(`Column ${index} should be "${title}" but is "${header[index]}"`);
	}
}
// Footnote lines are short, so skip anything that isn't a full data row.
const rows = lines
	.slice(1)
	.map(parseCsvLine)
	.filter((row) => row.length > COLUMN.density && row[2]);
// DGUIDs encode the geography: 2021A0005 + 35 is a census subdivision in Ontario,
// 2021A0003 + 35 is an Ontario census division. The digits after that are the division code.
const subdivisions = rows.filter((row) => row[2].startsWith('2021A000535'));
const divisions = new Map(
	rows.filter((row) => row[2].startsWith('2021A000335')).map((row) => [row[2].slice(9), row[1]])
);

// The full site list is about 28 MB, so allow time.
const sitesResponse = await fetch(SITES_URL, { signal: AbortSignal.timeout(120_000) });
if (!sitesResponse.ok) throw new Error(`Site list failed: ${sitesResponse.status}`);
const sites = (await sitesResponse.json()).features;

const names = readMunicipalityNames();
const coordinates = readMunicipalityCoordinates();
if (names.length === 0 || names.length !== coordinates.size) {
	throw new Error(
		`Read ${names.length} names but ${coordinates.size} coordinates from municipalities.ts`
	);
}
const facts = {};
for (const name of names) {
	const key = normalise(CENSUS_NAME[name] ?? name);
	const matches = subdivisions.filter((row) => normalise(row[1]) === key);
	if (matches.length !== 1) throw new Error(`${name}: ${matches.length} census matches`);
	const row = matches[0];

	const divisionName = divisions.get(row[2].slice(9, 13));
	if (!divisionName) throw new Error(`${name}: no census division`);

	let nearest = null;
	for (const site of sites) {
		const km = distanceKm(coordinates.get(name), site.geometry.coordinates);
		if (!nearest || km < nearest.km) nearest = { km, site };
	}
	if (nearest.km > MAX_SITE_KM) throw new Error(`${name}: nearest site is ${nearest.km} km away`);

	facts[name] = {
		district: ONTARIO_DISTRICTS.has(divisionName)
			? `${divisionName} District`
			: `${divisionName} County`,
		population: Number(row[COLUMN.population]),
		populationChangePercent: Number(row[COLUMN.change]),
		landAreaKm2: Number(row[COLUMN.landArea]),
		densityPerKm2: Number(row[COLUMN.density]),
		siteId: nearest.site.id,
		siteName: nearest.site.properties.name.en
	};
}

writeFileSync(OUTPUT, JSON.stringify(facts, null, '\t') + '\n');
console.log(`Wrote ${Object.keys(facts).length} municipalities to ${OUTPUT}`);
