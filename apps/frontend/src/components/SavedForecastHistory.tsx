import { useEffect, useRef } from "react";
import { SavedForecastSummary } from "../api/weatherApi";
import { formatSavedTime } from "./dateFormat";

interface SavedForecastHistoryProps {
  items: SavedForecastSummary[];
  loading: boolean;
  loadingMore: boolean;
  error: string;
  nextCursor: string | null;
  onSelect: (item: SavedForecastSummary) => void;
  onLoadMore: () => void;
  onReturn: () => void;
}

export function SavedForecastHistory({
  items,
  loading,
  loadingMore,
  error,
  nextCursor,
  onSelect,
  onLoadMore,
  onReturn,
}: SavedForecastHistoryProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section className="history" aria-labelledby="history-heading">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Personal history</p>
          <h2 id="history-heading" ref={heading} tabIndex={-1}>
            Saved forecasts
          </h2>
        </div>
        <button className="secondary-button" type="button" onClick={onReturn}>
          Return to search
        </button>
      </div>

      {loading && (
        <p className="loading-message" role="status">
          <span className="spinner" aria-hidden="true" />
          Loading saved forecasts…
        </p>
      )}
      {error && (
        <p className="notice error-message" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="notice empty-message" role="status">
          You have not saved any forecasts yet.
        </p>
      )}
      {items.length > 0 && (
        <ul className="history-list">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => onSelect(item)}>
                <span>
                  <strong>
                    {item.cityName}
                    {item.countryCode ? `, ${item.countryCode}` : ""}
                  </strong>
                  <span>{formatDateRange(item)}</span>
                </span>
                <time dateTime={item.savedAt}>
                  Saved {formatSavedTime(item.savedAt)}
                </time>
              </button>
            </li>
          ))}
        </ul>
      )}
      {nextCursor && (
        <button
          className="secondary-button load-more-button"
          type="button"
          disabled={loadingMore}
          onClick={onLoadMore}
        >
          {loadingMore ? "Loading more…" : "Load more"}
        </button>
      )}
    </section>
  );
}

function formatDateRange(item: SavedForecastSummary): string {
  if (!item.forecastStartDate || !item.forecastEndDate) {
    return "Forecast dates unavailable";
  }
  return `${item.forecastStartDate} to ${item.forecastEndDate}`;
}
