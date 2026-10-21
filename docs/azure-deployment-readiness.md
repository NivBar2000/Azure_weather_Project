# Azure Deployment Readiness and Controlled Runbook

## Scope and current status

This document records the initial production deployment outcome and retains the controlled operator runbook for future authorized infrastructure changes and application releases.

> **Historical context:** Interaction 013 performed no Azure deployment. Later reviewed interactions provisioned the infrastructure, deployed the artifacts, seeded secrets, configured Entra, and ran the initial production migrations.

The Sweden Central infrastructure, frontend, database migrations, backend, Microsoft Entra External ID authentication, and backend-only OpenWeather integration are operational. Human browser validation on 2026-10-21 succeeded for Google and Microsoft Account sign-in, city search and live forecasts, saved-forecast create/list/detail behavior, isolation between two identities, and sign-out. Repository validation CI and the manual production CD workflow are implemented. Terraform now defines—but has not deployed—the persistent migration job and GitHub OIDC/RBAC foundation, and the first CD run remains pending. Future changes must continue to use the stop/go gates below and retain human approval evidence.

## Readiness findings and blockers

The initial controlled production deployment is complete, but the repository is not ready for an unattended production release.

| Finding                                                          | Current status                                                                                                                                                             | Required disposition for future changes                                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Terraform configuration                                          | Deployed and retained as the reviewable infrastructure definition                                                                                                          | Revalidate from the approved release environment before each infrastructure change.                                          |
| Azure tenant, subscription, providers, quotas, and regional SKUs | Verified during the reviewed manual deployment                                                                                                                             | Recheck time-sensitive capacity, quota, provider, and authorization conditions before a future change.                       |
| Cost estimate and ownership                                      | Deployment completed; ongoing cost governance remains an operational responsibility                                                                                        | Refresh estimates and approval when a future change affects cost.                                                            |
| Remote state                                                     | Production deployment used the approved secured state workflow; real backend details remain uncommitted                                                                    | Preserve access, locking, recovery, and evidence controls for every Terraform operation.                                     |
| Backend image                                                    | Immutable backend image deployed through ACR; managed-identity pull is operational                                                                                         | Build, scan, retain, and promote future immutable artifacts through a reviewed manual process until CI/CD exists.            |
| Key Vault secrets                                                | Versionless database and OpenWeather references resolve; temporary human access used during reconciliation was removed                                                     | Continue out-of-band, least-privilege secret maintenance and refresh references after rotation when required.                |
| Production migrations                                            | Initial migrations completed through a temporary runner; the persistent manual Container Apps Job `azure-weather-prod-mig-d2cc26` is defined in Terraform but not deployed | Review/apply the foundation, validate private connectivity and secret resolution, and retain a strict single-execution gate. |
| Frontend                                                         | Reviewed static build is deployed to Storage and served through Front Door                                                                                                 | Retain build provenance and use Azure AD data-plane upload authorization for future releases.                                |
| Entra production redirects and providers                         | Production redirect/sign-out behavior, Google sign-in, and Microsoft Account sign-in were human-validated                                                                  | Keep External ID changes separately authorized and repeat human authentication checks after relevant changes.                |
| OpenWeather                                                      | Backend-only integration is operational after the active key was validated and only `openweather-api-key` was reconciled                                                   | Never expose the key to frontend assets or logs; use Key Vault and remove temporary access after maintenance.                |
| CI and CD                                                        | Validation CI and a manual-only production CD workflow exist; GitHub OIDC identity, migration job, and resource-scoped roles are defined but not yet live-validated        | Apply only after plan approval, verify the `production` Environment/variables, then human-trigger the first CD run.          |

Terraform ignores drift only for the externally managed `created_By` and `created_Date` tag entries on resources using `local.common_tags`. Every declared project tag remains Terraform-owned and must still be reviewed when a plan reports drift.

## Local tooling prerequisites

### Versions observed during Interaction 013

