import { BadRequestException } from "@nestjs/common";
import { SaveForecastRequest } from "./saved-forecast.types";

const DEFAULT_PAGE_LIMIT = 20;
const MAXIMUM_PAGE_LIMIT = 50;
const MAXIMUM_CURSOR_LENGTH = 512;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORECAST_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface SavedForecastCursor {
  savedAt: Date;
  id: string;
}

export function parseSaveForecastRequest(body: unknown): SaveForecastRequest {
  if (!isPlainObject(body)) {
    throw new BadRequestException("Request body must be an object.");
  }
  const keys = Object.keys(body);
  if (
    keys.length !== 3 ||
    !keys.includes("latitude") ||
    !keys.includes("longitude") ||
    !keys.includes("date")
  ) {
    throw new BadRequestException(
      "Request body must contain only latitude, longitude, and date.",
    );
  }
  return {
    latitude: parseCoordinate(body.latitude, "latitude", -90, 90),
    longitude: parseCoordinate(body.longitude, "longitude", -180, 180),
    date: parseForecastDate(body.date),
  };
}

export function parsePageLimit(value: unknown): number {
  if (value === undefined) {
    return DEFAULT_PAGE_LIMIT;
  }
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    throw new BadRequestException("limit must be a positive integer.");
  }
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit > MAXIMUM_PAGE_LIMIT) {
    throw new BadRequestException(
      `limit must be between 1 and ${MAXIMUM_PAGE_LIMIT}.`,
    );
  }
  return limit;
}

export function encodeCursor(savedAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ savedAt: savedAt.toISOString(), id }),
    "utf8",
  ).toString("base64url");
}

export function parseCursor(value: unknown): SavedForecastCursor | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAXIMUM_CURSOR_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    throw new BadRequestException("cursor is invalid.");
  }
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    if (Buffer.from(decoded, "utf8").toString("base64url") !== value) {
      throw new Error("Cursor encoding is not canonical");
    }
    const parsed: unknown = JSON.parse(decoded);
    if (
      !isPlainObject(parsed) ||
      Object.keys(parsed).length !== 2 ||
      typeof parsed.savedAt !== "string" ||
      typeof parsed.id !== "string" ||
      !UUID_PATTERN.test(parsed.id)
    ) {
      throw new Error("Cursor payload is invalid");
    }
    const savedAt = new Date(parsed.savedAt);
    if (
      !Number.isFinite(savedAt.getTime()) ||
      savedAt.toISOString() !== parsed.savedAt
    ) {
      throw new Error("Cursor timestamp is invalid");
    }
    return { savedAt, id: parsed.id };
  } catch {
    throw new BadRequestException("cursor is invalid.");
  }
}

function parseCoordinate(
  value: unknown,
  name: "latitude" | "longitude",
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new BadRequestException(
      `${name} must be a number between ${minimum} and ${maximum}.`,
    );
  }
  return value;
}

function parseForecastDate(value: unknown): string {
  if (typeof value !== "string") {
    throw new BadRequestException("date must use the YYYY-MM-DD format.");
  }
  const match = FORECAST_DATE_PATTERN.exec(value);
  if (!match) {
    throw new BadRequestException("date must use the YYYY-MM-DD format.");
  }
  const [, year, month, day] = match;
  const parsed = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );
  if (parsed.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException("date must be a valid calendar date.");
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
