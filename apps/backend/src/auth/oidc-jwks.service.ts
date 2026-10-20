import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { createRemoteJWKSet, JWTVerifyGetKey } from "jose";
import { APP_CONFIG, AppConfiguration } from "../config/configuration";

interface OidcMetadata {
  issuer: string;
  jwksUri: string;
}

@Injectable()
export class OidcJwksService {
  private keyResolverPromise?: Promise<JWTVerifyGetKey>;

  constructor(
    @Inject(APP_CONFIG) private readonly configuration: AppConfiguration,
  ) {}

  async getKeyResolver(): Promise<JWTVerifyGetKey> {
    this.keyResolverPromise ??= this.createKeyResolver();
    try {
      return await this.keyResolverPromise;
    } catch {
      this.keyResolverPromise = undefined;
      throw new UnauthorizedException("Unable to validate access token");
    }
  }

  private async createKeyResolver(): Promise<JWTVerifyGetKey> {
    const response = await fetch(this.configuration.entra.oidcMetadataUrl, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error("OIDC metadata request failed");
    }

    const metadata = parseOidcMetadata(await response.json());
    if (metadata.issuer !== this.configuration.entra.expectedIssuer) {
      throw new Error("OIDC metadata issuer does not match configuration");
    }

    return createRemoteJWKSet(new URL(metadata.jwksUri), {
      cooldownDuration: 30_000,
      timeoutDuration: 5_000,
    });
  }
}

function parseOidcMetadata(value: unknown): OidcMetadata {
  if (!isRecord(value)) {
    throw new Error("OIDC metadata must be an object");
  }

  const issuer = readHttpsUrl(value.issuer, "issuer");
  const jwksUri = readHttpsUrl(value.jwks_uri, "jwks_uri");
  return { issuer, jwksUri };
}

function readHttpsUrl(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new Error(`OIDC metadata ${name} must be an HTTPS URL`);
  }
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error(`OIDC metadata ${name} must be an HTTPS URL`);
  }
  return url.href;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
