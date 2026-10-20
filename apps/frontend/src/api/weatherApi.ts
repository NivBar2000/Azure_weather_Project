export interface LocationResult {
  name: string;
  country: string;
  state?: string;
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
  location: {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  timezoneOffsetSeconds: number;
  days: DailyForecast[];
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(
  /\/$/,
  "",
);

export async function searchLocations(
  query: string,
): Promise<LocationResult[]> {
  const url = createApiUrl("/weather/locations");
  url.searchParams.set("query", query);
  return requestJson<LocationResult[]>(url);
}

export async function fetchForecast(
  latitude: number,
  longitude: number,
): Promise<ForecastResponse> {
  const url = createApiUrl("/weather/forecast");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  return requestJson<ForecastResponse>(url);
}

function createApiUrl(path: string): URL {
  return new URL(`${API_BASE_URL}${path}`, window.location.origin);
}

async function requestJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("Weather API request failed");
  }
  return (await response.json()) as T;
}
