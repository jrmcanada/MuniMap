import type { RoadConditionRecord } from './roadConditions.js';

/**
 * Where road conditions come from. This is the one place to change when the Ontario 511 feed is
 * connected: return its records here (through a server route, because the 511 key must not reach
 * the browser). Until then, `npm run dev` shows made up sample roads so the layer can be built and
 * seen, and a production build returns null so nothing invented is ever shown on the wall display.
 */
export async function fetchRoadConditions(): Promise<RoadConditionRecord[] | null> {
	if (!import.meta.env.DEV) return null;
	return (await import('./sample-road-conditions.json')).default as RoadConditionRecord[];
}

/** Credit under the legend. Sample data says so, so nobody mistakes it for the real thing. */
export const ROAD_SOURCE_LABEL = import.meta.env.DEV
	? 'Sample data, not real conditions'
	: 'Road conditions: Ontario 511';
