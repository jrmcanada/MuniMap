const RAD = Math.PI / 180;
const UNIX_EPOCH_JULIAN_DAY = 2440587.5;
const J2000 = 2451545;

export interface SunTimes {
	sunrise: Date;
	sunset: Date;
}

function toDate(julianDay: number): Date {
	return new Date((julianDay - UNIX_EPOCH_JULIAN_DAY) * 86_400_000);
}

/**
 * Sunrise and sunset on a calendar day, from the NOAA sunrise equation. `year`, `month`
 * (1 to 12) and `day` are the local date. Returns null when the sun doesn't rise or set.
 */
export function sunTimes(
	latitude: number,
	longitude: number,
	year: number,
	month: number,
	day: number
): SunTimes | null {
	const noonUtc = Date.UTC(year, month - 1, day, 12);
	const julianDate = noonUtc / 86_400_000 + UNIX_EPOCH_JULIAN_DAY;
	const cycle = Math.ceil(julianDate - J2000 + 0.0008);
	const solarNoon = cycle - longitude / 360;

	const anomaly = (357.5291 + 0.98560028 * solarNoon) % 360;
	const centre =
		1.9148 * Math.sin(anomaly * RAD) +
		0.02 * Math.sin(2 * anomaly * RAD) +
		0.0003 * Math.sin(3 * anomaly * RAD);
	const eclipticLongitude = (anomaly + centre + 180 + 102.9372) % 360;
	const transit =
		J2000 +
		solarNoon +
		0.0053 * Math.sin(anomaly * RAD) -
		0.0069 * Math.sin(2 * eclipticLongitude * RAD);

	const sinDeclination = Math.sin(eclipticLongitude * RAD) * Math.sin(23.4397 * RAD);
	const cosDeclination = Math.cos(Math.asin(sinDeclination));
	const cosHourAngle =
		(Math.sin(-0.833 * RAD) - Math.sin(latitude * RAD) * sinDeclination) /
		(Math.cos(latitude * RAD) * cosDeclination);
	if (cosHourAngle < -1 || cosHourAngle > 1) return null;

	const hourAngle = Math.acos(cosHourAngle) / RAD;
	return { sunrise: toDate(transit - hourAngle / 360), sunset: toDate(transit + hourAngle / 360) };
}
