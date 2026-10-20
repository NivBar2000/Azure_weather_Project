# 010 - Authentication Foundation

## Tool

Codex

## Model

GPT-5

## Date

2026-10-20

## Objective

Integrate Microsoft Entra External ID into the React frontend and NestJS backend, protect business routes by default, synchronize a minimal local user record, and preserve a public health endpoint without handling any client secret or real user credential.

## Relevant decisions

- Use MSAL Browser and MSAL React for authorization code with PKCE, redirect login/logout, session-storage caching, and silent delegated access-token acquisition with interaction-required redirect fallback.
- Initialize a single MSAL client before rendering and synchronize `/api/auth/me` once per authenticated account before exposing weather functionality.
- Apply a global NestJS authentication guard and an explicit public-route decorator only to the health endpoint.
- Use `jose` with OIDC discovery and its cached remote JWKS implementation; validate cryptography plus issuer, audience, tenant, client, token version, expiry, and delegated scope.
- Key local identities by validated issuer plus `oid`, falling back to `sub`, and rely on the existing unique database constraint for concurrency-safe upsert.
- Keep public Entra identifiers configurable, add no client-secret setting, and extend CSP only for the exact CIAM origin.

## Exact Prompt

```text
You are implementing Interaction 010: Microsoft Entra External ID authentication foundation.

Repository:
C:\DevOps_Projects\Azure_weather_Project

Read and obey:
- The repository-root AGENTS.md.
- Any more specific AGENTS.md files that apply.
- The existing architecture, README, Docker Compose configuration, tests, and AI interaction documentation.

Work incrementally and preserve all existing functionality unless authentication intentionally changes access requirements.

Do not commit or push.
Do not expose, request, create, rotate, inspect, print, or store any client secret.
Do not modify the real .env file.
Do not use email addresses as application identity keys.
Do not store access tokens, ID tokens, refresh tokens, authorization codes, or email addresses in PostgreSQL or logs.

Goal:
Integrate the React frontend and NestJS backend with the already configured Microsoft Entra External ID tenant. Require authentication for application/business API routes while keeping the health endpoint public.

Existing Entra configuration
============================

External tenant:
- Tenant name: Azure Weather Customers
- Tenant ID: 79fb97ff-3c22-4210-b16d-e210b21db3e6
- Tenant subdomain: azureweatherexercise3
- Primary domain: azureweatherexercise3.onmicrosoft.com
- CIAM host: azureweatherexercise3.ciamlogin.com

Frontend SPA registration:
- Name: Azure Weather Frontend
- Client ID: ca698b88-3c0f-4279-bbb5-b60654497b31
- Redirect URI: http://localhost:8080/
- No client secret

Backend API registration:
- Name: Azure Weather API
- Client ID: 637c9165-b368-48a7-aa3d-3b9852a51a67
- Application ID URI:
  api://637c9165-b368-48a7-aa3d-3b9852a51a67
- Delegated scope:
  api://637c9165-b368-48a7-aa3d-3b9852a51a67/access_as_user
- Required scp value: access_as_user

User flow:
- Name: AzureWeatherSignUpSignIn
- Providers: Google, Microsoft Account, and Entra-managed email one-time passcode
- The email OTP option is a platform-required fallback, not an application-managed password system
- The frontend application is associated with this user flow

Expected External ID endpoints:
- Frontend authority:
  https://azureweatherexercise3.ciamlogin.com/
- Known authority host:
  azureweatherexercise3.ciamlogin.com
- OIDC metadata:
  https://azureweatherexercise3.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6/v2.0/.well-known/openid-configuration
- Expected v2 issuer:
  https://azureweatherexercise3.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6/v2.0/

Treat these IDs and URLs as public configuration, not secrets. Keep them configurable rather than hardcoding them throughout source code.

Implementation requirements
===========================

1. Inspect first
----------------

Before editing:
- Inspect the current frontend, backend, Dockerfiles, Nginx configuration, Compose configuration, database entities, tests, README, and existing AI interaction log format.
- Briefly report the implementation plan.
- Preserve current naming and project conventions.
- Do not rewrite unrelated code.

2. Frontend authentication
--------------------------

Use the maintained Microsoft libraries:
- @azure/msal-browser
- @azure/msal-react

Configure MSAL through Vite environment variables:

- VITE_ENTRA_CLIENT_ID
- VITE_ENTRA_AUTHORITY
- VITE_ENTRA_KNOWN_AUTHORITY
- VITE_ENTRA_API_SCOPE

Requirements:
- Use the authorization-code flow with PKCE as provided by MSAL.
- Prefer redirect-based login and logout.
- Use sessionStorage for the MSAL cache, not localStorage.
- Initialize MSAL exactly once.
- Wrap the application in MsalProvider.
- Handle redirect completion without redirect loops.
- Add clear Sign in and Sign out controls.
- Show an authenticated user’s display name when available.
- Add accessible loading, error, and signed-out states.
- Do not display or log tokens.
- Do not store tokens outside MSAL.
- Do not use an ID token to call the API.
- Acquire an access token for the API scope silently when possible.
- Use an interactive redirect fallback only for an MSAL interaction-required condition.
- Attach the Bearer access token to all protected backend requests, including weather requests and GET /api/auth/me.
- Call GET /api/auth/me after authentication so the backend can synchronize the local user record.
- Gate the application’s weather functionality behind successful authentication.
- Avoid duplicate token requests and duplicate /api/auth/me synchronization caused by React re-renders.

3. Backend token validation
---------------------------

Implement a reusable NestJS authentication guard/service using a maintained JOSE/JWT library such as jose.

The backend must:
- Read the Bearer access token from the Authorization header.
- Obtain signing keys through the configured OIDC/JWKS metadata.
- Cache and safely refresh remote signing keys using the library’s supported mechanism.
- Validate the JWT signature and expiration.
- Accept only the configured issuer.
- Accept only token version 2.0.
- Validate aud against the backend API Client ID GUID:
  637c9165-b368-48a7-aa3d-3b9852a51a67
- Validate tid against:
  79fb97ff-3c22-4210-b16d-e210b21db3e6
- Validate the calling client claim, normally azp for a v2 delegated token, against the frontend Client ID:
  ca698b88-3c0f-4279-bbb5-b60654497b31
- Require access_as_user in the space-separated scp claim.
- Reject missing, malformed, expired, incorrectly signed, wrong-issuer, wrong-audience, wrong-tenant, wrong-client, ID-token-like, and insufficient-scope tokens.
- Return 401 for missing or invalid authentication.
- Return 403 for a valid token lacking the required delegated scope.
- Never decode a JWT and trust it without cryptographic validation.
- Never log authorization headers or token contents.

Use backend environment variables with startup validation:

- ENTRA_TENANT_ID
- ENTRA_API_CLIENT_ID
- ENTRA_ALLOWED_CLIENT_ID
- ENTRA_OIDC_METADATA_URL
- ENTRA_EXPECTED_ISSUER
- ENTRA_REQUIRED_SCOPE

Fail fast with a clear, non-secret error when required configuration is absent or invalid.

4. Route protection
-------------------

- Keep GET /api/health public.
- Require the Entra authentication guard for all business routes, including weather routes and GET /api/auth/me.
- Prefer a secure default-deny design with an explicit, narrowly scoped public-route mechanism.
- Ensure future business endpoints are protected by default.
- Preserve correct 404 behavior for unknown routes where practical.

5. User synchronization and privacy
-----------------------------------

Implement GET /api/auth/me.

After successful token validation:
- Use oid as the preferred stable external identity identifier.
- Fall back to sub only when oid is absent.
- Never use email as the identity key.
- Use the validated issuer plus the external identity identifier as the unique identity.
- Upsert the existing UserEntity safely and idempotently.
- Handle simultaneous first requests without creating duplicate users.
- Populate displayName from the validated name claim when it is a non-empty string.
- Otherwise use a neutral fallback such as "Weather user".
- Populate identityProvider from a safe string idp claim when present.
- Otherwise use "entra-external-id".
- Do not use identityProvider for authorization decisions.
- Do not save email or any token data.
- Return only a privacy-safe DTO such as:
  id, displayName, identityProvider, createdAt, updatedAt.
- Do not return issuer, oid/sub, email, or raw claims to the browser.

Reuse the existing users table/entity where possible. Add a migration only if the current schema genuinely requires one.

6. Content Security Policy and container integration
----------------------------------------------------

Update the frontend Nginx CSP only as much as required for MSAL:
- Allow connections to the exact CIAM origin.
- Allow the exact CIAM origin for any MSAL hidden-frame operation that is actually required.
- Do not add broad wildcards.
- Preserve existing same-origin API proxying and other security headers.

Update Docker/Compose wiring:
- Add frontend build arguments for the VITE_ENTRA_* public values.
- Pass backend ENTRA_* values as runtime environment variables.
- Update relevant .env.example files with documented placeholders or safe public examples.
- Do not edit or read the real .env file.
- Do not add any client secret variable because this SPA/API delegated flow does not require one.

For validation, temporary process-level environment variables may be supplied to Docker Compose. Do not persist them into the real .env file.

7. Tests
--------

Add meaningful automated tests.

Backend tests must cover at minimum:
- Public health endpoint succeeds without authentication.
- Protected endpoint rejects a missing token.
- Correctly signed synthetic token with expected claims succeeds.
- Invalid signature is rejected.
- Expired token is rejected.
- Wrong issuer is rejected.
- Wrong audience is rejected.
- Wrong tenant is rejected.
- Wrong calling client is rejected.
- Missing required scope returns 403.
- First valid request creates a user.
- Repeated valid requests return the same user rather than creating duplicates.
- No email or token is persisted.
- Protected weather route rejects unauthenticated access.

Use local/generated test keys or a deterministic mocked JWKS/OIDC boundary. Automated tests must not depend on a real Entra token, real user account, or live client secret.

Frontend tests must cover at minimum:
- Signed-out UI.
- Login action.
- Authenticated UI/display name.
- Access token attachment to protected API calls.
- Authentication/API error state.
- No token rendered into the page or logged.

Also run the existing test suites and ensure existing non-authentication behavior has not regressed.

8. Documentation
----------------

Update the README with:
- Authentication architecture.
- Required frontend and backend public configuration variables.
- Local rebuild/start instructions.
- Manual browser authentication test instructions.
- Security and privacy decisions.
- Troubleshooting guidance for redirect URI, issuer, audience, scope, and stale frontend build arguments.
- A warning that VITE_* values are public build-time values and must never contain secrets.

Create a focused operational document, for example:
docs/entra-external-id-setup.md

Document:
- The tenant and application registration names.
- The non-secret IDs and endpoints listed above.
- API scope and granted frontend permission.
- User flow and configured providers.
- The forced Entra-managed email OTP fallback.
- The fact that Google authentication was manually verified.
- The Microsoft same-email account-collision behavior observed during testing.
- Secret rotation/expiry practices without recording secret values.
- How to rotate provider secrets safely.
- How to validate the frontend and backend integration manually.
- Explicitly state that the app stores no email addresses or tokens.

Do not include any Google or Microsoft provider client secret.

9. AI interaction log
---------------------

Create:
docs/ai-interactions/010-authentication-foundation.md

Follow the repository’s existing interaction-log format.
Include:
- The exact full prompt.
- The exact final response.
- Summary of changes.
- Files changed.
- Commands/tests run and their outcomes.
- Security/privacy decisions.
- Manual verification still required.
- Human Review status: Pending.

Update the interaction index if the repository has one.

Do not mark Human Review as Approved. Only the human reviewer may do that.

10. Verification
----------------

Run all relevant:
- frontend formatting/lint/typecheck/tests/build
- backend formatting/lint/typecheck/tests/build
- database/migration checks if applicable
- Docker Compose config validation
- Docker image builds
- container startup and health checks

For Compose validation/build/start, use these public values only as temporary process environment values:

VITE_ENTRA_CLIENT_ID=ca698b88-3c0f-4279-bbb5-b60654497b31
VITE_ENTRA_AUTHORITY=https://azureweatherexercise3.ciamlogin.com/
VITE_ENTRA_KNOWN_AUTHORITY=azureweatherexercise3.ciamlogin.com
VITE_ENTRA_API_SCOPE=api://637c9165-b368-48a7-aa3d-3b9852a51a67/access_as_user

ENTRA_TENANT_ID=79fb97ff-3c22-4210-b16d-e210b21db3e6
ENTRA_API_CLIENT_ID=637c9165-b368-48a7-aa3d-3b9852a51a67
ENTRA_ALLOWED_CLIENT_ID=ca698b88-3c0f-4279-bbb5-b60654497b31
ENTRA_OIDC_METADATA_URL=https://azureweatherexercise3.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6/v2.0/.well-known/openid-configuration
ENTRA_EXPECTED_ISSUER=https://azureweatherexercise3.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6/v2.0/
ENTRA_REQUIRED_SCOPE=access_as_user

Verify:
- frontend responds at http://localhost:8080/
- GET /api/health succeeds without a token
- protected APIs return 401 without a token
- containers remain healthy
- no secret or token appears in source, generated output, logs, tests, or documentation

A real end-to-end login requires the human user’s browser session. Do not attempt to use or request their credentials.

Final response
==============

Return a concise but complete report containing:
- What changed.
- Important architecture/security decisions.
- Files changed.
- Tests and builds run with exact outcomes.
- Container health status.
- Exact manual browser steps the user should perform next.
- Any limitation or remaining manual verification.
- Confirmation that no commit or push was performed.
- Confirmation that no client secret, token, or email address was stored or logged.

Before returning, ensure the final response is copied verbatim into the Response section of interaction 010.
```

