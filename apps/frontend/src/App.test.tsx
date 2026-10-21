import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const authentication = vi.hoisted(() => ({
  isAuthenticated: true,
  inProgress: "none",
  accounts: [
    {
      homeAccountId: "test-home-account",
      localAccountId: "test-local-account",
      environment: "login.example.test",
      tenantId: "test-tenant",
      username: "",
      name: "MSAL Display Name",
    },
  ],
  instance: {
    getActiveAccount: vi.fn(),
    acquireTokenSilent: vi.fn(),
    acquireTokenRedirect: vi.fn(),
    loginRedirect: vi.fn(),
    logoutRedirect: vi.fn(),
  },
}));

vi.mock("@azure/msal-react", () => ({
  useIsAuthenticated: () => authentication.isAuthenticated,
  useMsal: () => ({
    instance: authentication.instance,
    accounts: authentication.accounts,
    inProgress: authentication.inProgress,
  }),
}));

vi.mock("./auth/authConfig", () => ({
  apiTokenRequest: { scopes: ["api://test/access_as_user"] },
}));

const currentUser = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  displayName: "Authenticated User",
  identityProvider: "google.com",
  createdAt: "2026-10-20T10:00:00.000Z",
  updatedAt: "2026-10-20T10:00:00.000Z",
};

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

const savedSummary = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  cityName: "London",
  countryCode: "GB",
  latitude: 51.5072,
  longitude: -0.1276,
  savedAt: "2026-10-20T12:00:00.000Z",
  forecastStartDate: "2026-01-01",
  forecastEndDate: "2026-01-05",
};

const savedDetail = {
  ...savedSummary,
  forecast: forecastResult,
};

const singleDaySavedSummary = {
  ...savedSummary,
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  forecastStartDate: "2026-01-02",
  forecastEndDate: "2026-01-02",
};

const singleDaySavedDetail = {
  ...singleDaySavedSummary,
  forecast: { ...forecastResult, days: [forecastResult.days[1]] },
};

