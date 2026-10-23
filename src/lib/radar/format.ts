const toronto = new Intl.DateTimeFormat('en-US', {
	timeZone: 'America/Toronto',
	hour: 'numeric',
	minute: '2-digit'
});

/** "2026-10-23T02:48:00Z" becomes "10:48 pm" in Toronto time. */
export function formatRadarTime(time: string): string {
	return toronto.format(new Date(time)).replace(/\s?[AP]M$/i, (suffix) => suffix.toLowerCase());
}
