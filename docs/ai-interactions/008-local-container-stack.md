# 008 - Local Container Stack

## Tool

Codex

## Model

GPT-5

## Date

2026-10-20

## Objective

Containerize the React frontend and NestJS backend, complete the isolated three-service local Compose topology, and validate the application through its single loopback Nginx entry point.

## Relevant decisions

- Use multi-stage, explicitly versioned Node.js 22 Alpine builds and an explicitly versioned unprivileged Nginx runtime.
- Keep the backend image suitable for later App Service use by leaving migration execution out of its default command; Compose overrides startup to run compiled pending migrations first.
- Publish only Nginx on `127.0.0.1:8080`; leave the backend and PostgreSQL without host-published ports.
- Separate frontend/backend traffic from backend/database traffic with `application` and internal `data` networks.
- Consume existing ignored environment files only at runtime and exclude all real environment files from Docker build contexts.

## Exact Prompt

````text
Before making changes, read and follow the repository root `AGENTS.md` completely. Inspect the current repository, Docker and database implementation, existing tests, documentation, AI interaction records, and Git status. Preserve unrelated work.

## Objective

Containerize the React frontend and NestJS backend and complete the local Docker Compose environment so the entire application can be built and started with one command.

The final local environment must contain three long-running services:

- frontend
- backend
- PostgreSQL

The frontend container must use Nginx to serve the compiled React application and reverse-proxy `/api` requests to the backend over the Docker network.

Do not provision or modify Azure resources.

## Fixed architecture decisions

### Local request flow

