const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const UNIX_EPOCH_JULIAN_DAY = 2440587.5;
const J2000 = 2451545;
const OBLIQUITY = 23.4397 * RAD;
/** Altitude of the moon's centre at moonrise and moonset: refraction less parallax, in degrees. */
const RISE_ALTITUDE = 0.133;
const SCAN_STEP_MS = 10 * 60_000;
/** The moon is never up for longer than this in one stretch. */
const LONGEST_PASS_MS = 26 * 3_600_000;

export interface MoonPass {
	rise: Date;
	set: Date;
}

interface Equatorial {
	rightAscension: number;
	declination: number;
	distanceKm: number;
}

function daysSinceJ2000(time: Date): number {
	return time.getTime() / DAY_MS + UNIX_EPOCH_JULIAN_DAY - J2000;
}

function toEquatorial(
	longitude: number,
	latitude: number
): Pick<Equatorial, 'rightAscension' | 'declination'> {
	return {
		rightAscension: Math.atan2(
			Math.sin(longitude) * Math.cos(OBLIQUITY) - Math.tan(latitude) * Math.sin(OBLIQUITY),
			Math.cos(longitude)
		),
		declination: Math.asin(
			Math.sin(latitude) * Math.cos(OBLIQUITY) +
				Math.cos(latitude) * Math.sin(OBLIQUITY) * Math.sin(longitude)
		)
	};
}

/** Low precision lunar position, good to well under a degree. */
function moonCoordinates(days: number): Equatorial {
	const meanLongitude = (218.316 + 13.176396 * days) * RAD;
	const anomaly = (134.963 + 13.064993 * days) * RAD;
	const node = (93.272 + 13.22935 * days) * RAD;
	return {
		...toEquatorial(meanLongitude + 6.289 * RAD * Math.sin(anomaly), 5.128 * RAD * Math.sin(node)),
		distanceKm: 385001 - 20905 * Math.cos(anomaly)
	};
}

function sunCoordinates(days: number): Pick<Equatorial, 'rightAscension' | 'declination'> {
	const anomaly = (357.5291 + 0.98560028 * days) * RAD;
	const centre =
		(1.9148 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly) + 0.0003 * Math.sin(3 * anomaly)) *
		RAD;
	return toEquatorial(anomaly + centre + 102.9372 * RAD + Math.PI, 0);
}

/** Height of the moon's centre above the horizon, in degrees. `longitude` is east positive. */
function moonAltitude(time: Date, latitude: number, longitude: number): number {
	const days = daysSinceJ2000(time);
	const { rightAscension, declination } = moonCoordinates(days);
	const hourAngle = (280.16 + 360.9856235 * days + longitude) * RAD - rightAscension;
	const phi = latitude * RAD;
	return (
		Math.asin(
			Math.sin(phi) * Math.sin(declination) +
				Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle)
		) / RAD
	);
}

/** Where `isUp` flips between two times, found by halving the gap. */
function crossing(from: number, to: number, isUp: (time: number) => boolean): Date {
	let [low, high] = [from, to];
	const upAtLow = isUp(low);
	while (Math.abs(high - low) > 1000) {
		const middle = (low + high) / 2;
		if (isUp(middle) === upAtLow) low = middle;
		else high = middle;
	}
	return new Date((low + high) / 2);
}

/**
 * The stretch of time the moon is above the horizon around `now`, or null when it is below it.
 * The stretch can start the day before and end the day after.
 */
export function moonPass(now: Date, latitude: number, longitude: number): MoonPass | null {
	const isUp = (time: number) => moonAltitude(new Date(time), latitude, longitude) > RISE_ALTITUDE;
	const start = now.getTime();
	if (!isUp(start)) return null;

	const edge = (direction: 1 | -1): Date | null => {
		for (let elapsed = SCAN_STEP_MS; elapsed <= LONGEST_PASS_MS; elapsed += SCAN_STEP_MS) {
			const time = start + direction * elapsed;
			if (!isUp(time)) return crossing(time, time - direction * SCAN_STEP_MS, isUp);
		}
		return null;
	};
	const rise = edge(-1);
	const set = edge(1);
	return rise && set ? { rise, set } : null;
}

/**
 * How far through its cycle the moon is: 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter.
 */
export function moonPhase(time: Date): number {
	const days = daysSinceJ2000(time);
	const moon = moonCoordinates(days);
	const sun = sunCoordinates(days);
	const sunDistanceKm = 149_598_000;

	const separation = Math.acos(
		Math.sin(sun.declination) * Math.sin(moon.declination) +
			Math.cos(sun.declination) *
				Math.cos(moon.declination) *
				Math.cos(sun.rightAscension - moon.rightAscension)
	);
	const incidence = Math.atan2(
		sunDistanceKm * Math.sin(separation),
		moon.distanceKm - sunDistanceKm * Math.cos(separation)
	);
	const bearing = Math.atan2(
		Math.cos(sun.declination) * Math.sin(sun.rightAscension - moon.rightAscension),
		Math.sin(sun.declination) * Math.cos(moon.declination) -
			Math.cos(sun.declination) *
				Math.sin(moon.declination) *
				Math.cos(sun.rightAscension - moon.rightAscension)
	);
	return 0.5 + (0.5 * incidence * (bearing < 0 ? -1 : 1)) / Math.PI;
}
