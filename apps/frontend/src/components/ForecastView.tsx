import { DailyForecast, ForecastResponse } from "../api/weatherApi";
import { WeatherSymbol } from "./WeatherSymbol";

interface ForecastViewProps {
  forecast: ForecastResponse;
  onAnotherSearch: () => void;
}

export function ForecastView({ forecast, onAnotherSearch }: ForecastViewProps) {
  return (
    <section className="forecast" aria-labelledby="forecast-heading">
      <div className="forecast-heading-row">
        <div>
          <p className="eyebrow">Five-day outlook</p>
          <h2 id="forecast-heading">
            Forecast for {forecast.location.name}, {forecast.location.country}
          </h2>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={onAnotherSearch}
        >
          Search another city
        </button>
      </div>

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
