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

  it("selects a location and renders five forecast cards", async () => {
    await renderForecast();

    expect(
      await screen.findByRole("heading", { name: "Forecast for London, GB" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("3-hour details")).toHaveLength(5);
    expect(screen.getAllByText("12°C").length).toBeGreaterThan(0);
    expect(String(fetchMock.mock.calls[2][0])).toContain(
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

  it("shows save only for a live forecast and sends only coordinates", async () => {
    await renderForecast();
    expect(
      screen.getByRole("button", { name: "Save forecast" }),
    ).toBeInTheDocument();
    fetchMock.mockResolvedValueOnce(jsonResponse(savedDetail));

    fireEvent.click(screen.getByRole("button", { name: "Save forecast" }));

    expect(
      await screen.findByText("Saved as a new historical snapshot."),
    ).toBeInTheDocument();
    const saveCall = fetchMock.mock.calls[3];
    expect(String(saveCall[0])).toContain("/api/saved-forecasts");
    const options = saveCall[1] as RequestInit;
    expect(options.method).toBe("POST");
    expect(JSON.parse(String(options.body))).toEqual({
      latitude: 51.5072,
      longitude: -0.1276,
    });
    expect(options.headers).toMatchObject({
      Authorization: "Bearer test-access-token",
    });
  });

  it("disables save while pending", async () => {
    await renderForecast();
    fetchMock.mockReturnValueOnce(new Promise(() => undefined));
    fireEvent.click(screen.getByRole("button", { name: "Save forecast" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });

  it("shows a safe save error", async () => {
    await renderForecast();
    fetchMock.mockResolvedValueOnce(
      new Response("database details", { status: 500 }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save forecast" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We could not save this forecast");
    expect(alert).not.toHaveTextContent("database details");
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
    expect(screen.queryByRole("button", { name: "Save forecast" })).toBeNull();
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
