import { QueryRunner } from "typeorm";
import { AlignSavedForecastCursorPrecision1792512000000 } from "../src/database/migrations/1792512000000-AlignSavedForecastCursorPrecision";

describe("saved forecast cursor precision migration", () => {
  it("truncates timestamps to milliseconds and builds the stable ordering index", async () => {
    const query = jest.fn<Promise<void>, [string]>(() => Promise.resolve());
    const queryRunner = { query } as unknown as QueryRunner;

    await new AlignSavedForecastCursorPrecision1792512000000().up(queryRunner);

    const statements = query.mock.calls
      .map(([statement]) => String(statement).replace(/\s+/g, " ").trim())
      .join(" ");
    expect(statements).toContain(
      'ALTER COLUMN "saved_at" TYPE timestamptz(3) USING date_trunc(\'milliseconds\', "saved_at")',
    );
    expect(statements).toContain(
      'ALTER COLUMN "saved_at" SET DEFAULT CURRENT_TIMESTAMP(3)',
    );
    expect(statements).toContain(
      'ON "saved_forecasts" ("user_id", "saved_at", "id")',
    );
  });
});
