import {
  encodeCursor,
  parseCursor,
} from "../src/saved-forecasts/saved-forecast.validation";

describe("saved forecast cursor precision", () => {
  it("round-trips the millisecond precision stored by PostgreSQL", () => {
    const savedAt = new Date("2026-10-20T12:34:56.789Z");
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

    const parsed = parseCursor(encodeCursor(savedAt, id));

    expect(parsed).toEqual({ savedAt, id });
    expect(parsed?.savedAt.toISOString()).toBe("2026-10-20T12:34:56.789Z");
  });
});
