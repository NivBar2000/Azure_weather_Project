import { OpenWeatherClientError } from "./openweather.client";
import {
  DailyForecast,
  ForecastResponse,
  ForecastSlot,
  LocationResult,
} from "./weather.types";

interface ParsedForecastSlot extends ForecastSlot {
  minimumTemperature: number;
  maximumTemperature: number;
}

export function normalizeLocations(payload: unknown): LocationResult[] {
  if (!Array.isArray(payload)) {
    throw new OpenWeatherClientError();
  }

  return payload.slice(0, 5).map((item) => {
    const location = asRecord(item);
    const normalized: LocationResult = {
      name: readString(location.name),
      country: readString(location.country),
      latitude: readNumber(location.lat),
      longitude: readNumber(location.lon),
    };
    if (typeof location.state === "string" && location.state.trim()) {
      normalized.state = location.state;
    }
    return normalized;
  });
}

export function normalizeForecast(payload: unknown): ForecastResponse {
  const root = asRecord(payload);
  const city = asRecord(root.city);
  const coordinates = asRecord(city.coord);
  const timezoneOffsetSeconds = readNumber(city.timezone);
  if (!Number.isInteger(timezoneOffsetSeconds)) {
    throw new OpenWeatherClientError();
  }
  if (!Array.isArray(root.list)) {
    throw new OpenWeatherClientError();
  }

  const slots = root.list.map((entry) =>
    normalizeSlot(entry, timezoneOffsetSeconds),
  );
  const groupedSlots = new Map<string, ParsedForecastSlot[]>();
  for (const slot of slots) {
    const date = slot.localTime.slice(0, 10);
    const daySlots = groupedSlots.get(date) ?? [];
    daySlots.push(slot);
    groupedSlots.set(date, daySlots);
  }

  const days = [...groupedSlots.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, 5)
    .map(([date, daySlots]) => createDailyForecast(date, daySlots));

  return {
    location: {
      name: readString(city.name),
      country: readString(city.country),
      latitude: readNumber(coordinates.lat),
      longitude: readNumber(coordinates.lon),
    },
    timezoneOffsetSeconds,
    days,
  };
}

function normalizeSlot(
  value: unknown,
  timezoneOffsetSeconds: number,
): ParsedForecastSlot {
  const entry = asRecord(value);
  const main = asRecord(entry.main);
  const wind = asRecord(entry.wind);
  if (!Array.isArray(entry.weather) || entry.weather.length === 0) {
    throw new OpenWeatherClientError();
  }
  const weather = asRecord(entry.weather[0]);
  const unixSeconds = readNumber(entry.dt);
  const localDate = new Date((unixSeconds + timezoneOffsetSeconds) * 1_000);
  if (Number.isNaN(localDate.getTime())) {
    throw new OpenWeatherClientError();
  }

  return {
    timestamp: new Date(unixSeconds * 1_000).toISOString(),
    localTime: localDate.toISOString().slice(0, 19),
    temperature: readNumber(main.temp),
    feelsLike: readNumber(main.feels_like),
    humidity: readNumber(main.humidity),
    windSpeed: readNumber(wind.speed),
    description: readString(weather.description),
    weatherCode: readNumber(weather.id),
    minimumTemperature: readNumber(main.temp_min),
    maximumTemperature: readNumber(main.temp_max),
  };
}

function createDailyForecast(
  date: string,
  slots: ParsedForecastSlot[],
): DailyForecast {
  const representative = slots.reduce((closest, candidate) =>
    middayDistance(candidate.localTime) < middayDistance(closest.localTime)
      ? candidate
      : closest,
  );

  return {
    date,
    summary: representative.description,
    weatherCode: representative.weatherCode,
    minimumTemperature: roundOneDecimal(
      Math.min(...slots.map((slot) => slot.minimumTemperature)),
    ),
    maximumTemperature: roundOneDecimal(
      Math.max(...slots.map((slot) => slot.maximumTemperature)),
    ),
    averageHumidity: Math.round(
      slots.reduce((total, slot) => total + slot.humidity, 0) / slots.length,
    ),
    maximumWindSpeed: roundOneDecimal(
      Math.max(...slots.map((slot) => slot.windSpeed)),
    ),
    slots: slots.map(toForecastSlot),
  };
}

function toForecastSlot(slot: ParsedForecastSlot): ForecastSlot {
  return {
    timestamp: slot.timestamp,
    localTime: slot.localTime,
    temperature: slot.temperature,
    feelsLike: slot.feelsLike,
    humidity: slot.humidity,
    windSpeed: slot.windSpeed,
    description: slot.description,
    weatherCode: slot.weatherCode,
  };
}

function middayDistance(localTime: string): number {
  const hours = Number(localTime.slice(11, 13));
  const minutes = Number(localTime.slice(14, 16));
  return Math.abs(hours + minutes / 60 - 12);
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new OpenWeatherClientError();
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  if (typeof value !== "string") {
    throw new OpenWeatherClientError();
  }
  return value;
}

function readNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new OpenWeatherClientError();
  }
  return value;
}
