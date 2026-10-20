import { Inject, Injectable } from "@nestjs/common";
import { APP_CONFIG, AppConfiguration } from "../config/configuration";

export const OPENWEATHER_FETCH = Symbol("OPENWEATHER_FETCH");
const REQUEST_TIMEOUT_MILLISECONDS = 8_000;

export class OpenWeatherClientError extends Error {
  constructor() {
    super("OpenWeather request failed");
    this.name = "OpenWeatherClientError";
  }
}

@Injectable()
export class OpenWeatherClient {
  constructor(
    @Inject(APP_CONFIG) private readonly configuration: AppConfiguration,
    @Inject(OPENWEATHER_FETCH)
    private readonly fetchImplementation: typeof fetch,
  ) {}

  async searchLocations(query: string): Promise<unknown> {
    return this.request("/geo/1.0/direct", {
      q: query,
      limit: "5",
    });
  }

  async getForecast(latitude: number, longitude: number): Promise<unknown> {
    return this.request("/data/2.5/forecast", {
      lat: String(latitude),
      lon: String(longitude),
      units: "metric",
    });
  }

  private async request(
    path: "/geo/1.0/direct" | "/data/2.5/forecast",
    parameters: Record<string, string>,
  ): Promise<unknown> {
    const url = new URL(path, this.configuration.openWeatherBaseUrl);
    for (const [name, value] of Object.entries(parameters)) {
      url.searchParams.set(name, value);
    }
    url.searchParams.set("appid", this.configuration.openWeatherApiKey);

    try {
      const response = await this.fetchImplementation(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
      });
      if (!response.ok) {
        throw new OpenWeatherClientError();
      }
      return (await response.json()) as unknown;
    } catch {
      throw new OpenWeatherClientError();
    }
  }
}
