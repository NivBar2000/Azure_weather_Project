export const APP_CONFIG = Symbol("APP_CONFIG");

const DEFAULT_OPENWEATHER_BASE_URL = "https://api.openweathermap.org";
const DEFAULT_FRONTEND_ORIGIN = "http://localhost:5173";
const DEFAULT_PORT = 3000;

export interface AppConfiguration {
  openWeatherApiKey: string;
  openWeatherBaseUrl: string;
  frontendOrigin: string;
  port: number;
}

export function createAppConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfiguration {
  const openWeatherApiKey = requireNonEmpty(
    environment.OPENWEATHER_API_KEY,
    "OPENWEATHER_API_KEY",
  );
  const openWeatherBaseUrl = validateBaseUrl(
    environment.OPENWEATHER_BASE_URL ?? DEFAULT_OPENWEATHER_BASE_URL,
  );
  const frontendOrigin = validateOrigin(
    environment.FRONTEND_ORIGIN ?? DEFAULT_FRONTEND_ORIGIN,
  );
  const port = validatePort(environment.PORT ?? String(DEFAULT_PORT));

  return {
    openWeatherApiKey,
    openWeatherBaseUrl,
    frontendOrigin,
    port,
  };
}

function requireNonEmpty(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${name} must be configured`);
  }
  return normalized;
}

function validateBaseUrl(value: string): string {
  const url = parseHttpUrl(value, "OPENWEATHER_BASE_URL");
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("OPENWEATHER_BASE_URL must contain only an origin");
  }
  return url.origin;
}

function validateOrigin(value: string): string {
  const url = parseHttpUrl(value, "FRONTEND_ORIGIN");
  if (url.origin !== value.replace(/\/$/, "")) {
    throw new Error("FRONTEND_ORIGIN must contain only an origin");
  }
  return url.origin;
}

function parseHttpUrl(value: string, name: string): URL {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }
    return url;
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) URL`);
  }
}

function validatePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}
