import {
  InteractionRequiredAuthError,
  InteractionStatus,
} from "@azure/msal-browser";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CurrentUser,
  ForecastResponse,
  LocationResult,
  SavedForecastDetail,
  SavedForecastSummary,
  WeatherApiClient,
  createWeatherApiClient,
} from "./api/weatherApi";
import { apiTokenRequest } from "./auth/authConfig";
import { ForecastView } from "./components/ForecastView";
import { LocationResults } from "./components/LocationResults";
import { PopularCities } from "./components/PopularCities";
import { SavedForecastHistory } from "./components/SavedForecastHistory";
import { SearchForm } from "./components/SearchForm";

type LoadingState = "idle" | "locations" | "forecast";
type ApplicationView = "search" | "live" | "history" | "historical";
const MAXIMUM_QUERY_LENGTH = 100;

function App() {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = instance.getActiveAccount() ?? accounts[0];
  const [currentUser, setCurrentUser] = useState<{
    accountId: string;
    user: CurrentUser;
  } | null>(null);
  const [authenticationError, setAuthenticationError] = useState("");
  const [retrySequence, setRetrySequence] = useState(0);
  const synchronizedAccount = useRef<string | undefined>(undefined);

  const getAccessToken = useCallback(async (): Promise<string> => {
    if (!account) {
      throw new Error("An authenticated account is required");
    }
    try {
      const result = await instance.acquireTokenSilent({
        ...apiTokenRequest,
        account,
      });
      return result.accessToken;
    } catch (error: unknown) {
      if (error instanceof InteractionRequiredAuthError) {
        await instance.acquireTokenRedirect({
          ...apiTokenRequest,
          account,
        });
        throw new AuthenticationRedirectStartedError();
      }
      throw error;
    }
  }, [account, instance]);

  const apiClient = useMemo(
    () => createWeatherApiClient(getAccessToken),
    [getAccessToken],
  );

  useEffect(() => {
    if (!isAuthenticated || !account) {
      synchronizedAccount.current = undefined;
      return;
    }
    const accountKey = `${account.homeAccountId}:${retrySequence}`;
    if (synchronizedAccount.current === accountKey) {
      return;
    }
    synchronizedAccount.current = accountKey;
    let active = true;
    void apiClient
      .getCurrentUser()
      .then((user) => {
        if (active) {
          setCurrentUser({ accountId: account.homeAccountId, user });
        }
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof AuthenticationRedirectStartedError)) {
          setAuthenticationError(
            "We could not finish signing you in. Please try again.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [account, apiClient, isAuthenticated, retrySequence]);

  async function handleSignIn(): Promise<void> {
    setAuthenticationError("");
    try {
      await instance.loginRedirect(apiTokenRequest);
    } catch {
      setAuthenticationError("Sign in could not be started. Please try again.");
    }
  }

  async function handleSignOut(): Promise<void> {
    setAuthenticationError("");
    try {
      await instance.logoutRedirect({
        account,
        postLogoutRedirectUri: `${window.location.origin}/`,
      });
    } catch {
      setAuthenticationError(
        "Sign out could not be completed. Please try again.",
      );
    }
  }

  function retrySynchronization(): void {
    setAuthenticationError("");
    setRetrySequence((value) => value + 1);
  }

  if (inProgress !== InteractionStatus.None) {
    return <AuthenticationStatus message="Completing authentication…" />;
  }

  if (!isAuthenticated) {
    return (
      <main className="page-shell authentication-shell">
        <section className="weather-panel authentication-panel">
          <p className="eyebrow">Azure Weather</p>
          <h1>Sign in to continue</h1>
          <p>
            Use your configured Microsoft, Google, or email one-time passcode
            identity to access weather forecasts.
          </p>
          {authenticationError && (
            <p className="notice error-message" role="alert">
              {authenticationError}
            </p>
          )}
          <button
            className="primary-button"
            onClick={() => void handleSignIn()}
          >
            Sign in
          </button>
        </section>
      </main>
    );
  }

  if (authenticationError) {
    return (
      <main className="page-shell authentication-shell">
        <section className="weather-panel authentication-panel">
          <p className="notice error-message" role="alert">
            {authenticationError}
          </p>
          <button className="primary-button" onClick={retrySynchronization}>
            Retry
          </button>
          <button
            className="secondary-button"
            onClick={() => void handleSignOut()}
          >
            Sign out
          </button>
        </section>
      </main>
    );
  }

  if (!currentUser || currentUser.accountId !== account?.homeAccountId) {
    return <AuthenticationStatus message="Preparing your weather account…" />;
  }

  return (
    <>
      <div className="account-bar">
        <span>Signed in as {currentUser.user.displayName}</span>
        <button
          className="secondary-button"
          onClick={() => void handleSignOut()}
        >
          Sign out
        </button>
      </div>
      <WeatherApplication apiClient={apiClient} />
    </>
  );
}

function AuthenticationStatus({ message }: { message: string }) {
  return (
    <main className="page-shell authentication-shell">
      <div className="loading-message authentication-panel" role="status">
        <span className="spinner" aria-hidden="true" />
        {message}
      </div>
    </main>
  );
}

function WeatherApplication({ apiClient }: { apiClient: WeatherApiClient }) {
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [view, setView] = useState<ApplicationView>("search");
  const [loading, setLoading] = useState<LoadingState>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [historyItems, setHistoryItems] = useState<SavedForecastSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [savedForecast, setSavedForecast] =
    useState<SavedForecastDetail | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    setError("");
    setMessage("");

    if (!normalizedQuery) {
      setMessage("Enter a city name to search.");
      return;
    }
    if (Array.from(normalizedQuery).length > MAXIMUM_QUERY_LENGTH) {
      setMessage(
        `City names must be ${MAXIMUM_QUERY_LENGTH} characters or fewer.`,
      );
      return;
    }

    setLoading("locations");
    setForecast(null);
    setSelectedDayIndex(0);
    setSaveMessage("");
    setSaveError("");
    setView("search");
    setLocations([]);
    setHasSearched(true);
    try {
      setLocations(await apiClient.searchLocations(normalizedQuery));
    } catch {
      setError("We could not search for that city. Please try again.");
    } finally {
      setLoading("idle");
    }
  }

  async function handleLocationSelection(location: LocationResult) {
    setError("");
    setMessage("");
    setLoading("forecast");
    setForecast(null);
    setSavedForecast(null);
    setSelectedDayIndex(0);
    setSaveMessage("");
    setSaveError("");
    try {
      const loadedForecast = await apiClient.fetchForecast(
        location.latitude,
        location.longitude,
      );
      setForecast(loadedForecast);
      setView("live");
      setLocations([]);
    } catch {
      setError("We could not load that forecast. Please try again.");
    } finally {
      setLoading("idle");
    }
  }

  function startAnotherSearch() {
    setQuery("");
    setLocations([]);
    setForecast(null);
    setSavedForecast(null);
    setSelectedDayIndex(0);
    setView("search");
    setMessage("");
    setError("");
    setSaveMessage("");
    setSaveError("");
    setHasSearched(false);
  }

  async function saveCurrentForecast(): Promise<void> {
    const selectedDay = forecast?.days[selectedDayIndex];
    if (!forecast || !selectedDay || saving) {
      return;
    }
    setSaving(true);
    setSaveMessage("");
    setSaveError("");
    try {
      await apiClient.saveForecast(
        forecast.location.latitude,
        forecast.location.longitude,
        selectedDay.date,
      );
      setSaveMessage("This forecast day was saved as a new snapshot.");
      setHistoryItems([]);
      setNextCursor(null);
    } catch {
      setSaveError("We could not save this forecast. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function showHistory(): Promise<void> {
    setView("history");
    setSavedForecast(null);
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const page = await apiClient.listSavedForecasts();
      setHistoryItems(page.items);
      setNextCursor(page.nextCursor);
    } catch {
      setHistoryItems([]);
      setNextCursor(null);
      setHistoryError(
        "We could not load your saved forecasts. Please try again.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadMoreHistory(): Promise<void> {
    if (!nextCursor) {
      return;
    }
    setLoadingMore(true);
    setHistoryError("");
    try {
      const page = await apiClient.listSavedForecasts(nextCursor);
      setHistoryItems((items) => [...items, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      setHistoryError(
        "We could not load more saved forecasts. Please try again.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function showSavedForecast(item: SavedForecastSummary): Promise<void> {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const loadedForecast = await apiClient.getSavedForecast(item.id);
      setSavedForecast(loadedForecast);
      setSelectedDayIndex(0);
      setView("historical");
    } catch {
      setHistoryError(
        "We could not load that saved forecast. Please try again.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  const isLoading = loading !== "idle";

  function selectForecastDay(index: number): void {
    setSelectedDayIndex(index);
    setSaveMessage("");
    setSaveError("");
  }

  return (
    <main className="page-shell">
      <header className="hero">
        <div className="brand-mark" aria-hidden="true">
          ☀
        </div>
        <div>
          <p className="eyebrow">Weather, made clear</p>
          <h1>Azure Weather</h1>
          <p className="intro">
            Search the world, then explore the outlook one clear day at a time.
          </p>
        </div>
      </header>

      <nav className="application-navigation" aria-label="Weather views">
        <button
          className="secondary-button"
          type="button"
          onClick={startAnotherSearch}
        >
          Search weather
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void showHistory()}
        >
          Saved forecasts
        </button>
      </nav>

      <section className="weather-panel" aria-label="Weather search">
        {view === "search" && !forecast && (
          <div className="search-dashboard">
            <SearchForm
              query={query}
              disabled={isLoading}
              onQueryChange={setQuery}
              onSubmit={handleSearch}
            />
            <PopularCities
              disabled={isLoading}
              onSelect={(city) => void handleLocationSelection(city)}
            />
          </div>
        )}

        {view === "search" && message && (
          <p className="notice validation-message" role="status">
            {message}
          </p>
        )}
        {view === "search" && error && (
          <p className="notice error-message" role="alert">
            {error}
          </p>
        )}
        {view === "search" && isLoading && (
          <div className="loading-message" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            {loading === "locations"
              ? "Searching for locations…"
              : "Loading the forecast…"}
          </div>
        )}

        {view === "search" && !isLoading && locations.length > 0 && (
          <LocationResults
            locations={locations}
            onSelect={handleLocationSelection}
          />
        )}

        {view === "search" &&
          !isLoading &&
          hasSearched &&
          locations.length === 0 &&
          !forecast &&
          !error && (
            <p className="notice empty-message" role="status">
              No matching locations found. Try adding a country or region.
            </p>
          )}

        {view === "live" && forecast && (
          <ForecastView
            forecast={forecast}
            selectedDayIndex={selectedDayIndex}
            onSelectedDayChange={selectForecastDay}
            onAnotherSearch={startAnotherSearch}
            saving={saving}
            saveMessage={saveMessage}
            saveError={saveError}
            onSave={() => void saveCurrentForecast()}
          />
        )}

        {view === "history" && (
          <SavedForecastHistory
            items={historyItems}
            loading={historyLoading}
            loadingMore={loadingMore}
            error={historyError}
            nextCursor={nextCursor}
            onSelect={(item) => void showSavedForecast(item)}
            onLoadMore={() => void loadMoreHistory()}
            onReturn={startAnotherSearch}
          />
        )}

        {view === "historical" && savedForecast && (
          <ForecastView
            forecast={savedForecast.forecast}
            selectedDayIndex={selectedDayIndex}
            onSelectedDayChange={selectForecastDay}
            mode="historical"
            savedAt={savedForecast.savedAt}
            onAnotherSearch={startAnotherSearch}
          />
        )}
      </section>
    </main>
  );
}

export default App;

class AuthenticationRedirectStartedError extends Error {}