describe("App", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authentication.isAuthenticated = true;
    authentication.inProgress = "none";
    authentication.accounts = [
      {
        homeAccountId: "test-home-account",
        localAccountId: "test-local-account",
        environment: "login.example.test",
        tenantId: "test-tenant",
        username: "",
        name: "MSAL Display Name",
      },
    ];
    authentication.instance.getActiveAccount.mockReturnValue(null);
    authentication.instance.acquireTokenSilent.mockResolvedValue({
      accessToken: "test-access-token",
    });
    authentication.instance.acquireTokenRedirect.mockResolvedValue(undefined);
    authentication.instance.loginRedirect.mockResolvedValue(undefined);
    authentication.instance.logoutRedirect.mockResolvedValue(undefined);
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders an accessible signed-out state and starts redirect login", async () => {
    authentication.isAuthenticated = false;
    authentication.accounts = [];
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Sign in to continue" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(authentication.instance.loginRedirect).toHaveBeenCalledWith({
        scopes: ["api://test/access_as_user"],
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("synchronizes and displays the authenticated user once", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(currentUser));
    const view = render(<App />);

    expect(
      await screen.findByText("Signed in as Authenticated User"),
    ).toBeInTheDocument();
    view.rerender(<App />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/auth/me");
  });

  it("attaches the API access token to protected requests", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(currentUser))
      .mockResolvedValueOnce(jsonResponse([locationResult]));
    render(<App />);
    await screen.findByText("Signed in as Authenticated User");

    fireEvent.change(screen.getByLabelText("City name"), {
      target: { value: "London" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByRole("button", { name: /London, England, GB/ });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const call of fetchMock.mock.calls) {
      const options = call[1] as RequestInit;
      expect(options.headers).toMatchObject({
        Authorization: "Bearer test-access-token",
      });
    }
  });

  it("shows a safe authentication API error without rendering or logging a token", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    fetchMock.mockResolvedValueOnce(
      new Response("internal authentication response", { status: 503 }),
    );
    render(<App />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("could not finish signing you in");
    expect(document.body).not.toHaveTextContent("test-access-token");
    expect(document.body).not.toHaveTextContent(
      "internal authentication response",
    );
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("searches for a city and renders location choices", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(currentUser))
      .mockResolvedValueOnce(jsonResponse([locationResult]));
    render(<App />);
    await screen.findByText("Signed in as Authenticated User");

    fireEvent.change(screen.getByLabelText("City name"), {
      target: { value: "London" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(
      await screen.findByRole("button", { name: /London, England, GB/ }),
    ).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/api/weather/locations?query=London",
    );
  });

  it("selects a location and initially renders only its first forecast day", async () => {
    await renderForecast();

    expect(
      await screen.findByRole("heading", { name: "Forecast for London, GB" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("3-hour forecast details")).toHaveLength(1);
    expect(screen.getByText("Day 1 of 5")).toBeInTheDocument();
    expect(
      screen.getAllByText(/(?:January 1, 2026|1 January 2026)/),
    ).toHaveLength(2);
    expect(screen.queryByText(/(?:January 2, 2026|2 January 2026)/)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Previous forecast day" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Next forecast day" }),
    ).not.toBeDisabled();
    expect(String(fetchMock.mock.calls[2][0])).toContain(
      "/api/weather/forecast?lat=51.5072&lon=-0.1276",
    );
  });

  it("expands three-hour forecast details", async () => {
    await renderForecast();
    const summary = screen.getByText("3-hour forecast details");
    const details = summary.closest("details");

    fireEvent.click(summary);

    expect(details).toHaveAttribute("open");
    expect(screen.getByText("12:00")).toBeInTheDocument();
    expect(screen.getByText("3.2 m/s")).toBeInTheDocument();
  });

  it("navigates forecast days and disables controls at each boundary", async () => {
    await renderForecast();
    const previous = screen.getByRole("button", {
      name: "Previous forecast day",
    });
    const next = screen.getByRole("button", { name: "Next forecast day" });

    fireEvent.click(next);
    expect(screen.getByText("Day 2 of 5")).toBeInTheDocument();
    expect(
      screen.getAllByText(/(?:January 2, 2026|2 January 2026)/),
    ).toHaveLength(2);
    expect(previous).not.toBeDisabled();
    fireEvent.click(previous);
    expect(screen.getByText("Day 1 of 5")).toBeInTheDocument();

    for (let day = 1; day < 5; day += 1) fireEvent.click(next);
    expect(screen.getByText("Day 5 of 5")).toBeInTheDocument();
    expect(next).toBeDisabled();
  });

  it("loads a popular city directly by coordinates and resets the selected day", async () => {
    await renderForecast();
    fireEvent.click(screen.getByRole("button", { name: "Next forecast day" }));
    expect(screen.getByText("Day 2 of 5")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Search another city" }),
    );

    fetchMock.mockResolvedValueOnce(jsonResponse(forecastResult));
    fireEvent.click(
      screen.getByRole("button", {
        name: "View forecast for Tel Aviv, Israel",
      }),
    );

    expect(await screen.findByText("Day 1 of 5")).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[3][0])).toContain(
      "/api/weather/forecast?lat=32.0853&lon=34.7818",
    );
    expect(
      fetchMock.mock.calls
        .slice(3)
        .some(([url]) => String(url).includes("/weather/locations")),
    ).toBe(false);
  });

  it("shows safe loading and failure states for a popular city", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(currentUser))
      .mockResolvedValueOnce(new Response("provider details", { status: 503 }));
    render(<App />);
    await screen.findByText("Signed in as Authenticated User");
    fireEvent.click(
      screen.getByRole("button", { name: "View forecast for Paris, France" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading the forecast",
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We could not load that forecast");
    expect(alert).not.toHaveTextContent("provider details");
  });

  it("announces a weather loading state", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(currentUser))
      .mockReturnValueOnce(new Promise(() => undefined));
    render(<App />);
    await screen.findByText("Signed in as Authenticated User");

    fireEvent.change(screen.getByLabelText("City name"), {
      target: { value: "London" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Searching for locations",
    );
  });

  it("shows an empty result", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(currentUser))
      .mockResolvedValueOnce(jsonResponse([]));
    render(<App />);
    await screen.findByText("Signed in as Authenticated User");

    fireEvent.change(screen.getByLabelText("City name"), {
      target: { value: "Nowhere" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(
      await screen.findByText(/No matching locations found/),
    ).toBeInTheDocument();
  });

  it("shows a validation message without making a weather request", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(currentUser));
    render(<App />);
    await screen.findByText("Signed in as Authenticated User");

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByRole("status")).toHaveTextContent("Enter a city name");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a safe weather API error state", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(currentUser))
      .mockResolvedValueOnce(
        new Response("internal response body", { status: 503 }),
      );
    render(<App />);
    await screen.findByText("Signed in as Authenticated User");

    fireEvent.change(screen.getByLabelText("City name"), {
      target: { value: "London" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We could not search for that city");
    expect(alert).not.toHaveTextContent("internal response body");
  });

  it("saves only the selected forecast date with its coordinates", async () => {
    await renderForecast();
    expect(
      screen.getByRole("button", { name: "Save this day" }),
    ).toBeInTheDocument();
    fetchMock.mockResolvedValueOnce(jsonResponse(savedDetail));

    fireEvent.click(screen.getByRole("button", { name: "Next forecast day" }));
    fireEvent.click(screen.getByRole("button", { name: "Save this day" }));

    expect(
      await screen.findByText("This forecast day was saved as a new snapshot."),
    ).toBeInTheDocument();
    const saveCall = fetchMock.mock.calls[3];
    expect(String(saveCall[0])).toContain("/api/saved-forecasts");
    const options = saveCall[1] as RequestInit;
    expect(options.method).toBe("POST");
    expect(JSON.parse(String(options.body))).toEqual({
      latitude: 51.5072,
      longitude: -0.1276,
      date: "2026-01-02",
    });
    expect(options.headers).toMatchObject({
      Authorization: "Bearer test-access-token",
    });
  });

  it("disables save while pending", async () => {
    await renderForecast();
    fetchMock.mockReturnValueOnce(new Promise(() => undefined));
    fireEvent.click(screen.getByRole("button", { name: "Save this day" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });

  it("shows a safe save error", async () => {
    await renderForecast();
    fetchMock.mockResolvedValueOnce(
      new Response("database details", { status: 500 }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save this day" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We could not save this forecast");
    expect(alert).not.toHaveTextContent("database details");
  });

  it("clears save feedback when the selected day changes", async () => {
    await renderForecast();
    fetchMock.mockResolvedValueOnce(jsonResponse(singleDaySavedDetail));
    fireEvent.click(screen.getByRole("button", { name: "Save this day" }));
    expect(
      await screen.findByText("This forecast day was saved as a new snapshot."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next forecast day" }));
    expect(
      screen.queryByText("This forecast day was saved as a new snapshot."),
    ).toBeNull();
  });

  it("shows a loading saved-forecast state", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(currentUser))
      .mockReturnValueOnce(new Promise(() => undefined));
    render(<App />);
    await screen.findByText("Signed in as Authenticated User");
    fireEvent.click(screen.getByRole("button", { name: "Saved forecasts" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading saved forecasts",
    );
  });

  it("shows an empty saved-forecast state", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(currentUser))
      .mockResolvedValueOnce(jsonResponse({ items: [], nextCursor: null }));
    render(<App />);
    await screen.findByText("Signed in as Authenticated User");
    fireEvent.click(screen.getByRole("button", { name: "Saved forecasts" }));
    expect(
      await screen.findByText("You have not saved any forecasts yet."),
    ).toBeInTheDocument();
  });

  it("shows a safe saved-history error", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(currentUser))
      .mockResolvedValueOnce(new Response("query internals", { status: 500 }));
    render(<App />);
    await screen.findByText("Signed in as Authenticated User");
    fireEvent.click(screen.getByRole("button", { name: "Saved forecasts" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("could not load your saved forecasts");
    expect(alert).not.toHaveTextContent("query internals");
  });

  it("renders newest-first history and loads another cursor page", async () => {
    const older = {
      ...savedSummary,
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      cityName: "Paris",
      countryCode: "FR",
      savedAt: "2026-10-19T12:00:00.000Z",
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(currentUser))
      .mockResolvedValueOnce(
        jsonResponse({ items: [savedSummary], nextCursor: "opaque-cursor" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ items: [older], nextCursor: null }),
      );
    render(<App />);
    await screen.findByText("Signed in as Authenticated User");
    fireEvent.click(screen.getByRole("button", { name: "Saved forecasts" }));
    await screen.findByRole("button", { name: /London, GB/ });
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByRole("button", { name: /Paris, FR/ });

    const historyButtons = screen.getAllByRole("button", {
      name: /London, GB|Paris, FR/,
    });
    expect(historyButtons[0]).toHaveTextContent("London");
    expect(historyButtons[1]).toHaveTextContent("Paris");
    expect(String(fetchMock.mock.calls[2][0])).toContain(
      "/api/saved-forecasts?cursor=opaque-cursor",
    );
  });

  it("displays a stored snapshot without requesting live weather and returns to search", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(currentUser))
      .mockResolvedValueOnce(
        jsonResponse({ items: [savedSummary], nextCursor: null }),
      )
      .mockResolvedValueOnce(jsonResponse(savedDetail));
    render(<App />);
    await screen.findByText("Signed in as Authenticated User");
    fireEvent.click(screen.getByRole("button", { name: "Saved forecasts" }));
    fireEvent.click(await screen.findByRole("button", { name: /London, GB/ }));

    expect(
      await screen.findByText("Historical saved snapshot"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save this day" })).toBeNull();
    expect(screen.getByText("Day 1 of 5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next forecast day" }));
    expect(screen.getByText("Day 2 of 5")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes("/weather/")),
    ).toBe(false);
    expect(document.body).not.toHaveTextContent("test-access-token");
    expect(document.body).not.toHaveTextContent("email@example.test");
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    for (const call of fetchMock.mock.calls) {
      expect((call[1] as RequestInit).headers).toMatchObject({
        Authorization: "Bearer test-access-token",
      });
    }

    fireEvent.click(screen.getByRole("button", { name: "Return to search" }));
    expect(screen.getByLabelText("City name")).toBeInTheDocument();
  });

  it("formats and opens a newly saved single-day snapshot", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(currentUser))
      .mockResolvedValueOnce(
        jsonResponse({ items: [singleDaySavedSummary], nextCursor: null }),
      )
      .mockResolvedValueOnce(jsonResponse(singleDaySavedDetail));
    render(<App />);
    await screen.findByText("Signed in as Authenticated User");
    fireEvent.click(screen.getByRole("button", { name: "Saved forecasts" }));

    const historyItem = await screen.findByRole("button", {
      name: /London, GB/,
    });
    expect(historyItem).toHaveTextContent(/(?:January 2, 2026|2 January 2026)/);
    expect(historyItem).not.toHaveTextContent(" to ");
    fireEvent.click(historyItem);

    expect(await screen.findByText("Day 1 of 1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous forecast day" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Next forecast day" }),
    ).toBeDisabled();
  });

  async function renderForecast() {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(currentUser))
      .mockResolvedValueOnce(jsonResponse([locationResult]))
      .mockResolvedValueOnce(jsonResponse(forecastResult));
    render(<App />);
    await screen.findByText("Signed in as Authenticated User");

    fireEvent.change(screen.getByLabelText("City name"), {
      target: { value: "London" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /London, England, GB/ }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  }
});

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
