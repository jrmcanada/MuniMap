const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
	let formatter = formatters.get(timeZone);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' });
		formatters.set(timeZone, formatter);
	}
	return formatter;
}

/** "2026-10-23T02:48:00Z" in America/Toronto becomes "10:48 pm". */
export function formatClockTime(time: string | Date, timeZone: string): string {
	// Newer ICU versions put a narrow no-break space before AM or PM; normalise it.
	return formatterFor(timeZone)
		.format(new Date(time))
		.replace(/\s+/g, ' ')
		.replace(/ [AP]M$/i, (suffix) => suffix.toLowerCase());
}

export function formatRadarTime(time: string): string {
	return formatClockTime(time, 'America/Toronto');
}