| Tool      | Observed local status | Compatibility/readiness note                                                                                                                                               |
| --------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Terraform | `1.15.6`              | Compatible with `>= 1.10.0, < 2.0.0`. AzureRM is locked to `5.10.0`.                                                                                                       |
| Azure CLI | `2.91.0`              | Version was read with an isolated empty config. No login, account, tenant, or subscription command ran. Authentication remains unverified.                                 |
| Docker    | Client `29.2.1`       | Client is present, but the daemon/API was inaccessible. Image build is blocked in this environment until an approved operator resolves or replaces the build environment.  |
| Node.js   | `24.15.0`             | Satisfies the root `>=22` engine constraint, but the repository baseline and container images use Node 22. Use the pinned Node 22 release for reproducible release builds. |
| npm       | `11.12.1`             | Available; the committed npm lock file remains authoritative.                                                                                                              |

Local-only checks include Terraform formatting and validation with `-backend=false`, application build/lint/test/format checks, Dockerfile and configuration review, and Git status/diff checks.

The following checks require future authenticated Azure access and were deliberately not run: tenant/subscription context, resource-group existence/location, provider registration, regional SKU and availability-zone support, quotas, role assignments, globally unique name availability, remote-state access, resource health, diagnostic data, and cost/resource inventory.

## Azure context prerequisites

Before any backend initialization, plan, or apply, an authorized operator must verify and record all of the following without printing tokens or credentials:

1. The Azure CLI/SDK session uses the intended deployment tenant and subscription.
2. The manually managed Microsoft Entra External ID tenant is correctly distinguished from the Azure resource tenant used by `data.azurerm_client_config.current` for Key Vault.
3. The supplied existing resource group exists in the intended subscription and the deployment remains in `swedencentral`.
4. Naming inputs produce unused globally scoped names for Storage, ACR, Key Vault, App Service, PostgreSQL, and Front Door.
5. The subscription has the required resource providers registered:
   - `Microsoft.Authorization`
   - `Microsoft.App`
   - `Microsoft.Cdn`
   - `Microsoft.ContainerRegistry`
   - `Microsoft.DBforPostgreSQL`
   - `Microsoft.Insights`
   - `Microsoft.KeyVault`
   - `Microsoft.ManagedIdentity`
   - `Microsoft.Network`
   - `Microsoft.OperationalInsights`
   - `Microsoft.Storage`
   - `Microsoft.Web`
6. Sweden Central supports the selected P0v3 App Service plan with zone balancing, the selected General Purpose PostgreSQL SKU with zone-redundant HA, PostgreSQL 17, and the requested storage/backup configuration at deployment time.
7. Subscription quotas can accommodate two initial App Service workers scaling to four, PostgreSQL compute/storage, the workload-profiles Container Apps environment/job, public IP/service capacity where Azure allocates it internally, and monitoring ingestion.
8. The proposed VNet and subnet CIDRs do not overlap with existing, peered, on-premises, or planned networks.

Do not assume local Terraform validation proves any live subscription, regional capacity, quota, registration, or name-availability condition.

## Operator permissions

Use separate identities and narrower roles when duties are separated. Avoid subscription-wide Owner access where scoped roles are sufficient.

| Task                               | Minimum capability to arrange and verify                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Terraform resource deployment      | Create/read/update/delete the declared resource types in the existing resource group, normally through a reviewed custom role or scoped Contributor-equivalent role. The Terraform execution identity also needs Storage Blob Data Contributor (or an appropriate equivalent) at the frontend storage-account scope so AzureRM can configure the static website through Microsoft Entra data-plane authentication while Shared Key is disabled. Grant this separately; the workload module does not assign deployment-operator access. |
| Terraform-created RBAC assignments | `Microsoft.Authorization/roleAssignments/write` and delete/read permissions at the ACR and Key Vault scopes; Contributor alone is insufficient. Use Role Based Access Control Administrator, User Access Administrator, or a narrower custom role at the smallest practical scope.                                                                                                                                                                                                                                                     |
| Remote-state access                | Azure AD data-plane access sufficient to read/write/list blobs and acquire leases in the dedicated state container, typically Storage Blob Data Contributor scoped to that container or state account, plus any required control-plane read access.                                                                                                                                                                                                                                                                                    |
| Backend image push                 | `AcrPush` on the created registry for the release identity. App Service separately receives only `AcrPull`.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Key Vault secret seeding           | Secret write/list metadata capability such as Key Vault Secrets Officer at the vault scope, plus an approved network path. Do not grant the Terraform workload identity secret-write access.                                                                                                                                                                                                                                                                                                                                           |
| Frontend upload                    | Storage Blob Data Contributor for the `$web` container or the smallest supported equivalent. Shared-key access remains disabled.                                                                                                                                                                                                                                                                                                                                                                                                       |
| Entra configuration                | Authorized ownership/administration of the existing SPA/API registrations and External ID configuration. This is separate from Azure resource RBAC.                                                                                                                                                                                                                                                                                                                                                                                    |
| Production migration               | Private network/DNS reachability to PostgreSQL and database credentials delivered through an approved secret channel. The runner identity needs no broader Azure rights than its design requires.                                                                                                                                                                                                                                                                                                                                      |
| GitHub production CD               | Federated user-assigned identity restricted to the repository's `production` Environment, with resource-scoped ACR, App Service, `$web`, Front Door endpoint, and migration-job roles only. It receives no direct Key Vault or Terraform-state access.                                                                                                                                                                                                                                                                                 |

