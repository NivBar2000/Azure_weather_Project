import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthenticatedPrincipal } from "../auth/auth.types";
import { UserService } from "../auth/user.service";
import { SavedForecastEntity } from "../database/entities/saved-forecast.entity";
import { ForecastResponse } from "../weather/weather.types";
import { WeatherService } from "../weather/weather.service";
import {
  SavedForecastDetail,
  SavedForecastPage,
  SavedForecastSummary,
  SaveForecastRequest,
} from "./saved-forecast.types";
import { encodeCursor, SavedForecastCursor } from "./saved-forecast.validation";

@Injectable()
export class SavedForecastService {
  constructor(
    @InjectRepository(SavedForecastEntity)
    private readonly forecasts: Repository<SavedForecastEntity>,
    private readonly users: UserService,
    private readonly weather: WeatherService,
  ) {}

  async save(
    principal: AuthenticatedPrincipal,
    request: SaveForecastRequest,
  ): Promise<SavedForecastDetail> {
    const user = await this.users.resolveUser(principal);
    const forecast = await this.weather.getForecast(
      String(request.latitude),
      String(request.longitude),
    );
    const selectedDay = forecast.days.find((day) => day.date === request.date);
    if (!selectedDay) {
      throw new BadRequestException(
        "Requested date is not available in the current forecast.",
      );
    }
    const snapshot = cloneSelectedDaySnapshot(forecast, selectedDay);
    const entity = this.forecasts.create({
      userId: user.id,
      cityName: snapshot.location.name,
      countryCode: snapshot.location.country || null,
      latitude: snapshot.location.latitude,
      longitude: snapshot.location.longitude,
      forecastSnapshot: snapshot,
    });
    return toDetail(await this.forecasts.save(entity));
  }

  async list(
    principal: AuthenticatedPrincipal,
    limit: number,
    cursor?: SavedForecastCursor,
  ): Promise<SavedForecastPage> {
    const user = await this.users.resolveUser(principal);
    const query = this.forecasts
      .createQueryBuilder("forecast")
      .where("forecast.userId = :userId", { userId: user.id })
      .orderBy("forecast.savedAt", "DESC")
      .addOrderBy("forecast.id", "DESC")
      .take(limit + 1);

    if (cursor) {
      query.andWhere(
        "(forecast.savedAt < :cursorSavedAt OR (forecast.savedAt = :cursorSavedAt AND forecast.id < :cursorId))",
        { cursorSavedAt: cursor.savedAt, cursorId: cursor.id },
      );
    }

    const records = await query.getMany();
    const hasNextPage = records.length > limit;
    const pageRecords = records.slice(0, limit);
    const lastRecord = pageRecords.at(-1);
    return {
      items: pageRecords.map(toSummary),
      nextCursor:
        hasNextPage && lastRecord
          ? encodeCursor(lastRecord.savedAt, lastRecord.id)
          : null,
    };
  }

  async get(
    principal: AuthenticatedPrincipal,
    id: string,
  ): Promise<SavedForecastDetail> {
    const user = await this.users.resolveUser(principal);
    const forecast = await this.forecasts.findOneBy({ id, userId: user.id });
    if (!forecast) {
      throw new NotFoundException("Saved forecast was not found.");
    }
    return toDetail(forecast);
  }
}

function cloneSelectedDaySnapshot(
  forecast: ForecastResponse,
  selectedDay: ForecastResponse["days"][number],
): ForecastResponse {
  return structuredClone({
    location: forecast.location,
    timezoneOffsetSeconds: forecast.timezoneOffsetSeconds,
    days: [selectedDay],
  });
}

function toSummary(entity: SavedForecastEntity): SavedForecastSummary {
  const dates = entity.forecastSnapshot.days.map((day) => day.date);
  return {
    id: entity.id,
    cityName: entity.cityName,
    countryCode: entity.countryCode,
    latitude: entity.latitude,
    longitude: entity.longitude,
    savedAt: entity.savedAt.toISOString(),
    forecastStartDate: dates.at(0) ?? null,
    forecastEndDate: dates.at(-1) ?? null,
  };
}

function toDetail(entity: SavedForecastEntity): SavedForecastDetail {
  return { ...toSummary(entity), forecast: entity.forecastSnapshot };
}
