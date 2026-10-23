import { describe, it, expect } from 'vitest';
import { parseTimeDimension, readTimeDimension } from './capabilities.js';

describe('parseTimeDimension', () => {
	it('expands an interval into 6 minute steps', () => {
		const times = parseTimeDimension('2026-10-22T23:48:00Z/2026-10-23T02:48:00Z/PT6M');
		expect(times).toHaveLength(31);
		expect(times[0]).toBe('2026-10-22T23:48:00Z');
		expect(times[30]).toBe('2026-10-23T02:48:00Z');
	});

	it('accepts single times and several intervals, sorted and without duplicates', () => {
		const times = parseTimeDimension(
			'2026-10-23T01:00:00Z,2026-10-23T00:00:00Z/2026-10-23T00:12:00Z/PT6M,2026-10-23T00:12:00Z'
		);
		expect(times).toEqual([
			'2026-10-23T00:00:00Z',
			'2026-10-23T00:06:00Z',
			'2026-10-23T00:12:00Z',
			'2026-10-23T01:00:00Z'
		]);
	});

	it('rejects a period it cannot read', () => {
		expect(() => parseTimeDimension('2026-10-23T00:00:00Z/2026-10-23T01:00:00Z/P1D')).toThrow();
	});
});

describe('readTimeDimension', () => {
	it('finds the time dimension in a capabilities document', () => {
		const xml =
			'<Dimension name="time" units="ISO8601" default="x">2026-10-22T23:48:00Z/2026-10-23T02:48:00Z/PT6M</Dimension>';
		expect(readTimeDimension(xml)).toBe('2026-10-22T23:48:00Z/2026-10-23T02:48:00Z/PT6M');
	});

	it('throws when there is none', () => {
		expect(() => readTimeDimension('<Capability/>')).toThrow();
	});
});
