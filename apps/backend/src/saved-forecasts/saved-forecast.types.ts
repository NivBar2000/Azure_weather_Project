import { ForecastResponse } from "../weather/weather.types";

export interface SaveForecastRequest {
  latitude: number;
  longitude: number;
  date: string;
}

export interface SavedForecastSummary {
  id: string;
  cityName: string;
  countryCode: string | null;
  latitude: number;
  longitude: number;
  savedAt: string;
  forecastStartDate: string | null;
  forecastEndDate: string | null;
}

export interface SavedForecastPage {
  items: SavedForecastSummary[];
  nextCursor: string | null;
}

export interface SavedForecastDetail extends SavedForecastSummary {
  forecast: ForecastResponse;
}
