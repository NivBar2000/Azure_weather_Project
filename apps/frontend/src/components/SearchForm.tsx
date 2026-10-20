import { FormEvent } from "react";

interface SearchFormProps {
  query: string;
  disabled: boolean;
  onQueryChange: (query: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function SearchForm({
  query,
  disabled,
  onQueryChange,
  onSubmit,
}: SearchFormProps) {
  return (
    <form className="search-form" onSubmit={onSubmit} noValidate>
      <label htmlFor="city-search">City name</label>
      <div className="search-controls">
        <input
          id="city-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Try Stockholm or São Paulo"
          autoComplete="off"
          disabled={disabled}
          maxLength={101}
        />
        <button type="submit" disabled={disabled}>
          Search
        </button>
      </div>
    </form>
  );
}
