export interface CurrentConditions {
	observedAt: string;
	temperatureC: number;
	feelsLikeC?: number;
	condition?: string;
	iconUrl?: string;
	/** A number in km/h, or the feed's word for no wind. */
	windSpeedKmh?: number | 'calm';
	windDirection?: string;
	windGustKmh?: number;
	humidityPercent?: number;
}

export interface ForecastPeriod {
	name: string;
	temperatureC?: number;
	temperatureKind?: 'high' | 'low';
	summary?: string;
}

export type WarningLevel = 'red' | 'orange' | 'yellow' | 'other';

export interface WeatherWarning {
	description: string;
	level: WarningLevel;
}

export interface SiteWeather {
	current: CurrentConditions | null;
	forecast: ForecastPeriod[];
	warnings: WeatherWarning[];
	/** When this was fetched, in epoch milliseconds. */
	fetchedAt: number;
}
