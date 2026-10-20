# 003 - Weather Forecast

## Tool

Codex

## Model

GPT-5

## Date

2026-10-20

## Objective

Implement a secure, read-only city search and five-day weather forecast flow in which the browser communicates only with the NestJS backend and the OpenWeather API key remains private.

## Relevant decisions

- Use Node.js built-in `fetch` and environment-file loading; add no HTTP or configuration dependency.
- Keep OpenWeather paths fixed in a dedicated backend client and normalize all responses before returning them.
- Group forecast slots using OpenWeather's timezone offset and choose the slot closest to local midday as the daily representative.
- Cache successful location searches for 60 minutes and forecasts for 10 minutes in memory per backend instance.
- Use local Unicode weather symbols derived from normalized codes instead of browser requests for remote icons.
- Mock the external HTTP boundary in automated tests; do not use the real API key.

## Exact Prompt

````text
Read and follow the repository instructions in `AGENTS.md` before making changes.

Implement interaction 003: a complete read-only weather forecast flow using the OpenWeather APIs.

## Objective

Allow a user to search for a city, select the correct location, and view a five-day weather forecast.

The browser must communicate only with the NestJS backend. The OpenWeather API key must remain private in the backend.

## Security boundary

A local file already exists at:

```text
apps/backend/.env
```

It contains a private OpenWeather API key.

Rules:

- Do not display, print, copy, log, document, or return the value.
- Do not include the value in tests, snapshots, generated files, or the AI interaction record.
- Do not modify the real value.
- Do not send the API key to the frontend.
- Do not commit any `.env` file.
- Only update `.env.example` with safe placeholder values.

## Backend implementation

Use the built-in Node.js `fetch` API. Do not add Axios.

Add configuration loading and startup validation for:

```text
OPENWEATHER_API_KEY
OPENWEATHER_BASE_URL
FRONTEND_ORIGIN
PORT
```

Update the backend `.env.example` with safe example values.

Configure CORS so the allowed frontend origin comes from configuration and defaults safely to:

```text
http://localhost:5173
```

Create an isolated OpenWeather client or service. Use fixed OpenWeather base paths and safely encoded query parameters.

Do not accept arbitrary upstream URLs from users.

### Location search endpoint

Implement:

```text
GET /api/weather/locations?query={city}
```

Use the OpenWeather Direct Geocoding API:

```text
/geo/1.0/direct
```

Requirements:

- trim and validate the query
- accept Unicode city names
- reject empty or excessively long input
- request no more than five results
- return a normalized response
- do not return unnecessary upstream fields

Each result should contain:

```text
name
country
state, when available
latitude
longitude
```

Returning an empty array for no matching locations is acceptable.

### Forecast endpoint

Implement:

```text
GET /api/weather/forecast?lat={latitude}&lon={longitude}
```

Use the free OpenWeather 5 Day / 3 Hour Forecast API:

```text
/data/2.5/forecast
```

Use:

```text
units=metric
```

Validate that:

- latitude is a valid number between -90 and 90
- longitude is a valid number between -180 and 180

Use an upstream request timeout. Return safe application errors without exposing the API key, upstream URLs containing credentials, stack traces, or internal response bodies.

### Normalized forecast response

Do not pass the raw OpenWeather response directly to the frontend.

Return a stable application-owned structure containing:

```text
location
timezoneOffsetSeconds
days
```

Each daily item must contain:

```text
date
summary
weatherCode
minimumTemperature
maximumTemperature
averageHumidity
maximumWindSpeed
slots
```

Each three-hour slot must contain:

```text
timestamp
localTime
temperature
feelsLike
humidity
windSpeed
description
weatherCode
```

Group forecast entries by the selected location’s local date using the timezone offset returned by OpenWeather, not by the backend server’s local timezone.

For each day:

- calculate the minimum temperature
- calculate the maximum temperature
- calculate average humidity
- calculate maximum wind speed
- select a representative description and weather code from the slot closest to local midday

Round displayed aggregate values consistently, but retain suitable numeric values in the API response.

### Caching

Add a small in-memory cache without introducing an external cache service.

