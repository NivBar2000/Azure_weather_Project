import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { OpenWeatherClient } from "./openweather.client";
import { WeatherCacheService } from "./weather-cache.service";
import { normalizeForecast, normalizeLocations } from "./weather-normalizer";
import { ForecastResponse, LocationResult } from "./weather.types";

const MAXIMUM_QUERY_LENGTH = 100;
const LOCATION_CACHE_TTL_MILLISECONDS = 60 * 60 * 1_000;
const FORECAST_CACHE_TTL_MILLISECONDS = 10 * 60 * 1_000;

@Injectable()
export class WeatherService {
  constructor(
    private readonly client: OpenWeatherClient,
    private readonly cache: WeatherCacheService,
  ) {}

  async searchLocations(query: string | undefined): Promise<LocationResult[]> {
    const normalizedQuery = normalizeCityQuery(query);
    const cacheKey = `locations:${normalizedQuery.toLocaleLowerCase("en-US")}`;
    const cached = this.cache.get<LocationResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const locations = normalizeLocations(
        await this.client.searchLocations(normalizedQuery),
      );
      this.cache.set(cacheKey, locations, LOCATION_CACHE_TTL_MILLISECONDS);
      return locations;
    } catch {
      throw new ServiceUnavailableException(
        "Weather service is temporarily unavailable. Please try again later.",
      );
    }
  }

  async getForecast(
    latitudeInput: string | undefined,
    longitudeInput: string | undefined,
  ): Promise<ForecastResponse> {
    const latitude = parseCoordinate(latitudeInput, "latitude", -90, 90);
    const longitude = parseCoordinate(longitudeInput, "longitude", -180, 180);
    const cacheKey = `forecast:${latitude}:${longitude}`;
    const cached = this.cache.get<ForecastResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const forecast = normalizeForecast(
        await this.client.getForecast(latitude, longitude),
      );
      this.cache.set(cacheKey, forecast, FORECAST_CACHE_TTL_MILLISECONDS);
      return forecast;
    } catch {
      throw new ServiceUnavailableException(
        "Weather service is temporarily unavailable. Please try again later.",
      );
    }
  }
}

function normalizeCityQuery(query: string | undefined): string {
  const normalized = query?.trim().normalize("NFC") ?? "";
  if (!normalized) {
    throw new BadRequestException("City query is required.");
  }
  if (Array.from(normalized).length > MAXIMUM_QUERY_LENGTH) {
    throw new BadRequestException(
      `City query must be ${MAXIMUM_QUERY_LENGTH} characters or fewer.`,
    );
  }
  return normalized;
}

function parseCoordinate(
  input: string | undefined,
  name: "latitude" | "longitude",
  minimum: number,
  maximum: number,
): number {
  if (!input?.trim()) {
    throw new BadRequestException(`${name} is required.`);
  }
  const value = Number(input);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new BadRequestException(
      `${name} must be a number between ${minimum} and ${maximum}.`,
    );
  }
  return value;
}
