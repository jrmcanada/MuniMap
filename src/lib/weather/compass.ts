const POINTS = [
	'N',
	'NNE',
	'NE',
	'ENE',
	'E',
	'ESE',
	'SE',
	'SSE',
	'S',
	'SSW',
	'SW',
	'WSW',
	'W',
	'WNW',
	'NW',
	'NNW'
];

/** Compass bearing in degrees for a wind direction name such as "NW", or null if it isn't one. */
export function bearingOf(direction: string | undefined): number | null {
	const index = POINTS.indexOf((direction ?? '').trim().toUpperCase());
	return index < 0 ? null : index * 22.5;
}
