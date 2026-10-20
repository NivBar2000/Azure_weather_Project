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
