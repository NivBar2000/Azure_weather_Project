interface WeatherSymbolProps {
  weatherCode: number;
  description: string;
}

export function WeatherSymbol({
  weatherCode,
  description,
}: WeatherSymbolProps) {
  return (
    <span className="weather-symbol" role="img" aria-label={description}>
      {symbolForWeatherCode(weatherCode)}
    </span>
  );
}

function symbolForWeatherCode(code: number): string {
  if (code >= 200 && code < 300) return "⛈️";
  if (code >= 300 && code < 600) return "🌧️";
  if (code >= 600 && code < 700) return "❄️";
  if (code >= 700 && code < 800) return "🌫️";
  if (code === 800) return "☀️";
  if (code < 803) return "🌤️";
  return "☁️";
}
