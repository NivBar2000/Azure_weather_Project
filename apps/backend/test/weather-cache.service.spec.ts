import { WeatherCacheService } from "../src/weather/weather-cache.service";

describe("WeatherCacheService", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("retrieves a valid entry", () => {
    const cache = new WeatherCacheService();
    cache.set("city", { temperature: 20 }, 1_000);

    expect(cache.get("city")).toEqual({ temperature: 20 });
  });

  it("removes an expired entry without a real delay", () => {
    const cache = new WeatherCacheService();
    cache.set("expired", "value", 1_000);

    jest.advanceTimersByTime(1_001);

    expect(cache.get("expired")).toBeUndefined();
  });

  it("never retains more than 500 entries", () => {
    const cache = new WeatherCacheService();
    for (let index = 0; index < 600; index += 1) {
      cache.set(`key-${index}`, index, 60_000);
    }

    const retainedEntries = Array.from({ length: 600 }, (_, index) =>
      cache.get(`key-${index}`),
    ).filter((value) => value !== undefined);
    expect(retainedEntries).toHaveLength(500);
  });

  it("evicts the oldest remaining entry at capacity", () => {
    const cache = new WeatherCacheService();
    for (let index = 0; index < 500; index += 1) {
      cache.set(`key-${index}`, index, 60_000);
    }

    cache.set("newest", 500, 60_000);

    expect(cache.get("key-0")).toBeUndefined();
    expect(cache.get("key-1")).toBe(1);
    expect(cache.get("newest")).toBe(500);
  });
});
