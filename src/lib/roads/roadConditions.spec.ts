import { describe, it, expect } from 'vitest';
import { toSegments, type RoadConditionRecord } from './roadConditions.js';
import samples from './sample-road-conditions.json';

const GOOGLE_EXAMPLE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

const record = (overrides: Partial<RoadConditionRecord> = {}): RoadConditionRecord => ({
	RoadwayName: '17',
	LocationDescription: 'From Wawa to Marathon',
	Condition: ['Snow covered'],
	EncodedPolyline: [GOOGLE_EXAMPLE],
	LastUpdated: 1793000000,
	...overrides
});

describe('toSegments', () => {
	it('draws a record as a coloured line', () => {
		const [segment] = toSegments([record()]);
		expect(segment.status).toBe('snow');
		expect(segment.roadway).toBe('17');
		expect(segment.coordinates).toHaveLength(3);
	});

	it('accepts the line as a plain string too', () => {
		expect(toSegments([record({ EncodedPolyline: GOOGLE_EXAMPLE })])).toHaveLength(1);
	});

	it('skips unknown conditions, empty lines and malformed lines', () => {
		expect(
			toSegments([
				record({ Condition: ['Construction zone'] }),
				record({ EncodedPolyline: [] }),
				record({ EncodedPolyline: ['_p~iF'] })
			])
		).toEqual([]);
	});

	it('copes with a record that has no condition list', () => {
		const broken = { ...record(), Condition: undefined } as unknown as RoadConditionRecord;
		expect(toSegments([broken])).toEqual([]);
	});

	it('reads the bundled sample', () => {
		const segments = toSegments(samples as RoadConditionRecord[]);
		expect(segments.length).toBeGreaterThan(5);
		for (const { coordinates } of segments) {
			for (const [longitude, latitude] of coordinates) {
				expect(longitude).toBeGreaterThan(-96);
				expect(longitude).toBeLessThan(-73);
				expect(latitude).toBeGreaterThan(41);
				expect(latitude).toBeLessThan(53);
			}
		}
		expect(new Set(segments.map(({ status }) => status)).size).toBeGreaterThan(2);
	});
});
