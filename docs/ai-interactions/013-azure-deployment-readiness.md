# 013 - Azure Deployment Readiness

## Tool

Codex

## Model

GPT-5

## Date

2026-10-20

## Objective

Audit the approved Azure Terraform foundation and create a controlled future-deployment runbook without authenticating to Azure, connecting to a real backend, provisioning resources, creating costs, or handling real secrets.

## Relevant decisions

- Treat Interaction 013 as documentation and local validation only; actual Azure deployment remains deferred.
- Require explicit stop/go gates for state bootstrap, Azure context/capacity, cost, inputs, plan, apply, artifacts, secrets, migrations, health, Entra, and smoke tests.
- Record the production migration runner and Key Vault seeding network path as unresolved hard blockers rather than implying automation exists.
- Keep backend identifiers, variable values, state, secrets, and credentials out of source control and chat.
- Never use automatic destroy as rollback; preserve state/evidence and require reviewed recovery decisions.
- Do not modify the approved Interaction 012 record or any application/runtime configuration.

## Exact Prompt

```text
You are implementing Interaction 013: Azure deployment readiness review and controlled deployment runbook.

Repository:
C:\DevOps_Projects\Azure_weather_Project

Read and obey the repository-root AGENTS.md before taking any action.

Start by inspecting the repository, the approved Interaction 012 Terraform foundation, infrastructure documentation, application configuration contracts, Dockerfiles, Git status, and recent interaction records.

The branch should start clean and synchronized after commit `6387d77`. Preserve all unrelated user work.

Purpose
=======

Prepare the project for a future controlled Azure deployment without deploying or querying live Azure resources in this interaction.

This interaction is a readiness audit and runbook-writing step only. It must identify everything an operator must prepare, verify, approve, and execute before real Azure costs or changes are created.

Hard safety boundaries
======================

- Do not run Terraform plan, apply, destroy, import, refresh, or state-changing Terraform commands.
- Do not initialize or connect to a real remote Terraform backend.
- Do not run Azure CLI login, account, subscription, resource-group, quota, provider, SKU, resource, or deployment queries.
- Do not create, update, import, or delete any Azure resource.
- Do not create costs.
- Do not deploy the application.
- Do not build or push container images to a remote registry.
- Do not seed Key Vault secrets.
- Do not modify Microsoft Entra configuration.
- Do not run production database migrations.
- Do not inspect real `.env`, `.tfvars`, `backend.hcl`, Terraform state, credentials, passwords, API keys, tokens, connection strings, subscription IDs, or secret files.
- Do not request that the user paste secrets into chat, documentation, or committed files.
- Do not create a real `terraform.tfvars` or `backend.hcl`.
- Do not commit or push.
- Do not implement CI/CD yet.
- Do not modify application runtime behavior.
- Do not modify approved Interaction 012 except for links if genuinely required.

Readiness audit
===============

Review the approved Terraform configuration and document the exact future deployment prerequisites.

Cover at least:

1. Local tooling
   - Terraform version compatibility.
   - Azure CLI availability.
   - Docker availability.
   - Node.js and npm compatibility.
   - Explain which checks are local-only and which future checks require authenticated Azure access.

2. Azure context
   - Correct Azure tenant and subscription selection.
   - Existing resource-group name.
   - Sweden Central as the approved region.
   - Required provider registrations.
   - Permissions required by the deployment operator.
   - Required regional quotas and SKU/availability-zone checks.
   - Do not query any of these live in this interaction.

3. Terraform remote state
   - An existing, separately secured Azure Storage state backend is required.
   - Document required storage account/container capabilities.
   - Require Azure AD authentication and least-privilege RBAC.
   - Cover encryption, network access, soft delete/versioning, state locking and recovery.
   - Explain the bootstrap problem and provide a safe future bootstrap decision point.
   - Do not create bootstrap resources or a backend in this interaction.
   - Do not recommend committing `backend.hcl`, state files, or real backend identifiers.

4. Required Terraform inputs
   - Existing resource-group name.
   - Globally unique suffix.
   - Immutable backend image tag.
   - PostgreSQL administrator password supplied only through an approved local/secret mechanism.
   - Public Entra tenant/client IDs and OIDC URLs.
   - Network CIDRs and configurable production choices.
   - Clearly separate public identifiers from secrets.
   - Never include real values.

5. Cost approval gate
   - Identify the main qualitative cost drivers:
     - P0v3 App Service with two to four instances.
     - Zone-redundant General Purpose PostgreSQL.
     - Front Door Standard.
     - Log Analytics ingestion.
     - ACR, Storage and network usage.
   - Require a current Azure Pricing Calculator estimate and explicit human approval before deployment.
   - Do not invent or freeze exact prices.

6. Deployment dependencies and phases
   Design a controlled future sequence with explicit stop/go gates, including:

   - secure remote-state backend readiness;
   - authenticated Azure context verification;
   - reviewed untracked variable/backend files;
   - Terraform initialization against the approved backend;
   - future Terraform plan review;
   - explicit approval before apply;
   - infrastructure creation;
   - backend image build and immutable push to the created ACR;
   - out-of-band Key Vault secret seeding;
   - exactly-once, network-connected production migration execution;
   - App Service startup and health validation;
   - frontend production build and upload to `$web`;
   - Entra SPA redirect and post-logout URI update;
   - Front Door, authentication, API, history and security smoke tests.

   Account for the bootstrap condition that ACR, Key Vault and Storage are created by Terraform, so image push, secret seeding and frontend upload happen only after those resources exist.

7. Failure and rollback guidance
   - Stop immediately on failed plan review, apply errors, unresolved secret references, failed migrations, unhealthy origins, or authentication failures.
   - Never use `terraform destroy` as an automatic rollback.
   - Explain that database migrations require their own reviewed recovery decision.
   - Preserve Terraform state and diagnostic evidence.
   - Avoid exposing secrets in logs.
   - Include a cost-containment procedure that requires explicit human approval before scaling down or deleting anything.

8. Post-deployment verification
   - Front Door HTTPS behavior.
   - Static frontend delivery.
   - `/api/health`.
   - Direct App Service origin rejection.
   - Private PostgreSQL connectivity.
   - Key Vault reference resolution without printing values.
   - Managed-identity ACR pull.
   - Google and Microsoft authentication.
   - Per-user forecast history isolation.
   - Logging and monitoring.
   - No secrets in frontend assets or logs.

Documentation
=============

Create:

`docs/azure-deployment-readiness.md`

It must contain:

- scope and current status;
- prerequisites;
- operator inputs;
- public-versus-secret input classification;
- remote-state readiness;
- cost approval gate;
- phased deployment runbook;
- stop/go gates;
- failure and rollback guidance;
- post-deployment verification checklist;
- deferred CI/CD work;
- a prominent statement that Interaction 013 performs no Azure deployment.

Update the root README only if a concise link to this readiness document is useful. Do not mark Azure deployment as implemented.

AI interaction record
=====================

Create:

`docs/ai-interactions/013-azure-deployment-readiness.md`

Include:

- Tool: Codex
- Model
- Date
- Objective
- Relevant decisions
- This exact prompt
- Exact final model response
- Files changed
- Local validation performed
- Security notes
- Assumptions
- Deferred work
- Human Review: Pending
- Final Status: Awaiting human review

Add Interaction 013 to:

`docs/ai-interactions/README.md`

Local validation
================

Run only non-deploying local checks:

- `terraform fmt -check -recursive`
- `terraform init -backend=false`
- `terraform validate`
- `npm run build`
- `npm run lint`
- `npm test`
- `npm run format:check`
- `git diff --check`
- read-only Git status and diff inspection

You may run local version commands such as:

- `terraform version`
- `az version`
- `docker version`
- `node --version`
- `npm --version`

A missing or stopped tool must be reported truthfully and must not be installed, started, logged in, or repaired without approval.

Do not run Terraform plan or any authenticated Azure command.

Final response
==============

Report:

- readiness findings;
- files changed;
- local tool availability;
- validation results;
- operator inputs still required;
- live Azure checks deferred;
- deployment blockers and approval gates;
- confirmation that no Azure query, deployment, cost, secret operation, commit, or push occurred.

Keep Interaction 013 pending for independent senior review.
```

