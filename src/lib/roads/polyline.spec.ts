import { describe, it, expect } from 'vitest';
import { decodePolyline } from './polyline.js';

describe('decodePolyline', () => {
	it("decodes Google's documented example, as longitude then latitude", () => {
		expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
			[-120.2, 38.5],
			[-120.95, 40.7],
			[-126.453, 43.252]
		]);
	});

	it('reads six decimal places when asked', () => {
		const [point] = decodePolyline('_p~iF~ps|U', 6);
		expect(point[0]).toBeCloseTo(-12.02, 6);
	});

	it('gives nothing for an empty or cut off string', () => {
		expect(decodePolyline('')).toEqual([]);
		expect(decodePolyline('_p~iF')).toEqual([]);
		expect(decodePolyline('_p~iF~ps|')).toEqual([]);
	});
});
