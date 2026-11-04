import type { MunicipalityFacts } from '#lib/data/facts.js';
import type { SiteWeather } from './types.js';

/** The kinds of weather in the bar, in the order they are drawn and listed. */
export const CONDITION_KINDS = ['rain', 'snow', 'clear', 'other'] as const;
export type ConditionKind = (typeof CONDITION_KINDS)[number];

/** A reading older than this is left out, like the ticker's "right now" facts. */
const MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Sorts Environment Canada's condition text ("Light Rain", "Mainly Clear", "Mostly Cloudy") by
 * keyword. Snow is checked first, so rain and snow together counts as snow. Cloud, mist and fog are
 * neither rain, snow nor clear, so they fall into "other".
 */
export function classifyCondition(text: string): ConditionKind {
	if (/snow|flurr|blizzard|ice pellet|sleet/i.test(text)) return 'snow';
	if (/rain|drizzle|shower|thunder/i.test(text)) return 'rain';
	if (/^(mainly )?(clear|sunny)$/i.test(text.trim())) return 'clear';
	return 'other';
}

export interface ConditionMix {
	/** Municipalities in each kind of weather. */
	counts: Record<ConditionKind, number>;
	/** Municipalities with a fresh reading that names a condition; the counts add up to this. */
	reporting: number;
}

export interface ConditionMixInputs {
	municipalities: { name: string }[];
	facts: Record<string, Pick<MunicipalityFacts, 'siteId'>>;
	/** Weather held for a forecast site, already filtered for age and expired warnings. */
	peekWeather: (siteId: string) => SiteWeather | null;
	/** Epoch milliseconds. */
	now: number;
}

/**
 * What the weather is across the municipalities right now. Each municipality counts once, using
 * its nearest forecast site, so sites shared by several municipalities weigh more, as they do in
 * the ticker's alert count. A site with no fresh reading or no condition text is left out.
 */
export function conditionMix(inputs: ConditionMixInputs): ConditionMix {
	const counts: Record<ConditionKind, number> = { rain: 0, snow: 0, clear: 0, other: 0 };
	let reporting = 0;
	for (const { name } of inputs.municipalities) {
		const weather = inputs.peekWeather(inputs.facts[name].siteId);
		const current = weather?.current;
		if (!weather || !current?.condition) continue;
		const observed = Date.parse(current.observedAt);
		if (inputs.now - weather.fetchedAt > MAX_AGE_MS || inputs.now - observed > MAX_AGE_MS) continue;
		counts[classifyCondition(current.condition)]++;
		reporting++;
	}
	return { counts, reporting };
}