## Model Response

## Summary

Completed Interaction 013 as a documentation-only Azure deployment readiness audit and controlled future-deployment runbook.

The audit found that the Terraform foundation is locally valid but real deployment is not yet authorized or operationally ready. Hard gates remain for a secured remote-state bootstrap, authenticated tenant/subscription/provider/quota/SKU checks, a current cost estimate and human approval, an approved Docker build environment, a network-reachable Key Vault seeding path, and a separately reviewed exactly-once production migration runner.

The runbook defines 12 gated phases covering release approval, state bootstrap, Azure context, inputs/artifacts, future plan review, explicit apply approval, infrastructure bootstrap, artifact/secret deployment, one-shot migrations, backend health, frontend upload, Entra redirects, and end-to-end handoff. It also documents stop conditions, evidence preservation, database-specific recovery decisions, and human-approved cost containment without automatic destroy.

## Files changed

- `docs/azure-deployment-readiness.md` — added the readiness findings, prerequisites, permissions, public/secret input classification, state bootstrap requirements, cost gate, phased runbook, failure/rollback guidance, verification checklist, and deferred CI/CD scope.
- `docs/ai-interactions/013-azure-deployment-readiness.md` — recorded the exact prompt, this exact response, decisions, validation, security notes, assumptions, and deferred work.
- `docs/ai-interactions/README.md` — indexed Interaction 013.
- `README.md` — added a concise link to the readiness runbook while leaving actual Azure provisioning deferred.

