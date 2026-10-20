import { Module } from "@nestjs/common";
import { OPENWEATHER_FETCH, OpenWeatherClient } from "./openweather.client";
import { WeatherCacheService } from "./weather-cache.service";
import { WeatherController } from "./weather.controller";
import { WeatherService } from "./weather.service";

@Module({
  controllers: [WeatherController],
  providers: [
    WeatherService,
    WeatherCacheService,
    OpenWeatherClient,
    {
      provide: OPENWEATHER_FETCH,
      useValue: fetch,
    },
  ],
  exports: [OpenWeatherClient, WeatherService],
})
export class WeatherModule {}
