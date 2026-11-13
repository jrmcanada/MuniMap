import type { MunicipalityFacts } from '#lib/data/facts.js';
import type { SiteWeather } from './types.js';

/** The kinds of weather in the bar, in the order they are drawn and listed. */
export const CONDITION_KINDS = ['rain', 'snow', 'clear', 'cloud', 'fog'] as const;
export type ConditionKind = (typeof CONDITION_KINDS)[number];

/** A site not fetched within this long is left out. */
const MAX_FETCH_AGE_MS = 60 * 60 * 1000;
/**
 * A station reading counts for this long. Stations report hourly and the reading arrives 15 to 35
 * minutes late, so a one hour limit would drop most stations for part of every hour.
 */
const MAX_OBSERVATION_AGE_MS = 2 * 60 * 60 * 1000;

/** Mostly sun counts as clear, including the partly cloudy, few-clouds and sun-and-cloud mixes. Mostly cloudy does not. */
const CLEAR_SKY =
	/^((mainly |mostly )?(clear|sunny)|partly cloudy|a few clouds|a mix of sun and cloud)$/i;

/**
 * Sorts Environment Canada's condition text ("Light Rain", "Mainly Clear", "Mostly Cloudy") by
 * keyword. Snow is checked first, so rain and snow together counts as snow. Mist, fog and the other
 * things that cut visibility (haze, smoke) share "fog". Anything left over counts as cloud.
 */
export function classifyCondition(text: string): ConditionKind {
	if (/snow|flurr|blizzard|ice pellet|sleet/i.test(text)) return 'snow';
	if (/rain|drizzle|shower|thunder/i.test(text)) return 'rain';
	if (CLEAR_SKY.test(text.trim())) return 'clear';
	if (/fog|mist|haze|smoke|dust/i.test(text)) return 'fog';
	return 'cloud';
}

/**
 * The weather a forecast describes, for a site whose station gives no usable reading. Only the first
 * sentence counts ("Cloudy. 40 percent chance of showers near noon." is cloud), and a "chance of"
 * phrase is dropped because a chance is not weather that is happening.
 */
function forecastCondition(summary: string): string {
	const first = summary.split(/\.\s/)[0].replace(/\s+with \d+ percent chance of [^.]*/i, '');
	return first.replace(/\.$/, '');
}

export interface ConditionMix {
	/** Municipalities in each kind of weather. */
	counts: Record<ConditionKind, number>;
	/** Municipalities with a condition, observed or forecast; the counts add up to this. */
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
 * the ticker's alert count. A site whose station gives no fresh condition (many send only a
 * temperature) uses the first period of its forecast instead. A site not fetched lately is left out.
 */
export function conditionMix(inputs: ConditionMixInputs): ConditionMix {
	const counts: Record<ConditionKind, number> = { rain: 0, snow: 0, clear: 0, cloud: 0, fog: 0 };
	let reporting = 0;
	for (const { name } of inputs.municipalities) {
		const weather = inputs.peekWeather(inputs.facts[name].siteId);
		if (!weather || inputs.now - weather.fetchedAt > MAX_FETCH_AGE_MS) continue;
		const current = weather.current;
		const fresh = current && inputs.now - Date.parse(current.observedAt) <= MAX_OBSERVATION_AGE_MS;
		const forecast = weather.forecast[0]?.summary;
		const condition =
			fresh && current.condition ? current.condition : forecast && forecastCondition(forecast);
		if (!condition) continue;
		counts[classifyCondition(condition)]++;
		reporting++;
	}
	return { counts, reporting };
}
