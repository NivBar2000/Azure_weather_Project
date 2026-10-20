import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { OpenWeatherClient } from "../src/weather/openweather.client";
import { ForecastResponse, LocationResult } from "../src/weather/weather.types";

describe("weather endpoints", () => {
  let app: INestApplication;
  const client = {
    searchLocations: jest.fn(),
    getForecast: jest.fn(),
  };

  beforeAll(async () => {
    process.env.OPENWEATHER_API_KEY = "test-only-placeholder";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OpenWeatherClient)
      .useValue(client)
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

    const response = await request(app.getHttpServer())
      .get("/api/weather/locations")
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

    const response = await request(app.getHttpServer())
      .get("/api/weather/locations")
      .query({ query: "Nowhere" })
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it.each([undefined, "   ", "a".repeat(101)])(
    "rejects an invalid city query",
    async (query) => {
      const requestBuilder = request(app.getHttpServer()).get(
        "/api/weather/locations",
      );
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
    const requestBuilder = request(app.getHttpServer()).get(
      "/api/weather/forecast",
    );
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

    const response = await request(app.getHttpServer())
      .get("/api/weather/forecast")
      .query({ lat: 1, lon: 2 })
      .expect(503);
    const serializedBody = JSON.stringify(response.body);

    expect(serializedBody).toContain("temporarily unavailable");
    expect(serializedBody).not.toContain("sensitive details");
    expect(serializedBody).not.toContain("appid");
  });

  it("caches successful forecast responses", async () => {
    client.getForecast.mockResolvedValueOnce(createForecastPayload());

    const firstResponse = await request(app.getHttpServer())
      .get("/api/weather/forecast")
      .query({ lat: 10, lon: 20 })
      .expect(200);
    const secondResponse = await request(app.getHttpServer())
      .get("/api/weather/forecast")
      .query({ lat: "10.0", lon: "20.0" })
      .expect(200);

    expect(firstResponse.body as ForecastResponse).toEqual(
      secondResponse.body as ForecastResponse,
    );
    expect(client.getForecast).toHaveBeenCalledTimes(1);
  });
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