The approved trust model accepts that `Container Apps Jobs Contributor` on the migration job gives the GitHub deployment identity effective use of the job's database secret and attached identity through update/start operations. This is not equivalent to direct Key Vault read access, but it is a secret-use capability. Control of the backend image also makes the identity a trusted production release principal for code running with App Service runtime configuration. Azure RBAC cannot restrict job writes to the image field or disable execution overrides, so protected-environment approval and a narrowly reviewed future workflow are mandatory compensating controls.

Every temporary elevated assignment must have an owner, justification, expiry/removal step, and evidence of removal after deployment.

## Terraform remote-state readiness

### Required backend

The root module contains an empty `azurerm` backend block. A real deployment requires an existing, separately secured Azure Storage backend that is not created by this workload module.

The state backend must provide:

- a dedicated private blob container in a StorageV2 account;
- Azure AD authentication (`use_azuread_auth = true`) with least-privilege blob data-plane RBAC;
- encryption at rest using the approved organizational standard;
- restricted network access that still permits the approved Terraform runner;
- blob versioning, blob/container soft delete, and documented retention aligned with recovery requirements;
- Azure Blob lease-based state locking and an operator procedure for investigating stale locks before any force-unlock decision;
- diagnostic/audit logging appropriate for state access;
- tested recovery from a previous blob version without copying state into chat, tickets, or source control.

Never commit a real `backend.hcl`, `terraform.tfvars`, `.tfstate`, plan file, subscription ID, or backend identifier. Do not pass backend secrets on the command line. Use Azure AD/workload identity rather than storage account keys or SAS tokens.

### Bootstrap decision gate

The state backend must exist before this module can use it, which creates a bootstrap decision. Before deployment, choose and approve one of these approaches:

1. **Preferred:** use a centrally managed state account/container provisioned by an independently governed platform/bootstrap process.
2. Use a separately reviewed, minimal bootstrap stack with its own lifecycle, state, access controls, and recovery procedure.
3. Use an explicitly approved one-time manual bootstrap only when organizational policy permits it, recording ownership and the exact resulting controls without committing identifiers.

Do not add the backend resources to this workload root module or initialize against local state and later improvise a migration. The chosen bootstrap path and state-recovery owner are deployment blockers until approved.

## Operator inputs

Prepare untracked copies of `terraform.tfvars.example` and `backend.hcl.example` only in the approved release environment. Review them out of band; never paste real values into chat or committed documentation.

### Input classification

