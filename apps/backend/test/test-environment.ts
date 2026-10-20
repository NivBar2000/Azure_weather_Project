export function configureTestEnvironment(): void {
  process.env.OPENWEATHER_API_KEY = "test-only-placeholder";
  process.env.DATABASE_HOST = "localhost";
  process.env.DATABASE_PORT = "5432";
  process.env.DATABASE_USER = "test-user";
  process.env.DATABASE_PASSWORD = "test-only-placeholder";
  process.env.DATABASE_NAME = "test-database";
  process.env.DATABASE_SSL = "false";
}
