import { useEffect, useRef } from "react";
import { DailyForecast, ForecastResponse } from "../api/weatherApi";
import { formatSavedTime } from "./dateFormat";
import { WeatherSymbol } from "./WeatherSymbol";

interface ForecastViewProps {
  forecast: ForecastResponse;
  onAnotherSearch: () => void;
  mode?: "live" | "historical";
  savedAt?: string;
  saving?: boolean;
  saveMessage?: string;
  saveError?: string;
  onSave?: () => void;
}

export function ForecastView({
  forecast,
  onAnotherSearch,
  mode = "live",
  savedAt,
  saving = false,
  saveMessage = "",
  saveError = "",
  onSave,
}: ForecastViewProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (mode === "historical") {
      heading.current?.focus();
    }
  }, [mode, savedAt]);

  return (
    <section className="forecast" aria-labelledby="forecast-heading">
      <div className="forecast-heading-row">
        <div>
          <p className="eyebrow">
            {mode === "historical"
              ? "Historical saved snapshot"
              : "Live five-day outlook"}
          </p>
          <h2 id="forecast-heading" ref={heading} tabIndex={-1}>
            Forecast for {forecast.location.name}, {forecast.location.country}
          </h2>
          {mode === "historical" && savedAt && (
            <p className="snapshot-time">
              Saved <time dateTime={savedAt}>{formatSavedTime(savedAt)}</time>
            </p>
          )}
        </div>
        <div className="forecast-actions">
          {mode === "live" && onSave && (
            <button
              className="primary-button"
              type="button"
              disabled={saving}
              onClick={onSave}
            >
              {saving ? "Saving…" : "Save forecast"}
            </button>
          )}
          <button
            className="secondary-button"
            type="button"
            onClick={onAnotherSearch}
          >
            {mode === "historical" ? "Return to search" : "Search another city"}
          </button>
        </div>
      </div>

      {saveMessage && (
        <p className="notice success-message" role="status">
          {saveMessage}
        </p>
      )}
      {saveError && (
        <p className="notice error-message" role="alert">
          {saveError}
        </p>
      )}

      <div className="forecast-grid">
        {forecast.days.map((day) => (
          <DayForecastCard key={day.date} day={day} />
        ))}
      </div>
    </section>
  );
}

function DayForecastCard({ day }: { day: DailyForecast }) {
  return (
    <article className="forecast-card">
      <div className="day-summary">
        <div>
          <p className="day-name">{formatDate(day.date)}</p>
          <p className="summary-text">{day.summary}</p>
        </div>
        <WeatherSymbol
          weatherCode={day.weatherCode}
          description={day.summary}
        />
      </div>
      <p className="temperature-range">
        <strong>{formatNumber(day.maximumTemperature)}°C</strong>
        <span>{formatNumber(day.minimumTemperature)}°C</span>
      </p>
      <dl className="daily-metrics">
        <div>
          <dt>Humidity</dt>
          <dd>{formatNumber(day.averageHumidity)}%</dd>
        </div>
        <div>
          <dt>Wind</dt>
          <dd>{formatNumber(day.maximumWindSpeed)} m/s</dd>
        </div>
      </dl>
      <details>
        <summary>3-hour details</summary>
        <div className="slot-list">
          {day.slots.map((slot) => (
            <div className="forecast-slot" key={slot.timestamp}>
              <time dateTime={slot.timestamp}>
                {slot.localTime.slice(11, 16)}
              </time>
              <WeatherSymbol
                weatherCode={slot.weatherCode}
                description={slot.description}
              />
              <span>{formatNumber(slot.temperature)}°C</span>
              <span>{formatNumber(slot.humidity)}%</span>
              <span>{formatNumber(slot.windSpeed)} m/s</span>
            </div>
          ))}
        </div>
      </details>
    </article>
  );
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
    value,
  );
}
