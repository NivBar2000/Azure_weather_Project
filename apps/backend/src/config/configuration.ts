export const APP_CONFIG = Symbol("APP_CONFIG");

const DEFAULT_OPENWEATHER_BASE_URL = "https://api.openweathermap.org";
const DEFAULT_FRONTEND_ORIGIN = "http://localhost:5173";
const DEFAULT_PORT = 3000;

export interface AppConfiguration {
  openWeatherApiKey: string;
  openWeatherBaseUrl: string;
  frontendOrigin: string;
  port: number;
  database: DatabaseConfiguration;
}

export interface DatabaseConfiguration {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  ssl: boolean;
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
  const port = validatePort(environment.PORT ?? String(DEFAULT_PORT), "PORT");

  return {
    openWeatherApiKey,
    openWeatherBaseUrl,
    frontendOrigin,
    port,
    database: createDatabaseConfiguration(environment),
  };
}

export function createDatabaseConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): DatabaseConfiguration {
  return {
    host: requireNonEmpty(environment.DATABASE_HOST, "DATABASE_HOST"),
    port: validatePort(
      requireNonEmpty(environment.DATABASE_PORT, "DATABASE_PORT"),
      "DATABASE_PORT",
    ),
    username: requireNonEmpty(environment.DATABASE_USER, "DATABASE_USER"),
    password: requireNonEmpty(
      environment.DATABASE_PASSWORD,
      "DATABASE_PASSWORD",
    ),
    name: requireNonEmpty(environment.DATABASE_NAME, "DATABASE_NAME"),
    ssl: validateBoolean(
      requireNonEmpty(environment.DATABASE_SSL, "DATABASE_SSL"),
      "DATABASE_SSL",
    ),
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

function validatePort(value: string, name: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return port;
}

function validateBoolean(value: string, name: string): boolean {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`${name} must be either true or false`);
}
