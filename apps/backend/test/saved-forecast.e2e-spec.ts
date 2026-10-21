import { INestApplication } from "@nestjs/common";
import { getDataSourceToken, getRepositoryToken } from "@nestjs/typeorm";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { EntraTokenService } from "../src/auth/entra-token.service";
import { SavedForecastEntity } from "../src/database/entities/saved-forecast.entity";
import { UserEntity } from "../src/database/entities/user.entity";
import {
  SavedForecastDetail,
  SavedForecastPage,
} from "../src/saved-forecasts/saved-forecast.types";
import { ForecastResponse } from "../src/weather/weather.types";
import { WeatherService } from "../src/weather/weather.service";
import { createTestDataSource } from "./test-data-source";
import { configureTestEnvironment } from "./test-environment";

describe("saved forecast endpoints", () => {
  let app: INestApplication;
  let nextSavedAt = new Date("2026-10-20T12:00:00.000Z");
  let idSequence = 1;
  const users = new Map<string, UserEntity>();
  const savedForecasts: SavedForecastEntity[] = [];
  const dataSource = createTestDataSource();
  const weatherService = {
    getForecast: jest.fn(() => Promise.resolve(createForecast())),
  };
  const tokenService = {
    validateAccessToken: jest.fn((token: string) =>
      Promise.resolve({
        issuer:
          "https://11111111-1111-4111-8111-111111111111.ciamlogin.test/11111111-1111-4111-8111-111111111111/v2.0",
        externalSubjectIdentifier:
          token === "other-token" ? "other-user" : "first-user",
        displayName: token === "other-token" ? "Other User" : "First User",
        identityProvider: "google.com",
      }),
    ),
  };
  const userRepository = {
    upsert: jest.fn((input: Partial<UserEntity>) => {
      const key = `${input.identityIssuer}:${input.externalSubjectIdentifier}`;
      if (!users.has(key)) {
        const now = new Date("2026-10-20T10:00:00.000Z");
        users.set(
          key,
          Object.assign(new UserEntity(), input, {
            id:
              input.externalSubjectIdentifier === "other-user"
                ? "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
                : "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            createdAt: now,
            updatedAt: now,
          }),
        );
      }
      return Promise.resolve({ identifiers: [], generatedMaps: [], raw: [] });
    }),
    findOneByOrFail: jest.fn(
      (
        criteria: Pick<
          UserEntity,
          "identityIssuer" | "externalSubjectIdentifier"
        >,
      ) => {
        const user = users.get(
          `${criteria.identityIssuer}:${criteria.externalSubjectIdentifier}`,
        );
        return user
          ? Promise.resolve(user)
          : Promise.reject(new Error("User was not synchronized"));
      },
    ),
  };
  const savedForecastRepository = {
    create: jest.fn((input: Partial<SavedForecastEntity>) =>
      Object.assign(new SavedForecastEntity(), input),
    ),
    save: jest.fn((entity: SavedForecastEntity) => {
      entity.id ||= createUuid(idSequence++);
      entity.savedAt ||= new Date(nextSavedAt);
      savedForecasts.push(entity);
      return Promise.resolve(entity);
    }),
    findOneBy: jest.fn((criteria: Pick<SavedForecastEntity, "id" | "userId">) =>
      Promise.resolve(
        savedForecasts.find(
          (forecast) =>
            forecast.id === criteria.id && forecast.userId === criteria.userId,
        ) ?? null,
      ),
    ),
    createQueryBuilder: jest.fn(() => createQueryBuilder()),
  };

  beforeAll(async () => {
    configureTestEnvironment();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSource)
      .overrideProvider(getRepositoryToken(UserEntity))
      .useValue(userRepository)
      .overrideProvider(getRepositoryToken(SavedForecastEntity))
      .useValue(savedForecastRepository)
      .overrideProvider(WeatherService)
      .useValue(weatherService)
      .overrideProvider(EntraTokenService)
      .useValue(tokenService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    users.clear();
    savedForecasts.length = 0;
    idSequence = 1;
    nextSavedAt = new Date("2026-10-20T12:00:00.000Z");
    weatherService.getForecast.mockResolvedValue(createForecast());
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ["post", "/api/saved-forecasts"],
    ["get", "/api/saved-forecasts"],
    ["get", "/api/saved-forecasts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
  ])("rejects unauthenticated %s requests", async (method, path) => {
    const call = request(app.getHttpServer())[method as "get" | "post"](path);
    await call.expect(401);
  });

  it("creates a server-authoritative snapshot with HTTP 201", async () => {
    const response = await authorizedPost({
      latitude: 51.5072,
      longitude: -0.1276,
      date: "2026-10-22",
    }).expect(201);
    const body = response.body as SavedForecastDetail;

    expect(weatherService.getForecast).toHaveBeenCalledWith(
      "51.5072",
      "-0.1276",
    );
    expect(body.cityName).toBe("London");
    expect(body.forecast.days).toEqual([createForecast().days[1]]);
    expect(savedForecasts[0].forecastSnapshot.days).toEqual([
      createForecast().days[1],
    ]);
    expect(body.forecast.location).toEqual(createForecast().location);
    expect(body.forecast.timezoneOffsetSeconds).toBe(0);
    expect(body.forecastStartDate).toBe("2026-10-22");
    expect(body.forecastEndDate).toBe("2026-10-22");
    expect(JSON.stringify(body)).not.toMatch(
      /email|token|issuer|externalSubject|rawClaims/i,
    );
  });

  it.each([
    [{ latitude: 91, longitude: 0, date: "2026-10-21" }],
    [{ latitude: 0, longitude: -181, date: "2026-10-21" }],
    [{ latitude: "51.5", longitude: 0, date: "2026-10-21" }],
    [{ latitude: "NaN", longitude: 0, date: "2026-10-21" }],
    [{ latitude: null, longitude: 0, date: "2026-10-21" }],
    [{ longitude: 0 }],
    [{ latitude: 0 }],
    [
      {
        latitude: 0,
        longitude: 0,
        date: "2026-10-21",
        cityName: "Client supplied",
      },
    ],
    [
      {
        latitude: 0,
        longitude: 0,
        date: "2026-10-21",
        forecast: createForecast(),
      },
    ],
    [{ latitude: 0, longitude: 0 }],
    [{ latitude: 0, longitude: 0, date: null }],
    [{ latitude: 0, longitude: 0, date: 20261021 }],
    [{ latitude: 0, longitude: 0, date: "2026-1-01" }],
    [{ latitude: 0, longitude: 0, date: "2026-02-30" }],
    [{ latitude: 0, longitude: 0, date: "not-a-date" }],
  ])("rejects an invalid save body", async (body) => {
    await authorizedPost(body).expect(400);
    expect(weatherService.getForecast).not.toHaveBeenCalled();
  });

  it("creates distinct immutable rows for repeated saves", async () => {
    const first = await authorizedPost({
      latitude: 51.5,
      longitude: -0.1,
      date: "2026-10-21",
    }).expect(201);
    const second = await authorizedPost({
      latitude: 51.5,
      longitude: -0.1,
      date: "2026-10-21",
    }).expect(201);

    expect((first.body as SavedForecastDetail).id).not.toBe(
      (second.body as SavedForecastDetail).id,
    );
    expect(savedForecasts).toHaveLength(2);
  });

  it("rejects a valid date that is absent from the fetched forecast", async () => {
    const response = await authorizedPost({
      latitude: 51.5,
      longitude: -0.1,
      date: "2026-10-30",
    }).expect(400);

    expect(weatherService.getForecast).toHaveBeenCalledTimes(1);
    expect(response.text).not.toContain("forecastSnapshot");
    expect(savedForecasts).toHaveLength(0);
  });

  it("lists newest first and applies default and maximum limits", async () => {
    await synchronizeFirstUser();
    seedForecasts(52);

    const defaultPage = await authorizedGet("/api/saved-forecasts").expect(200);
    const maximumPage = await authorizedGet(
      "/api/saved-forecasts?limit=50",
    ).expect(200);
    const defaultBody = defaultPage.body as SavedForecastPage;
    const maximumBody = maximumPage.body as SavedForecastPage;

    expect(defaultBody.items).toHaveLength(20);
    expect(maximumBody.items).toHaveLength(50);
    expect(defaultBody.items[0].savedAt > defaultBody.items[1].savedAt).toBe(
      true,
    );
    expect(defaultBody.items[0].forecastStartDate).toBe("2026-10-21");
    expect(defaultBody.items[0].forecastEndDate).toBe("2026-10-22");
    expect(defaultBody.nextCursor).not.toBeNull();
    expect(maximumBody.nextCursor).not.toBeNull();
  });

  it.each(["0", "51", "1.5", "NaN", "-1", "999999999999999999999"])(
    "rejects invalid limit %s",
    async (limit) => {
      await authorizedGet(`/api/saved-forecasts?limit=${limit}`).expect(400);
    },
  );

  it("paginates records sharing one millisecond timestamp without duplicates or skips", async () => {
    await synchronizeFirstUser();
    seedForecasts(3, true);

    const firstResponse = await authorizedGet(
      "/api/saved-forecasts?limit=2",
    ).expect(200);
    const first = firstResponse.body as SavedForecastPage;
    const secondResponse = await authorizedGet(
      `/api/saved-forecasts?limit=2&cursor=${encodeURIComponent(first.nextCursor ?? "")}`,
    ).expect(200);
    const second = secondResponse.body as SavedForecastPage;
    const ids = [...first.items, ...second.items].map((item) => item.id);

    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(second.nextCursor).toBeNull();
  });

  it.each(["not-a-cursor", "e30", "%%%%"])(
    "rejects malformed cursor %s",
    async (cursor) => {
      await authorizedGet(
        `/api/saved-forecasts?cursor=${encodeURIComponent(cursor)}`,
      ).expect(400);
    },
  );

  it("returns the exact stored snapshot without calling weather", async () => {
    await authorizedPost({
      latitude: 51.5,
      longitude: -0.1,
      date: "2026-10-21",
    }).expect(201);
    const id = savedForecasts[0].id;
    weatherService.getForecast.mockClear();

    const response = await authorizedGet(`/api/saved-forecasts/${id}`).expect(
      200,
    );

    expect((response.body as SavedForecastDetail).forecast).toEqual({
      ...createForecast(),
      days: [createForecast().days[0]],
    });
    expect(weatherService.getForecast).not.toHaveBeenCalled();
  });

  it("returns 404 for unknown and cross-user detail lookups", async () => {
    await authorizedPost({
      latitude: 51.5,
      longitude: -0.1,
      date: "2026-10-21",
    }).expect(201);
    const id = savedForecasts[0].id;

    await authorizedGet(
      "/api/saved-forecasts/ffffffff-ffff-4fff-8fff-ffffffffffff",
    ).expect(404);
    await authorizedGet(`/api/saved-forecasts/${id}`, "other-token").expect(
      404,
    );
  });

  it("rejects a malformed saved forecast UUID", async () => {
    await authorizedGet("/api/saved-forecasts/not-a-uuid").expect(400);
  });

  it("isolates list results by authenticated user", async () => {
    await authorizedPost({
      latitude: 51.5,
      longitude: -0.1,
      date: "2026-10-21",
    }).expect(201);

    const otherResponse = await authorizedGet(
      "/api/saved-forecasts",
      "other-token",
    ).expect(200);

    expect((otherResponse.body as SavedForecastPage).items).toEqual([]);
  });

  function authorizedPost(body: object) {
    return request(app.getHttpServer())
      .post("/api/saved-forecasts")
      .set("Authorization", "Bearer valid-token")
      .send(body);
  }

  function authorizedGet(path: string, token = "valid-token") {
    return request(app.getHttpServer())
      .get(path)
      .set("Authorization", `Bearer ${token}`);
  }

  async function synchronizeFirstUser(): Promise<void> {
    await authorizedGet("/api/auth/me").expect(200);
  }

  function seedForecasts(count: number, equalTimestamps = false): void {
    const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    for (let index = 0; index < count; index += 1) {
      const savedAt = equalTimestamps
        ? new Date("2026-10-20T12:00:00.000Z")
        : new Date(Date.UTC(2026, 9, 20, 12, index));
      savedForecasts.push(
        Object.assign(new SavedForecastEntity(), {
          id: createUuid(idSequence++),
          userId,
          cityName: "London",
          countryCode: "GB",
          latitude: 51.5072,
          longitude: -0.1276,
          forecastSnapshot: createForecast(),
          savedAt,
        }),
      );
    }
  }

  function createQueryBuilder() {
    return new InMemorySavedForecastQueryBuilder(savedForecasts);
  }
});

class InMemorySavedForecastQueryBuilder {
  private userId = "";
  private cursorSavedAt: Date | undefined;
  private cursorId: string | undefined;
  private requestedCount = 21;

  constructor(private readonly forecasts: SavedForecastEntity[]) {}

  where(_condition: string, parameters: { userId: string }): this {
    this.userId = parameters.userId;
    return this;
  }

  andWhere(
    _condition: string,
    parameters: { cursorSavedAt: Date; cursorId: string },
  ): this {
    this.cursorSavedAt = parameters.cursorSavedAt;
    this.cursorId = parameters.cursorId;
    return this;
  }

  orderBy(): this {
    return this;
  }

  addOrderBy(): this {
    return this;
  }

  take(requested: number): this {
    this.requestedCount = requested;
    return this;
  }

  getMany(): Promise<SavedForecastEntity[]> {
    return Promise.resolve(
      this.forecasts
        .filter((forecast) => forecast.userId === this.userId)
        .filter(
          (forecast) =>
            !this.cursorSavedAt ||
            forecast.savedAt < this.cursorSavedAt ||
            (forecast.savedAt.getTime() === this.cursorSavedAt.getTime() &&
              this.cursorId !== undefined &&
              forecast.id < this.cursorId),
        )
        .sort(
          (left, right) =>
            right.savedAt.getTime() - left.savedAt.getTime() ||
            right.id.localeCompare(left.id),
        )
        .slice(0, this.requestedCount),
    );
  }
}

function createForecast(): ForecastResponse {
  return {
    location: {
      name: "London",
      country: "GB",
      latitude: 51.5072,
      longitude: -0.1276,
    },
    timezoneOffsetSeconds: 0,
    days: [
      {
        date: "2026-10-21",
        summary: "clear sky",
        weatherCode: 800,
        minimumTemperature: 10,
        maximumTemperature: 15,
        averageHumidity: 60,
        maximumWindSpeed: 4,
        slots: [
          {
            timestamp: "2026-10-21T12:00:00.000Z",
            localTime: "2026-10-21T12:00:00",
            temperature: 14,
            feelsLike: 13,
            humidity: 60,
            windSpeed: 3,
            description: "clear sky",
            weatherCode: 800,
          },
        ],
      },
      {
        date: "2026-10-22",
        summary: "light rain",
        weatherCode: 500,
        minimumTemperature: 9,
        maximumTemperature: 13,
        averageHumidity: 72,
        maximumWindSpeed: 5,
        slots: [
          {
            timestamp: "2026-10-22T12:00:00.000Z",
            localTime: "2026-10-22T12:00:00",
            temperature: 12,
            feelsLike: 11,
            humidity: 72,
            windSpeed: 4,
            description: "light rain",
            weatherCode: 500,
          },
        ],
      },
    ],
  };
}

function createUuid(sequence: number): string {
  return `00000000-0000-4000-8000-${sequence.toString().padStart(12, "0")}`;
}
