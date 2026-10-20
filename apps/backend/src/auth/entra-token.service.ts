import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JWTPayload, JWTVerifyGetKey, jwtVerify } from "jose";
import {
  APP_CONFIG,
  AppConfiguration,
  EntraConfiguration,
} from "../config/configuration";
import { AuthenticatedPrincipal } from "./auth.types";
import { OidcJwksService } from "./oidc-jwks.service";

@Injectable()
export class EntraTokenService {
  constructor(
    @Inject(APP_CONFIG) private readonly configuration: AppConfiguration,
    private readonly oidcJwksService: OidcJwksService,
  ) {}

  async validateAccessToken(token: string): Promise<AuthenticatedPrincipal> {
    const keyResolver = await this.oidcJwksService.getKeyResolver();
    return verifyEntraAccessToken(token, this.configuration.entra, keyResolver);
  }
}

export async function verifyEntraAccessToken(
  token: string,
  configuration: EntraConfiguration,
  keyResolver: JWTVerifyGetKey,
): Promise<AuthenticatedPrincipal> {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, keyResolver, {
      algorithms: ["RS256"],
      issuer: configuration.expectedIssuer,
      audience: configuration.apiClientId,
      requiredClaims: ["iss", "aud", "iat", "exp"],
    }));
  } catch {
    throw new UnauthorizedException("Invalid access token");
  }

  if (
    payload.ver !== "2.0" ||
    payload.tid !== configuration.tenantId ||
    payload.azp !== configuration.allowedClientId
  ) {
    throw new UnauthorizedException("Invalid access token claims");
  }

  const scopes =
    typeof payload.scp === "string"
      ? payload.scp.split(/\s+/).filter(Boolean)
      : [];
  if (!scopes.includes(configuration.requiredScope)) {
    throw new ForbiddenException("Required delegated scope is missing");
  }

  const externalSubjectIdentifier =
    readIdentity(payload.oid) ?? readIdentity(payload.sub);
  if (!externalSubjectIdentifier) {
    throw new UnauthorizedException("Access token has no stable subject");
  }

  return {
    issuer: configuration.expectedIssuer,
    externalSubjectIdentifier,
    displayName: readSafeString(payload.name) ?? "Weather user",
    identityProvider: readSafeString(payload.idp) ?? "entra-external-id",
  };
}

function readIdentity(value: unknown): string | undefined {
  return readSafeString(value);
}

function readSafeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized || undefined;
}
