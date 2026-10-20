import { DataSource } from "typeorm";
import { createTypeOrmOptions } from "../src/database/database.options";

type TestDataSource = Pick<DataSource, "isInitialized" | "manager" | "destroy">;

export function createTestDataSource(): TestDataSource {
  const dormantDataSource = new DataSource(
    createTypeOrmOptions({
      host: "localhost",
      port: 5432,
      username: "test-user",
      password: "test-only-placeholder",
      name: "test-database",
      ssl: false,
    }),
  );

  return {
    isInitialized: true,
    manager: dormantDataSource.manager,
    destroy: jest.fn((): Promise<void> => Promise.resolve()),
  };
}
