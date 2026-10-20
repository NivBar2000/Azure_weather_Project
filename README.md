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

Copy the relevant `.env.example` to `.env` inside an application directory when local overrides are needed. The committed examples contain no credentials.

## Build, lint, test, and format

```bash
npm run build
npm run lint
npm test
npm run format
```

Use `npm run format:check` to verify formatting without changing files.

## Deferred work

This foundation intentionally does not include Azure infrastructure, Terraform resources, Docker configuration, CI/CD pipelines, authentication, PostgreSQL integration, or OpenWeatherMap integration. Those capabilities are reserved for later implementation steps. The `infra/terraform` directory is only a placeholder for the future infrastructure code.
