# 028 - Single-Day Forecast Experience

## Tool

Codex

## Model

Not exposed by the client

## Date

2026-10-21

## Objective

Modernize the authenticated weather dashboard, add curated popular-city shortcuts, browse one forecast day at a time, and save only the selected server-trusted day while preserving legacy history and security behavior.

## Relevant Decisions

- Keep selected-day state in the application container so live and historical views share one clear owner.
- Reuse the existing forecast endpoint for preset coordinates without geocoding or persistence.
- Extend the save contract with a strict date and construct the one-day snapshot only from the server-fetched forecast.
- Keep the existing JSONB schema and retain navigation for legacy multi-day records.
- Add no dependencies and make no infrastructure, workflow, or deployment changes.

## Exact Prompt

```text
Work in the existing `Azure_weather_Project` repository.

Implement the next application release: improve the frontend appearance, display one forecast day at a time, save only the selected day, and add a curated list of popular cities for quick selection.

Before editing, read the repository instructions and inspect the existing frontend, backend, tests, database model, README, and AI-interaction documentation conventions. Preserve unrelated working-tree changes. Do not commit, push, deploy, trigger GitHub Actions, run Terraform, or make any live Azure/GitHub changes.

## Product goals

1. Modernize the site’s visual design while keeping it responsive, accessible, and consistent with the Azure Weather identity.
2. Replace the current five-card forecast display with a focused single-day forecast viewer.
3. Let the user navigate between forecast days.
4. Save only the day currently selected by the user, not the complete five-day forecast.
5. Add a “Popular cities” area that lets users open a forecast without typing a search query.
6. Preserve authentication, user isolation, existing saved data, API security, and the production deployment architecture.

## 1. Frontend visual redesign

Improve the overall frontend presentation, including:

- Authenticated application shell.
- Header and navigation.
- Search form.
- Location results.
- Popular-city shortcuts.
- Forecast display.
- Saved-forecast history.
- Loading, empty, success, and error states.
- Sign-in and authentication-status screens where appropriate.

Use a polished weather-dashboard style:

- Clean atmospheric background.
- Strong but restrained Azure blue/cyan accents.
- Layered cards with clear hierarchy.
- Good whitespace and readable typography.
- A large primary forecast card for the selected day.
- Subtle transitions that respect `prefers-reduced-motion`.
- Clear focus states and sufficient color contrast.
- Responsive behavior for desktop, tablet, and narrow mobile layouts.

Do not add stock photos or large decorative assets. Reuse the existing weather-symbol system or improve it without adding a heavy icon dependency. Do not introduce a new UI framework unless the repository already uses it. Prefer the existing React and CSS structure and avoid unnecessary dependencies.

Keep all user-facing text in English, consistent with the current application.

## 2. Popular cities

Add a visually distinct section titled `Popular cities` near the normal city search.

Provide these curated options:

- Tel Aviv, Israel — latitude `32.0853`, longitude `34.7818`
- Jerusalem, Israel — latitude `31.7683`, longitude `35.2137`
- London, United Kingdom — latitude `51.5074`, longitude `-0.1278`
- New York, United States — latitude `40.7128`, longitude `-74.0060`
- Paris, France — latitude `48.8566`, longitude `2.3522`
- Tokyo, Japan — latitude `35.6762`, longitude `139.6503`
- Dubai, United Arab Emirates — latitude `25.2048`, longitude `55.2708`
- Sydney, Australia — latitude `-33.8688`, longitude `151.2093`

Requirements:

- Represent the options as compact, accessible buttons or chips.
- Keep the curated data in a small typed frontend module instead of scattering constants through components.
- Clicking a city must use its known coordinates and the existing forecast API.
- It must not require an intermediate geocoding request.
- Show the same loading and safe error handling used by a normal location selection.
- Clearly describe these as popular preset cities, not personalized stored favorites.
- Do not add a database table or persistence for these shortcuts.

## 3. Single-day forecast viewer

The forecast API may continue returning the existing multi-day `ForecastResponse`. Change the UI presentation rather than reducing the live forecast response.

The viewer must:

- Display exactly one `DailyForecast` at a time.
- Initially select the first available day after every new forecast search or popular-city selection.
- Include visible Previous and Next controls.
- Disable Previous on the first day and Next on the final day.
- Show the selected date prominently.
- Show an indicator such as `Day 2 of 5`.
- Keep the selected day’s:
  - summary;
  - weather symbol;
  - minimum and maximum temperatures;
  - average humidity;
  - maximum wind speed;
  - three-hour forecast slots.
- Use clear accessible button names such as `Previous forecast day` and `Next forecast day`.
- Keep keyboard and screen-reader behavior correct.
- Do not rely on color alone to indicate the selected day.
- Reset stale save success/error messages when the selected day changes.
- Prevent indexes from becoming invalid when a different forecast is loaded.

A compact row of date indicators may be added if it remains usable on mobile, but the primary navigation must still be obvious.

## 4. Save only the selected day

Change the save action from “save the whole forecast” to “save this selected day”.

Update the button copy to:

`Save this day`

The frontend save request must send:

- latitude;
- longitude;
- selected forecast date in strict `YYYY-MM-DD` format.

Do not send a client-created forecast snapshot to the backend.

The backend must remain the trusted source of weather data:

1. Authenticate and resolve the current user exactly as it does now.
2. Strictly validate latitude, longitude, and the requested date.
3. Fetch the forecast through the existing `WeatherService`.
4. Find the day whose `date` exactly matches the requested date.
5. Reject the request safely if that date is not present in the returned forecast.
6. Construct a new immutable `ForecastResponse` snapshot containing:
   - the trusted location returned by the weather service;
   - the existing timezone data;
   - a `days` array containing exactly the selected trusted day.
7. Save that one-day snapshot in the existing `forecast_snapshot` JSONB field.
8. Return the saved detail using the existing authenticated API behavior.

Use an appropriate safe 4xx NestJS exception for malformed input or a date not included in the current forecast. Do not leak provider responses or internal errors.

## 5. Database and backward compatibility

Do not create a database migration unless inspection proves one is genuinely necessary.

The existing JSONB snapshot can store a `ForecastResponse` with one item in `days`, so the expected implementation should not require a schema change.

Preserve compatibility with existing saved records:

- Existing historical records containing several days must remain readable.
- The historical detail view should use the same day-navigation component when an older snapshot contains multiple days.
- New records must contain only the selected day.
- For new saved records, `forecastStartDate` and `forecastEndDate` may both equal the selected date.
- Existing multi-day summaries and pagination must continue working.
- Do not rewrite or delete existing database data.
- Preserve strict per-user isolation and all current authorization checks.

Update user-facing saved-history text so that a single-day record displays one date cleanly rather than rendering an awkward `date to same date` range.

## 6. State-management requirements

Refactor carefully so that:

- Selected day state has one clear owner.
- A newly loaded live forecast selects its first day.
- Opening a historical saved forecast selects its first stored day.
- Returning from history to search does not expose stale forecast or save state.
- Save loading state disables only the relevant action.
- Repeated clicks cannot create accidental duplicate requests while a save is pending.
- Search, location selection, popular-city selection, history pagination, and sign-out behavior remain intact.

Avoid a large unrelated rewrite. Extract small reusable components only where they improve clarity, for example:

- `PopularCities`
- single-day navigation or day selector
- selected-day forecast card

Follow the project’s existing naming, typing, error handling, and accessibility conventions.

## 7. Tests

Update existing tests and add focused coverage for the new behavior.

### Frontend tests

Cover at least:

- A newly loaded forecast displays one day, not five simultaneous forecast cards.
- It initially displays the first day.
- Next advances to the following day.
- Previous returns to the preceding day.
- Boundary buttons are disabled appropriately.
- The day counter/date updates correctly.
- Selecting a new city resets the selected day to the first day.
- Clicking a popular city requests its expected coordinates.
- Popular-city loading and failure behavior is safe.
- `Save this day` sends latitude, longitude, and the selected date.
- Navigating to another day changes the date sent by the save request.
- Save is disabled while pending.
- Save success/error state does not leak between selected days.
- A newly saved single-day snapshot is displayed correctly.
- A legacy multi-day saved snapshot remains navigable.
- Saved-history single-day date formatting is correct.
- Existing authentication and saved-history behavior remains covered.

Avoid brittle assertions that depend only on CSS class names.

### Backend tests

Cover at least:

- A valid save request containing latitude, longitude, and date stores exactly one forecast day.
- The stored day is taken from the server-fetched forecast.
- A client cannot submit its own weather snapshot.
- Missing, malformed, impossible, or incorrectly typed dates are rejected.
- A correctly formatted date that is not present in the fetched forecast is rejected.
- Existing coordinate validation remains intact.
- Saved records remain user-isolated.
- Repeated saves still create distinct immutable records if that is the current intended behavior.
- Listing and retrieving both new one-day and legacy multi-day snapshots remains correct.
- The weather provider is not called when validation fails.
- Safe error responses do not expose internals.

## 8. Security and scope boundaries

Preserve all existing security behavior:

- Microsoft Entra authentication.
- API scope validation.
- Per-user saved-forecast isolation.
- Backend-owned weather snapshot.
- No OpenWeather key in frontend code.
- No secrets in source, tests, documentation, logs, or generated files.
- No weakening of validation or authorization.
- No real `.env`, Terraform variables, state, plan, Azure token, or credentials may be inspected or modified.

Do not change:

- Terraform.
- Azure resource definitions.
- GitHub Actions workflows.
- OIDC configuration.
- RBAC.
- App Service configuration.
- Container Apps migration job configuration.
- Front Door.
- Key Vault.
- Production repository variables.
- Dependency versions, unless a dependency change is absolutely necessary and explicitly justified.

No Infrastructure-as-Code change or database migration is expected for this feature.

## 9. Documentation

Update the permanent project documentation and README only where needed to describe:

- Popular-city shortcuts.
- Single-day browsing.
- Saving a selected day rather than a complete five-day snapshot.
- Backward compatibility for existing multi-day saved snapshots.
- The unchanged CI/CD release flow.

Add the next AI-interaction document following the repository’s existing numbering and format. Include:

- The exact human prompt verbatim.
- A concise description of how AI was used.
- Tools/actions used.
- Design decisions.
- Files changed.
- Validation performed.
- Security findings.
- Assumptions.
- Deferred work.
- Human review status pending.
- Final status awaiting human review.

Do not falsely claim that CI, deployment, Azure validation, commit, or push occurred.

## 10. Local validation

Run the strongest safe local validation available without using secrets or live cloud resources:

- Formatting check.
- Frontend and backend lint.
- All relevant unit and integration tests.
- Production builds for all workspaces.
- Root application checks where appropriate.
- Backend Docker build using the repository-root context if the Docker daemon is available.
- `git diff --check`.
- Review the final diff for accidental secrets, generated build output, Terraform artifacts, unrelated changes, and dependency drift.

Do not start local containers if they are unnecessary. Do not call OpenWeather, Azure, GitHub, PostgreSQL, Key Vault, or any live external service.

If Docker is unavailable, report that clearly rather than treating it as application-code failure.

## 11. Handoff

Stop after implementation, local validation, and documentation.

Do not commit or push. The human will:

1. Review the diff.
2. Commit and push the changes.
3. Let the existing CI workflow validate the release.
4. Manually trigger the existing Production CD workflow only after CI succeeds.
5. Verify authentication, popular-city selection, day navigation, saving a selected day, saved-history isolation, and production health.

In the final response provide:

- Summary of the implemented user experience.
- Exact files changed.
- API contract change.
- Database/migration status.
- Tests added or updated.
- Validation results with pass/fail status.
- Security and dependency findings.
- Any limitations or deferred work.
- Suggested commit message.
- Explicit confirmation that no commit, push, deployment, Terraform command, or live cloud mutation was performed.
```