```text
Browser
  |
  v
Frontend container: Nginx + compiled React
  |-- /       -> React static files
  |
  `-- /api/*  -> Backend container
                       |
                       v
                PostgreSQL container
```

Only the frontend is the public application entry point.

The browser must not call the backend container directly.

### Production distinction

The frontend container and Nginx are for local execution and integration testing.

The planned Azure production topology remains:

- Azure Front Door for global routing
- Azure Storage Static Website for React static files
- Azure App Service for the backend container
- Azure Database for PostgreSQL Flexible Server
- Azure Container Registry for the backend image

Do not change the documented Azure architecture.

## Required implementation

### 1. Backend Dockerfile

Create a production-quality multi-stage Dockerfile for the NestJS backend.

Requirements:

- build from the repository root so npm workspaces and the root lock file work correctly;
- use an explicit Node.js 22 Alpine image version rather than `latest`;
- install dependencies with `npm ci`;
- compile the backend in a build stage;
- create a smaller production runtime stage;
- include only files and dependencies required at runtime;
- run as a non-root user;
- set an appropriate production environment;
- expose only the backend application port as container metadata;
- use an exec-form default command;
- do not copy `.env` files or secrets into any image;
- do not run database migrations in the Dockerfile;
- do not make automatic migration execution part of the image's production default command.

Add suitable production scripts to the backend package if required.

The same backend image should be usable later by Azure App Service.

### 2. Compiled migration support

Add a production-safe npm script that runs TypeORM migrations from compiled JavaScript in the backend `dist` directory.

Keep the existing TypeScript migration scripts for host-based development.

For local Docker Compose only, start the backend with this sequence:

```text
run compiled pending migrations
then start the compiled NestJS application
```

If the migration fails, the backend must not start.

Running the same migration command again must safely report that no pending migration exists.

Do not enable TypeORM schema synchronization and do not enable automatic PostgreSQL extension installation.

### 3. Frontend Dockerfile

Create a multi-stage Dockerfile for the frontend.

Requirements:

- build from the repository root using npm workspaces and the root lock file;
- use an explicit Node.js 22 Alpine build image version;
- compile the React/Vite application;
- set the container-build API base URL to the relative path `/api`;
- never place an OpenWeather key, database credential, or other secret in a frontend build argument or image;
- serve only the compiled static output from an explicitly versioned unprivileged Nginx image;
- run Nginx as a non-root user;
- listen on container port `8080`;
- include SPA fallback so browser navigation returns `index.html`;
- include a useful container health check.

The frontend image is for local execution and testing. It is not a replacement for Azure Storage Static Website in production.

### 4. Nginx reverse proxy

Add a focused Nginx configuration for the frontend container.

Required behavior:

```text
/       -> compiled React files
/api/*  -> http://backend:3000/api/*
```

Requirements:

- preserve the complete `/api` path when proxying;
- forward appropriate host and proxy headers;
- support normal HTTP connection reuse;
- do not expose Docker-internal hostnames to the browser;
- do not create an open forward proxy;
- do not expose directory listings;
- keep error responses free of internal configuration details;
- support the React SPA fallback without intercepting `/api` requests.

### 5. Docker build context

Add a root `.dockerignore`.

Exclude at least:

- Git metadata
- all real `.env` files
- local dependency directories
- build output
- coverage
- logs
- editor files
- irrelevant temporary files

Do not exclude committed `.env.example` files if they are needed for documentation, but do not copy them into runtime images unnecessarily.

### 6. Complete Docker Compose topology

Extend the root Compose file to include:

- frontend
- backend
- postgres

Use clear service names:

```text
frontend
backend
postgres
```

Requirements:

#### PostgreSQL

- retain the pinned PostgreSQL image;
- retain the health check;
- retain the named persistent volume;
- obtain database name, username, and password through variable substitution;
- connect only to the data network;
- if a host port remains available for developer tooling, bind it only to `127.0.0.1`, never all host interfaces.

#### Backend

- build from the backend Dockerfile using the repository root as context;
- wait for PostgreSQL to become healthy;
- run compiled migrations before starting the server;
- receive the OpenWeather settings from the existing untracked backend environment file without displaying their values;
- override database connectivity inside Compose so the host is `postgres`, not `localhost`;
- receive the database password through Compose variable substitution;
- set the frontend origin to `http://localhost:8080`;
- include a health check against `/api/health`;
- do not publish the backend port to the host;
- connect to both the application network and the private data network;
- retain outbound internet access so it can contact OpenWeather.

#### Frontend

- build from the frontend Dockerfile using the repository root as context;
- wait for the backend to become healthy;
- publish the application only on:

```text
127.0.0.1:8080
```

- connect only to the application network.

### 7. Network separation

Define two Docker networks:

```text
application
data
```

Required membership:

```text
frontend -> application
backend  -> application + data
postgres -> data
```

Make the data network internal so PostgreSQL does not receive general outbound network access.

The backend must still have outbound internet access through the application network for OpenWeather requests.

Do not publish the backend port.

### 8. Startup and dependency behavior

Use Compose health and dependency conditions so startup proceeds in this order:

```text
PostgreSQL healthy
    ↓
Backend migration and startup
    ↓
Backend healthy
    ↓
Frontend startup
```

Use bounded health-check retries and appropriate start periods.

Avoid arbitrary fixed sleep commands when a health condition can be checked directly.

Use a reasonable restart policy for the three long-running services.

### 9. Local configuration safety

Real local environment files already exist.

Do not inspect, print, copy, rewrite, or document their values.

Docker Compose may consume them as environment sources during startup, but command output must not expose resolved secrets.

Use:

```bash
docker compose config --quiet
```

Do not print the fully rendered Compose configuration.

Keep all real `.env` files ignored by Git.

Do not place secrets in:

- Dockerfiles
- Nginx configuration
- image labels
- build arguments
- frontend JavaScript
- committed documentation
- container health-check output

### 10. Documentation

Update the README with a concise full-stack local workflow:

```bash
docker compose up --build
```

Document:

- application URL;
- service roles;
- request flow through Nginx;
- health/status command;
- safe log commands;
- stopping containers while preserving PostgreSQL data;
- the destructive command that also deletes local PostgreSQL data, clearly marked as destructive;
- how migrations run in Compose;
- how to run migrations manually for host-based development;
- the difference between local Nginx/PostgreSQL containers and the planned Azure services.

Ensure old PostgreSQL-only Compose instructions are updated and no longer describe the current complete topology as temporary.

Do not place real credentials in the README.

### 11. Tests

Add focused automated tests where useful for new configuration or scripts.

Do not add brittle tests that merely duplicate Dockerfile text line-by-line.

Preserve all existing backend and frontend tests.

### 12. AI interaction documentation

Create:

`docs/ai-interactions/008-local-container-stack.md`

Update:

`docs/ai-interactions/README.md`

Follow all AI interaction requirements in `AGENTS.md`.

Include this prompt verbatim.

Set:

- Human Review: Pending
- Final Status: Awaiting human review

Before returning the final response:

1. prepare the complete final report;
2. save that exact report under `Model Response`;
3. return the identical report.

## Validation

Run all standard checks:

```bash
npm run build
npm run lint
npm test
npm run format:check
npm audit
npm audit --omit=dev
git diff --check
docker compose config --quiet
docker compose build
```

Then start the complete stack:

```bash
docker compose up --detach
```

Wait for health checks rather than using an arbitrary fixed delay.

Verify:

1. PostgreSQL becomes healthy.
2. The migration runs successfully.
3. The backend becomes healthy.
4. The frontend becomes healthy.
5. `http://localhost:8080/` returns the React application.
6. `http://localhost:8080/api/health` reaches the backend through Nginx.
7. a location-search request succeeds through the Nginx `/api` route without exposing the OpenWeather key;
8. `users`, `saved_forecasts`, and `typeorm_migrations` exist;
9. the expected migration record exists;
10. the backend has no published host port;
11. PostgreSQL is not bound to a non-loopback host interface;
12. restarting the backend does not damage the database and pending migrations remain idempotent;
13. real `.env` files remain ignored and untracked;
14. no secret is present in image history, committed files, frontend output, or displayed command output.

After successful validation, leave the local stack running so the human reviewer can open:

```text
http://localhost:8080
```

If validation fails, report the exact failing command and relevant sanitized error. Do not claim success.

## Constraints

- Do not implement authentication.
- Do not implement forecast save/history endpoints.
- Do not change the database schema.
- Do not change the selected Azure architecture.
- Do not modify architecture diagrams.
- Do not provision Azure resources.
- Do not run Terraform.
- Do not create a Git commit or push changes.
- Do not delete existing Docker images or unrelated Docker resources.
- Do not delete the PostgreSQL named volume.
- Do not use `npm audit fix --force`.
- Do not expose or modify real secret values.
- Keep changes focused on local containerization.

## Final response

Use the final-response format required by `AGENTS.md` and clearly report:

1. Summary
2. Files changed
3. Validation performed
4. Container and health status
5. Security or dependency findings
6. Assumptions
7. Deferred work
8. Documentation status
````

## Model Response

## Summary

- Added production-oriented multi-stage containers for the NestJS backend and React frontend using explicitly versioned Node.js 22 Alpine images and an unprivileged Nginx runtime.
- Added compiled TypeORM migration support. The backend image defaults to application startup only; Compose runs pending compiled migrations before starting NestJS and stops on migration failure.
- Completed the three-service Compose topology with health-gated startup, persistent PostgreSQL storage, separate application/internal-data networks, and Nginx as the only public entry point at `http://localhost:8080`.
- Added Nginx `/api` reverse proxying, SPA fallback, a root `.dockerignore`, and concise full-stack operating instructions. No application feature, database schema, Azure architecture, or architecture diagram was changed.

## Files changed

- `.dockerignore`
- `.env.example`
- `README.md`
- `apps/backend/Dockerfile`
- `apps/backend/package.json`
- `apps/frontend/Dockerfile`
- `apps/frontend/nginx.conf`
- `compose.yaml`
- `docs/ai-interactions/README.md`
- `docs/ai-interactions/008-local-container-stack.md`

## Validation performed

- `npm.cmd run build` — exit 0; backend and frontend production builds passed.
- `npm.cmd run lint` — exit 0; backend and frontend lint passed.
- `npm.cmd test` — exit 0; 7 backend suites/30 tests and 1 frontend suite/7 tests passed.
- `npm.cmd run format:check` — exit 0; all matched files use Prettier formatting.
- `npm.cmd audit` — exit 1 with 20 moderate vulnerabilities in the Jest/ts-jest development dependency chain.
- `npm.cmd audit --omit=dev` — exit 0 with zero production vulnerabilities.
- `git diff --check` — exit 0; Git emitted only line-ending conversion warnings.
- `docker compose config --quiet` — exit 0 without rendering resolved configuration.
- `docker compose build` — exit 0; backend and frontend images built successfully.
- `docker compose up --detach` — exit 0; the rebuilt stack started in dependency order and was left running.
- `docker compose restart backend` — exit 0; the backend returned to healthy, logged `No migrations are pending`, and showed no migration-error matches.

## Container and health status

- PostgreSQL, backend, and frontend are all running and healthy. Compose observed PostgreSQL healthy before backend startup and backend healthy before frontend startup.
- `http://localhost:8080/` returned HTTP 200 with the React application; a nested frontend route also returned the SPA shell.
- `http://localhost:8080/api/health` returned `ok` from `azure-weather-backend` through Nginx. An unknown `/api` route remained a backend 404 rather than being intercepted by SPA fallback.
- A Tel Aviv location search through the public Nginx `/api` route returned at least one normalized result with latitude and longitude; no key was displayed.
- Read-only database checks found `saved_forecasts`, `typeorm_migrations`, and `users`, plus migration record `1760976000000|CreateDatabaseFoundation1760976000000`.
- The backend restart and final rebuilt-image startup both found no pending migration, confirming idempotent migration startup without database damage.
- Only frontend port 8080 is host-published, bound to `127.0.0.1`. Backend and PostgreSQL host port bindings are empty.
- Network membership is frontend → application, backend → application + data, and PostgreSQL → data; the data network is internal.

## Security or dependency findings

- Backend runs as `node`; frontend runs as UID `101`. Both use non-root runtime identities.
- Real root and backend `.env` files remain ignored and untracked. Their values were not inspected, printed, copied, modified, or committed.
- Sensitive environment-variable patterns were absent from image history and compiled frontend files; the frontend bundle contains the relative `/api` route.
- The full audit's 20 moderate findings remain confined to the Jest/ts-jest development toolchain. No forced or breaking remediation was applied; production dependencies report zero known vulnerabilities.
- The PostgreSQL named volume was preserved. No unrelated Docker image, container, network, or volume was deleted or modified.

## Assumptions

- The existing ignored environment files contain the local OpenWeather and database settings required by Compose; successful migration and live location validation confirmed the necessary runtime configuration without exposing it.
- PostgreSQL intentionally has no host-published port. Host-based migration commands documented in the README require a separately reachable PostgreSQL endpoint.

## Deferred work

- Authentication, forecast saving/history endpoints, Azure provisioning, Terraform, CI/CD, and distributed caching remain out of scope.
- No production Azure topology change or local database schema change was introduced.

## Documentation status

- README instructions now describe the complete local stack, request flow, health/log commands, migration behavior, safe shutdown, destructive volume removal warning, host-based migration workflow, and the local-versus-Azure distinction.
- Interaction 008 contains the exact prompt and this exact response and is indexed. Its Human Review is `Pending` and Final Status is `Awaiting human review`.
- Architecture diagrams are unchanged. No Git commit or push was created; HEAD remains `f8ed6869597fb93bbb758d527783ec7df55ca136`.
- The healthy stack remains running for review at `http://localhost:8080`.

## Files Changed

- Backend and frontend container build/runtime configuration.
- Local Compose topology and safe example configuration.
- Backend production and compiled-migration scripts.
- Local workflow and AI interaction documentation.

## Validation

- Exact command, automated-check, container-health, connectivity, migration, and security outcomes are recorded in the final response.

## Security Notes

- Real environment files and secrets are excluded from image build contexts and remain ignored and untracked.
- Only the frontend is published, on the IPv4 loopback interface; backend and PostgreSQL ports are not published.
- Containers use non-root runtime users, and the database network is internal.

## Assumptions

- The existing ignored root and backend environment files contain the required local settings and may be consumed by Compose without exposing their values.
- Keeping PostgreSQL entirely unexposed is preferable because host-based migration commands can target a separately reachable development database when needed.

## Deferred Work

- Authentication, forecast persistence/history APIs, Azure resources, Terraform, CI/CD, and distributed caching remain out of scope.

## Human Review

Approved by the human reviewer on 2026-10-20.

## Final Status

Approved