## Model Response

## Summary

- Added Microsoft Entra External ID authentication with `@azure/msal-browser` and `@azure/msal-react`. The SPA uses redirect login/logout, authorization code with PKCE, `sessionStorage`, silent delegated-token acquisition, and an interaction-required redirect fallback.
- Added a default-deny NestJS authentication guard. Only `GET /api/health` is explicitly public; weather routes and `GET /api/auth/me` require a bearer access token.
- Added cryptographic access-token validation with `jose` and cached remote JWKS obtained through the configured OIDC metadata. Validation requires RS256, expiry and issued-at claims, issuer, API audience GUID, tenant, v2 token version, frontend `azp`, and `access_as_user`.
- Added privacy-safe, concurrency-safe user synchronization using the existing unique issuer/subject constraint. Identity uses `oid`, falling back to `sub`; no schema migration was needed.
- Added public Entra configuration examples, Docker build/runtime wiring, an exact-origin CIAM CSP extension, README guidance, and an operational setup document. No client-secret setting was introduced.

## Important architecture and security decisions

- MSAL is initialized once before React renders, handles redirect completion once, and is wrapped by `MsalProvider`.
- Weather UI is unavailable until authentication and one successful `/api/auth/me` synchronization. Render-driven duplicate synchronization is prevented per account.
- All protected API calls acquire an API access token and attach it as `Authorization: Bearer …`; ID tokens are never used as API credentials.
- The backend never trusts decoded claims without signature validation. Invalid authentication returns 401; a valid token without the delegated scope returns 403.
- Local users are keyed by validated issuer plus `oid`/`sub`, never by email. API responses omit issuer, external subject, email, tokens, and raw claims.
- CSP permits only the exact `https://azureweatherexercise3.ciamlogin.com` origin for MSAL connections and frames; no wildcard origin was added.