| Input                                                                     | Classification                                        | Handling requirement                                                                                                                                                                            |
| ------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project/environment labels, tags                                          | Non-secret configuration                              | Review naming/tagging policy; may be committed only as generic examples.                                                                                                                        |
| Existing resource-group name                                              | Environment-specific identifier                       | Keep in untracked configuration; verify against authenticated context.                                                                                                                          |
| Globally unique suffix                                                    | Environment-specific identifier                       | Choose deterministically and verify live availability before plan.                                                                                                                              |
| Region                                                                    | Approved public configuration                         | Must remain `swedencentral`.                                                                                                                                                                    |
| VNet and subnet CIDRs                                                     | Sensitive operational configuration, not a credential | Review for overlap; keep production values out of generic examples when policy requires.                                                                                                        |
| App Service/ACR/PostgreSQL SKUs, storage, retention, autoscale thresholds | Cost/availability configuration                       | Match the approved estimate and regional checks.                                                                                                                                                |
| Backend image repository and immutable tag                                | Public/non-secret release metadata                    | Tag must not be empty or `latest`; bind it to reviewed source and build evidence.                                                                                                               |
| PostgreSQL administrator login/database name/Key Vault secret names       | Operational configuration                             | Stable names only; do not confuse names with secret values.                                                                                                                                     |
| Entra tenant ID, SPA/API client IDs, issuer, metadata URL, scope          | Public identity configuration                         | Verify exact environment values; these are identifiers/URLs, not client secrets.                                                                                                                |
| Frontend `VITE_ENTRA_*` values                                            | Public build-time configuration                       | They are compiled into browser assets. Never place a secret or token in a `VITE_*` value.                                                                                                       |
| PostgreSQL administrator password                                         | **Secret**                                            | Supply only through an approved secret-injection mechanism. It can enter Terraform state because Azure requires it on the resource; `sensitive` masks output but does not remove it from state. |
| OpenWeather API key                                                       | **Secret**                                            | Never provide it to Terraform. Seed it out of band into the configured Key Vault secret after the vault exists.                                                                                 |
| Real backend identifiers                                                  | Sensitive operational configuration                   | Keep only in untracked backend configuration; never commit or paste them into chat.                                                                                                             |

The database-password Key Vault secret must contain exactly the same value used to create PostgreSQL. The release design must avoid printing, shell tracing, command-history persistence, logs, artifacts, and process arguments that expose either secret.

## Cost approval gate

Before plan approval, create a current Azure Pricing Calculator estimate for the approved region and expected usage. Exact prices must not be copied into this runbook because pricing, agreements, taxes, and usage change.

At minimum, estimate and review:

- P0v3 Linux App Service with two always-active instances and autoscale up to four;
- General Purpose PostgreSQL storage/compute with zone-redundant HA and backup retention;
- Front Door Standard requests, rules, and data transfer;
- Log Analytics ingestion and retention plus Application Insights telemetry;
- ACR Basic storage/build-egress assumptions, Storage LRS capacity/transactions/egress, and network/data-transfer usage.

Record the estimate date, workload assumptions, budget owner, monthly/annual ranges, alerting expectations, and explicit human approver. A missing, stale, or rejected estimate is a hard stop. Cost approval does not authorize deployment by itself.

## Controlled runbook for future changes

Each phase requires recorded evidence and an explicit go decision. A stop condition cannot be waived silently.

### Phase 0 - Release scope and change approval

1. Select the reviewed commit and immutable release identifier.
2. Confirm the working tree is clean and Interaction 013 has independent senior approval.
3. Confirm a deployment window, owners, communication channel, evidence location, and rollback decision-maker.
4. Approve the current cost estimate and confirm budget/monitoring ownership.

**Go:** named human approvers accept scope, cost, risks, and the remaining manual steps.  
**Stop:** unreviewed changes, missing owners, incomplete cost approval, or unresolved blockers.

### Phase 1 - Secure state bootstrap readiness

1. Complete the approved backend bootstrap outside this workload module.
2. Verify Azure AD-only access, least-privilege RBAC, network reachability, encryption, versioning, soft delete, lease locking, audit logging, and recovery ownership.
3. Prepare an untracked backend configuration with real identifiers in the approved runner only.

**Go:** backend controls and recovery have independent approval.  
**Stop:** local state, shared keys/SAS, public/uncontrolled access, untested recovery, or committed backend details.

### Phase 2 - Authenticated Azure context and capacity verification

1. Authenticate using the approved deployment identity without exposing tokens.
2. Verify tenant, subscription, resource group, Sweden Central, provider registrations, quotas, selected SKUs, availability zones, and global-name availability.
3. Verify the identity can deploy resources and create the two scoped role assignments.

**Go:** captured evidence matches the approved target and no quota/SKU/provider issue remains.  
**Stop:** any tenant/subscription ambiguity, missing registration/permission, quota shortfall, unsupported SKU/zone combination, or name collision.

