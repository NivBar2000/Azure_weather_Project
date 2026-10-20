# 009 - Container Runtime Hardening

## Tool

Codex

## Model

GPT-5

## Date

2026-10-20

## Objective

Harden the existing local container stack so the compiled backend Node process becomes PID 1, NestJS handles termination signals, Express implementation details are hidden, and Nginx returns restrictive browser security headers.

## Relevant decisions

- Keep migration execution specific to Compose: run the compiled TypeORM command in a short-lived shell sequence and use `exec` for the application so Node replaces the shell as PID 1.
- Keep the production image default migration-free and start compiled Node directly without npm.
- Use Nest's typed Express application interface to disable `X-Powered-By` and enable framework-managed shutdown hooks during normal bootstrap.
- Apply Nginx security headers with `always`, including a same-origin CSP that permits local static assets, data-image rendering, and same-origin API requests without wildcard origins.
- Document that future Microsoft Entra External ID integration requires an explicit CSP review for its identity-provider origins.

## Exact Prompt

````text
Before making changes, read and follow `AGENTS.md` completely. Review the current uncommitted interaction 008 containerization changes and preserve unrelated work.

## Objective

Apply focused runtime-process and HTTP-header hardening corrections to the working local container stack.

Do not add application features or change the established container architecture.

## Review findings

Independent validation confirmed that:

- all three services are healthy;
- the frontend, reverse-proxied API, live location search, database tables, and migration record work;
- only the frontend is host-published;
- real environment files remain ignored;
- images run as non-root users;
- production dependency audit reports zero vulnerabilities.

Two hardening issues remain:

1. The backend container runs an npm process chain:

```text
npm -> npm -> node
```

The application Node process should become PID 1 after migrations complete so Docker signals reach it directly.

2. API responses expose:

```text
X-Powered-By: Express
```

The Nginx responses also lack basic browser-security headers.

## Required corrections

### 1. Make Node the backend PID 1 process

Change the backend Dockerfile default command so it starts the compiled application directly with Node, without an npm wrapper.

The production image default must remain migration-free and suitable for future Azure App Service use.

For Docker Compose startup:

1. run the compiled TypeORM migration command;
2. start the compiled NestJS application using shell `exec` so Node replaces the shell and becomes PID 1.

Requirements:

- migration failure must prevent application startup;
- repeated startup must remain migration-idempotent;
- do not add a process supervisor;
- do not use an arbitrary sleep;
- do not run development tooling in the production image;
- remove a Compose-only package script if it becomes unused;
- retain a clear production-start script if it remains useful for humans or non-Compose environments.

After startup, the backend container process tree must show the compiled Node application as PID 1 without persistent npm parent processes.

### 2. Enable graceful NestJS shutdown

Enable NestJS shutdown hooks during normal application bootstrap so termination signals are handled cleanly.

Do not change test-only module construction or introduce global signal listeners into Jest tests.

### 3. Hide the Express implementation header

Disable the Express:

```text
X-Powered-By
```

response header during application bootstrap.

Keep the implementation type-safe. Do not use `any`.

Verify that proxied API responses no longer contain the header.

### 4. Add basic Nginx security headers

Add appropriate security headers at the Nginx server level and apply them to successful and error responses.

Include at least:

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Add a restrictive Content Security Policy suitable for the current self-hosted React application.

The policy must allow:

- the application’s own scripts and styles;
- requests to the same-origin `/api` route;
- local weather-symbol rendering currently used by the application.

It must reject unnecessary external scripts, plugins, framing, and object content.

Document that the CSP may need an explicit update when Microsoft Entra External ID browser integration is implemented later.

Do not add unsafe wildcard origins.

Do not attempt to install third-party Nginx modules merely to remove the generic `Server: nginx` name. Keeping the version hidden with `server_tokens off` is sufficient.

### 5. Preserve existing behavior

The corrections must not break:

- React SPA fallback;
- `/api` proxy path preservation;
- OpenWeather location search;
- backend health checks;
- migration startup;
- database persistence;
- service health-gated startup;
- non-root runtime users;
- network separation;
- loopback-only frontend publication.

## Tests and validation

Run:

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
docker compose up --detach
```

Wait for all three services to become healthy.

Verify:

1. the backend application Node process is PID 1;
2. no persistent npm parent process remains in the backend container;
3. restarting the backend returns it to healthy;
4. restart logs do not report an npm lifecycle `SIGTERM` failure;
5. restart logs report that no migration is pending;
6. `http://127.0.0.1:8080/` returns the React application;
7. SPA fallback still works;
8. `/api/health` works through Nginx;
9. location search works through Nginx;
10. an unknown `/api` route remains a backend 404;
11. `X-Powered-By` is absent;
12. the required security headers are present;
13. the Content Security Policy is present;
14. the expected tables and migration record remain intact;
15. backend and PostgreSQL still have no published host ports;
16. real environment files remain ignored and untracked.

Do not display resolved secret values.

After successful validation, leave the healthy stack running for human review.

## Documentation

Update the README only where necessary to explain the security headers and the future Entra CSP consideration.

Create:

`docs/ai-interactions/009-container-runtime-hardening.md`

Update:

`docs/ai-interactions/README.md`

Follow all interaction-record requirements from `AGENTS.md`.

Include this prompt verbatim.

Set:

- Human Review: Pending
- Final Status: Awaiting human review

Before returning the final response:

1. prepare the complete final report;
2. store that exact report under `Model Response`;
3. return the identical report.

## Constraints

- Do not implement authentication.
- Do not implement forecast save/history endpoints.
- Do not change the database schema.
- Do not change image versions.
- Do not change the selected Azure architecture.
- Do not modify architecture diagrams.
- Do not provision Azure resources.
- Do not run Terraform.
- Do not create a Git commit or push changes.
- Do not inspect, print, copy, or modify real `.env` values.
- Do not delete the PostgreSQL volume.
- Do not delete unrelated Docker resources.
- Do not use `npm audit fix --force`.
- Keep all changes limited to the review findings above.

## Final response

Use the final-response format required by `AGENTS.md` and report:

1. Summary
2. Files changed
3. Validation performed
4. Container and process status
5. HTTP security-header verification
6. Security or dependency findings
7. Assumptions
8. Deferred work
9. Documentation status
````

## Model Response

## Summary

- Changed the backend image default to start the compiled application directly with Node, without migrations or an npm wrapper.
- Changed Compose startup to run the compiled TypeORM migration first and then `exec node apps/backend/dist/main.js`, so migration failure prevents startup and Node becomes PID 1.
- Enabled NestJS shutdown hooks and disabled Express `X-Powered-By` during typed application bootstrap.
- Added Nginx browser-security headers, including a restrictive same-origin Content Security Policy applied to successful and error responses.
- Preserved the established images, Compose topology, database schema, application behavior, Azure architecture, and architecture diagrams.

## Files changed

- `apps/backend/Dockerfile`
- `apps/backend/package.json`
- `apps/backend/src/main.ts`
- `apps/frontend/nginx.conf`
- `compose.yaml`
- `README.md`
- `docs/ai-interactions/README.md`
- `docs/ai-interactions/009-container-runtime-hardening.md`

## Validation performed

- `npm.cmd run build` — exit 0; backend and frontend production builds passed.
- `npm.cmd run lint` — exit 0; backend and frontend lint passed.
- `npm.cmd test` — exit 0; 7 backend suites/30 tests and 1 frontend suite/7 tests passed.
- `npm.cmd run format:check` — exit 0; all matched files use Prettier formatting.
- `npm.cmd audit` — exit 1 with 20 moderate findings in the Jest/ts-jest development dependency chain.
- `npm.cmd audit --omit=dev` — exit 0 with zero production vulnerabilities.
- `git diff --check` — exit 0; Git emitted only line-ending conversion warnings.
- `docker compose config --quiet` — exit 0 without rendering resolved configuration.
- `docker compose build` — exit 0; the hardened backend and frontend images built successfully.
- `docker compose up --detach` — exit 0; the final images were applied with health-gated startup.
- `docker compose restart backend` — exit 0; the backend returned to healthy.