Interaction 012, Terraform/application runtime files, Dockerfiles, dependencies, architecture images, and environment files were not modified.

## Local tool availability

- Terraform `1.15.6` is installed and satisfies the repository constraint `>= 1.10.0, < 2.0.0`; AzureRM remains locked to `5.10.0`.
- Azure CLI `2.91.0` is installed. The default version probe could not access the local Azure profile because of filesystem permissions; an isolated empty config returned the version without login or account/subscription access. Authentication and Azure context remain unverified.
- Docker client `29.2.1` is installed, but its config/daemon API was inaccessible in this environment. Remote image build/push readiness is therefore blocked until an approved build environment is available.
- Node.js `24.15.0` and npm `11.12.1` are installed. Local checks pass, but reproducible release builds should use the repository's Node 22 baseline and pinned Node 22 container images.

## Validation performed

- `terraform fmt -check -recursive` — exit 0.
- First sandboxed `terraform init -backend=false` — exit 1 because provider-registry network access was blocked. The approved retry reused the locked, installed AzureRM `v5.10.0` provider and exited 0. No real backend was configured or contacted.
- `terraform validate` — exit 0; configuration valid.
- `npm.cmd run build` — exit 0; backend and frontend production builds passed.
- `npm.cmd run lint` — exit 0; backend and frontend lint passed with zero warnings.
- `npm.cmd test` — exit 0; 13 backend suites/87 tests and 1 frontend suite/19 tests passed (106 total).
- `npm.cmd run format:check` — exit 0.
- `git diff --check` — exit 0, with only LF-to-CRLF working-tree warnings for the two modified tracked Markdown files.
- Final status/diff inspection confirmed only the four documentation/index files listed above changed and Interaction 012 remained untouched.

## Operator inputs and live checks still required

A future operator must supply reviewed, untracked backend and variable configuration: the existing resource-group name, globally unique suffix, immutable non-`latest` image tag, approved PostgreSQL password injection, public Entra tenant/client/issuer/metadata values, non-overlapping network CIDRs, cost-affecting SKU/storage/retention/autoscale choices, stable secret names, tags, and public frontend `VITE_ENTRA_*` settings. Real values must not be committed or pasted into chat.

Authenticated Azure checks remain deferred for tenant/subscription/resource-group context, Sweden Central provider registration and regional capacity, P0v3 and PostgreSQL HA/SKU support, quotas, permissions, global-name availability, CIDR compatibility, state-backend access, and post-deployment health/diagnostics.