### Phase 3 - Inputs and release artifacts review

1. Prepare untracked variable and backend files from the committed examples.
2. Obtain the PostgreSQL password through the approved secret mechanism without displaying it.
3. Review public Entra/backend settings, network CIDRs, immutable image tag, cost-affecting variables, tags, and stable secret names.
4. Build and test release artifacts in the approved build environment, retain provenance/SBOM/scanning evidence as required, but do not push yet because ACR does not exist.

**Go:** two-person review confirms values, classifications, immutable tag, artifact provenance, and no secret leakage.  
**Stop:** placeholder, mutable `latest`, CIDR conflict, missing secret mechanism, unreviewed public identity values, or non-reproducible artifact.

### Phase 4 - Backend initialization and plan review

1. Initialize Terraform against the approved remote backend using the untracked backend configuration.
2. Confirm the backend is remote and locking works; do not expose state contents.
3. Generate a saved plan through the approved process.
4. Review every create/change/destroy action, replacement, output, tag, region, SKU, public endpoint, role assignment, and cost impact.
5. Treat any destroy/replacement, unexpected data-source target, or secret-like output as a stop condition.

**Go:** the exact saved plan receives explicit human approval and has not become stale.  
**Stop:** plan errors, drift, unexpected action, changed inputs/provider lock, stale plan, or missing approval.

### Phase 5 - Infrastructure creation

1. Apply only the exact approved saved plan.
2. Monitor the operation without logging secrets; retain Terraform and Azure diagnostic evidence in the approved location.
3. Recognize the bootstrap condition: Terraform creates ACR, Key Vault, Storage, App Service, Front Door, and PostgreSQL together. The image and secrets do not exist yet, so the App Service/API origin is not expected to be healthy at this point.
4. Do not advertise the generated Front Door hostname or approve production traffic during bootstrap.

**Go:** apply completes without unexpected actions, state is intact/locked correctly, and required outputs are captured securely.  
**Stop:** apply error, partial unknown state, unresolved authorization, unexpected replacement, or missing output. Do not continue to artifact deployment until state is reconciled and a fresh plan is reviewed.

### Phase 6 - Artifact push and secret seeding

Only after ACR, Key Vault, and Storage exist:

1. Grant/verify temporary release identities: `AcrPush`, Key Vault secret write, and `$web` blob upload permissions at minimal scopes.
2. Push the already reviewed backend image to the created ACR using the exact immutable tag; verify digest and provenance.
3. Seed the OpenWeather key and the matching PostgreSQL password into the configured versionless Key Vault secret names from the approved network path.
4. Verify Key Vault reference status without printing secret values. Allow for managed-identity/RBAC propagation, but do not bypass controls.

**Go:** immutable digest is confirmed, both secret references resolve, and temporary access is tracked.  
**Stop:** mutable/mismatched image, denied/unsafe vault access, unresolved secret reference, value mismatch, or any secret disclosure.

### Phase 7 - Exactly-once production migration

1. Update the manual Container Apps migration job to the same reviewed immutable backend release.
2. Confirm its dedicated identity still has only `AcrPull` and `Key Vault Secrets User`, and that its versionless password reference resolves without displaying the value.
3. Confirm no App Service instance runs migrations at startup.
4. Execute pending TypeORM migrations exactly once and retain sanitized status/evidence.
5. Independently verify migration status/schema compatibility without printing credentials or sensitive application data.

**Go:** the migration completes once, the expected migration list/schema is present, and the recovery owner accepts the result.  
**Stop:** runner/network/DNS/credential uncertainty, concurrent runner possibility, migration error, unexpected schema, or missing recovery decision. Do not send traffic to the new backend.

The persistent job is represented in Terraform but does not exist in Azure until a separately reviewed plan is applied. Continue using the approved manual process until live job networking, identity, secret resolution, and execution behavior have been validated.

### Phase 8 - Backend activation and health

1. Start/restart or update App Service only after image, secret, RBAC, and migration gates pass.
2. Verify managed-identity ACR pull, direct Node PID 1 startup, Key Vault references, private database connection, application logs, App Service health, and Front Door backend-origin health.
3. Confirm autoscale bounds remain two through four and no direct-origin access rule was weakened.

