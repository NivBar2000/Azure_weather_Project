import { FormEvent, useState } from "react";
import {
  ForecastResponse,
  LocationResult,
  fetchForecast,
  searchLocations,
} from "./api/weatherApi";
import { ForecastView } from "./components/ForecastView";
import { LocationResults } from "./components/LocationResults";
import { SearchForm } from "./components/SearchForm";

type LoadingState = "idle" | "locations" | "forecast";
const MAXIMUM_QUERY_LENGTH = 100;

function App() {
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState<LoadingState>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

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
    setLocations([]);
    setHasSearched(true);
    try {
      setLocations(await searchLocations(normalizedQuery));
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
    try {
      setForecast(await fetchForecast(location.latitude, location.longitude));
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
    setMessage("");
    setError("");
    setHasSearched(false);
  }

  const isLoading = loading !== "idle";

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
            Search for a city and explore its five-day forecast in local time.
          </p>
        </div>
      </header>

      <section className="weather-panel" aria-label="Weather search">
        {!forecast && (
          <SearchForm
            query={query}
            disabled={isLoading}
            onQueryChange={setQuery}
            onSubmit={handleSearch}
          />
        )}

        {message && (
          <p className="notice validation-message" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="notice error-message" role="alert">
            {error}
          </p>
        )}
        {isLoading && (
          <div className="loading-message" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            {loading === "locations"
              ? "Searching for locations…"
              : "Loading the forecast…"}
          </div>
        )}

        {!isLoading && locations.length > 0 && (
          <LocationResults
            locations={locations}
            onSelect={handleLocationSelection}
          />
        )}

        {!isLoading &&
          hasSearched &&
          locations.length === 0 &&
          !forecast &&
          !error && (
            <p className="notice empty-message" role="status">
              No matching locations found. Try adding a country or region.
            </p>
          )}

        {forecast && (
          <ForecastView
            forecast={forecast}
            onAnotherSearch={startAnotherSearch}
          />
        )}
      </section>
    </main>
  );
}

export default App;
