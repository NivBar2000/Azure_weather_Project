import { DataSource } from "typeorm";
import { createDatabaseConfiguration } from "../config/configuration";
import { loadEnvironmentFile } from "../config/load-environment";
import { createTypeOrmOptions } from "./database.options";

const DATABASE_ENVIRONMENT_VARIABLES = [
  "DATABASE_HOST",
  "DATABASE_PORT",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
  "DATABASE_NAME",
  "DATABASE_SSL",
] as const;

if (
  DATABASE_ENVIRONMENT_VARIABLES.some(
    (variableName) => process.env[variableName] === undefined,
  )
) {
  loadEnvironmentFile();
}

export default new DataSource(
  createTypeOrmOptions(createDatabaseConfiguration(process.env)),
);
