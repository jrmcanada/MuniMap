import type { FactInputs, TickerFact } from './facts.js';
import { MAX_ROAD_AGE_MS } from './live.js';
import { listNames, plural } from './text.js';

/** How many highways are named in the snow and ice line. */
const MAX_HIGHWAYS = 3;

/** Collisions that leave the road open; ones that shut it are counted as closures. */
export function collisionsFact(inputs: FactInputs): TickerFact | null {
	const snapshot = inputs.roadEvents;
	if (!snapshot || inputs.now - snapshot.loadedAt > MAX_ROAD_AGE_MS) return null;
	const count = snapshot.events.filter(({ kind }) => kind === 'collision').length;
	return {
		id: 'collisions',
		text:
			count === 0
				? 'Ontario 511 lists no collisions right now, apart from any that shut the road.'
				: `Ontario 511 lists ${plural(count, 'collision')} right now, apart from any that shut the road.`
	};
}

/** A bare number such as "17" is a highway number; names such as "QEW" are used as they are. */
const highwayName = (roadway: string) => (/^\d+$/.test(roadway) ? `Highway ${roadway}` : roadway);

/** The highways with the most snow covered or icy sections. Skipped when there are none. */
export function hazardHighwaysFact(inputs: FactInputs): TickerFact | null {
	const snapshot = inputs.roadSections;
	if (!snapshot || inputs.now - snapshot.loadedAt > MAX_ROAD_AGE_MS) return null;
	const counts = new Map<string, number>();
	for (const { roadway, status } of snapshot.segments) {
		const name = roadway.trim();
		if (name && (status === 'snow' || status === 'ice'))
			counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	const worst = [...counts]
		.sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
		.slice(0, MAX_HIGHWAYS)
		.map(([name]) => highwayName(name));
	if (worst.length === 0) return null;
	return {
		id: 'hazard-highways',
		text: `Snow covered or icy road sections are on ${listNames(worst)}.`
	};
}
