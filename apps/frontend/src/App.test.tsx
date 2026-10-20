import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const locationResult = {
  name: "London",
  country: "GB",
  state: "England",
  latitude: 51.5072,
  longitude: -0.1276,
};

const forecastResult = {
  location: {
    name: "London",
    country: "GB",
    latitude: 51.5072,
    longitude: -0.1276,
  },
  timezoneOffsetSeconds: 0,
  days: Array.from({ length: 5 }, (_, index) => ({
    date: `2026-01-0${index + 1}`,
    summary: index === 0 ? "clear sky" : "few clouds",
    weatherCode: index === 0 ? 800 : 801,
    minimumTemperature: 7 + index,
    maximumTemperature: 12 + index,
    averageHumidity: 60,
    maximumWindSpeed: 4.5,
    slots: [
      {
        timestamp: `2026-01-0${index + 1}T12:00:00.000Z`,
        localTime: `2026-01-0${index + 1}T12:00:00`,
        temperature: 11 + index,
        feelsLike: 10 + index,
        humidity: 60,
        windSpeed: 3.2,
        description: "clear sky",
        weatherCode: 800,
      },
    ],
  })),
};

describe("App", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("searches for a city and renders location choices", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([locationResult]));
    render(<App />);

    fireEvent.change(screen.getByLabelText("City name"), {
      target: { value: "London" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(
      await screen.findByRole("button", { name: /London, England, GB/ }),
    ).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/weather/locations?query=London",
    );
  });

  it("selects a location and renders five forecast cards", async () => {
    await renderForecast();

    expect(
      await screen.findByRole("heading", { name: "Forecast for London, GB" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("3-hour details")).toHaveLength(5);
    expect(screen.getAllByText("12°C").length).toBeGreaterThan(0);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/api/weather/forecast?lat=51.5072&lon=-0.1276",
    );
  });

  it("expands three-hour forecast details", async () => {
    await renderForecast();
    const summary = (await screen.findAllByText("3-hour details"))[0];
    const details = summary.closest("details");

    fireEvent.click(summary);

    expect(details).toHaveAttribute("open");
    expect(screen.getAllByText("12:00")).toHaveLength(5);
    expect(screen.getAllByText("3.2 m/s")).toHaveLength(5);
  });

  it("announces a loading state", () => {
    fetchMock.mockReturnValueOnce(new Promise(() => undefined));
    render(<App />);

    fireEvent.change(screen.getByLabelText("City name"), {
      target: { value: "London" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Searching for locations",
    );
  });

  it("shows an empty result", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    render(<App />);

    fireEvent.change(screen.getByLabelText("City name"), {
      target: { value: "Nowhere" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(
      await screen.findByText(/No matching locations found/),
    ).toBeInTheDocument();
  });

  it("shows a validation message without making a request", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByRole("status")).toHaveTextContent("Enter a city name");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a safe backend error state", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("internal response body", { status: 503 }),
    );
    render(<App />);

    fireEvent.change(screen.getByLabelText("City name"), {
      target: { value: "London" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We could not search for that city");
    expect(alert).not.toHaveTextContent("internal response body");
  });

  async function renderForecast() {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([locationResult]))
      .mockResolvedValueOnce(jsonResponse(forecastResult));
    render(<App />);

    fireEvent.change(screen.getByLabelText("City name"), {
      target: { value: "London" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /London, England, GB/ }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  }
});

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
