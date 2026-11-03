const TIME_ZONE = 'America/Toronto';

const eventTime = new Intl.DateTimeFormat('en-CA', {
	timeZone: TIME_ZONE,
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit'
});

/** "Nov 3, 1:32 p.m." in Toronto time, which is how the rest of the display tells time. */
export function formatEventTime(milliseconds: number): string {
	return eventTime.format(new Date(milliseconds));
}