Use approximately:

```text
Location search: 60 minutes
Forecast: 10 minutes
```

Cache keys must use normalized input.

Do not cache failed responses.

Document that this cache is local to each backend instance and will be replaced or reconsidered if globally shared caching becomes necessary.

## Frontend implementation

Replace the placeholder-only screen with a responsive weather-search interface.

The interface must include:

- city search input
- search button
- location-selection results
- selected-location heading
- five daily forecast cards
- expandable three-hour details for each day
- loading state
- empty-results state
- validation message
- safe error state
- a clear way to perform another search

Use the configured frontend API base URL.

Do not call OpenWeather directly from browser code.

Do not load OpenWeather icon URLs in the browser. Use local visual representations based on the normalized weather code so the browser does not make an unnecessary third-party request.

Display metric units clearly:

```text
°C
%
m/s
```

Keep the interface accessible:

- use labels
- support keyboard interaction
- use semantic buttons
- expose loading and error messages appropriately
- do not rely only on color to communicate state

## Code organization

Keep HTTP controllers thin.

Separate:

- configuration
- OpenWeather HTTP communication
- response normalization
- caching
- frontend API communication
- frontend presentation components

Do not create unnecessary abstractions or dependencies.

## Testing

Do not make real OpenWeather requests in automated tests.

Mock the external HTTP boundary and add tests covering at least:

### Backend

- successful location normalization
- empty location result
- invalid city query
- invalid coordinates
- correct grouping by the location’s local date
- daily aggregate calculations
- safe handling of an upstream failure
- caching of successful forecast responses
- preservation of the existing health endpoint

### Frontend

- city search
- location selection
- forecast rendering
- expansion of three-hour details
- loading state
- empty result
- backend error state

Do not place a real API key in any test.

## Non-goals

Do not add:

- authentication
- PostgreSQL
- saved forecasts
- Docker files
- Terraform
- Azure resources
- CI/CD
- direct browser calls to OpenWeather

Do not modify the architecture diagrams.

Do not create a Git commit or push changes.

## Documentation

Follow the AI interaction logging rules from `AGENTS.md`.

Create and index:

```text
docs/ai-interactions/003-weather-forecast.md
```

Record this exact prompt and the exact final model response.

Set human review to pending and final status to awaiting human review.

## Validation

Run:

```text
npm install
npm run build
npm run lint
npm test
npm run format:check
npm audit
npm audit --omit=dev
```

Also verify:

- no `.env` file is tracked
- no API key appears in tracked files or command output
- the frontend contains no OpenWeather API URL or API key
- architecture diagrams remain unchanged
- production dependencies have no known vulnerabilities

If the real API key is inactive or external access is unavailable, automated tests must still pass using mocks. Report the external limitation accurately without exposing the key.

## Final response

Follow the final-response and documentation requirements in `AGENTS.md`.

Keep the final report concise and factual.
````

## Model Response

## Summary

- Added backend configuration loading and startup validation, configured origin-restricted CORS, and preserved `GET /api/health`.
- Added fixed-path OpenWeather geocoding and metric forecast communication using Node.js `fetch`, an 8-second timeout, safe errors, normalized application-owned responses, local-date daily aggregation, and per-instance caches (60-minute location searches; 10-minute forecasts).
- Replaced the placeholder UI with an accessible, responsive city search, location selection, five-day cards, expandable three-hour details, local weather symbols, metric units, and loading/validation/empty/error states.
- Added mocked coverage for all requested backend and frontend scenarios; automated tests make no real OpenWeather requests.

## Files changed

- Backend: configuration files under `apps/backend/src/config/`, weather client/service/controller/module/types/normalizer/cache under `apps/backend/src/weather/`, application bootstrap/module wiring, safe `.env.example`, and backend tests.
- Frontend: `App.tsx`, `styles.css`, API client, presentation components, Vite environment types, and frontend tests.
- Documentation: `README.md`, `docs/ai-interactions/README.md`, and `docs/ai-interactions/003-weather-forecast.md`.
- No dependency manifests, application architecture diagrams, real `.env` files, infrastructure, authentication, or database files were changed.

