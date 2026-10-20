import { createEntraConfiguration } from "../src/config/configuration";

describe("authentication configuration", () => {
  it("creates validated Entra configuration", () => {
    expect(createEntraConfiguration(validEnvironment())).toEqual({
      tenantId: "11111111-1111-4111-8111-111111111111",
      apiClientId: "22222222-2222-4222-8222-222222222222",
      allowedClientId: "33333333-3333-4333-8333-333333333333",
      oidcMetadataUrl:
        "https://tenant-name.ciamlogin.test/11111111-1111-4111-8111-111111111111/v2.0/.well-known/openid-configuration",
      expectedIssuer:
        "https://11111111-1111-4111-8111-111111111111.ciamlogin.test/11111111-1111-4111-8111-111111111111/v2.0",
      requiredScope: "access_as_user",
    });
  });

  it.each([
    "ENTRA_TENANT_ID",
    "ENTRA_API_CLIENT_ID",
    "ENTRA_ALLOWED_CLIENT_ID",
    "ENTRA_OIDC_METADATA_URL",
    "ENTRA_EXPECTED_ISSUER",
    "ENTRA_REQUIRED_SCOPE",
  ])("rejects missing %s", (name) => {
    const environment = validEnvironment();
    delete environment[name];
    expect(() => createEntraConfiguration(environment)).toThrow(
      `${name} must be configured`,
    );
  });

  it("rejects a non-HTTPS metadata endpoint", () => {
    expect(() =>
      createEntraConfiguration({
        ...validEnvironment(),
        ENTRA_OIDC_METADATA_URL: "http://login.example.test/metadata",
      }),
    ).toThrow("ENTRA_OIDC_METADATA_URL must be a valid HTTPS URL");
  });

  it("rejects multiple configured required scopes", () => {
    expect(() =>
      createEntraConfiguration({
        ...validEnvironment(),
        ENTRA_REQUIRED_SCOPE: "scope-one scope-two",
      }),
    ).toThrow("ENTRA_REQUIRED_SCOPE must be a single scope value");
  });
});

function validEnvironment(): NodeJS.ProcessEnv {
  return {
    ENTRA_TENANT_ID: "11111111-1111-4111-8111-111111111111",
    ENTRA_API_CLIENT_ID: "22222222-2222-4222-8222-222222222222",
    ENTRA_ALLOWED_CLIENT_ID: "33333333-3333-4333-8333-333333333333",
    ENTRA_OIDC_METADATA_URL:
      "https://tenant-name.ciamlogin.test/11111111-1111-4111-8111-111111111111/v2.0/.well-known/openid-configuration",
    ENTRA_EXPECTED_ISSUER:
      "https://11111111-1111-4111-8111-111111111111.ciamlogin.test/11111111-1111-4111-8111-111111111111/v2.0",
    ENTRA_REQUIRED_SCOPE: "access_as_user",
  };
}