## Files changed

- Authentication implementation: `apps/backend/src/auth/`, `apps/frontend/src/auth/`, backend module/config/health wiring, frontend application/bootstrap/API client/styles.
- Tests: backend token, configuration, route, user-sync, and protected-weather coverage; frontend authentication and existing weather-flow coverage.
- Dependencies: `apps/backend/package.json`, `apps/frontend/package.json`, and npm-generated `package-lock.json`.
- Container/configuration: `.env.example`, both workspace `.env.example` files, `apps/frontend/Dockerfile`, `apps/frontend/nginx.conf`, and `compose.yaml`.
- Documentation: `README.md`, `docs/entra-external-id-setup.md`, interaction index, and `docs/ai-interactions/010-authentication-foundation.md`.
- Existing interaction 008/009 work and architecture diagrams were preserved.

## Tests and builds

- `npm.cmd install jose@^5 --workspace=@azure-weather/backend` — exit 0; lock file updated through npm.
- `npm.cmd install @azure/msal-browser @azure/msal-react --workspace=@azure-weather/frontend` — exit 0; lock file updated through npm.
- `npm.cmd run build` — exit 0; backend and frontend production builds passed.
- `npm.cmd run lint` — exit 0; backend and frontend lint passed.
- `npm.cmd test` — exit 0; 10 backend suites/56 tests and 1 frontend suite/11 tests passed.
- Backend tests cover public health; missing authentication; synthetic valid, invalid-signature, expired, missing-expiry, wrong-issuer, wrong-audience, wrong-tenant, wrong-client, wrong-version, and insufficient-scope tokens; protected weather; stable repeated user synchronization; and absence of persisted email/token data.
- Frontend tests cover signed-out UI, redirect login, authenticated display name, single user synchronization, bearer attachment to protected calls, safe authentication/API errors, absence of rendered/logged tokens, and existing weather behavior.
- `npm.cmd run format:check` — exit 0.
- `git diff --check` — exit 0; only Git line-ending conversion warnings were emitted.
- `npm.cmd audit` — exit 1 with the existing 20 moderate Jest/ts-jest development-tooling findings.
- `npm.cmd audit --omit=dev` — exit 0 with zero production vulnerabilities.
- `docker compose config --quiet` — exit 0 using only the supplied public Entra values as temporary process variables.
- `docker compose --progress quiet build` — exit 0.
- `docker compose up --detach` — exit 0.

