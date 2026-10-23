export const GEOMET_URL = 'https://geo.weather.gc.ca/geomet';
export const RAIN_LAYER = 'RADAR_1KM_RRAI';
export const SNOW_LAYER = 'RADAR_1KM_RSNO';

const PERIOD = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;

/** GeoMet wants whole seconds, no milliseconds: 2026-10-23T02:48:00Z. */
function toWmsTime(ms: number): string {
	return new Date(ms).toISOString().slice(0, 19) + 'Z';
}

function periodMs(period: string): number {
	const match = PERIOD.exec(period);
	if (!match) throw new Error(`Unsupported time period: ${period}`);
	const [, hours = '0', minutes = '0', seconds = '0'] = match;
	return ((Number(hours) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000;
}

/**
 * Expands a WMS time dimension into timestamps, oldest first. Accepts a comma list of
 * single times and `start/end/period` intervals.
 */
export function parseTimeDimension(value: string): string[] {
	const times = new Set<string>();
	for (const part of value.split(',')) {
		const [start, end, period] = part.trim().split('/');
		if (!start) continue;
		const first = Date.parse(start);
		if (Number.isNaN(first)) throw new Error(`Bad time: ${start}`);
		if (!end || !period) {
			times.add(toWmsTime(first));
			continue;
		}
		const step = periodMs(period);
		if (step <= 0) throw new Error(`Bad period: ${period}`);
		for (let t = first; t <= Date.parse(end); t += step) times.add(toWmsTime(t));
	}
	return [...times].sort();
}

/** Pulls the time dimension out of a GetCapabilities document. */
export function readTimeDimension(capabilitiesXml: string): string {
	const match = /<Dimension[^>]*name="time"[^>]*>([^<]+)</.exec(capabilitiesXml);
	if (!match) throw new Error('No time dimension in capabilities');
	return match[1];
}

export async function fetchFrameTimes(signal: AbortSignal): Promise<string[]> {
	const url = `${GEOMET_URL}?service=WMS&version=1.3.0&request=GetCapabilities&layer=${RAIN_LAYER}`;
	const response = await fetch(url, { signal });
	if (!response.ok) throw new Error(`Capabilities failed: ${response.status}`);
	return parseTimeDimension(readTimeDimension(await response.text()));
}
