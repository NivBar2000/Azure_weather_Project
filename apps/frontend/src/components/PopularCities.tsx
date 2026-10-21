import { PopularCity, popularCities } from "../data/popularCities";

interface PopularCitiesProps {
  disabled: boolean;
  onSelect: (city: PopularCity) => void;
}

export function PopularCities({ disabled, onSelect }: PopularCitiesProps) {
  return (
    <section className="popular-cities" aria-labelledby="popular-cities-title">
      <div className="section-introduction">
        <div>
          <p className="eyebrow">Quick forecast</p>
          <h2 id="popular-cities-title">Popular cities</h2>
        </div>
        <p>Preset city shortcuts for fast access, not saved favorites.</p>
      </div>
      <div className="city-chips">
        {popularCities.map((city) => (
          <button
            type="button"
            key={`${city.latitude}:${city.longitude}`}
            disabled={disabled}
            onClick={() => onSelect(city)}
            aria-label={`View forecast for ${city.name}, ${city.countryName}`}
          >
            <strong>{city.name}</strong>
            <span>{city.countryName}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
