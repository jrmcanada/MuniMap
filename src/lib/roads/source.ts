import type { RoadEventRecord } from './events.js';
import type { RoadConditionRecord } from './roadConditions.js';

/** True while the roads on the map are made up, which only `npm run dev` without a key can do. */
let usingSample = false;

/**
 * Loads one feed from our own server routes, which hold the Ontario 511 key. If the route fails,
 * `npm run dev` falls back to made up sample roads so the layer can be built and seen; a
 * production build returns null so nothing invented is ever shown on the wall display.
 */
async function load<Record>(
	path: string,
	sample: () => Promise<{ default: unknown }>
): Promise<Record[] | null> {
	const response = await fetch(path).catch(() => null);
	if (response?.ok) {
		usingSample = false;
		return (await response.json()) as Record[];
	}
	if (!import.meta.env.DEV) return null;
	usingSample = true;
	return (await sample()).default as Record[];
}

export const fetchRoadConditions = () =>
	load<RoadConditionRecord>('/api/road-conditions', () => import('./sample-road-conditions.json'));

export const fetchRoadEvents = () =>
	load<RoadEventRecord>('/api/road-events', () => import('./sample-road-events.json'));

/** Credit under the legend. Sample data says so, so nobody mistakes it for the real thing. */
export const roadSourceLabel = () =>
	usingSample ? 'Sample data, not real conditions' : 'Road conditions: Ontario 511';
