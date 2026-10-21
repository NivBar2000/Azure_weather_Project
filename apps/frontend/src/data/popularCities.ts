import { LocationResult } from "../api/weatherApi";

export interface PopularCity extends LocationResult {
  countryName: string;
}

export const popularCities: readonly PopularCity[] = [
  {
    name: "Tel Aviv",
    country: "IL",
    countryName: "Israel",
    latitude: 32.0853,
    longitude: 34.7818,
  },
  {
    name: "Jerusalem",
    country: "IL",
    countryName: "Israel",
    latitude: 31.7683,
    longitude: 35.2137,
  },
  {
    name: "London",
    country: "GB",
    countryName: "United Kingdom",
    latitude: 51.5074,
    longitude: -0.1278,
  },
  {
    name: "New York",
    country: "US",
    countryName: "United States",
    latitude: 40.7128,
    longitude: -74.006,
  },
  {
    name: "Paris",
    country: "FR",
    countryName: "France",
    latitude: 48.8566,
    longitude: 2.3522,
  },
  {
    name: "Tokyo",
    country: "JP",
    countryName: "Japan",
    latitude: 35.6762,
    longitude: 139.6503,
  },
  {
    name: "Dubai",
    country: "AE",
    countryName: "United Arab Emirates",
    latitude: 25.2048,
    longitude: 55.2708,
  },
  {
    name: "Sydney",
    country: "AU",
    countryName: "Australia",
    latitude: -33.8688,
    longitude: 151.2093,
  },
];
