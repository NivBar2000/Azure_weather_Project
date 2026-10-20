export interface LocationResult {
  name: string;
  country: string;
  state?: string;
  latitude: number;
  longitude: number;
}

export interface ForecastLocation {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface ForecastSlot {
  timestamp: string;
  localTime: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  weatherCode: number;
}

export interface DailyForecast {
  date: string;
  summary: string;
  weatherCode: number;
  minimumTemperature: number;
  maximumTemperature: number;
  averageHumidity: number;
  maximumWindSpeed: number;
  slots: ForecastSlot[];
}

export interface ForecastResponse {
  location: ForecastLocation;
  timezoneOffsetSeconds: number;
  days: DailyForecast[];
}
