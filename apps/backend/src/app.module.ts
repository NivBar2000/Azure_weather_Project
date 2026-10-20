import { Module } from "@nestjs/common";
import { ConfigurationModule } from "./config/configuration.module";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { WeatherModule } from "./weather/weather.module";

@Module({
  imports: [ConfigurationModule, DatabaseModule, WeatherModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