## Deployment blockers and approval gates

Deployment must not proceed until:

- an independently governed Azure Storage state backend has Azure AD-only least-privilege access, restricted networking, encryption, versioning/soft delete, lease locking, logging, and tested recovery;
- the bootstrap approach and state-recovery owner are explicitly approved;
- a current Azure Pricing Calculator estimate covers P0v3 at two-to-four instances, zone-redundant General Purpose PostgreSQL, Front Door Standard, monitoring ingestion, ACR, Storage, and network usage, with explicit human cost approval;
- the deployment identity has scoped resource permissions plus separate role-assignment capability, and temporary AcrPush/secret-write/blob-upload duties are owned and time-bounded;
- an approved network path exists for Key Vault secret seeding;
- a one-shot runner can privately resolve/reach PostgreSQL and execute migrations exactly once before production traffic;
- the Docker build environment, immutable artifact provenance, secret mechanism, Entra operator, smoke-test identities, rollback decision-maker, and deployment window are ready.

Any failed plan review, apply error, unresolved secret reference, migration failure, unhealthy origin, authentication failure, isolation failure, secret exposure, or lingering elevation is a stop condition. `terraform destroy` is never an automatic rollback, and cost-driven scale-down or deletion requires explicit human approval.

## Assumptions and deferred work

The existing Azure resource group and Entra External ID registrations remain externally managed. The future state backend is created by an independent approved process. Production database recovery, migration rollback/forward-fix decisions, and temporary-role removal have named human owners before deployment.

CI/CD, remote-state bootstrap resources, Azure authentication/capacity validation, real plan/apply, image push, Key Vault seeding, the production migration runner, frontend upload, Entra updates, custom domains/certificates, live smoke tests, and cost controls remain deferred.

## Documentation status

The readiness runbook is linked from the root README, and Interaction 013 is indexed. Interaction 013 remains `Human Review: Pending` and `Final Status: Awaiting human review`; no approval was recorded.

No Terraform plan, apply, destroy, import, refresh, or real-backend initialization ran. No Azure login/account/resource query or mutation ran, no resource was deployed, no cost was created, no image was pushed, no secret was read/seeded/requested, no Entra setting or production database was changed, and no commit or push occurred.

## Files Changed

- Added `docs/azure-deployment-readiness.md` and this Interaction 013 record.
- Updated the root README with a readiness-runbook link and indexed Interaction 013.
- No Terraform, application/runtime, Docker, dependency, architecture-image, environment, or approved Interaction 012 file changed.

## Local Validation Performed

- Local versions: Terraform 1.15.6, Azure CLI 2.91.0 through an isolated empty config, Docker client 29.2.1 with inaccessible daemon, Node.js 24.15.0, npm 11.12.1.
- Terraform format check, backend-disabled initialization, and validation passed after an approved retry for sandboxed provider-registry access.
- Application build, lint, 106 tests, formatting, and diff whitespace checks passed.
- Read-only Git inspection confirmed the branch started clean at `6387d77` and the final diff is documentation-only.

## Security Notes

- No Azure authentication, context/resource query, real backend, state, real variable file, secret, credential, token, subscription ID, or live resource was accessed.
- Public identifiers, operational identifiers, and secrets are classified separately; the PostgreSQL password state caveat remains explicit.
- The runbook requires least privilege, network controls, secret-safe evidence, exactly-once migrations, and no automatic destroy rollback.

## Assumptions

- Existing Azure resource-group and Entra systems remain externally managed.
- A future operator will obtain independent state-bootstrap, cost, Azure-capacity, secret-path, migration-runner, and deployment approvals.
- Release builds use the Node 22 baseline even though local non-release validation ran successfully on Node 24.

## Deferred Work

- All authenticated Azure checks, remote-state provisioning/initialization, plan/apply, deployment, and live verification.
- CI/CD, image push, secret seeding, production migration runner, frontend upload, Entra updates, custom domains/certificates, and cost/monitoring operations.
- Independent senior review and approval of Interaction 013.

## Human Review

Approved after senior review

## Final Status

Approved
