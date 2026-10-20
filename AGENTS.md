# AGENTS.md

## Purpose

This repository contains an Azure DevOps take-home project for a secure, highly available, globally accessible weather web application.

All changes must be incremental, reviewable, tested, and documented. Do not make unrelated changes.

## Working Method

Before changing files:

1. Read this file completely.
2. Inspect the current repository structure.
3. Read the relevant existing code and documentation.
4. Check the current Git status.
5. Preserve unrelated user changes.

If a requested change requires a new architectural decision, do not choose silently. Explain the relevant options, trade-offs, and recommendation, then wait for the user’s decision.

Do not create commits, push changes, rewrite Git history, provision cloud resources, or modify external systems unless the current prompt explicitly requests it.

## Repository Structure

Use the following structure:

```text
apps/
  frontend/
  backend/

infra/
  terraform/

docs/
  ai-interactions/
```

Do not rename or reorganize these directories without explicit approval.

## Fixed Technology Decisions

### Frontend

- React
- TypeScript
- Vite
- Static production build
- Hosted in Azure Storage Static Website
- Delivered globally through Azure Front Door

The frontend may run in a container for local development and integration testing, but its production output is deployed as static files.

Never expose private API keys, database credentials, client secrets, or privileged tokens to frontend code.

### Backend

- NestJS
- TypeScript
- Strict TypeScript configuration
- REST endpoints under `/api`
- Containerized for local and production deployment
- Production image stored in Azure Container Registry
- Production container hosted by Azure App Service

The backend is responsible for:

- communicating with OpenWeatherMap
- protecting the OpenWeatherMap API key
- validating authenticated users
- applying authorization rules
- reading and writing application data
- validating external and user-controlled input
- returning safe error responses

### Database

- PostgreSQL
- Local PostgreSQL runs through Docker Compose
- Production uses Azure Database for PostgreSQL Flexible Server
- Production database access is private
- Production high availability is zone-redundant

Use relational columns for searchable and structured data. Use PostgreSQL `JSONB` only for suitable nested data, such as a saved weather forecast snapshot.

A saved forecast is historical data. Saving a new forecast must create a new record and must not silently overwrite an older saved forecast.

### Authentication

Use Microsoft Entra External ID.

Supported identity providers:

- Microsoft Account
- Google

Do not implement local password storage.

Store only the minimum identity information required by the application, such as:

- external subject identifier
- identity provider
- display name
- required timestamps

The backend must derive the user identity from a validated access token. Never trust a user identifier supplied directly by the frontend.

### Local Containers

The local Docker Compose environment will contain:

- frontend
- backend
- PostgreSQL

Use health checks and persistent PostgreSQL storage.

The complete local environment should eventually start with:

```bash
docker compose up
```

Do not assume that the Docker Compose topology is identical to the Azure production topology.

### Azure Infrastructure

The selected primary Azure region is:

```text
Sweden Central
```

The planned production architecture includes:

- Azure Front Door
- Azure Storage Static Website
- Azure Container Registry
- Azure App Service
- two active App Service instances
- availability-zone redundancy
- autoscaling with a minimum of 2 and maximum of 4 instances
- Azure Database for PostgreSQL Flexible Server
- zone-redundant PostgreSQL high availability
- virtual network integration
- private database connectivity
- Azure Key Vault
- Azure Monitor and Application Insights
- Microsoft Entra External ID

Terraform code belongs under:

```text
infra/terraform
```

The actual cost-focused deployment uses Azure Front Door Standard.

The architecture documentation should also describe Azure Front Door Premium as the security-focused alternative. Do not deploy both profiles simultaneously.

Do not introduce Azure Kubernetes Service unless an explicit new architectural decision approves it.

## Security Rules

- Never commit secrets, passwords, API keys, access tokens, connection strings, certificates, or private keys.
- Use environment variables for local configuration.
- Commit only safe `.env.example` files.
- Use Azure Key Vault for production secrets.
- Do not log secrets or complete authentication tokens.
- Do not return sensitive internal errors to clients.
- Validate all external input.
- Use least-privilege access.
- Prefer managed identities over stored Azure credentials.
- Keep PostgreSQL inaccessible from the public internet.
- Keep the OpenWeatherMap API key in the backend only.
- Store the minimum personal information required.
- Use UTC for persisted timestamps.
- Do not run destructive commands without explicit approval.
- Do not use `npm audit fix --force`.

