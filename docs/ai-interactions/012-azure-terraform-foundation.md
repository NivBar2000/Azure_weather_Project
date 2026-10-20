# 012 - Azure Terraform Foundation

## Tool

Codex

## Model

GPT-5

## Date

2026-10-20

## Objective

Create a production-oriented, reviewable Terraform foundation for the approved Sweden Central Azure architecture without deploying or querying live Azure resources.

## Relevant decisions

- Read the existing resource group as a data source; do not create or import it.
- Deploy only the cost-focused Front Door Standard design; document Premium with Private Link and managed WAF as the stronger alternative.
- Keep PostgreSQL private and zone redundant; integrate App Service through a separate delegated subnet.
- Use a system-assigned App Service identity for ACR pull and least-privilege Key Vault secret reads.
- Keep secret values out of Terraform resources except for the Azure-required sensitive PostgreSQL administrator password input, which can enter state.
- Keep frontend artifacts, backend image build/push, secret seeding, Entra changes, CI/CD, and all Azure deployment activity out of this interaction.

## Exact Prompt

```text
You are implementing Interaction 012: production Azure infrastructure as code with Terraform.

Repository:
C:\DevOps_Projects\Azure_weather_Project

Read and obey the repository-root AGENTS.md before taking any action.
Inspect the current repository, architecture documents, application configuration, Dockerfiles, Git status, and previous interaction records.

The working tree should start clean after the approved and pushed interactions 008-011. Preserve all unrelated user work.

Hard safety boundaries
======================

- Do not run terraform plan, apply, destroy, import, refresh, or any command that reads or changes live Azure resources.
- Do not run Azure CLI commands that create, modify, delete, import, or query live resources.
- Do not provision anything.
- Do not create costs.
- Do not commit or push.
- Do not modify the real .env file.
- Do not request, inspect, print, generate, store, or commit real credentials, passwords, API keys, tokens, certificates, connection strings, subscription IDs, or secrets.
- Do not add real secrets to Terraform variables, tfvars examples, outputs, documentation, command output, or tests.
- Do not modify the existing architecture image files.
- Do not implement CI/CD in this interaction.
- Do not change application runtime behavior unless a small configuration/documentation correction is strictly required by the Terraform contract.

Goal
====

Create a production-oriented, reviewable Terraform foundation under:

infra/terraform

The configuration must represent the approved Azure architecture without deploying it.

Approved production architecture
================================

Primary region:
- Sweden Central
- Terraform location value: swedencentral

Existing external systems:
- Microsoft Entra External ID tenant and app registrations are configured manually and are not created by this Terraform configuration.
- Google and Microsoft Account federation are configured manually.
- OpenWeather is an external API.
- The Azure resource group already exists and is supplied as a Terraform variable/data source. Do not attempt to create or import it in this interaction.

Frontend:
- React/Vite static production build
- Azure Storage Static Website
- Delivered through Azure Front Door Standard
- Front Door Premium must be documented as the security-focused Private Link/WAF alternative, but must not be deployed at the same time as Standard

Backend:
- Existing NestJS Linux container
- Image stored in Azure Container Registry
- Hosted by Azure Linux App Service
- App Service plan: Premium v3, default SKU P0v3
- Zone balancing enabled
- Minimum two active instances
- Autoscale from two through four instances
- Scale-out and scale-in based on defensible CPU thresholds
- Health endpoint: /api/health
- System-assigned managed identity
- ACR pull through managed identity
- Public backend origin restricted to Azure Front Door rather than generally open internet access
- HTTPS only, TLS 1.2 or newer, HTTP/2, client affinity disabled, FTP disabled
- Backend container listens on port 3000

Database:
- Azure Database for PostgreSQL Flexible Server
- Supported PostgreSQL version appropriate for the current AzureRM provider
- General Purpose production SKU compatible with zone-redundant high availability
- Zone-redundant HA enabled
- Private network access only
- Delegated PostgreSQL subnet
- Private DNS
- No public database access
- One application database
- Seven-day backup retention by default
- Geo-redundant backup disabled by default as a documented cost decision
- Storage sized conservatively but configurable
- Prevent accidental destructive replacement where practical

Networking:
- One virtual network in Sweden Central
- Separate App Service integration subnet
- Separate delegated PostgreSQL subnet
- Include any subnet required for private endpoints only if actually used
- App Service regional VNet integration
- PostgreSQL reachable privately from App Service
- Network address spaces configurable and non-overlapping
- Appropriate subnet delegation and service endpoints
- Private DNS zone linked to the VNet

Secrets:
- Azure Key Vault with RBAC authorization
- Soft-delete and purge protection enabled
- App Service system identity receives only the minimum Key Vault secret-reading role
- App settings use Key Vault references for:
  - OpenWeather API key
  - production database password
- Use stable configurable secret names, not secret values
- Do not create OpenWeather or database-password secret values in Terraform
- Document the required out-of-band secret-seeding step
- PostgreSQL administrator password must be a required sensitive Terraform input because the Azure resource requires it
- Never output this password
- Document accurately that the PostgreSQL administrator password can still enter Terraform state through the Azure resource and therefore production state must use an encrypted, access-controlled remote backend
- Do not claim Terraform sensitive variables keep values out of state

Container registry:
- Azure Container Registry
- Default to a cost-conscious SKU suitable for the exercise
- Admin user disabled
- App Service pulls through managed identity and AcrPull RBAC
- Backend image repository and immutable image tag are variables
- Reject empty tags and discourage/reject mutable latest
- Do not build or push an image in this interaction
- Document that private ACR networking requires Premium SKU and is a future security/cost option if not implemented

Monitoring:
- Log Analytics workspace
- Application Insights connected to the workspace
- Configurable log retention
- App Service receives the Application Insights connection string
- Diagnostic settings for important supported resources where useful and not excessively noisy
- Alerts are not required unless they can be added without inventing notification destinations

Front Door routing
==================

Deploy only Azure Front Door Standard in the Terraform configuration.

Configure:
- One Front Door profile
- One endpoint
- Storage static website origin group and origin
- Backend App Service origin group and origin
- A frontend route for static application content
- A higher-priority /api/* route to App Service
- No caching for /api/*
- Static asset caching/compression where appropriate
- Backend health probe using /api/health
- HTTPS redirect
- Supported forwarding protocols and safe defaults

Origin security:
- Restrict App Service access to the AzureFrontDoor.Backend service tag.
- Also validate/restrict the X-Azure-FDID header to the created Front Door profile ID using supported App Service access-restriction configuration.
- Ensure the App Service SCM endpoint is not accidentally exposed by copying an unsuitable restriction without analysis.
- Explain that Front Door Standard cannot provide Private Link origin connectivity.
- Explain that the Storage static website origin remains publicly reachable with the Standard cost-focused design.
- Document Front Door Premium with Private Link and managed WAF as the stronger security alternative.
- Do not deploy both Standard and Premium.
- Do not create a custom domain or certificate without user-provided domain information.

Avoid Terraform dependency cycles:
- It is acceptable for App Service configuration to reference the independently created Front Door endpoint hostname.
- Front Door origins/routes may then depend on the App Service and Storage resources.
- Check the dependency graph carefully.

Frontend authentication deployment consideration:
- Output the generated Front Door endpoint URL.
- Document that this production URL must later be added manually to the Entra SPA redirect URIs and post-logout redirect configuration.
- Do not modify Entra in this interaction.

Terraform structure
===================

Use a clear root-module layout such as:

infra/terraform/
  versions.tf
  providers.tf
  variables.tf
  locals.tf
  data.tf
  networking.tf
  container-registry.tf
  key-vault.tf
  database.tf
  app-service.tf
  monitoring.tf
  storage.tf
  front-door.tf
  outputs.tf
  terraform.tfvars.example
  backend.hcl.example
  README.md

Adjust filenames only when a clearer maintainable structure is justified.

Requirements:
- Pin Terraform and provider version ranges deliberately.
- Generate and commit the provider lock file through Terraform tooling if possible.
- Use the AzureRM provider and only additional providers that are genuinely necessary.
- Use an empty azurerm backend block suitable for backend config supplied during init.
- Do not hardcode a subscription ID or tenant ID.
- Do not hardcode the existing resource-group name.
- Use data.azurerm_resource_group for the supplied existing resource group.
- Use variables with descriptions, types, validation, safe defaults, and sensitivity flags.
- Use locals for deterministic normalized naming.
- Require a short globally unique suffix variable for globally scoped resource names.
- Apply consistent tags.
- Do not use random naming that changes across runs.
- Do not use provisioners or local-exec.
- Do not use null_resource.
- Avoid unnecessary modules or abstractions for this project-sized deployment.
- Add lifecycle protections where justified, but do not make normal maintenance impossible.
- Use explicit dependencies only when Terraform cannot infer them.
- Do not expose secret-bearing outputs.
- Mark potentially sensitive outputs accurately.
- Ensure outputs are operationally useful.

Naming inputs should support:
- project name
- environment
- globally unique suffix
- existing resource-group name

Provide safe placeholder examples only.

Application configuration contract
==================================

Map the existing backend’s required production settings without changing their meaning:

- NODE_ENV=production
- PORT=3000
- FRONTEND_ORIGIN using the Front Door endpoint hostname
- OPENWEATHER_API_KEY using a Key Vault reference
- DATABASE_HOST using the PostgreSQL private FQDN
- DATABASE_PORT=5432
- DATABASE_USER using the configured PostgreSQL administrator login
- DATABASE_PASSWORD using a Key Vault reference
- DATABASE_NAME
- DATABASE_SSL=true
- ENTRA_TENANT_ID
- ENTRA_API_CLIENT_ID
- ENTRA_ALLOWED_CLIENT_ID
- ENTRA_OIDC_METADATA_URL
- ENTRA_EXPECTED_ISSUER
- ENTRA_REQUIRED_SCOPE=access_as_user

Treat Entra IDs and URLs as public configuration, but keep them as variables because they are environment-specific.

Use the existing production container startup behavior so TypeORM migrations run before the NestJS process. Do not place a shell command containing secret values in Terraform.

The Front Door URL is produced by Terraform and may be used as FRONTEND_ORIGIN without creating a dependency cycle. Verify this in the resource graph.

Storage requirements
====================

- Globally unique storage account name derived from normalized inputs.
- Secure transfer required.
- Minimum TLS 1.2.
- Shared public blob-container access disabled.
- Static website enabled with index.html and an SPA-compatible error document.
- The static website endpoint must remain usable as the Front Door Standard origin.
- Do not upload frontend build files with Terraform.
- Document the later deployment step that uploads apps/frontend/dist.
- Do not store build artifacts in Terraform state.

Cost and security documentation
===============================

Create or update a focused document such as:

docs/azure-infrastructure.md

Document:
- Each provisioned component and why it exists.
- The traffic flow from user to Front Door to frontend/API.
- Private database flow.
- Managed identity and RBAC flows.
- Secret flow through Key Vault references.
- Remote state security.
- Required manual prerequisites.
- Deployment order.
- Post-deployment Entra redirect URI update.
- Frontend artifact upload and backend image push as later CI/CD responsibilities.
- Qualitative cost drivers without inventing exact prices.
- P0v3 with 2-4 instances and zone-redundant PostgreSQL are the primary cost drivers.
- Front Door Standard is the selected cost-focused option.
- Front Door Premium plus Private Link/WAF is the stronger, higher-cost alternative.
- ACR Basic is cost-focused; Premium is required for private endpoints.
- Storage static website remains publicly reachable behind Standard.
- PostgreSQL geo-redundant backup is off by default for cost control.
- No resource has been deployed by Interaction 012.

Update README:
- Terraform code becomes Implemented.
- Actual Azure provisioning remains Deferred.
- Add safe validation instructions.
- Link the infrastructure document.
- Do not claim Azure resources exist.

Validation
==========

Verify current AzureRM provider resource arguments against current official Terraform Registry or Microsoft documentation before finalizing. Do not guess unsupported schema fields.

Run only local, non-deploying checks:

1. terraform fmt -recursive
2. terraform fmt -check -recursive
3. terraform init -backend=false
4. terraform validate

Also run:
- npm run build
- npm run lint
- npm test
- npm run format:check
- git diff --check

Do not run:
- terraform plan
- terraform apply
- terraform destroy
- terraform import
- terraform refresh
- Azure deployment commands

If Terraform is unavailable:
- Report it truthfully.
- Do not download or install software without approval.
- Still inspect the files carefully.
- Do not claim validation passed.

If provider download is blocked by the sandbox or network:
- Retry only through the normal approval mechanism.
- Do not work around security restrictions.
- Record the exact limitation.

AI interaction record
=====================

Create and index:

docs/ai-interactions/012-azure-terraform-foundation.md

Follow the existing interaction format.

Include:
- objective;
- relevant approved architecture decisions;
- the exact full prompt;
- exact final model response;
- files changed;
- Terraform validation results;
- application regression results;
- security decisions;
- cost decisions;
- assumptions;
- manual prerequisites;
- deferred work;
- Human Review: Pending;
- Final Status: Awaiting human review.

Before returning:
1. Prepare the exact final response.
2. Save it verbatim under Model Response.
3. Return the same response to the user.

Final response
==============

Return a concise but complete report containing:
- Terraform components created;
- important topology and dependency decisions;
- security controls;
- cost trade-offs;
- files changed;
- exact Terraform validation results;
- exact application regression results;
- variables requiring operator input;
- remote-state and secret-state caveats;
- manual prerequisites;
- what was deliberately not deployed;
- deferred CI/CD and deployment work;
- confirmation that no plan/apply/destroy/import/refresh ran;
- confirmation that no Azure resource was changed;
- confirmation that no real secret or credential was stored;
- confirmation that no commit or push occurred.
```

