import { DataSource } from "typeorm";
import { createTypeOrmOptions } from "../src/database/database.options";

type TestDataSource = Pick<
  DataSource,
  | "isInitialized"
  | "manager"
  | "destroy"
  | "entityMetadatas"
  | "options"
  | "getRepository"
>;

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
    entityMetadatas: dormantDataSource.entityMetadatas,
    options: dormantDataSource.options,
    getRepository: dormantDataSource.getRepository.bind(dormantDataSource),
    destroy: jest.fn((): Promise<void> => Promise.resolve()),
  };
}
