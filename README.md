# Azure Weather Project

A clean npm-workspaces monorepo foundation for a weather forecast web application. This first step provides a React frontend, a NestJS backend, local development tooling, and an auditable record of AI-assisted implementation.

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

## Install dependencies

From the repository root:

```bash
nvm use
npm install
```

If your environment does not provide `nvm`, install a current Node.js 22 release directly.

## Run locally

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

Copy the relevant `.env.example` to `.env` inside an application directory when local overrides are needed. The committed examples contain no credentials. The backend requires `OPENWEATHER_API_KEY`; it validates weather-service, frontend-origin, and port configuration during startup. Never place the private key in frontend configuration.

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

### Deferred

- Authentication
- PostgreSQL and saved forecasts
- Docker
- Terraform and Azure resources
- CI/CD
- Distributed caching