## Container health status

- PostgreSQL, backend, and frontend are running and healthy; the stack remains available at `http://127.0.0.1:8080`.
- The frontend root and public `GET /api/health` returned HTTP 200.
- Unauthenticated weather and `GET /api/auth/me` requests returned HTTP 401; a malformed bearer value returned 401; an unknown API route remained 404.
- Backend Node remains PID 1. Startup reported no pending migration, and sanitized logs contained no authorization/token/client-secret patterns.
- `users`, `saved_forecasts`, and `typeorm_migrations` remain present with the expected migration record. The users table has only ID, issuer, external subject, provider, display name, and timestamp columns.
- Backend and PostgreSQL have no host port bindings; frontend remains loopback-only on `127.0.0.1:8080`.
- The compiled frontend contains the intended public client ID, CIAM authority, and API scope, with no private configuration or JWT-like value found.

## Manual browser verification

1. Open a private browser window at `http://localhost:8080/`.
2. Confirm the signed-out page appears and select **Sign in**.
3. Complete Google, Microsoft Account, or Entra-managed email one-time passcode authentication directly in Microsoft Entra. Do not provide credentials or tokens to project tooling.
4. Confirm the redirect returns to exactly `http://localhost:8080/`, the authenticated display name appears, and weather search becomes available.
5. Search for a city and load a forecast. In browser developer tools, confirm `/api/auth/me` and weather requests succeed, but do not copy or record authorization headers.
6. Refresh once and confirm the session restores without a redirect loop or duplicate local user.
7. Select **Sign out** and confirm the application returns to the signed-out state.
8. If desired, re-test the previously observed Microsoft same-email collision scenario; identity linking or collision resolution belongs in External ID and the application must not merge users by email.

