import { getMetadataArgsStorage } from "typeorm";
import { SavedForecastEntity } from "../src/database/entities/saved-forecast.entity";
import { UserEntity } from "../src/database/entities/user.entity";

describe("database entity mappings", () => {
  it("maps external identities to users with the required unique constraint", () => {
    const metadata = getMetadataArgsStorage();
    const table = metadata.filterTables(UserEntity)[0];
    const unique = metadata.filterUniques(UserEntity)[0];

    expect(table.name).toBe("users");
    expect(unique.name).toBe("UQ_users_identity_issuer_external_subject");
    expect(unique.columns).toEqual([
      "identityIssuer",
      "externalSubjectIdentifier",
    ]);
    expect(
      metadata
        .filterColumns(UserEntity)
        .some(({ propertyName }) =>
          propertyName.toLowerCase().includes("password"),
        ),
    ).toBe(false);
  });

  it("maps historical JSONB forecasts to users with a retrieval index", () => {
    const metadata = getMetadataArgsStorage();
    const table = metadata.filterTables(SavedForecastEntity)[0];
    const snapshot = metadata
      .filterColumns(SavedForecastEntity)
      .find(({ propertyName }) => propertyName === "forecastSnapshot");
    const relation = metadata
      .filterRelations(SavedForecastEntity)
      .find(({ propertyName }) => propertyName === "user");
    const index = metadata.filterIndices(SavedForecastEntity)[0];

    expect(table.name).toBe("saved_forecasts");
    expect(snapshot?.options.type).toBe("jsonb");
    expect(relation?.relationType).toBe("many-to-one");
    expect(relation?.options.onDelete).toBe("RESTRICT");
    expect(index.name).toBe("IDX_saved_forecasts_user_saved_at");
    expect(index.columns).toEqual(["userId", "savedAt"]);
  });
});
