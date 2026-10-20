import {
  normalizeForecast,
  normalizeLocations,
} from "../src/weather/weather-normalizer";

describe("weather normalization", () => {
  it("normalizes only the required location fields", () => {
    const locations = normalizeLocations([
      {
        name: "München",
        country: "DE",
        state: "Bavaria",
        lat: 48.1374,
        lon: 11.5755,
        local_names: { en: "Munich" },
      },
    ]);

    expect(locations).toEqual([
      {
        name: "München",
        country: "DE",
        state: "Bavaria",
        latitude: 48.1374,
        longitude: 11.5755,
      },
    ]);
  });

  it("returns an empty location result", () => {
    expect(normalizeLocations([])).toEqual([]);
  });

  it("groups slots by local date and calculates daily aggregates", () => {
    const forecast = normalizeForecast({
      city: {
        name: "Test City",
        country: "TC",
        coord: { lat: 10, lon: 20 },
        timezone: 7_200,
      },
      list: [
        createSlot("2026-01-01T22:00:00Z", 9, 11, 70, 2.4, 500, "rain"),
        createSlot("2026-01-02T09:00:00Z", 14, 16, 50, 5.26, 800, "clear sky"),
        createSlot("2026-01-02T12:00:00Z", 13, 15, 60, 3.1, 801, "few clouds"),
      ],
    });

    expect(forecast.timezoneOffsetSeconds).toBe(7_200);
    expect(forecast.days).toHaveLength(1);
    expect(forecast.days[0]).toMatchObject({
      date: "2026-01-02",
      summary: "clear sky",
      weatherCode: 800,
      minimumTemperature: 9,
      maximumTemperature: 16,
      averageHumidity: 60,
      maximumWindSpeed: 5.3,
    });
    expect(forecast.days[0].slots.map((slot) => slot.localTime)).toEqual([
      "2026-01-02T00:00:00",
      "2026-01-02T11:00:00",
      "2026-01-02T14:00:00",
    ]);
  });
});

function createSlot(
  timestamp: string,
  minimumTemperature: number,
  maximumTemperature: number,
  humidity: number,
  windSpeed: number,
  weatherCode: number,
  description: string,
) {
  const temperature = (minimumTemperature + maximumTemperature) / 2;
  return {
    dt: Date.parse(timestamp) / 1_000,
    main: {
      temp: temperature,
      feels_like: temperature - 1,
      temp_min: minimumTemperature,
      temp_max: maximumTemperature,
      humidity,
    },
    weather: [{ id: weatherCode, description }],
    wind: { speed: windSpeed },
  };
}
