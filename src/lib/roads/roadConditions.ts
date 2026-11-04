import { decodePolyline } from './polyline.js';
import { classifyConditions, type RoadStatus } from './status.js';

/**
 * One record of Ontario 511's road conditions feed (https://511on.ca/help/endpoint/roadconditions),
 * as documented. Only the fields the map uses are listed.
 */
export interface RoadConditionRecord {
	RoadwayName: string;
	LocationDescription: string;
	Condition: string[];
	/** Documented as a string but shown as a one item list in the sample, so both are accepted. */
	EncodedPolyline: string | string[];
	/** Unix time, in seconds. */
	LastUpdated: number;
}

/** A stretch of road ready to draw. */
export interface RoadSegment {
	roadway: string;
	location: string;
	status: RoadStatus;
	/** [longitude, latitude] pairs. */
	coordinates: [number, number][];
}

/**
 * Turns feed records into drawable segments. A record whose condition is not recognised, or whose
 * line is empty or malformed, is skipped: a missing road is better than a wrong colour.
 */
/** The road segments from the latest successful refresh, and when it arrived (epoch milliseconds). */
export interface RoadSegmentSnapshot {
	segments: RoadSegment[];
	loadedAt: number;
}

export function toSegments(records: RoadConditionRecord[]): RoadSegment[] {
	const segments: RoadSegment[] = [];
	for (const record of records) {
		const status = classifyConditions(record.Condition ?? []);
		const lines = [record.EncodedPolyline].flat().filter(Boolean);
		if (!status) continue;
		for (const line of lines) {
			const coordinates = decodePolyline(line);
			if (coordinates.length < 2) continue;
			segments.push({
				roadway: record.RoadwayName,
				location: record.LocationDescription,
				status,
				coordinates
			});
		}
	}
	return segments;
}
