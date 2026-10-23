/** Ontario's Central zone covers the far west; everywhere else here is Eastern. */
export function timeZoneAt(longitude: number): string {
	return longitude < -90 ? 'America/Winnipeg' : 'America/Toronto';
}

/** The calendar date at `now` in a time zone. */
export function localDate(
	now: Date,
	timeZone: string
): { year: number; month: number; day: number } {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: 'numeric',
		day: 'numeric'
	}).formatToParts(now);
	const read = (type: string) => Number(parts.find((part) => part.type === type)!.value);
	return { year: read('year'), month: read('month'), day: read('day') };
}
