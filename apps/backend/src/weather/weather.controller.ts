import { Controller, Get, Query } from "@nestjs/common";
import { WeatherService } from "./weather.service";
import { ForecastResponse, LocationResult } from "./weather.types";

@Controller("weather")
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get("locations")
  searchLocations(
    @Query("query") query: string | undefined,
  ): Promise<LocationResult[]> {
    return this.weatherService.searchLocations(query);
  }

  @Get("forecast")
  getForecast(
    @Query("lat") latitude: string | undefined,
    @Query("lon") longitude: string | undefined,
  ): Promise<ForecastResponse> {
    return this.weatherService.getForecast(latitude, longitude);
  }
}