## Model Response

## Summary

- Modernized the authenticated Azure Weather dashboard with a layered responsive layout, clearer focus states, reduced-motion support, and stronger live/history/loading/error presentation.
- Added eight typed Popular cities shortcuts that call the existing forecast API directly with known coordinates and do not geocode or persist favorites.
- Replaced the five-card view with one selected day, visible Previous/Next controls, boundary disabling, a Day n of n indicator, and retained daily metrics and three-hour slots.
- Live saves now persist only the selected server-trusted day. Historical one-day records display cleanly, while legacy multi-day snapshots remain navigable.

## Exact files changed

- README.md
- apps/backend/src/saved-forecasts/saved-forecast.service.ts
- apps/backend/src/saved-forecasts/saved-forecast.types.ts
- apps/backend/src/saved-forecasts/saved-forecast.validation.ts
- apps/backend/test/saved-forecast.e2e-spec.ts
- apps/frontend/src/App.test.tsx
- apps/frontend/src/App.tsx
- apps/frontend/src/api/weatherApi.ts
- apps/frontend/src/components/ForecastView.tsx
- apps/frontend/src/components/PopularCities.tsx
- apps/frontend/src/components/SavedForecastHistory.tsx
- apps/frontend/src/components/dateFormat.ts
- apps/frontend/src/data/popularCities.ts
- apps/frontend/src/styles.css
- docs/ai-interactions/028-single-day-forecast-experience.md
- docs/ai-interactions/README.md

