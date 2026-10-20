import { LocationResult } from "../api/weatherApi";

interface LocationResultsProps {
  locations: LocationResult[];
  onSelect: (location: LocationResult) => void;
}

export function LocationResults({ locations, onSelect }: LocationResultsProps) {
  return (
    <section className="location-results" aria-labelledby="location-heading">
      <h2 id="location-heading">Choose a location</h2>
      <ul>
        {locations.map((location) => {
          const label = [location.name, location.state, location.country]
            .filter(Boolean)
            .join(", ");
          return (
            <li key={`${location.latitude}:${location.longitude}`}>
              <button type="button" onClick={() => onSelect(location)}>
                <span>{label}</span>
                <span aria-hidden="true">→</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
