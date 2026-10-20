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
  entra: EntraConfiguration;
}

export interface EntraConfiguration {
  tenantId: string;
  apiClientId: string;
  allowedClientId: string;
  oidcMetadataUrl: string;
  expectedIssuer: string;
  requiredScope: string;
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
    entra: createEntraConfiguration(environment),
  };
}

export function createEntraConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): EntraConfiguration {
  return {
    tenantId: validateGuid(
      requireNonEmpty(environment.ENTRA_TENANT_ID, "ENTRA_TENANT_ID"),
      "ENTRA_TENANT_ID",
    ),
    apiClientId: validateGuid(
      requireNonEmpty(environment.ENTRA_API_CLIENT_ID, "ENTRA_API_CLIENT_ID"),
      "ENTRA_API_CLIENT_ID",
    ),
    allowedClientId: validateGuid(
      requireNonEmpty(
        environment.ENTRA_ALLOWED_CLIENT_ID,
        "ENTRA_ALLOWED_CLIENT_ID",
      ),
      "ENTRA_ALLOWED_CLIENT_ID",
    ),
    oidcMetadataUrl: validateHttpsUrl(
      requireNonEmpty(
        environment.ENTRA_OIDC_METADATA_URL,
        "ENTRA_OIDC_METADATA_URL",
      ),
      "ENTRA_OIDC_METADATA_URL",
    ),
    expectedIssuer: validateHttpsUrl(
      requireNonEmpty(
        environment.ENTRA_EXPECTED_ISSUER,
        "ENTRA_EXPECTED_ISSUER",
      ),
      "ENTRA_EXPECTED_ISSUER",
    ),
    requiredScope: validateScope(
      requireNonEmpty(environment.ENTRA_REQUIRED_SCOPE, "ENTRA_REQUIRED_SCOPE"),
    ),
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

function validateGuid(value: string, name: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error(`${name} must be a valid GUID`);
  }
  return value.toLowerCase();
}

function validateHttpsUrl(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL`);
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error(`${name} must be a valid HTTPS URL`);
  }
  return url.href;
}

function validateScope(value: string): string {
  if (/\s/.test(value)) {
    throw new Error("ENTRA_REQUIRED_SCOPE must be a single scope value");
  }
  return value;
}