## API contract change

- POST /api/saved-forecasts now accepts exactly numeric latitude, numeric longitude, and date in strict YYYY-MM-DD form.
- The backend validates the date, fetches the current forecast through WeatherService, matches the requested date exactly, and stores a cloned ForecastResponse containing the trusted location, timezone, and exactly one trusted day.
- Extra fields, including a client-created snapshot, are rejected. A validly formatted date absent from the fetched forecast returns a safe HTTP 400 response.

## Database and migration status

- No schema change or migration was needed. The existing forecast_snapshot JSONB field stores both new one-day snapshots and existing legacy multi-day snapshots.
- No existing data was rewritten or deleted. Repeated saves still create distinct immutable records, and per-user list/detail scoping is unchanged.

## Tests added or updated

- Frontend coverage now verifies single-day rendering, initial selection, forward/back navigation and boundaries, day/date updates, selection reset, popular-city coordinates/loading/failure, selected-date save payloads, pending-save disabling, feedback reset, single-day history formatting, and legacy multi-day navigation.
- Backend coverage now verifies one-day trusted snapshots, strict/malformed/impossible date rejection without provider calls, absent-date rejection, coordinate validation, client-snapshot rejection, repeated immutable saves, user isolation, and new/legacy summary behavior.

## Validation results

- PASS — npm.cmd run build: backend and frontend production builds succeeded. Vite emitted its existing advisory that the main minified chunk exceeds 500 kB.
- PASS — npm.cmd run lint: backend and frontend lint succeeded with zero warnings.
- PASS — npm.cmd test: 13 backend suites/95 tests and 1 frontend suite/24 tests passed (119 tests total).
- PASS — npm.cmd run format:check: all matched files conform to Prettier.
- PASS — docker compose --env-file .env.example config --quiet: configuration validated using only the committed safe example values; Docker emitted a non-fatal inaccessible user config warning.
- NOT RUN — backend Docker build: docker info exited 1 because the Docker daemon is not running in this environment.
- BLOCKED (environment/policy) — npm.cmd audit and npm.cmd audit --omit=dev both exited 1 because sandboxed registry access was unavailable. The requested network escalation was denied because it would disclose project dependency metadata. No audit finding is attributed to the code.
- PASS — git diff --check: no whitespace errors; only line-ending conversion warnings were reported.
- PASS — focused review found no dependency/lockfile, Terraform, GitHub Actions, generated build-output, or credential-like changes.
- During iteration, one frontend test run failed three locale-order assertions and one lint run found an unsafe test matcher; both test-only issues were corrected before the passing full validation above. An initial Compose check without safe values failed for a missing required variable; the explicit .env.example check passed.