## Limitations and remaining verification

- A real end-to-end login was not attempted because it requires the human user's browser session and credentials.
- The supplied configuration states that Google authentication was manually verified during tenant setup; this implementation turn did not repeat that human verification.
- If the stack is rebuilt in a new shell, copy the public Entra values from the committed examples into the appropriate ignored local environment files or supply them as process variables. `VITE_*` values are public build-time values, so changing them requires a frontend rebuild.
- Authentication-provider administration, provider-secret rotation, same-email collision handling, forecast persistence/history APIs, Azure provisioning, Terraform, CI/CD, and distributed caching remain deferred.

## Security and documentation status

- No real environment file was read, printed, copied, or modified. Real environment files remain ignored and untracked.
- No client secret, provider secret, real token, authorization code, or email address was stored or logged. Automated JWT tests use locally generated keys and synthetic claims only.
- The PostgreSQL volume and unrelated Docker resources were preserved. No database schema or image version was changed.
- README and `docs/entra-external-id-setup.md` document architecture, public configuration, manual testing, privacy, troubleshooting, provider-secret rotation practices, configured providers, email OTP fallback, Google verification context, and same-email collision handling.
- Interaction 010 contains the exact prompt and this exact response and is indexed. Human Review is `Pending`; Final Status is `Awaiting human review`.
- No commit or push was performed; HEAD remains `f8ed6869597fb93bbb758d527783ec7df55ca136`.