**Go:** sustained healthy instances and probes with no secret/reference/database/authentication errors.  
**Stop:** pull failure, unresolved reference, restart loop, database error, unhealthy origin, or sensitive log output.

### Phase 9 - Frontend build and Storage upload

1. Build the frontend from the approved commit with reviewed public `VITE_ENTRA_*` settings and `VITE_API_BASE_URL=/api`.
2. Inspect the compiled assets for unexpected secrets/endpoints; public client IDs and authority/scope values are expected.
3. Upload the exact reviewed `apps/frontend/dist` contents to `$web` with Azure AD authorization.
4. Verify SPA fallback and static asset content types/cache behavior through Front Door.

**Go:** artifact digest/provenance matches and Front Door serves the intended static build.  
**Stop:** unexpected secret, wrong API base, stale artifact, upload mismatch, or broken SPA/static delivery.

### Phase 10 - Entra production redirect configuration

1. Use the Terraform `front_door_endpoint_url` output and the application's trailing-slash behavior to prepare exact SPA redirect and post-logout URLs.
2. Have an authorized Entra operator review and apply the changes to the existing registration.
3. Do not add wildcard redirects, client secrets, or unrelated origins.

**Go:** exact URLs are independently reviewed and saved in the intended External ID tenant.  
**Stop:** tenant/app ambiguity, wildcard/HTTP URL, mismatched authority/issuer/client/scope, or unauthorized change.

### Phase 11 - End-to-end verification and handoff

Complete every post-deployment check below with sanitized evidence. Remove/expire temporary deployment roles, confirm monitoring ownership and cost alerts, and record the final go-live approval.

**Go:** all security, availability, authentication, data-isolation, observability, and cleanup checks pass.  
**Stop:** any failed check, missing evidence, lingering elevation, or unresolved cost/monitoring ownership.

## Failure and rollback guidance

1. **Stop immediately** on failed plan review, apply errors, unresolved Key Vault references, failed migrations, unhealthy origins, authentication failures, cross-user data exposure, or suspected secret leakage.
2. Never use `terraform destroy` as an automatic rollback. It can remove persistent resources and does not reverse database migrations or external Entra changes.
3. Preserve the remote state, state lock information, exact approved plan, sanitized Terraform output, Azure activity/diagnostic evidence, artifact digests, and timeline. Do not copy secrets or full state into logs/tickets.
4. If apply partially succeeds, reconcile state and live resources through read-only investigation, then produce and reapprove a fresh plan. Do not improvise imports, state edits, or deletion.
5. If image startup fails before a migration, keep traffic blocked and correct the image/configuration through a newly reviewed release.
6. If a migration fails, do not start the new version and do not automatically run a down migration. Schema recovery, forward fix, point-in-time restore, or application rollback requires a separate database-owner decision based on compatibility and data-loss risk.
7. If a migration succeeds but the application fails, determine whether the prior image is schema-compatible before selecting it. Never assume an image rollback reverses schema changes.
8. Frontend rollback requires a retained known-good artifact and explicit approval; Terraform does not version frontend content.
9. Entra rollback is a separately authorized external configuration change and must preserve any still-required redirect URI until traffic is safely moved.
10. Suspected secret exposure triggers incident handling and secret rotation without printing old/new values.

### Cost containment

Unexpected spend requires immediate notification to the budget owner and collection of current usage/evidence. Scaling below the approved two-instance/HA architecture, disabling services, or deleting resources is a production architecture/state change and requires explicit human approval plus impact review. Prefer reversible traffic blocking or autoscale-limit changes only through a reviewed plan. Never destroy the environment reflexively to stop costs.

## Post-deployment verification checklist

### Edge and frontend

- [ ] Front Door default/custom production URL serves HTTPS and redirects HTTP to HTTPS.
- [ ] TLS behavior and headers meet the approved policy.
- [x] `/` serves the reviewed React build; asset requests and SPA routing were validated through Front Door.
- [x] `/api/*` is routed to App Service; health, authentication rejection, and application requests reached the backend.
- [ ] Direct Storage endpoint exposure is recorded as the accepted Front Door Standard limitation.
- [ ] Compiled frontend assets contain no secrets, tokens, private keys, connection strings, database credentials, or OpenWeather key.