## Coding Rules

- Keep changes focused on the current task.
- Prefer simple and maintainable solutions.
- Avoid premature abstractions.
- Avoid duplicated business logic.
- Use clear names.
- Keep controllers thin.
- Place business logic in services.
- Separate external API clients from business logic.
- Separate database access from HTTP controllers.
- Validate configuration during application startup.
- Handle asynchronous failures explicitly.
- Maintain strict TypeScript type safety.
- Do not use `any` without a documented reason.
- Do not leave unexplained TODO comments.
- Do not add dependencies when the platform or existing dependencies already provide a clear solution.
- Keep production dependencies separate from development dependencies.

## API Rules

- Keep application endpoints under `/api`.
- Preserve `GET /api/health`.
- Use consistent HTTP status codes.
- Use consistent error-response structures.
- Do not expose stack traces in production responses.
- Design write operations so retries do not accidentally create unexpected results where idempotency is required.
- Add rate limiting or caching where appropriate for the external weather API.
- Never allow the frontend to call OpenWeatherMap with a private API key.

## Testing and Validation

Every implementation task must run the checks relevant to its changes.

The standard checks are:

```bash
npm run build
npm run lint
npm test
npm run format:check
```

When dependencies change, also run:

```bash
npm audit
npm audit --omit=dev
```

When containers change, also validate:

```bash
docker compose config
docker compose build
```

Run appropriate container health and connectivity tests when possible.

When Terraform changes, run:

```bash
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
```

Do not report a check as passed unless it was actually executed successfully.

If a check cannot run, report:

- the exact command
- the reason it could not run
- whether the limitation is environmental or caused by the code

Fix errors caused by the current changes before finishing.

## Dependency Policy

- Use versions compatible with Node.js 22.
- Keep the lock file synchronized with package manifests.
- Do not edit the lock file manually.
- Do not apply forced or breaking dependency upgrades merely to remove an audit warning.
- Distinguish production vulnerabilities from development-only vulnerabilities.
- Document accepted development-tooling risks accurately.
- Do not claim that a vulnerability is harmless without evidence.

## Infrastructure Rules

- Use Terraform for Azure infrastructure.
- Do not hard-code subscription IDs, tenant IDs, passwords, secrets, or environment-specific credentials.
- Use variables, locals, and outputs deliberately.
- Use deterministic naming.
- Apply consistent resource tags.
- Keep production secrets out of Terraform state whenever possible.
- Use secure defaults.
- Document cost-impacting options.
- Do not run `terraform apply` unless explicitly requested.
- Do not run `terraform destroy` unless explicitly requested.
- Do not change the selected region or availability design without an architectural decision.

## Documentation Rules

Keep documentation synchronized with the implementation.

Do not modify or delete architecture diagrams unless the task explicitly requires diagram changes.

Document important:

- architectural decisions
- security decisions
- cost trade-offs
- operational assumptions
- manual Azure configuration
- limitations
- deferred work

Do not claim that a feature exists merely because it appears in an architecture diagram.

## AI Interaction Log

Every user-authorized implementation prompt must have a numbered record under:

```text
docs/ai-interactions
```

Use a descriptive filename such as:

```text
003-database-foundation.md
```

Each interaction record must include:

1. Title
2. Tool
3. Model
4. Date
5. Objective
6. Relevant decisions
7. Exact Prompt
8. Model Response
9. Files Changed
10. Validation
11. Security Notes
12. Assumptions
13. Deferred Work
14. Human Review
15. Final Status

Rules:

- Store the implementation prompt verbatim.
- Store the final model response verbatim.
- Never rewrite an older prompt or model response.
- Record follow-up corrections as review notes or new numbered interactions.
- Do not invent model names, commands, test results, or review outcomes.
- If the model name is unavailable, use `Not exposed by the client`.
- Set `Human Review` to `Pending`.
- Set `Final Status` to `Awaiting human review`.
- Only the human reviewer may approve an interaction.
- Update `docs/ai-interactions/README.md` with a link to every new record.

Before returning the final response:

1. Prepare the final report.
2. Save that exact report under `Model Response`.
3. Return the same report to the user.

## Final Response Format

Unless the current prompt requires something different, report:

1. Summary
2. Files changed
3. Validation performed
4. Security or dependency findings
5. Assumptions
6. Deferred work
7. Documentation status

Keep the report factual and concise.
