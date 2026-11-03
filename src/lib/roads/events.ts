/**
 * One record of Ontario 511's events feed (https://511on.ca/help/endpoint/event), as documented.
 * Only the fields the map uses are listed; the optional ones are often empty in the feed.
 */
export interface RoadEventRecord {
	ID: number;
	RoadwayName: string;
	Description: string;
	/** Documented values: roadwork, closures, accidentsAndIncidents. */
	EventType: string;
	IsFullClosure: boolean;
	Latitude: number;
	Longitude: number;
	/** Documented values include "Northbound", "All Directions" and "Unknown". */
	DirectionOfTravel?: string | null;
	LanesAffected?: string | null;
	/** Unix time, in seconds. */
	LastUpdated?: number | null;
	PlannedEndDate?: number | null;
}

/** What the symbol on the map stands for. */
export const EVENT_KINDS = ['roadwork', 'collision', 'closure'] as const;
export type RoadEventKind = (typeof EVENT_KINDS)[number];

/** A road event ready to mark on the map. */
export interface RoadEvent {
	id: number;
	kind: RoadEventKind;
	roadway: string;
	description: string;
	direction: string | null;
	lanesAffected: string | null;
	/** Unix time in milliseconds, or null when the feed gives none. */
	updatedAt: number | null;
	plannedEndAt: number | null;
	longitude: number;
	latitude: number;
}

const isCoordinate = (value: unknown, limit: number): value is number =>
	typeof value === 'number' && Math.abs(value) <= limit;

/** Feed times are Unix seconds; the map works in milliseconds. */
const toMilliseconds = (seconds: number | null | undefined): number | null =>
	typeof seconds === 'number' && seconds > 0 ? seconds * 1000 : null;

/** A shut road is a closure whatever 511 filed it under, so a collision that shuts a highway counts. */
function kindOf(record: RoadEventRecord): RoadEventKind | null {
	if (record.EventType === 'closures' || record.IsFullClosure === true) return 'closure';
	if (record.EventType === 'accidentsAndIncidents') return 'collision';
	if (record.EventType === 'roadwork') return 'roadwork';
	return null;
}

/** "Unknown" and "All Directions" say nothing worth showing. */
function directionOf(record: RoadEventRecord): string | null {
	const direction = record.DirectionOfTravel?.trim();
	return direction && !/^(unknown|all directions)$/i.test(direction) ? direction : null;
}

/**
 * Sorts feed records into closures, collisions and roadwork. Events of any other type, or with no
 * usable position, are skipped, and an event repeated in the feed is kept once.
 */
export function toEvents(records: RoadEventRecord[]): RoadEvent[] {
	const events = new Map<number, RoadEvent>();
	for (const record of records) {
		const kind = kindOf(record);
		if (!kind) continue;
		if (!isCoordinate(record.Latitude, 90) || !isCoordinate(record.Longitude, 180)) continue;
		events.set(record.ID, {
			id: record.ID,
			kind,
			roadway: record.RoadwayName,
			description: record.Description,
			direction: directionOf(record),
			lanesAffected: record.LanesAffected?.trim() || null,
			updatedAt: toMilliseconds(record.LastUpdated),
			plannedEndAt: toMilliseconds(record.PlannedEndDate),
			longitude: record.Longitude,
			latitude: record.Latitude
		});
	}
	return [...events.values()];
}