## Container and process status

- PostgreSQL, backend, and frontend are running and healthy; the stack remains available at `http://127.0.0.1:8080`.
- Before and after backend restart, the process tree showed PID 1 as `node apps/backend/dist/main.js`; no persistent npm or shell parent process remained.
- Restart and final startup logs reported `No migrations are pending`, with zero migration-error and npm lifecycle `SIGTERM` failure matches.
- Read-only checks confirmed `saved_forecasts`, `typeorm_migrations`, and `users`, plus migration record `1760976000000|CreateDatabaseFoundation1760976000000`.
- Backend and PostgreSQL host port bindings remain empty. Only frontend port 8080 is published, on `127.0.0.1`.
- Database persistence, non-root image users, network separation, and health-gated startup remain unchanged.

## HTTP security-header verification

- The React root and SPA fallback returned HTTP 200.
- `/api/health` returned HTTP 200 through Nginx, a Tel Aviv location search returned normalized coordinates, and an unknown `/api` route remained a backend HTTP 404.
- `X-Powered-By` is absent from the proxied API response.
- Successful and error responses include:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- The Content Security Policy is present on successful and error responses. It permits same-origin scripts, styles, fonts, API connections, and local/data-image rendering while rejecting external defaults, object content, framing, frames, media, and workers.

## Security or dependency findings

- Real root and backend environment files remain ignored and untracked; their values were not inspected, printed, copied, modified, or committed.
- No dependency or image version was changed.
- The full audit's 20 moderate findings remain limited to the Jest/ts-jest development toolchain. The suggested forced remedy is breaking and was not applied; production dependencies report zero known vulnerabilities.
- The PostgreSQL named volume was preserved. No unrelated Docker resource was deleted or modified.

## Assumptions

- The current frontend requires no external script, style, font, frame, media, or worker origin; its weather symbols render locally and data images remain permitted.
- Microsoft Entra External ID integration will define the exact identity-provider origins needed before the CSP is explicitly extended.

## Deferred work

- Microsoft Entra External ID implementation and its CSP origins remain deferred.
- Authentication, forecast saving/history endpoints, Azure provisioning, Terraform, CI/CD, and distributed caching remain out of scope.

## Documentation status

- README now documents the baseline browser security headers and the requirement to review and explicitly extend CSP for future Entra integration without wildcard origins.
- Interaction 009 contains the exact prompt and this exact response and is indexed. Its Human Review is `Pending` and Final Status is `Awaiting human review`.
- Interaction 008 content and unrelated work were preserved. Architecture diagrams are unchanged.
- No Git commit or push was created; HEAD remains `f8ed6869597fb93bbb758d527783ec7df55ca136`.

## Files Changed

- Backend process startup and application bootstrap.
- Frontend Nginx security headers.
- README and AI interaction documentation.

## Validation

- Exact automated, container-process, migration, HTTP, persistence, network, and security-header results are recorded in the final response.

## Security Notes

- Node replaces the Compose startup shell after successful migrations and handles container signals as PID 1.
- Express implementation disclosure is disabled, while Nginx provides restrictive browser security headers on successful and error responses.
- Real environment values remain uninspected, unprinted, unmodified, and untracked.

## Assumptions

- The current frontend uses only same-origin scripts, styles, API requests, and local/data-image weather rendering, so it does not require external CSP origins.
- Microsoft Entra External ID browser integration will define its precise required origins before the CSP is extended.

## Deferred Work

- Authentication, forecast persistence/history APIs, Azure resources, Terraform, CI/CD, distributed caching, and Entra-specific CSP origins remain out of scope.

## Human Review

Approved by the human reviewer on 2026-10-20.

## Final Status

Approved
