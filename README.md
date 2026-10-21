# Azure Weather Project

An npm-workspaces monorepo for a weather forecast web application with a React frontend, a NestJS backend, and a PostgreSQL database foundation.

## Repository structure

```text
.
|-- apps/
|   |-- frontend/          # React, TypeScript, and Vite
|   `-- backend/           # NestJS and TypeScript
|-- docs/
|   |-- ai-interactions/   # Numbered AI interaction records
|   |-- azure-infrastructure.md
|   |-- azure-architecture.drawio
|   `-- azure-architecture.mmd
`-- infra/
    `-- terraform/         # Production Azure infrastructure foundation
```

## Prerequisites

- Node.js 22 (see `.nvmrc`)
- npm, included with Node.js
- Docker with the Compose plugin for the local full stack

## Install dependencies

From the repository root:

```bash
nvm use
npm install
```

If your environment does not provide `nvm`, install a current Node.js 22 release directly.

## Local container stack

For first-time setup only, copy each committed example when its corresponding `.env` file does not already exist:

```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
```

Do not run those copy commands over existing files. If `apps/backend/.env` already contains an OpenWeather API key, keep that file in place and add only the database and `ENTRA_*` entries shown in `apps/backend/.env.example`. Likewise, if the root `.env` already exists, add or update only the database and public Entra entries from the root example. Use the same new local-only database password in both files without printing or committing either real `.env` file.

Build and start the complete local environment:

```bash
docker compose up --build
```

The application is available only through the frontend at `http://localhost:8080`. Nginx serves the compiled React files and proxies `/api/*` over the Docker application network to NestJS. The backend connects to PostgreSQL over the private internal data network; its port is not published.

Nginx adds baseline browser security headers. Its Content Security Policy permits only same-origin application resources plus connections and hidden frames to the exact configured CIAM origin; it does not use wildcard origins.

Compose waits for PostgreSQL to become healthy, then the backend runs compiled pending migrations before starting. It waits for the backend health endpoint before starting the frontend. Repeated backend starts are safe when no migration is pending.

In another terminal, inspect service health and bounded logs without rendering resolved Compose configuration:

```bash
docker compose ps
docker compose logs --tail=100 frontend backend
docker compose logs --tail=100 postgres
```

Stop the containers while preserving local PostgreSQL data:

```bash
docker compose down
```

> **Destructive:** the following command also deletes the named volume and all local PostgreSQL data:

```bash
docker compose down --volumes
```

TypeORM maps backend TypeScript entities to PostgreSQL tables. Migrations provide reviewed schema history; schema synchronization and automatic extension installation are intentionally disabled.

For host-based development against a PostgreSQL instance that is reachable with the settings in `apps/backend/.env`, run migrations from the repository root:

```bash
npm run db:migrate
```

To safely revert the latest migration during host-based development:

```bash
npm run db:migration:revert
```

Generate a future migration only after changing entity mappings:

```bash
npm run db:migration:generate -- src/database/migrations/DescriptiveName
```

The local Nginx and PostgreSQL containers are development and integration-test infrastructure. Azure production continues to use Azure Front Door, Azure Storage Static Website, App Service, Azure Database for PostgreSQL Flexible Server, and Azure Container Registry.

## Production Azure infrastructure

The Terraform root module under `infra/terraform` defines the deployed Sweden Central production architecture: Front Door Standard, Storage Static Website, a managed-identity App Service/ACR path, private zone-redundant PostgreSQL, Key Vault, networking, autoscale, and monitoring. It reads an existing resource group and does not manage Entra External ID.

The production infrastructure, frontend, database migrations, backend, Microsoft Entra External ID authentication, and backend-only OpenWeather integration are operational. Human validation covered Google and Microsoft Account sign-in, city search and live forecasts, saved-forecast create/list/detail behavior, cross-user isolation with two identities, and sign-out. See [Azure infrastructure](docs/azure-infrastructure.md) for topology and security/cost decisions, [Azure deployment readiness](docs/azure-deployment-readiness.md) for deployment evidence and the controlled runbook, and the [Terraform README](infra/terraform/README.md) for safe placeholders and local validation.

Safe non-deploying validation:

```bash
cd infra/terraform
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
```

Do not commit environment-specific `terraform.tfvars` or `backend.hcl` files. Do not run deployment commands without a separately reviewed and authorized deployment interaction.

## Run directly with npm

Start the frontend and backend together:

```bash
npm run dev
```

