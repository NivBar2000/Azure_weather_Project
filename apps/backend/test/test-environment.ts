export function configureTestEnvironment(): void {
  process.env.OPENWEATHER_API_KEY = "test-only-placeholder";
  process.env.DATABASE_HOST = "localhost";
  process.env.DATABASE_PORT = "5432";
  process.env.DATABASE_USER = "test-user";
  process.env.DATABASE_PASSWORD = "test-only-placeholder";
  process.env.DATABASE_NAME = "test-database";
  process.env.DATABASE_SSL = "false";
  process.env.ENTRA_TENANT_ID = "11111111-1111-4111-8111-111111111111";
  process.env.ENTRA_API_CLIENT_ID = "22222222-2222-4222-8222-222222222222";
  process.env.ENTRA_ALLOWED_CLIENT_ID = "33333333-3333-4333-8333-333333333333";
  process.env.ENTRA_OIDC_METADATA_URL =
    "https://tenant-name.ciamlogin.test/11111111-1111-4111-8111-111111111111/v2.0/.well-known/openid-configuration";
  process.env.ENTRA_EXPECTED_ISSUER =
    "https://11111111-1111-4111-8111-111111111111.ciamlogin.test/11111111-1111-4111-8111-111111111111/v2.0";
  process.env.ENTRA_REQUIRED_SCOPE = "access_as_user";
}
