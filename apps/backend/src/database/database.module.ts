import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_CONFIG, AppConfiguration } from "../config/configuration";
import { ConfigurationModule } from "../config/configuration.module";
import { createTypeOrmOptions } from "./database.options";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigurationModule],
      inject: [APP_CONFIG],
      useFactory: (configuration: AppConfiguration) =>
        createTypeOrmOptions(configuration.database),
    }),
  ],
})
export class DatabaseModule {}
