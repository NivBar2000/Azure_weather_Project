import {
  createDatabaseConfiguration,
  DatabaseConfiguration,
} from "../src/config/configuration";
import { createTypeOrmOptions } from "../src/database/database.options";

describe("database configuration", () => {
  it("creates local PostgreSQL options with schema synchronization disabled", () => {
    const configuration = createDatabaseConfiguration(validEnvironment());
    const options = createTypeOrmOptions(configuration);

    expect(configuration).toEqual({
      host: "localhost",
      port: 5432,
      username: "azure-weather",
      password: "test-only-placeholder",
      name: "azure-weather",
      ssl: false,
    });
    expect(options.type).toBe("postgres");
    expect(options.synchronize).toBe(false);
    expect(options.installExtensions).toBe(false);
    expect(options.ssl).toBe(false);
  });

  it("enables certificate verification when database TLS is required", () => {
    const configuration: DatabaseConfiguration = {
      host: "example.postgres.database.azure.com",
      port: 5432,
      username: "azure-weather",
      password: "test-only-placeholder",
      name: "azure-weather",
      ssl: true,
    };

    expect(createTypeOrmOptions(configuration).ssl).toEqual({
      rejectUnauthorized: true,
    });
  });

  it("rejects missing credentials without including credential values", () => {
    const environment = validEnvironment();
    delete environment.DATABASE_PASSWORD;

    expect(() => createDatabaseConfiguration(environment)).toThrow(
      "DATABASE_PASSWORD must be configured",
    );
  });

  it.each(["0", "65536", "not-a-port"])(
    "rejects invalid database port %s",
    (port) => {
      expect(() =>
        createDatabaseConfiguration({
          ...validEnvironment(),
          DATABASE_PORT: port,
        }),
      ).toThrow("DATABASE_PORT must be an integer between 1 and 65535");
    },
  );

  it("rejects ambiguous TLS settings", () => {
    expect(() =>
      createDatabaseConfiguration({
        ...validEnvironment(),
        DATABASE_SSL: "yes",
      }),
    ).toThrow("DATABASE_SSL must be either true or false");
  });
});

function validEnvironment(): NodeJS.ProcessEnv {
  return {
    DATABASE_HOST: "localhost",
    DATABASE_PORT: "5432",
    DATABASE_USER: "azure-weather",
    DATABASE_PASSWORD: "test-only-placeholder",
    DATABASE_NAME: "azure-weather",
    DATABASE_SSL: "false",
  };
}
