import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { AuthenticatedPrincipal } from "../auth/auth.types";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import { SavedForecastService } from "./saved-forecast.service";
import { SavedForecastDetail, SavedForecastPage } from "./saved-forecast.types";
import {
  parseCursor,
  parsePageLimit,
  parseSaveForecastRequest,
} from "./saved-forecast.validation";

@Controller("saved-forecasts")
export class SavedForecastController {
  constructor(private readonly savedForecasts: SavedForecastService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  save(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown,
  ): Promise<SavedForecastDetail> {
    return this.savedForecasts.save(principal, parseSaveForecastRequest(body));
  }

  @Get()
  list(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Query("limit") limit: unknown,
    @Query("cursor") cursor: unknown,
  ): Promise<SavedForecastPage> {
    return this.savedForecasts.list(
      principal,
      parsePageLimit(limit),
      parseCursor(cursor),
    );
  }

  @Get(":id")
  get(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<SavedForecastDetail> {
    return this.savedForecasts.get(principal, id);
  }
}