### Backend and origin security

- [x] `GET /api/health` succeeds through Front Door.
- [x] The direct App Service hostname rejects a normal request that lacks the valid Front Door service-tag path/header combination.
- [x] SCM remains deny-by-default and does not inherit the Front Door origin allow rule.
- [x] The container pulls the exact ACR digest with managed identity; ACR admin remains disabled.
- [x] Node starts directly as PID 1 and no App Service instance attempts migrations.
- [ ] App Service has two healthy baseline workers and autoscale bounds of two through four.

### Database, secrets, and identity

- [x] PostgreSQL public network access is disabled; no public firewall path exists.
- [x] The backend resolves and connects to PostgreSQL through VNet integration/private DNS with TLS.
- [x] Exactly the expected TypeORM migrations are recorded after a single runner execution.
- [x] Key Vault references resolve for OpenWeather and the database password without printing values.
- [x] App Service has scoped `AcrPull` and Key Vault secret-read workload roles at intended scopes.
- [x] Temporary migration and OpenWeather-reconciliation roles and firewall access were removed.

### Authentication and application behavior

- [x] The exact Front Door URL is present as the SPA redirect and post-logout URI.
- [x] Google sign-in completes through Entra External ID.
- [x] Microsoft Account sign-in completes through Entra External ID.
- [x] Sign-out returns to the approved Front Door origin.
- [x] Authenticated weather search and forecast calls succeed through `/api`.
- [x] Save/list/detail history works for a test identity.
- [x] Saved-forecast history remained isolated between two tested identities.
- [ ] No token, authorization header, raw identity claim, or personal email is written to application logs.

### Monitoring and operations

- [ ] Application Insights receives backend telemetry.
- [ ] App Service, PostgreSQL, Front Door, and Key Vault diagnostics reach the intended Log Analytics workspace.
- [ ] Health probes and operational dashboards show healthy origins/instances.
- [ ] Logs contain no API keys, passwords, connection strings, complete tokens, or secret values.
- [ ] Cost monitoring/alerts, operational ownership, incident contacts, backup retention, and recovery procedures are confirmed.
- [ ] Final deployment evidence and approvals are stored in the approved system without state or secrets.

## Delivery automation status and first-run gate

The validation CI remains deployment-free. `.github/workflows/cd.yml` now implements a manual production release without Terraform or client secrets: validate application, push a full-SHA backend tag, verify and deploy its digest, update/start/poll one migration execution, deploy and health-check App Service, build/upload the frontend with Entra authentication, purge Front Door, and run bounded public smoke checks.

The workflow is manual-only, rejects refs other than `refs/heads/main`, and requires both the original `github.actor` and the current `github.triggering_actor` to equal `NivBar2000`, including on re-runs. It declares the `production` Environment, grants only `contents: read` and `id-token: write` to deployment, and serializes production runs without cancelling an active deployment. Required Environment reviewers are unavailable for this private repository under the current GitHub plan, so those controls plus the exact Environment-scoped federated subject and digest-qualified images are the accepted compensating boundary.

Before the first run, a human must review/apply and live-validate the Terraform OIDC/RBAC/migration-job foundation, verify all required public repository variables, confirm the selected `main` commit, and observe the run. Live OIDC, role propagation, ACR digest lookup, migration status polling, endpoint-scoped Front Door purge authorization, App Service image rollback, MIME handling, and end-to-end smoke behavior can only be proven in GitHub/Azure.

Failure is intentionally forward-only at the database boundary. Migration failure stops before backend/frontend deployment. Backend restart or health failure triggers a best-effort previous-image restore, but it does not reverse a completed migration. Frontend upload is non-atomic, and failures during upload, purge, or final smoke checks do not restore prior static files. Retain a known-good frontend build and independently confirm schema compatibility before any application rollback.

Still deferred: remote-state plan/apply automation, artifact promotion/signing/SBOM policy, automatic frontend rollback, database rollback orchestration, alert destinations, broader evidence retention, and cost-containment workflows. Terraform infrastructure changes remain separately planned and approved; CD never receives Terraform-state access or runs Terraform.