## Validation performed

- `npm.cmd install` — passed; dependencies were already up to date.
- `npm.cmd run build` — passed for backend and frontend.
- `npm.cmd run lint` — passed for backend and frontend.
- `npm.cmd test` — passed: 4 backend suites/17 tests and 1 frontend suite/7 tests.
- `npm.cmd run format:check` — passed.
- Repository checks confirmed no tracked `.env`, the real backend `.env` remains ignored, frontend source contains no OpenWeather URL/API-key variable, architecture hashes are unchanged, and Git HEAD is unchanged; no commit or push was created.

## Security or dependency findings

- The private `.env` value was not read, printed, modified, copied, logged, tested, or documented. Tracked assignments are limited to explicitly fake test/example placeholders.
- The browser calls only the configured backend API and uses local weather symbols; the backend uses fixed upstream paths, encoded parameters, validated inputs, a timeout, and sanitized failure responses.
- `npm.cmd audit` reports 20 moderate vulnerabilities in the existing Jest/ts-jest development chain; the available complete fix is breaking, so no forced fix was applied.
- `npm.cmd audit --omit=dev` passed with zero production vulnerabilities.

## Assumptions

- `OPENWEATHER_BASE_URL` defaults to `https://api.openweathermap.org`, `FRONTEND_ORIGIN` to `http://localhost:5173`, and `PORT` to `3000`; `OPENWEATHER_API_KEY` is required.
- The in-memory cache is intentionally local to each backend instance and must be reconsidered if globally shared caching becomes necessary.
- Live OpenWeather connectivity and the real key’s activity were not exercised; automated validation used mocks and passed independently of external access.

## Deferred work

- Shared/distributed caching, authentication, PostgreSQL/saved forecasts, Docker, Terraform/Azure resources, and CI/CD remain deferred.
- No forced or breaking remediation of development-only audit findings was performed.

## Documentation status

Interaction 003 contains the exact prompt and this response and is indexed. Human review is `Pending`; final status is `Awaiting human review`.

## Files Changed

- `README.md`
- `apps/backend/.env.example`
- `apps/backend/src/app.module.ts`, `apps/backend/src/main.ts`, `apps/backend/src/config/`, and `apps/backend/src/weather/`
- `apps/backend/test/health.e2e-spec.ts`, `apps/backend/test/openweather.client.spec.ts`, `apps/backend/test/weather-normalizer.spec.ts`, and `apps/backend/test/weather.e2e-spec.ts`
- `apps/frontend/src/App.tsx`, `apps/frontend/src/styles.css`, `apps/frontend/src/api/`, `apps/frontend/src/components/`, `apps/frontend/src/vite-env.d.ts`, and `apps/frontend/src/App.test.tsx`
- `docs/ai-interactions/README.md` and this interaction record

## Validation

- Install, build, lint, tests, and formatting completed as recorded in the model response.
- Backend: 4 suites and 17 tests passed.
- Frontend: 1 suite and 7 tests passed.
- Tests use mocked external communication.
- Secret boundary, frontend boundary, architecture hashes, and unchanged Git HEAD were verified.

## Security Notes

- The private API key was neither read nor exposed; the real `.env` remains ignored and untracked.
- Only safe placeholder values were added to examples/tests.
- Full audit: 20 moderate development-only findings in the Jest/ts-jest chain.
- Production-only audit: zero vulnerabilities.
- No forced audit remediation was used.

## Assumptions

- OpenWeather's forecast timezone offset is authoritative for grouping and display.
- Cache entries do not need to be shared between backend instances in this step.
- Live provider connectivity was not exercised.

## Deferred Work

- Distributed caching and all stated non-goals.
- Breaking development-tool audit remediation.

## Human Review

Independent review confirmed that the build and all 17 backend and 7 frontend tests passed, and that a live backend weather request returned five forecast days for Tel Aviv. Root lint failed on two `String(...)` conversions in the OpenWeather client test, the in-memory cache was unbounded, and the README contained stale deferred-work information. Corrective work is documented in interaction 004.

## Final Status

Changes requested — corrective work documented in interaction 004