## Security and dependency findings

- Authentication, Entra scope validation, server-derived identity, per-user ownership checks, 404 cross-user behavior, and backend-only OpenWeather access are unchanged.
- The frontend sends no snapshot or identity data. Strict allow-list validation rejects unknown save fields, and provider/internal payloads are not exposed in errors.
- No dependency or lockfile changed. Current registry vulnerability status could not be refreshed for the environmental/policy reason above.
- No secret, credential, token, authorization header, real environment value, or personal email was added or logged.

## Assumptions

- The selected date may disappear between the browser's live fetch and the backend's save-time fetch; the intentional safe behavior is HTTP 400 rather than saving a different day.
- Existing stored snapshots conform to the current ForecastResponse shape; multi-day records remain read-only and navigable.

## Limitations and deferred work

- Authenticated browser verification remains for human review, including popular-city selection, navigation, selected-day saving, history isolation, and responsive visual review.
- CI and production deployment remain the existing human-controlled release steps.
- Dependency audit results remain unavailable until an authorized environment can query the npm registry.

## Suggested commit message

feat: add single-day forecast browsing and saving

## Documentation status

- README documents popular-city shortcuts, single-day browsing/saving, legacy compatibility, and the unchanged CI/CD flow.
- Interaction 028 contains the exact prompt and this exact response and is indexed with Human Review Pending and Final Status Awaiting human review.

No commit, push, deployment, GitHub Actions trigger, Terraform command, database migration, live provider call, or Azure/GitHub/cloud mutation was performed.

## Files Changed

The exact changed-file list is included in the Model Response above.

## Validation

The command outcomes, totals, warnings, and environmental limitations are recorded exactly in the Model Response above.

## Security Notes

Server-authoritative data, strict input allow-listing, existing Entra authentication, and per-user isolation were preserved. No secret or identity data was introduced.

## Assumptions

The save-time weather response is authoritative, and existing stored snapshots conform to the current application-owned ForecastResponse shape.

## Deferred Work

Human authenticated-browser review, normal CI/CD execution, and a registry-backed dependency audit remain pending.

## Human Review

Checked and approved by the human reviewer on 2026-10-21.

## Final Status

Approved