## Files Changed

- Frontend MSAL configuration, authentication UI, protected API client, tests, and container build wiring.
- Backend validated configuration, global authentication guard, OIDC/JWKS token validation, user synchronization endpoint, and tests.
- Safe environment examples, Compose runtime/build configuration, CSP, README, operational documentation, dependency manifests/lock file, interaction index, and this record.

## Validation

- Exact build, lint, test, formatting, audit, Compose, container-health, route-protection, and secret-safety outcomes are recorded in the final response.

## Security Notes

- Business routes default to authenticated access; only the health route is explicitly public.
- No email address, client secret, provider secret, token, authorization code, or raw claims are stored or logged.
- Token validation is cryptographic and checks every configured delegated-token boundary before a principal is trusted.

## Assumptions

- The supplied tenant, registration, user-flow, permission, and endpoint configuration remains active and matches the public values in the committed examples.
- Real interactive authentication must be completed by the human reviewer in a browser.

## Deferred Work

- Manual browser verification, authentication-provider collision retesting, forecast persistence/history APIs, Azure provisioning, Terraform, CI/CD, and distributed caching remain outside automated implementation.

## Human Review

Approved on 2026-10-20 after manual browser verification. Google sign-in completed through Microsoft Entra External ID, redirected successfully to the local application, created the local user with the corrected display name, enabled protected weather search, and preserved authentication across the tested flow.

## Final Status

Approved

## Review Correction — 2026-10-20

### Exact Review Prompt

```text
Correct the Interaction 010 Entra configuration based on the live OIDC metadata verification.

The current browser sign-in fails before redirect with "Sign in could not be started."

Verified root cause:
- The current frontend authority is too short.
- Requesting:
  https://azureweatherexercise3.ciamlogin.com/.well-known/openid-configuration?appid=ca698b88-3c0f-4279-bbb5-b60654497b31
  returns HTTP 404.
- The tenant-specific metadata endpoint returns HTTP 200:
  https://azureweatherexercise3.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6/v2.0/.well-known/openid-configuration
- That live metadata document reports this exact issuer:
  https://79fb97ff-3c22-4210-b16d-e210b21db3e6.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6/v2.0

Required corrections:

1. Change the frontend authority to:
   https://azureweatherexercise3.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6

2. Keep the known authority host as:
   azureweatherexercise3.ciamlogin.com

3. Change ENTRA_EXPECTED_ISSUER to the exact live metadata value:
   https://79fb97ff-3c22-4210-b16d-e210b21db3e6.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6/v2.0

4. Preserve the metadata URL:
   https://azureweatherexercise3.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6/v2.0/.well-known/openid-configuration

5. Update all safe environment examples, Docker build/runtime values, README, and docs/entra-external-id-setup.md.

6. Update affected tests so they use the real issuer format, while continuing to use synthetic tokens and local test keys.

7. Rebuild and restart the Docker Compose stack with the corrected public values.

8. Run build, lint, tests, format check, Compose validation, and health/unauthenticated-route checks.

9. Record this as a review correction inside:
   docs/ai-interactions/010-authentication-foundation.md

Do not create a new numbered interaction.
Keep Human Review as Pending.
Do not commit or push.
Do not read or modify the real .env file.
Do not expose or use any client secret, credentials, or real token.

Return the exact manual browser steps for retesting after the containers are healthy.
```

### Correction Model Response

Implemented the Interaction 010 Entra review correction without adding application features.

## Corrections performed

- Changed the frontend authority to `https://azureweatherexercise3.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6` in every committed safe environment example and in the rebuilt frontend image.
- Kept the known authority host as `azureweatherexercise3.ciamlogin.com`.
- Changed `ENTRA_EXPECTED_ISSUER` to the exact metadata value `https://79fb97ff-3c22-4210-b16d-e210b21db3e6.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6/v2.0`.
- Preserved the tenant-specific OIDC metadata URL unchanged.
- Updated README and the Entra setup guide to explain the tenant-path authority and the distinct metadata-published issuer host.
- Updated backend test fixtures to mirror the live CIAM issuer shape while retaining synthetic tenant/client IDs, synthetic tokens, and locally generated test keys.
- Rebuilt and restarted the Compose backend and frontend with the corrected public values. PostgreSQL and its data were preserved.

