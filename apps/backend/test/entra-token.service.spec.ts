import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  KeyLike,
  JWTPayload,
  SignJWT,
} from "jose";
import { EntraConfiguration } from "../src/config/configuration";
import { verifyEntraAccessToken } from "../src/auth/entra-token.service";

const configuration: EntraConfiguration = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  apiClientId: "22222222-2222-4222-8222-222222222222",
  allowedClientId: "33333333-3333-4333-8333-333333333333",
  oidcMetadataUrl:
    "https://tenant-name.ciamlogin.test/11111111-1111-4111-8111-111111111111/v2.0/.well-known/openid-configuration",
  expectedIssuer:
    "https://11111111-1111-4111-8111-111111111111.ciamlogin.test/11111111-1111-4111-8111-111111111111/v2.0",
  requiredScope: "access_as_user",
};

describe("Entra access token validation", () => {
  let privateKey: KeyLike;
  let invalidPrivateKey: KeyLike;
  let keyResolver: ReturnType<typeof createLocalJWKSet>;

  beforeAll(async () => {
    const validPair = await generateKeyPair("RS256");
    const invalidPair = await generateKeyPair("RS256");
    privateKey = validPair.privateKey;
    invalidPrivateKey = invalidPair.privateKey;
    const publicJwk = await exportJWK(validPair.publicKey);
    keyResolver = createLocalJWKSet({
      keys: [{ ...publicJwk, kid: "test-key", alg: "RS256", use: "sig" }],
    });
  });

  it("accepts a correctly signed delegated access token", async () => {
    const principal = await verifyEntraAccessToken(
      await signToken(),
      configuration,
      keyResolver,
    );

    expect(principal).toEqual({
      issuer: configuration.expectedIssuer,
      externalSubjectIdentifier: "external-object-id",
      displayName: "Test User",
      identityProvider: "google.com",
    });
    expect(principal).not.toHaveProperty("email");
  });

  it("rejects an invalid signature", async () => {
    await expect(
      verifyEntraAccessToken(
        await signToken({}, invalidPrivateKey),
        configuration,
        keyResolver,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an expired token", async () => {
    await expect(
      verifyEntraAccessToken(
        await signToken({ exp: Math.floor(Date.now() / 1000) - 60 }),
        configuration,
        keyResolver,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a token without an expiration", async () => {
    await expect(
      verifyEntraAccessToken(
        await signToken({ exp: undefined }),
        configuration,
        keyResolver,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("falls back to sub and neutral profile values when optional claims are absent", async () => {
    const principal = await verifyEntraAccessToken(
      await signToken({ oid: undefined, name: " ", idp: undefined }),
      configuration,
      keyResolver,
    );

    expect(principal.externalSubjectIdentifier).toBe("fallback-subject");
    expect(principal.displayName).toBe("Weather user");
    expect(principal.identityProvider).toBe("entra-external-id");
  });

  it.each([
    ["issuer", { iss: "https://wrong.example.test/v2.0/" }],
    ["audience", { aud: "wrong-audience" }],
    ["tenant", { tid: "44444444-4444-4444-8444-444444444444" }],
    ["calling client", { azp: "55555555-5555-4555-8555-555555555555" }],
    ["token version", { ver: "1.0" }],
  ])("rejects a token with the wrong %s", async (_name, claims) => {
    await expect(
      verifyEntraAccessToken(
        await signToken(claims),
        configuration,
        keyResolver,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("returns forbidden when the delegated scope is missing", async () => {
    await expect(
      verifyEntraAccessToken(
        await signToken({ scp: "another_scope" }),
        configuration,
        keyResolver,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects an ID-token-like token without delegated scopes", async () => {
    await expect(
      verifyEntraAccessToken(
        await signToken({ scp: undefined, nonce: "test-nonce" }),
        configuration,
        keyResolver,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  async function signToken(
    overrides: JWTPayload = {},
    signingKey: KeyLike = privateKey,
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: JWTPayload = {
      oid: "external-object-id",
      sub: "fallback-subject",
      name: "Test User",
      idp: "google.com",
      ver: "2.0",
      tid: configuration.tenantId,
      azp: configuration.allowedClientId,
      scp: "openid access_as_user profile",
      iss: configuration.expectedIssuer,
      aud: configuration.apiClientId,
      iat: now,
      exp: now + 3_600,
      ...overrides,
    };

    return new SignJWT(payload)
      .setProtectedHeader({ alg: "RS256", kid: "test-key", typ: "JWT" })
      .sign(signingKey);
  }
});
