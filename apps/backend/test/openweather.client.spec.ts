import { AppConfiguration } from "../src/config/configuration";
import { OpenWeatherClient } from "../src/weather/openweather.client";

describe("OpenWeatherClient", () => {
  const configuration: AppConfiguration = {
    openWeatherApiKey: "test-only-placeholder",
    openWeatherBaseUrl: "https://api.openweathermap.org",
    frontendOrigin: "http://localhost:5173",
    port: 3000,
    database: {
      host: "localhost",
      port: 5432,
      username: "test-user",
      password: "test-only-placeholder",
      name: "test-database",
      ssl: false,
    },
    entra: {
      tenantId: "11111111-1111-4111-8111-111111111111",
      apiClientId: "22222222-2222-4222-8222-222222222222",
      allowedClientId: "33333333-3333-4333-8333-333333333333",
      oidcMetadataUrl:
        "https://tenant-name.ciamlogin.test/11111111-1111-4111-8111-111111111111/v2.0/.well-known/openid-configuration",
      expectedIssuer:
        "https://11111111-1111-4111-8111-111111111111.ciamlogin.test/11111111-1111-4111-8111-111111111111/v2.0",
      requiredScope: "access_as_user",
    },
  };

  it("uses the fixed geocoding path and safely encoded parameters", async () => {
    const fetchMock = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(async () => Promise.resolve(new Response("[]", { status: 200 })));
    const fetchImplementation: typeof fetch = (input, init) =>
      fetchMock(input, init);
    const client = new OpenWeatherClient(configuration, fetchImplementation);

    await client.searchLocations("São Paulo & region");

    const requestUrl = getRequestUrl(fetchMock.mock.calls[0][0]);
    expect(requestUrl.pathname).toBe("/geo/1.0/direct");
    expect(requestUrl.searchParams.get("q")).toBe("São Paulo & region");
    expect(requestUrl.searchParams.get("limit")).toBe("5");
  });

  it("uses the fixed metric forecast path", async () => {
    const fetchMock = jest.fn<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    >(async () => Promise.resolve(new Response("{}", { status: 200 })));
    const fetchImplementation: typeof fetch = (input, init) =>
      fetchMock(input, init);
    const client = new OpenWeatherClient(configuration, fetchImplementation);

    await client.getForecast(12.3, 45.6);

    const requestUrl = getRequestUrl(fetchMock.mock.calls[0][0]);
    expect(requestUrl.pathname).toBe("/data/2.5/forecast");
    expect(requestUrl.searchParams.get("lat")).toBe("12.3");
    expect(requestUrl.searchParams.get("lon")).toBe("45.6");
    expect(requestUrl.searchParams.get("units")).toBe("metric");
  });
});

function getRequestUrl(input: RequestInfo | URL): URL {
  if (typeof input === "string") {
    return new URL(input);
  }
  if (input instanceof URL) {
    return input;
  }
  return new URL(input.url);
}
