import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { SavedForecastEntity } from "../database/entities/saved-forecast.entity";
import { WeatherModule } from "../weather/weather.module";
import { SavedForecastController } from "./saved-forecast.controller";
import { SavedForecastService } from "./saved-forecast.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([SavedForecastEntity]),
    AuthModule,
    WeatherModule,
  ],
  controllers: [SavedForecastController],
  providers: [SavedForecastService],
})
export class SavedForecastModule {}
