/**
 * Ontario towns and cities named on the map, so the pins have somewhere to sit. About 30, spread
 * across the map. Places that are also a client or the office (Wawa, Chapleau, Espanola, Tehkummah,
 * Ignace, Hornepayne, Sudbury) use the same position as their pin, and the map names them beside
 * it without a second dot. Add one by name and position; the map skips any name that would cover a
 * pin or another name, unless the place is marked keep.
 */
export interface Place {
	name: string;
	longitude: number;
	latitude: number;
	/** Always named, even if the name has to sit over something. */
	keep?: true;
	/** Try the left of the dot first; the default is the right. */
	side?: 'left';
}

export const places: Place[] = [
	{ name: 'Dryden', side: 'left', longitude: -92.83, latitude: 49.78 },
	{ name: 'Sioux Lookout', longitude: -91.92, latitude: 50.1 },
	{ name: 'Rainy River', keep: true, longitude: -94.567, latitude: 48.717 },
	{ name: 'Atikokan', longitude: -91.62, latitude: 48.76 },
	{ name: 'Thunder Bay', longitude: -89.25, latitude: 48.38 },
	{ name: 'Geraldton', longitude: -86.95, latitude: 49.72 },
	{ name: 'Marathon', longitude: -86.38, latitude: 48.72 },
	{ name: 'Sault Ste. Marie', keep: true, side: 'left', longitude: -84.35, latitude: 46.52 },
	{ name: 'Hearst', longitude: -83.67, latitude: 49.69 },
	{ name: 'Kapuskasing', keep: true, longitude: -82.43, latitude: 49.42 },
	{ name: 'Timmins', longitude: -81.33, latitude: 48.48 },
	{ name: 'Espanola', keep: true, longitude: -81.757, latitude: 46.242 },
	{ name: 'North Bay', keep: true, longitude: -79.46, latitude: 46.31 },
	{ name: 'Parry Sound', keep: true, longitude: -80.04, latitude: 45.35 },
	{ name: 'Owen Sound', keep: true, side: 'left', longitude: -80.94, latitude: 44.57 },
	{ name: 'Barrie', longitude: -79.69, latitude: 44.39 },
	{ name: 'Toronto', longitude: -79.38, latitude: 43.65 },
	{ name: 'Peterborough', longitude: -78.32, latitude: 44.3 },
	{ name: 'Sudbury', keep: true, longitude: -80.993, latitude: 46.49 },
	{ name: 'Nipigon', keep: true, side: 'left', longitude: -88.26, latitude: 49.015 },
	{ name: 'New Liskeard', keep: true, longitude: -79.68, latitude: 47.51 },
	{ name: 'Chapleau', keep: true, longitude: -83.4, latitude: 47.844 },
	{ name: 'Tehkummah', keep: true, side: 'left', longitude: -82.047, latitude: 45.632 },
	{ name: 'Ignace', keep: true, longitude: -91.677, latitude: 49.408 },
	{ name: 'Hornepayne', keep: true, longitude: -84.782, latitude: 49.253 },
	{ name: 'Wawa', keep: true, side: 'left', longitude: -84.774, latitude: 47.994 },
	{ name: 'Bancroft', keep: true, longitude: -77.853, latitude: 45.06 },
	{ name: 'Waterloo', keep: true, side: 'left', longitude: -80.52, latitude: 43.464 },
	{ name: 'London', keep: true, longitude: -81.246, latitude: 42.984 },
	{ name: 'Pembroke', longitude: -77.11, latitude: 45.83 }
];
