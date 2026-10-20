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
|   |-- azure-architecture.drawio
|   `-- azure-architecture.mmd
`-- infra/
    `-- terraform/         # Reserved for a later step
```

## Prerequisites

- Node.js 22 (see `.nvmrc`)
- npm, included with Node.js
- Docker with the Compose plugin for local PostgreSQL

## Install dependencies

From the repository root:

```bash
nvm use
npm install
```

If your environment does not provide `nvm`, install a current Node.js 22 release directly.

## Local database

For first-time setup only, copy each committed example when its corresponding `.env` file does not already exist:

```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
```

Do not run those copy commands over existing files. If `apps/backend/.env` already contains an OpenWeather API key, keep that file in place and add only the six `DATABASE_*` entries shown in `apps/backend/.env.example`. Likewise, if the root `.env` already exists, add or update only the four database entries from the root example. Use the same new local-only database password in both files without printing or committing either real `.env` file.

Start only PostgreSQL and check its health:

```bash
docker compose up -d postgres
docker compose ps postgres
```

Run the schema migration from the repository root:

```bash
npm run db:migrate
```

TypeORM maps the backend's TypeScript entities to PostgreSQL tables. Migrations are the reviewed history of schema changes, and `synchronize` is intentionally disabled. Local PostgreSQL is containerized; production will use Azure Database for PostgreSQL Flexible Server instead.

To safely revert the latest migration during local development:

```bash
npm run db:migration:revert
```

Generate a future migration only after changing entity mappings:

```bash
npm run db:migration:generate -- src/database/migrations/DescriptiveName
```

At this incremental stage Compose runs PostgreSQL only. The frontend and backend continue to use the existing npm development workflow; their containers will be added later.

## Run the application

Start the frontend and backend together:

```bash
npm run dev
```

The frontend is available at `http://localhost:5173`. The backend is available at `http://localhost:3000`, with health information at `http://localhost:3000/api/health`.

You can also start each application independently:

```bash
npm run dev:frontend
npm run dev:backend
```

The committed examples contain placeholders, not credentials. The backend requires OpenWeather and database settings and validates them during startup. Set `DATABASE_SSL=false` locally and `DATABASE_SSL=true` for Azure PostgreSQL TLS. Never place the private weather key or database credentials in frontend configuration.

## Weather forecast flow

The browser searches and loads forecasts only through the backend endpoints under `/api/weather`. The backend uses fixed OpenWeather geocoding and five-day forecast paths, keeps the API key server-side, validates user input, and returns an application-owned response rather than the upstream payload.

Successful location searches are cached for 60 minutes, and successful forecasts are cached for 10 minutes. This small cache is held in memory, is local to each backend instance, and is not shared across replicas. It should be replaced or reconsidered if globally shared caching becomes necessary.

## Build, lint, test, and format

```bash
npm run build
npm run lint
npm test
npm run format
```

Use `npm run format:check` to verify formatting without changing files.

## Implementation status

### Implemented

- City search and location selection
- Five-day forecasts with expandable three-hour details
- Backend-only OpenWeather access with normalized responses
- Local, per-instance in-memory caching
- PostgreSQL entities, configuration, and migration foundation
- Containerized local PostgreSQL service

### Deferred

- Authentication
- Saving forecasts and forecast history APIs
- Frontend and backend containers
- Terraform and Azure resources
- CI/CD
- Distributed caching
