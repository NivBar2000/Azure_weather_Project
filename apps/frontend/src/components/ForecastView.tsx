import { useEffect, useRef } from "react";
import { DailyForecast, ForecastResponse } from "../api/weatherApi";
import { formatForecastDate, formatSavedTime } from "./dateFormat";
import { WeatherSymbol } from "./WeatherSymbol";

interface ForecastViewProps {
  forecast: ForecastResponse;
  selectedDayIndex: number;
  onSelectedDayChange: (index: number) => void;
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
  selectedDayIndex,
  onSelectedDayChange,
  onAnotherSearch,
  mode = "live",
  savedAt,
  saving = false,
  saveMessage = "",
  saveError = "",
  onSave,
}: ForecastViewProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const selectedDay = forecast.days[selectedDayIndex];

  useEffect(() => {
    if (mode === "historical") {
      heading.current?.focus();
    }
  }, [mode, savedAt]);

  if (!selectedDay) {
    return (
      <p className="notice empty-message" role="status">
        No forecast days are available for this location.
      </p>
    );
  }

  const isFirstDay = selectedDayIndex === 0;
  const isLastDay = selectedDayIndex === forecast.days.length - 1;

  return (
    <section className="forecast" aria-labelledby="forecast-heading">
      <div className="forecast-heading-row">
        <div>
          <p className="eyebrow">
            {mode === "historical"
              ? "Historical saved snapshot"
              : "Live weather outlook"}
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
              {saving ? "Saving…" : "Save this day"}
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

      <div className="day-navigation" aria-label="Forecast day navigation">
        <button
          className="secondary-button"
          type="button"
          aria-label="Previous forecast day"
          disabled={isFirstDay}
          onClick={() => onSelectedDayChange(selectedDayIndex - 1)}
        >
          <span aria-hidden="true">←</span> Previous
        </button>
        <div className="day-position" aria-live="polite">
          <strong>{formatForecastDate(selectedDay.date)}</strong>
          <span>
            Day {selectedDayIndex + 1} of {forecast.days.length}
          </span>
        </div>
        <button
          className="secondary-button"
          type="button"
          aria-label="Next forecast day"
          disabled={isLastDay}
          onClick={() => onSelectedDayChange(selectedDayIndex + 1)}
        >
          Next <span aria-hidden="true">→</span>
        </button>
      </div>

      <DayForecastCard day={selectedDay} />
    </section>
  );
}

function DayForecastCard({ day }: { day: DailyForecast }) {
  return (
    <article className="forecast-card primary-forecast-card">
      <div className="day-summary">
        <div>
          <p className="day-name">{formatForecastDate(day.date)}</p>
          <p className="summary-text">{day.summary}</p>
        </div>
        <WeatherSymbol
          weatherCode={day.weatherCode}
          description={day.summary}
        />
      </div>
      <p className="temperature-range" aria-label="Temperature range">
        <strong>{formatNumber(day.maximumTemperature)}°C</strong>
        <span>High</span>
        <strong>{formatNumber(day.minimumTemperature)}°C</strong>
        <span>Low</span>
      </p>
      <dl className="daily-metrics">
        <div>
          <dt>Average humidity</dt>
          <dd>{formatNumber(day.averageHumidity)}%</dd>
        </div>
        <div>
          <dt>Maximum wind</dt>
          <dd>{formatNumber(day.maximumWindSpeed)} m/s</dd>
        </div>
      </dl>
      <details>
        <summary>3-hour forecast details</summary>
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
    value,
  );
}
