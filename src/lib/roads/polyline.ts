/**
 * Decodes Google's encoded polyline format, which Ontario 511 uses for road geometry, into
 * [longitude, latitude] pairs. `precision` is the number of decimal places that were kept: 5 is the
 * usual, 6 is the other variant. Anything malformed gives an empty line, never an exception.
 */
export function decodePolyline(encoded: string, precision = 5): [number, number][] {
	const scale = 10 ** precision;
	const points: [number, number][] = [];
	let index = 0;
	let latitude = 0;
	let longitude = 0;

	/** One signed, zigzag encoded number, or null if the string ends partway through it. */
	const next = (): number | null => {
		let result = 0;
		let shift = 0;
		let byte: number;
		do {
			if (index >= encoded.length) return null;
			byte = encoded.charCodeAt(index++) - 63;
			result |= (byte & 0x1f) << shift;
			shift += 5;
		} while (byte >= 0x20);
		return result & 1 ? ~(result >> 1) : result >> 1;
	};

	while (index < encoded.length) {
		const latitudeStep = next();
		const longitudeStep = next();
		if (latitudeStep === null || longitudeStep === null) return [];
		latitude += latitudeStep;
		longitude += longitudeStep;
		points.push([longitude / scale, latitude / scale]);
	}
	return points;
}