## Files changed for this correction

- `.env.example`
- `apps/frontend/.env.example`
- `apps/backend/.env.example`
- `README.md`
- `docs/entra-external-id-setup.md`
- `apps/backend/test/test-environment.ts`
- `apps/backend/test/auth.e2e-spec.ts`
- `apps/backend/test/authentication-configuration.spec.ts`
- `apps/backend/test/entra-token.service.spec.ts`
- `apps/backend/test/openweather.client.spec.ts`
- `apps/backend/test/weather.e2e-spec.ts`
- `docs/ai-interactions/010-authentication-foundation.md`

`compose.yaml` already passes the public Entra settings into the frontend build and backend runtime through variables, so no Compose source change was necessary for this correction.

## Validation

- `npm.cmd run build` - exit 0; backend and frontend production builds passed.
- `npm.cmd run lint` - exit 0; backend and frontend lint passed with no disabled or weakened rule.
- `npm.cmd test` - exit 0; 10 backend suites/56 tests and 1 frontend suite/11 tests passed.
- `npm.cmd run format:check` - exit 0; all checked files use Prettier formatting.
- `docker compose config --quiet` with the corrected public values supplied as temporary process variables - exit 0.
- `docker compose --progress quiet build` - the first sandboxed attempt exited 32 because access to the user's Docker buildx configuration was denied; the approved rerun exited 0.
- `docker compose up --detach` - exit 0 on the approved rerun; PostgreSQL, backend, and frontend are healthy.
- The served frontend bundle contains the corrected tenant-specific authority, and a runtime equality check confirmed the backend has the exact corrected expected issuer.
- `GET http://127.0.0.1:8080/` - HTTP 200.
- `GET http://127.0.0.1:8080/api/health` - HTTP 200.
- Unauthenticated `GET /api/auth/me` - HTTP 401.
- Unauthenticated `GET /api/weather/locations?query=Tel%20Aviv` - HTTP 401.
- `GET /api/auth/me` with a malformed synthetic bearer value - HTTP 401.
- `git diff --check` - exit 0; only Git line-ending conversion warnings were emitted.
- No real `.env` file is tracked, no architecture diagram changed, no new numbered interaction was created, and HEAD remains `f8ed6869597fb93bbb758d527783ec7df55ca136` with no commit or push.

## Assumptions and intentionally deferred work

- The supplied live metadata verification and registered redirect URI remain authoritative. This correction did not repeat an interactive provider login.
- A real browser sign-in, provider credentials, and real tokens remain exclusively with the human reviewer. No real `.env` file, client secret, credential, or real token was inspected, printed, modified, or used.
- Authentication-provider administration, account-collision handling, and all previously deferred application/infrastructure work remain out of scope.

## Documentation status

- The original Interaction 010 Exact Prompt and Model Response remain unchanged.
- This review prompt and this exact correction response are recorded inside Interaction 010; no Interaction 011 was created.
- Human Review remains `Pending`, and Final Status remains `Awaiting human review`.

## Exact manual browser retest

1. Open a new private/incognito browser window. If reusing a window, clear site data and session storage for `http://localhost:8080` first.
2. Open `http://localhost:8080/` and confirm the signed-out page appears.
3. Open browser developer tools, select the Network panel, and enable **Preserve log**. Do not copy authorization headers or tokens.
4. Select **Sign in**.
5. Confirm that the browser leaves the application and Microsoft Entra sign-in starts through the tenant-scoped authority `https://azureweatherexercise3.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6`. The previous immediate "Sign in could not be started" error should not appear.
6. Complete one configured provider flow directly in Microsoft Entra.
7. Confirm the browser returns to exactly `http://localhost:8080/`, displays the authenticated user's name, and enables weather search.
8. In the Network panel, confirm `GET /api/auth/me` succeeds with HTTP 200. Search for a city and confirm the protected location and forecast requests also succeed; do not inspect or copy bearer-token contents.
9. Refresh the page once and confirm the session restores without a redirect loop or duplicate-user symptom.
10. Select **Sign out** and confirm the application returns to the signed-out state and weather functionality is gated again.
