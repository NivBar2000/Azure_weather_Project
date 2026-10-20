import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ConfigurationModule } from "./config/configuration.module";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { SavedForecastModule } from "./saved-forecasts/saved-forecast.module";
import { WeatherModule } from "./weather/weather.module";

@Module({
  imports: [
    ConfigurationModule,
    DatabaseModule,
    AuthModule,
    WeatherModule,
    SavedForecastModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
