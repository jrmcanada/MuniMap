import { describe, it, expect } from 'vitest';
import { toEvents, type RoadEventRecord } from './events.js';
import samples from './sample-road-events.json';

const record = (overrides: Partial<RoadEventRecord> = {}): RoadEventRecord => ({
	ID: 1,
	RoadwayName: 'HWY 17',
	Description: 'Closed',
	EventType: 'closures',
	IsFullClosure: true,
	Latitude: 47.99,
	Longitude: -84.77,
	...overrides
});

describe('toEvents', () => {
	it('keeps a closure with its position, road and details', () => {
		const [event] = toEvents([
			record({
				DirectionOfTravel: 'Eastbound',
				LanesAffected: 'All lanes',
				LastUpdated: 1793700000,
				PlannedEndDate: 1793800000
			})
		]);
		expect(event).toEqual({
			id: 1,
			kind: 'closure',
			roadway: 'HWY 17',
			description: 'Closed',
			direction: 'Eastbound',
			lanesAffected: 'All lanes',
			updatedAt: 1793700000_000,
			plannedEndAt: 1793800000_000,
			longitude: -84.77,
			latitude: 47.99
		});
	});

	it('sorts events into closures, collisions and roadwork', () => {
		const kinds = toEvents([
			record({ ID: 1 }),
			record({ ID: 2, EventType: 'accidentsAndIncidents', IsFullClosure: false }),
			record({ ID: 3, EventType: 'roadwork' })
		]).map(({ kind }) => kind);
		expect(kinds).toEqual(['closure', 'collision', 'roadwork']);
	});

	it('calls any event that shuts the road a closure, such as a collision', () => {
		const collision = record({ EventType: 'accidentsAndIncidents', IsFullClosure: true });
		expect(toEvents([collision])[0].kind).toBe('closure');
	});

	it('shows roadwork only where it shuts the road, and never as a closure', () => {
		const events = toEvents([
			record({ ID: 1, EventType: 'roadwork', IsFullClosure: false }),
			record({ ID: 2, EventType: 'roadwork', IsFullClosure: true })
		]);
		expect(events.map(({ id, kind }) => [id, kind])).toEqual([[2, 'roadwork']]);
	});

	it('leaves out unknown event types, missing positions and repeats', () => {
		const missing = { ...record({ ID: 4 }), Latitude: null } as unknown as RoadEventRecord;
		expect(
			toEvents([
				record({ ID: 5, EventType: 'weather', IsFullClosure: false }),
				missing,
				record({ ID: 6, Longitude: -400 }),
				record(),
				record()
			])
		).toHaveLength(1);
	});

	it('drops "Unknown" and "All Directions", and empty details', () => {
		const [event] = toEvents([
			record({ DirectionOfTravel: 'All Directions', LanesAffected: '  ', LastUpdated: null })
		]);
		expect(event.direction).toBeNull();
		expect(event.lanesAffected).toBeNull();
		expect(event.updatedAt).toBeNull();
		expect(toEvents([record({ DirectionOfTravel: 'Unknown' })])[0].direction).toBeNull();
	});

	it('reads the bundled sample: three closures, one collision and two roadwork', () => {
		const events = toEvents(samples as RoadEventRecord[]);
		const count = (kind: string) => events.filter((event) => event.kind === kind).length;
		expect([count('closure'), count('collision'), count('roadwork')]).toEqual([3, 1, 2]);
		expect(events.find(({ id }) => id === 9002)?.kind).toBe('closure');
	});
});