## Model Response

## Summary

Implemented Interaction 012 as a local, production-oriented Terraform foundation for the approved Sweden Central architecture.

- Defined an existing-resource-group data source, VNet with separate delegated App Service/PostgreSQL subnets, private PostgreSQL DNS, ACR, Key Vault, PostgreSQL Flexible Server/database, Premium v3 Linux App Service, CPU autoscale, Storage Static Website, Front Door Standard, Log Analytics, Application Insights, diagnostic settings, RBAC, and operational outputs.
- App Service starts with two zone-balanced P0v3 workers and scales from 2-4 at 70%/30% CPU thresholds. PostgreSQL 17 defaults to General Purpose, zone-redundant HA, private-only access, 32 GiB configurable storage, seven-day backups, and geo-redundant backup disabled.
- Front Door uses a non-cached, more-specific `/api/*` route to App Service and a compressed `/*` route to Storage. The profile/endpoint are created before App Service consumes the endpoint hostname and profile GUID; origins/routes then depend on App Service and Storage, avoiding a dependency cycle.

## Security and cost decisions

- App Service's main endpoint denies unmatched traffic and allows only `AzureFrontDoor.Backend` traffic carrying the created profile's `X-Azure-FDID`. SCM is separately deny-by-default and does not inherit an unsuitable Front Door rule.
- PostgreSQL has no public network access. App Service uses regional VNet integration and private DNS.
- The system identity receives only `AcrPull` and `Key Vault Secrets User` at the relevant resource scopes. ACR admin access is disabled. Key Vault uses RBAC, purge protection, soft delete, and subnet-restricted access.
- OpenWeather and database-password settings are versionless Key Vault references. Terraform creates no secret values. The required PostgreSQL administrator password is sensitive, but can still enter Terraform state; production requires an encrypted, access-controlled remote Azure Storage backend. Sensitive variables do not keep values out of state.
- P0v3 at 2-4 instances and zone-redundant General Purpose PostgreSQL are the main cost drivers. Front Door Standard, ACR Basic, LRS storage, and disabled geo-redundant database backup are the cost-focused defaults. Front Door Premium with Private Link/managed WAF and ACR Premium/private endpoints are documented stronger, higher-cost alternatives, not co-deployed options.
- The schema was checked against current official [AzureRM Linux Web App](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app), [Front Door route](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_route), [PostgreSQL Flexible Server](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server), and [App Service access-restriction](https://learn.microsoft.com/en-us/azure/app-service/app-service-ip-restrictions) documentation.

## Files changed

- Added 18 Terraform files under `infra/terraform`, including the AzureRM 5.10.0 lock file, safe variable/backend examples, and Terraform operating documentation; removed the replaced `.gitkeep`.
- Added `docs/azure-infrastructure.md` and `docs/ai-interactions/012-azure-terraform-foundation.md`.
- Updated `.gitignore`, the root `README.md`, and the AI-interaction index.
- No application runtime code, dependency manifest, lock file for npm, architecture image, real `.env`, or existing interaction record was changed.

## Validation performed

- `terraform fmt -recursive` - exit 0.
- `terraform fmt -check -recursive` - exit 0.
- First sandboxed `terraform init -backend=false` - exit 1 because registry network access was blocked. The approved retry succeeded, installed/pinned AzureRM `v5.10.0`, and generated `.terraform.lock.hcl`. The final approved rerun reused that locked provider and exited 0.
- `terraform validate` - exit 0: configuration valid.
- `npm.cmd run build` - exit 0; backend and frontend production builds passed.
- `npm.cmd run lint` - exit 0; backend and frontend lint passed with zero warnings.
- `npm.cmd test` - exit 0; 13 backend suites/87 tests and 1 frontend suite/19 tests passed (106 total).
- Initial `npm.cmd run format:check` - exit 1 for the new infrastructure document only; it was formatted. Final `npm.cmd run format:check` - exit 0.
- `git diff --check` - exit 0, with only working-tree LF-to-CRLF conversion warnings.
- No dependency changed, so npm audit and container rebuild checks were not required.

## Required operator inputs and prerequisites

Required environment inputs are the existing resource-group name, globally unique suffix, immutable non-`latest` backend image tag, PostgreSQL administrator password, and public Entra tenant/client IDs plus OIDC metadata/issuer URLs. Project/environment names, SKU/storage/retention settings, network CIDRs, database name, and stable secret names have reviewed defaults but remain configurable.

Before a future authorized deployment, an operator must prepare the secured remote-state backend, confirm providers/quotas/SKU and zone availability, supply untracked variable/backend files, push the immutable backend image, seed both Key Vault secrets through an approved network path, upload `apps/frontend/dist` to `$web`, grant the uploader least-privilege blob access, and add the generated Front Door URL to Entra SPA redirect and post-logout redirect URIs.

## Assumptions and deferred work

- The existing resource group and Entra External ID configuration remain externally managed.
- The database password seeded in Key Vault will exactly match the password supplied to PostgreSQL through Terraform.
- Secret seeding, image push, frontend build/upload, real deployment validation, custom domain/certificate setup, alert destinations, CI/CD, Front Door Premium/Private Link/WAF, ACR private networking, and distributed caching remain deferred.

## Documentation status

The root README now marks Terraform code as implemented and actual Azure provisioning as deferred. The focused infrastructure document records topology, traffic/identity/secret flows, cost/security trade-offs, state caveats, manual prerequisites, deployment order, and limitations. Interaction 012 contains the exact prompt and this exact response, is indexed, and remains `Human Review: Pending` / `Final Status: Awaiting human review`.

No Terraform plan, apply, destroy, import, or refresh command ran. No Azure CLI command ran, no live Azure resource was queried or changed, no external configuration was modified, no cost was created, no real secret/credential/subscription ID was requested or stored, and no commit or push occurred.

## Files Changed

- Added the complete `infra/terraform` root module, examples, lock file, and README; removed its placeholder `.gitkeep`.
- Added `docs/azure-infrastructure.md` and this Interaction 012 record.
- Updated `.gitignore`, `README.md`, and `docs/ai-interactions/README.md`.
- No application runtime, npm dependency, architecture image, real environment file, or older interaction record changed.

## Validation

- Terraform formatting, initialization without a backend, and validation completed with the exact outcomes recorded in Model Response.
- Application build, lint, 106 tests, final formatting check, and diff whitespace validation passed.
- The initial sandboxed provider-registry and initial documentation-format failures were retained in the report; both were corrected through the approved network retry and formatting-only edit.

## Security Notes

- PostgreSQL is private-only; App Service is restricted to the exact Front Door profile; SCM remains separately closed.
- Managed identity and narrow RBAC replace registry credentials and direct Key Vault access.
- No Key Vault secret resource or secret-bearing output exists. The PostgreSQL password state caveat and secured remote-backend requirement are explicit.
- No real credential, secret, token, connection string, subscription ID, or environment file was inspected or stored.

## Assumptions

- The existing resource group, remote-state prerequisites, Azure permissions/quotas, and Entra External ID configuration are operator-managed.
- Future operators will provide an immutable image tag, matching PostgreSQL/Key Vault password value, and approved network paths for secret and artifact deployment.
- Regional SKU/zone availability is checked again immediately before any authorized deployment.

## Deferred Work

- All Azure provisioning and live-resource validation.
- Secret seeding, image push, frontend upload, Entra redirect changes, browser verification, custom domains/certificates, and CI/CD.
- Alert notification destinations, distributed caching, Front Door Premium/Private Link/WAF, and ACR Premium/private endpoints.

## Human Review

Approved after senior review

## Final Status

Approved

## Senior Review Correction - Production Migration Execution

### Exact Correction Prompt

```text
Apply the senior-review correction for Interaction 012.

Repository:\
C:\DevOps_Projects\Azure_weather_Project

Read and obey the repository-root AGENTS.md before making changes. Inspect the current uncommitted Interaction 012 Terraform implementation and preserve all unrelated work.

# Important correction

The current `azurerm_linux_web_app` overrides the production container startup command with:

`npm run migration:run:prod --workspace=@azure-weather/backend && node apps/backend/dist/main.js`

This is unsafe for the production architecture because the App Service plan starts with two instances and can scale to four. Multiple instances may attempt the same database migrations concurrently.

It also conflicts with the previously reviewed container hardening decision: the production image must remain migration-free and start compiled Node directly as PID 1. Migration execution is Compose-specific until a dedicated production release mechanism is implemented.

# Required changes

1. Remove the `app_command_line` override from `infra/terraform/app-service.tf`.
2. Keep the existing Docker image startup behavior unchanged:
   - the image’s existing `CMD` must start compiled Node directly;
   - do not add an npm or persistent shell wrapper;
   - do not modify the Dockerfile or application runtime.
3. Do not run TypeORM migrations automatically from every App Service instance.
4. Update:
   - `infra/terraform/README.md`
   - `docs/azure-infrastructure.md`
   - any other Interaction 012 text that currently claims App Service runs migrations during startup.
5. Document the production migration requirement accurately:
   - database migrations must be executed exactly once by a separately reviewed, network-connected deployment/release mechanism before the new application version receives production traffic;
   - this mechanism will eventually belong to CI/CD or another controlled release process;
   - CI/CD and the migration runner remain deferred and must not be implemented in this correction;
   - do not claim production migrations are currently automated.
6. Preserve all other reviewed Terraform behavior, including:
   - two-to-four App Service instances;
   - direct Node container startup;
   - private PostgreSQL;
   - Front Door restrictions;
   - managed identities and RBAC;
   - Key Vault references;
   - no secret values in Terraform.

# Safety boundaries

- Do not run Terraform plan, apply, destroy, import, or refresh.
- Do not run Azure CLI commands or query/change live Azure resources.
- Do not deploy anything or create costs.
- Do not inspect or modify real environment files or secrets.
- Do not commit or push.
- Do not implement CI/CD.
- Do not change application code, Dockerfiles, dependency files, or existing approved interaction records unrelated to this correction.

# Validation

Run only:

- `terraform fmt -recursive`
- `terraform fmt -check -recursive`
- `terraform init -backend=false`
- `terraform validate`
- `npm run build`
- `npm run lint`
- `npm test`
- `npm run format:check`
- `git diff --check`

Review the final diff carefully and confirm that no Terraform deployment command or Azure operation ran.

# Interaction record

Append this exact correction prompt and the final correction response to:

`docs/ai-interactions/012-azure-terraform-foundation.md`

Keep:

- `Human Review: Pending`
- `Final Status: Awaiting human review`

Do not approve the interaction yourself. Report the exact files changed and validation results.
```

### Correction Model Response

## Summary

Applied the focused senior-review correction for Interaction 012.

- Removed the App Service `app_command_line` override, so Terraform no longer starts a shell/npm migration wrapper on every instance.
- Preserved the production image behavior: the unchanged Docker `CMD ["node", "apps/backend/dist/main.js"]` starts compiled Node directly as PID 1.
- App Service instances no longer run TypeORM migrations during startup. The two-to-four instance topology, private PostgreSQL, Front Door restrictions, managed identities/RBAC, Key Vault references, and secret handling are unchanged.
- Documented that production migrations must run exactly once through a separately reviewed, network-connected deployment/release mechanism before a new application version receives traffic. That mechanism and CI/CD remain deferred; production migrations are not currently automated. Docker Compose retains its local-only migration behavior.

## Files changed

- `infra/terraform/app-service.tf` — removed only the `app_command_line` override.
- `infra/terraform/README.md` — corrected the production release order and documented direct Node startup plus the deferred one-shot migration runner.
- `docs/azure-infrastructure.md` — corrected the runtime contract, deployment sequence, and deferred-work documentation.
- `docs/ai-interactions/012-azure-terraform-foundation.md` — appended the exact correction prompt and this exact response.

No Dockerfile, application code, Compose configuration, dependency file, lock file, architecture image, real environment file, or unrelated interaction record was changed.

## Validation performed

- `terraform fmt -recursive` — exit 0.
- `terraform fmt -check -recursive` — exit 0.
- First sandboxed `terraform init -backend=false` — exit 1 because provider-registry network access was blocked. The approved retry reused the locked, already installed AzureRM `v5.10.0` provider and exited 0.
- `terraform validate` — exit 0; configuration valid.
- `npm.cmd run build` — exit 0; backend and frontend production builds passed.
- `npm.cmd run lint` — exit 0; backend and frontend lint passed with zero warnings.
- `npm.cmd test` — exit 0; 13 backend suites/87 tests and 1 frontend suite/19 tests passed (106 total).
- `npm.cmd run format:check` — exit 0.
- `git diff --check` — exit 0, with only existing working-tree LF-to-CRLF conversion warnings.

Final review confirmed there is no `app_command_line` or `migration:run:prod` reference in Terraform, the Docker image still starts Node directly, and no application/Docker file is modified.

## Security and dependency findings

The correction removes the multi-instance migration race without weakening any network, identity, RBAC, Front Door, database, Key Vault, or secret controls. No dependency changed, and no real secret, credential, token, connection string, subscription ID, or environment file was inspected or stored.

## Assumptions and deferred work

A future authorized release design will provide a single network-connected migration runner and gate production traffic on its successful completion. CI/CD, that runner, deployment, live validation, secret seeding, image push, frontend upload, and Entra redirect changes remain deferred.

## Documentation status

The exact correction prompt and this response are appended to Interaction 012. `Human Review` remains `Pending`, and `Final Status` remains `Awaiting human review`; no approval was recorded.

No Terraform plan, apply, destroy, import, or refresh command ran. No Azure CLI command ran, no live Azure resource was queried or changed, no deployment or cost was created, and no commit or push occurred.

## Human Review

Approved after senior review

## Final Status

Approved