The directly run frontend is available at `http://localhost:5173`. The backend is available at `http://localhost:3000`, with health information at `http://localhost:3000/api/health`.

You can also start each application independently:

```bash
npm run dev:frontend
npm run dev:backend
```

The committed examples contain placeholders, not credentials. The backend requires OpenWeather and database settings and validates them during startup. Set `DATABASE_SSL=false` locally and `DATABASE_SSL=true` for Azure PostgreSQL TLS. Never place the private weather key or database credentials in frontend configuration.

## Authentication

Microsoft Entra External ID protects every business API route by default. `GET /api/health` is the only explicitly public application endpoint. The React SPA uses MSAL authorization-code flow with PKCE, keeps MSAL state in `sessionStorage`, acquires a delegated API access token, and sends it as a bearer token to `/api/auth/me` and weather endpoints. The backend validates the signature, issuer, audience, tenant, calling client, token version, expiry, and `access_as_user` scope before synchronizing the local user.

The frontend requires these public build-time variables:

- `VITE_ENTRA_CLIENT_ID`
- `VITE_ENTRA_AUTHORITY`
- `VITE_ENTRA_KNOWN_AUTHORITY`
- `VITE_ENTRA_API_SCOPE`

The backend requires these runtime variables:

- `ENTRA_TENANT_ID`
- `ENTRA_API_CLIENT_ID`
- `ENTRA_ALLOWED_CLIENT_ID`
- `ENTRA_OIDC_METADATA_URL`
- `ENTRA_EXPECTED_ISSUER`
- `ENTRA_REQUIRED_SCOPE`

The committed examples contain the project's non-secret IDs and endpoints. Every `VITE_*` value is compiled into browser JavaScript and is public; never put a client secret, provider secret, token, weather key, or database credential in a `VITE_*` variable. This delegated SPA/API flow has no application client secret.

For this External ID tenant, the frontend authority must include the tenant ID path while the known-authority host remains `azureweatherexercise3.ciamlogin.com`. The backend metadata URL uses that host and tenant path, but issuer validation uses the exact issuer published by the live metadata document: `https://79fb97ff-3c22-4210-b16d-e210b21db3e6.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6/v2.0`.

After changing a frontend build-time value, rebuild rather than only restarting containers:

```bash
docker compose up --build
```

Manual browser verification:

1. Open `http://localhost:8080/` in a private browser window and select **Sign in**.
2. Complete the configured Google, Microsoft Account, or Entra-managed email one-time passcode flow without sharing credentials with project tooling.
3. Confirm the browser returns to `http://localhost:8080/`, shows the display name, and enables weather search.
4. Search for a city, load a forecast, refresh the page, and verify the session remains available only for that browser session.
5. Select **Sign out** and confirm protected weather functionality is no longer shown.

The application keys users by validated issuer plus `oid` (or `sub` only when `oid` is absent). It does not use or persist email addresses and does not store or log access, ID, or refresh tokens. See [Entra External ID setup](docs/entra-external-id-setup.md) for registration details, privacy decisions, manual checks, and troubleshooting.

For login problems, verify the SPA redirect URI exactly matches `http://localhost:8080/`, then check the configured authority/issuer, API audience GUID, delegated scope grant, and frontend client ID. If container values changed but the browser still uses old settings, rebuild the frontend image and clear that site's session storage before retrying.

## Weather forecast flow

The browser searches and loads forecasts only through the backend endpoints under `/api/weather`. The backend uses fixed OpenWeather geocoding and five-day forecast paths, keeps the API key server-side, validates user input, and returns an application-owned response rather than the upstream payload.

Successful location searches are cached for 60 minutes, and successful forecasts are cached for 10 minutes. This small cache is held in memory, is local to each backend instance, and is not shared across replicas. It should be replaced or reconsidered if globally shared caching becomes necessary.

## Saved forecast history

Authenticated users can create immutable historical snapshots and browse only their own history through these protected endpoints:

- `POST /api/saved-forecasts` accepts only numeric `latitude` and `longitude`, obtains the normalized forecast through the backend weather service, and creates a new snapshot with HTTP 201.
- `GET /api/saved-forecasts` returns newest-first summaries with an opaque cursor, a default limit of 20, and a maximum limit of 50.
- `GET /api/saved-forecasts/:id` returns one stored snapshot without calling OpenWeather.

