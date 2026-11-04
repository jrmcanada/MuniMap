/** The office's time zone, which the daylight and moon dates are told in. */
export const TIME_ZONE = 'America/Toronto';

export const number = new Intl.NumberFormat('en-CA');
export const decimal = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1 });

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
const unit = (count: number, word: string, compound: boolean) =>
	compound ? `${count} ${word}` : plural(count, word);

/**
 * "2 hours 15 minutes" for a short trip, "11.4 days" for one so long it reads better that way.
 * `compound` gives "2 hour 15 minute", for use before a noun as in "a 2 hour 15 minute drive".
 */
export function formatTravelTime(minutes: number, compound = false): string {
	if (minutes >= 48 * 60) return `${decimal.format(minutes / (24 * 60))} days`;
	const hours = Math.floor(minutes / 60);
	const rest = Math.round(minutes % 60);
	if (hours === 0) return unit(rest, 'minute', compound);
	const hoursText = unit(hours, 'hour', compound);
	return rest === 0 ? hoursText : `${hoursText} ${unit(rest, 'minute', compound)}`;
}
