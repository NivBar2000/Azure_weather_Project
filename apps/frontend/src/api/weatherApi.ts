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

export interface CurrentUser {
  id: string;
  displayName: string;
  identityProvider: string;
  createdAt: string;
  updatedAt: string;
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

export type AccessTokenProvider = () => Promise<string>;

export interface WeatherApiClient {
  getCurrentUser(): Promise<CurrentUser>;
  searchLocations(query: string): Promise<LocationResult[]>;
  fetchForecast(latitude: number, longitude: number): Promise<ForecastResponse>;
  saveForecast(
    latitude: number,
    longitude: number,
    date: string,
  ): Promise<SavedForecastDetail>;
  listSavedForecasts(cursor?: string): Promise<SavedForecastPage>;
  getSavedForecast(id: string): Promise<SavedForecastDetail>;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(
  /\/$/,
  "",
);

export function createWeatherApiClient(
  getAccessToken: AccessTokenProvider,
): WeatherApiClient {
  return {
    getCurrentUser: () =>
      requestJson<CurrentUser>(createApiUrl("/auth/me"), getAccessToken),
    searchLocations: (query) => {
      const url = createApiUrl("/weather/locations");
      url.searchParams.set("query", query);
      return requestJson<LocationResult[]>(url, getAccessToken);
    },
    fetchForecast: (latitude, longitude) => {
      const url = createApiUrl("/weather/forecast");
      url.searchParams.set("lat", String(latitude));
      url.searchParams.set("lon", String(longitude));
      return requestJson<ForecastResponse>(url, getAccessToken);
    },
    saveForecast: (latitude, longitude, date) =>
      requestJson<SavedForecastDetail>(
        createApiUrl("/saved-forecasts"),
        getAccessToken,
        {
          method: "POST",
          body: JSON.stringify({ latitude, longitude, date }),
        },
      ),
    listSavedForecasts: (cursor) => {
      const url = createApiUrl("/saved-forecasts");
      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }
      return requestJson<SavedForecastPage>(url, getAccessToken);
    },
    getSavedForecast: (id) =>
      requestJson<SavedForecastDetail>(
        createApiUrl(`/saved-forecasts/${encodeURIComponent(id)}`),
        getAccessToken,
      ),
  };
}

function createApiUrl(path: string): URL {
  return new URL(`${API_BASE_URL}${path}`, window.location.origin);
}

async function requestJson<T>(
  url: URL,
  getAccessToken: AccessTokenProvider,
  init: RequestInit = {},
): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error("Weather API request failed");
  }
  return (await response.json()) as T;
}