Saving is server-authoritative: the browser cannot submit a user ID, owner, city name, identity field, or forecast payload. Every save creates a new row rather than replacing an earlier snapshot. The backend derives ownership from the validated Entra principal, synchronizes the local user when needed, and scopes list/detail queries by that user. A missing record and a record owned by someone else both return HTTP 404 to prevent ownership disclosure.

Manual saved-history verification:

1. Sign in at `http://localhost:8080/`, search for a city, and open its live forecast.
2. Select **Save forecast** twice and confirm each action reports a newly created historical snapshot.
3. Open **Saved forecasts** and confirm both newest-first entries appear with their saved times.
4. Select an entry and confirm it is labeled **Historical saved snapshot**. In browser developer tools, confirm opening it calls `/api/saved-forecasts/:id` and does not call `/api/weather/forecast`.
5. Return to search, then use **Load more** when more than one page is available.
6. Sign in as a different test user and confirm the first user's history is not visible. Do not copy tokens or authorization headers into diagnostics.

## Build, lint, test, and format

```bash
npm run build
npm run lint
npm test
npm run format
```

Use `npm run format:check` to verify formatting without changing files.

## Continuous integration

The GitHub Actions workflow at `.github/workflows/ci.yml` runs on pull requests to `main`, pushes to `main`, and manual dispatch. Its parallel jobs validate the application, build the backend container locally, and format/validate Terraform without deployment credentials, artifact publishing, registry pushes, Azure access, or CD.

## Production deployment workflow

The manual-only workflow at `.github/workflows/cd.yml` validates the application and then deploys one reviewed `main` commit through the GitHub `production` Environment. It accepts only `workflow_dispatch` runs whose original actor and current triggering actor are both `NivBar2000`, including re-runs, allows only one active production deployment, and authenticates to Azure with OIDC using public repository variables rather than client secrets.

The ordered release is: build and push a full-commit-SHA backend tag, verify its ACR digest, update and run exactly one migration execution, deploy that same digest to App Service, require `GET /api/health`, build and upload the frontend to `$web` with Entra authentication and explicit content types, purge Front Door, and run bounded frontend/API smoke checks. Terraform continues to own infrastructure and all non-image runtime configuration; CD owns backend and migration image revisions plus static frontend content.

The workflow expects public repository variables only: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`, `ACR_NAME`, `ACR_LOGIN_SERVER`, `BACKEND_IMAGE_REPOSITORY`, `MIGRATION_JOB_NAME`, `BACKEND_APP_NAME`, `FRONTEND_STORAGE_ACCOUNT`, `FRONT_DOOR_PROFILE`, `FRONT_DOOR_ENDPOINT`, `PRODUCTION_URL`, `VITE_API_BASE_URL`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_AUTHORITY`, `VITE_ENTRA_KNOWN_AUTHORITY`, and `VITE_ENTRA_API_SCOPE`. Never place a credential, client secret, storage key, SAS token, OpenWeather key, database password, or access token in those variables.

To start a deployment, open **Actions**, select **Production CD**, choose **Run workflow**, select `main`, and confirm the commit before running it. The private-repository GitHub plan does not provide required Environment reviewers, so manual dispatch, exact original-actor, triggering-actor, and ref checks, the `production` Environment boundary, OIDC subject restriction, immutable digest deployment, and non-cancelling concurrency are the compensating controls. The first run failed safely at OIDC authentication before deployment and exposed the immutable subject needed by Azure federation. After the reviewed Terraform credential correction, the retry remains the live validation of OIDC/RBAC propagation, migration execution, Front Door purge scope, and production health.

## Implementation status

### Implemented

- City search and location selection
- Five-day forecasts with expandable three-hour details
- Backend-only OpenWeather access with normalized responses
- Local, per-instance in-memory caching
- PostgreSQL entities, configuration, and migration foundation
- Complete local frontend, backend, and PostgreSQL container stack
- Microsoft Entra External ID authentication and privacy-safe user synchronization
- Authenticated immutable saved forecasts and personal cursor-paginated history
- Production Azure Terraform configuration and operating documentation
- Operational Azure production infrastructure, frontend, private database, backend, authentication, and OpenWeather flow
- GitHub Actions CI for application, backend-container, dependency-audit, and Terraform validation
- Manual GitHub Actions production CD with OIDC, digest-qualified backend deployment, ordered migration gate, frontend upload, purge, health checks, and bounded smoke checks

### Deferred

- Applying and live-validating the Terraform-defined persistent migration runner and GitHub OIDC/RBAC foundation
- First human-triggered production CD run and live workflow validation
- Distributed caching
