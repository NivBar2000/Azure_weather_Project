import { INestApplication } from "@nestjs/common";
import { getDataSourceToken } from "@nestjs/typeorm";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { EntraTokenService } from "../src/auth/entra-token.service";
import { OpenWeatherClient } from "../src/weather/openweather.client";
import { ForecastResponse, LocationResult } from "../src/weather/weather.types";
import { createTestDataSource } from "./test-data-source";
import { configureTestEnvironment } from "./test-environment";

describe("weather endpoints", () => {
  let app: INestApplication;
  const client = {
    searchLocations: jest.fn(),
    getForecast: jest.fn(),
  };
  const dataSource = createTestDataSource();
  const tokenService = {
    validateAccessToken: jest.fn().mockResolvedValue({
      issuer:
        "https://11111111-1111-4111-8111-111111111111.ciamlogin.test/11111111-1111-4111-8111-111111111111/v2.0",
      externalSubjectIdentifier: "weather-test-user",
      displayName: "Weather Test User",
      identityProvider: "entra-external-id",
    }),
  };

  beforeAll(async () => {
    configureTestEnvironment();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSource)
      .overrideProvider(OpenWeatherClient)
      .useValue(client)
      .overrideProvider(EntraTokenService)
      .useValue(tokenService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    expect(dataSource.destroy).toHaveBeenCalledTimes(1);
  });

  it("rejects unauthenticated weather access", async () => {
    await request(app.getHttpServer())
      .get("/api/weather/locations")
      .query({ query: "London" })
      .expect(401);
  });

  it("normalizes a successful Unicode location search", async () => {
    client.searchLocations.mockResolvedValueOnce([
      {
        name: "ירושלים",
        country: "IL",
        lat: 31.778,
        lon: 35.235,
        local_names: { en: "Jerusalem" },
      },
    ]);

    const response = await authorizedGet("/api/weather/locations")
      .query({ query: "  ירושלים  " })
      .expect(200);
    const body = response.body as LocationResult[];

    expect(client.searchLocations).toHaveBeenCalledWith("ירושלים");
    expect(body).toEqual([
      {
        name: "ירושלים",
        country: "IL",
        latitude: 31.778,
        longitude: 35.235,
      },
    ]);
  });

  it("returns an empty location result", async () => {
    client.searchLocations.mockResolvedValueOnce([]);

    const response = await authorizedGet("/api/weather/locations")
      .query({ query: "Nowhere" })
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it.each([undefined, "   ", "a".repeat(101)])(
    "rejects an invalid city query",
    async (query) => {
      const requestBuilder = authorizedGet("/api/weather/locations");
      if (query !== undefined) {
        requestBuilder.query({ query });
      }
      await requestBuilder.expect(400);
      expect(client.searchLocations).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["invalid", "20"],
    ["91", "20"],
    ["20", "181"],
    [undefined, "20"],
  ])("rejects invalid coordinates", async (lat, lon) => {
    const requestBuilder = authorizedGet("/api/weather/forecast");
    if (lat !== undefined) {
      requestBuilder.query({ lat });
    }
    if (lon !== undefined) {
      requestBuilder.query({ lon });
    }
    await requestBuilder.expect(400);
    expect(client.getForecast).not.toHaveBeenCalled();
  });

  it("handles an upstream failure without exposing internal details", async () => {
    client.getForecast.mockRejectedValueOnce(
      new Error("upstream response with sensitive details"),
    );

    const response = await authorizedGet("/api/weather/forecast")
      .query({ lat: 1, lon: 2 })
      .expect(503);
    const serializedBody = JSON.stringify(response.body);

    expect(serializedBody).toContain("temporarily unavailable");
    expect(serializedBody).not.toContain("sensitive details");
    expect(serializedBody).not.toContain("appid");
  });

  it("caches successful forecast responses", async () => {
    client.getForecast.mockResolvedValueOnce(createForecastPayload());

    const firstResponse = await authorizedGet("/api/weather/forecast")
      .query({ lat: 10, lon: 20 })
      .expect(200);
    const secondResponse = await authorizedGet("/api/weather/forecast")
      .query({ lat: "10.0", lon: "20.0" })
      .expect(200);

    expect(firstResponse.body as ForecastResponse).toEqual(
      secondResponse.body as ForecastResponse,
    );
    expect(client.getForecast).toHaveBeenCalledTimes(1);
  });

  function authorizedGet(path: string) {
    return request(app.getHttpServer())
      .get(path)
      .set("Authorization", "Bearer test-access-token");
  }
});

function createForecastPayload() {
  return {
    city: {
      name: "Cache City",
      country: "CC",
      coord: { lat: 10, lon: 20 },
      timezone: 0,
    },
    list: [
      {
        dt: Date.parse("2026-01-01T12:00:00Z") / 1_000,
        main: {
          temp: 20,
          feels_like: 19,
          temp_min: 18,
          temp_max: 21,
          humidity: 55,
        },
        weather: [{ id: 800, description: "clear sky" }],
        wind: { speed: 2.5 },
      },
    ],
  };
}
