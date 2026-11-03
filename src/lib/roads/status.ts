/**
 * How a stretch of road looks on the map. Ordered best to worst: where Ontario 511 lists several
 * conditions for one stretch, the worst one wins.
 */
export const ROAD_STATUSES = ['clear', 'wet', 'snow', 'ice'] as const;
export type RoadStatus = (typeof ROAD_STATUSES)[number];

/**
 * Ontario 511 gives the condition as free text and publishes no full list of values, only
 * examples ("Bare and dry road", "snow packed", "snow covered", "bare and wet road"). Each text is
 * sorted by keyword, worst first. Anything unrecognised is null and the road is left undrawn.
 */
const KEYWORDS: [RoadStatus, RegExp][] = [
	['ice', /\b(ice|icy|freezing|black ice)\b/i],
	['snow', /\b(snow|slush|drift)/i],
	['wet', /\b(wet|slippery|water)\b/i],
	['clear', /\b(dry|bare)\b/i]
];

function classifyText(text: string): RoadStatus | null {
	return KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

/** "Bare and wet road" is wet, not clear: the worst keyword in the text decides. */
export function classifyConditions(conditions: string[]): RoadStatus | null {
	let worst: RoadStatus | null = null;
	for (const text of conditions) {
		const status = classifyText(text);
		if (status && (!worst || ROAD_STATUSES.indexOf(status) > ROAD_STATUSES.indexOf(worst))) {
			worst = status;
		}
	}
	return worst;
}
