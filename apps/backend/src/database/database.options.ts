import { join } from "node:path";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { DatabaseConfiguration } from "../config/configuration";
import { SavedForecastEntity } from "./entities/saved-forecast.entity";
import { UserEntity } from "./entities/user.entity";

export const DATABASE_ENTITIES = [UserEntity, SavedForecastEntity];

export function createTypeOrmOptions(
  configuration: DatabaseConfiguration,
): PostgresConnectionOptions {
  return {
    type: "postgres",
    host: configuration.host,
    port: configuration.port,
    username: configuration.username,
    password: configuration.password,
    database: configuration.name,
    ssl: configuration.ssl ? { rejectUnauthorized: true } : false,
    entities: DATABASE_ENTITIES,
    migrations: [join(__dirname, "migrations", "*.{js,ts}")],
    migrationsTableName: "typeorm_migrations",
    synchronize: false,
    installExtensions: false,
  };
}
