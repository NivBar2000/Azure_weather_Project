# Production Azure Terraform foundation

This root module represents the approved Azure production architecture now deployed in Sweden Central. The existing resource group and manually configured Microsoft Entra External ID tenant/app registrations are inputs, not managed resources.

## What the module defines

- Sweden Central virtual network with separate delegated App Service, PostgreSQL, and workload-profiles Container Apps subnets. The Container Apps allocation is permanently fixed at `10.40.3.0/24`.
- Private DNS and private-only PostgreSQL Flexible Server connectivity.
- Zone-redundant PostgreSQL high availability, seven-day backups by default, and one application database.
- Azure Container Registry with admin access disabled and managed-identity image pulls.
- A Consumption workload-profiles Container Apps environment and manual, single-replica TypeORM migration job (`azure-weather-prod-mig-d2cc26`) connected to the private database network.
- Separate migration-job and GitHub CD user-assigned identities, with GitHub OIDC restricted to the repository's protected `production` Environment.
- Premium v3 Linux App Service with two baseline workers, zone balancing, CPU autoscale from two through four, regional VNet integration, health checks, and hardened TLS/FTP settings.
- RBAC-enabled Key Vault with purge protection, subnet-restricted access, and least-privilege secret-read access for the App Service identity.
- Azure Storage Static Website, Front Door Standard routes, the active `www.nivbarweather.com` custom domain with an Azure-managed TLS 1.2-or-later certificate, Log Analytics, Application Insights, and focused diagnostic settings.

Terraform intentionally does not create Key Vault secret values, upload frontend files, build or push the backend image, create or configure the GitHub Environment/workflow, configure Entra External ID, manage public DNS records, create alert notification destinations, or provision the existing resource group/state backend. The repository CD workflow is maintained separately in `.github/workflows/cd.yml`.

## Required operator inputs

Copy `terraform.tfvars.example` to an untracked `terraform.tfvars` and replace all placeholders. Required values include:

- a deterministic globally unique suffix;
- the existing resource-group name;
- an immutable backend image tag already intended for ACR;
- the PostgreSQL administrator password;
- public, environment-specific Entra tenant/client IDs and OIDC URLs.

Never commit `terraform.tfvars`. The PostgreSQL administrator password is marked sensitive so Terraform masks it in normal CLI output, but Azure requires it on the PostgreSQL resource and it can therefore be stored in Terraform state. Sensitive variables do **not** keep values out of state.

The remote state backend must be an existing Azure Storage container with encryption, Azure AD authentication, restricted network and RBAC access, versioning/soft delete where appropriate, and operational locking/recovery controls. Keep `backend.hcl` and all environment-specific backend details out of version control.

## Safe initialization and validation

These commands initialize only provider plugins and validate configuration; they do not calculate or apply infrastructure changes:

```bash
cd infra/terraform
terraform fmt -recursive
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
```

For a future authorized infrastructure change, initialize the secured backend using an untracked copy of `backend.hcl.example`. Do not run `plan` or any deployment command merely to validate this configuration.

## Deployment prerequisites and order

Before an authorized deployment:

1. Confirm provider registration, regional SKU/zone availability, quotas, permissions, the existing resource group, and the secured remote-state container.
2. Supply reviewed, non-committed variables and deploy the Terraform configuration through an approved process.
3. Push the backend image with the configured immutable tag to the created ACR. The App Service and migration-job identities receive scoped `AcrPull`; no registry admin credentials are used.
4. Seed the versionless Key Vault secret names out of band. `openweather-api-key` contains the private OpenWeather key. `postgresql-administrator-password` must contain the exact password supplied to Terraform for PostgreSQL creation. Terraform never creates or reads either secret value.
5. Update the manual migration job to the same immutable image, start exactly one execution, and require successful completion. It runs `npm run migration:run:prod --workspace=@azure-weather/backend` with no scheduled trigger or automatic retry. The multi-instance App Service must not run migrations during startup.
6. Update the App Service image only after migration success, then verify identity propagation, ACR pull, Key Vault reference resolution, health, and private database connectivity. Terraform does not override the application image command: the existing Docker `CMD` starts compiled Node directly as PID 1.
7. Build the frontend with the approved public Entra settings and upload `apps/frontend/dist` to the storage account's `$web` container using Entra data-plane authentication.
8. Purge the Front Door endpoint if stale content requires it, then run health, routing, authentication, and application checks.

The initial image push, one-shot production migration, secret seeding, frontend build/upload, and Entra updates were completed through separately reviewed manual deployment interactions. The deployed infrastructure, frontend, database schema, backend, authentication, and OpenWeather flow are operational. The repository contains a manual-only CD workflow with exact original-actor, triggering-actor, and `main`-ref checks. Its first run failed safely during OIDC authentication, before deployment, because the deployed federated credential expected an obsolete name-only subject. That failure is historical: after the reviewed subject correction, a later manual Production CD run completed successfully using `https://www.nivbarweather.com`. Compose retains its local-only migration startup behavior. Terraform state does not contain application build artifacts.

## CD identity, trust boundary, and image ownership

The federated credential accepts only the immutable subject observed from the GitHub `production` Environment: `repo:NivBar2000@262624074/Azure_weather_Project@1426703721:environment:production`. The owner and repository IDs prevent a rename or name reuse from silently changing the trusted repository. The GitHub identity receives resource-scoped `AcrPush`, App Service `Website Contributor`, `$web` `Storage Blob Data Contributor`, Front Door endpoint `CDN Profile Contributor`, and migration-job `Container Apps Jobs Contributor`. It receives no subscription/resource-group Contributor, Owner, User Access Administrator, Key Vault role, database credential output, or Terraform-state permission.

The approved trust model explicitly accepts that migration-job update/start permission gives the protected GitHub identity effective use of the job's database secret and attached migration identity. Azure does not provide a field-level RBAC boundary that permits image-only job updates or disables execution overrides. As the backend image deployment principal, the same identity can also deploy code that runs with the App Service's runtime configuration. It is therefore a trusted production release principal even though it has no direct Key Vault role. Required Environment reviewers are unavailable on the current private-repository GitHub plan; manual-only dispatch, the exact `NivBar2000`/`main` checks, the Environment-scoped OIDC subject, minimal workflow permissions, digest-qualified deployment, non-cancelling concurrency, and sanitized logs are the compensating controls.

Terraform owns the registry configuration, identities, secret reference, command, environment variables, networking, health/access settings, and all other runtime infrastructure. CD owns only deployed image revisions. Narrow lifecycle rules ignore `site_config[0].application_stack[0].docker_image_name` for App Service and `template[0].container[0].image` for the migration job.

## CD release sequence and recovery boundary

The manual `.github/workflows/cd.yml` workflow first runs `npm ci`, formatting, lint, tests, and both workspace builds. Its deployment job then uses OIDC, builds the backend from the repository root, pushes a full-commit-SHA tag, resolves the ACR manifest digest, and deploys only the digest-qualified reference. It updates only the configured migration-job image, starts one execution without command/environment/secret overrides, and polls for bounded success before updating App Service. App Service is health-checked at `/api/health` before any frontend change. The frontend is then rebuilt from public `VITE_*` variables, uploaded to `$web` with Entra data-plane authentication and explicit MIME types, followed by Front Door purge and bounded public smoke checks.

If migration update/start/execution fails, App Service and frontend deployment stop. If the new backend fails restart or health, the workflow attempts to restore the previously configured App Service image and fails. That best-effort image rollback does not reverse a successful database migration. Frontend upload is not atomic, and neither a later upload/purge/smoke failure nor the workflow itself restores prior static files; a frontend rollback requires a retained known-good build and a separate authorized run. Terraform is never invoked by CD.

## Tag ownership

Terraform owns every project-defined tag in `local.common_tags`. Azure or an external governance process owns only the automatically applied `created_By` and `created_Date` keys. Each taggable managed resource ignores drift for exactly `tags["created_By"]` and `tags["created_Date"]`; the complete `tags` map is never ignored, so changes to application, environment, owner, cost-center, workload, and other declared tags remain visible and managed by Terraform.

Because the vault denies unlisted networks, secret seeding must run from an explicitly approved network path (for example, a controlled deployment runner with temporary reviewed access). Do not permanently broaden the vault firewall for convenience. The frontend uploader likewise needs a separately assigned least-privilege Storage Blob Data Contributor role; this workload module does not grant deployment-operator access.

The AzureRM provider sets `storage_use_azuread = true` so its Storage Blob/Queue data-plane operations use Microsoft Entra authentication while Shared Key remains disabled. Before Terraform creates or updates the frontend static-website configuration, grant the Terraform execution identity an appropriate Storage Blob data-plane role, normally Storage Blob Data Contributor, at the frontend storage-account scope. That operator permission is managed separately and is intentionally not assigned by this workload module.

## Traffic, routing, and dependencies

Front Door creates `/api/*` and `/*` routes on one Standard profile. Azure Front Door uses the more-specific `/api/*` match for the App Service; the API route omits a cache block, so API responses are not cached. The catch-all frontend route enables compression and honors origin caching semantics for static content. Both routes redirect HTTP to HTTPS and forward to their origins over HTTPS.

The Front Door profile, endpoint, and custom-domain resource are independent of the origins. App Service consumes `https://www.nivbarweather.com` from the custom-domain resource as `FRONTEND_ORIGIN` and the profile `resource_guid` in its access rule. Origins/routes depend on App Service and Storage afterward. This ordering avoids a Terraform dependency cycle. Terraform also explicitly sets `WEBSITES_ENABLE_APP_SERVICE_STORAGE = "false"` because the backend container does not depend on persistent App Service filesystem storage.

## Completed staged custom-domain rollout

Terraform defines `www.nivbarweather.com` as an Azure Front Door custom domain with an Azure-managed certificate and `TLS12` as the minimum TLS version. Stage 1 created the domain while `front_door_custom_domain_association_enabled=false`, exposed Azure's DNS-validation token, and left both routes on the Azure-provided endpoint. After Azure validated the domain and completed managed-certificate deployment, Stage 2 enabled the production input. The single switch associated the custom domain with both `/api/*` and `/*`; partial association is not supported by this module.

The canonical production URL is now `https://www.nivbarweather.com`. Both routes retain `link_to_default_domain = true`, so `https://azure-weather-prod-fd-d2cc26-epa4ddasghg4d8fr.z03.azurefd.net` remains the rollback and operational fallback.

Namecheap remains manually managed outside Terraform:

| Type  | Namecheap Host | Value/Target                                                    | TTL       |
| ----- | -------------- | --------------------------------------------------------------- | --------- |
| TXT   | `_dnsauth.www` | Azure's validation token, retained after validation             | Automatic |
| CNAME | `www`          | `azure-weather-prod-fd-d2cc26-epa4ddasghg4d8fr.z03.azurefd.net` | Automatic |

Do not delete the `_dnsauth.www` TXT record. Microsoft Entra External ID is also managed outside Terraform: `https://www.nivbarweather.com/` was added as an SPA redirect while the localhost and original Front Door redirects were preserved. The GitHub repository variable `PRODUCTION_URL` now uses the canonical URL. A manual Production CD run and human checks of HTTPS, frontend loading, `/api/health`, authentication redirect, city search, forecast saving, and saved-forecast loading completed successfully.

Rollback remains explicit and non-destructive: keep the default Front Door hostname linked to both routes, direct operational access back to that fallback if the custom hostname has a problem, and treat any Namecheap or Entra rollback as a separately authorized manual change. Terraform does not manage either external system.

App Service allows its main endpoint only from the `AzureFrontDoor.Backend` service tag when `X-Azure-FDID` matches the created profile GUID. Unmatched requests are denied. The SCM endpoint has a separate deny-by-default policy; it does not copy the Front Door rule. Front Door Standard cannot connect to these origins through Private Link, so the App Service still has a public endpoint protected by restrictions and the Storage static-website endpoint remains publicly reachable.

PostgreSQL has no public network access. App Service resolves its private FQDN through the linked private DNS zone and reaches it through regional VNet integration. The Key Vault public endpoint is restricted to the integration subnet through a service endpoint; RBAC separately limits the App Service identity to secret reads.

## Cost and security choices

- P0v3 with two to four App Service instances and zone-redundant General Purpose PostgreSQL are the primary cost drivers.
- Front Door Standard is the selected cost-focused profile. Front Door Premium with Private Link origins and a managed WAF policy is the stronger, higher-cost alternative; it would replace Standard rather than run beside it.
- ACR Basic is the default. A private ACR endpoint requires Premium and additional private DNS/network resources.
- Storage uses locally redundant Standard storage and remains publicly readable through its static website endpoint because Standard Front Door cannot use Private Link origins.
- PostgreSQL geo-redundant backup is disabled by default for cost control; zone-redundant HA and local point-in-time backups remain enabled.
- Diagnostic ingestion and retention generate usage costs. No alerts are created because no notification destination was provided.
- The workload-profiles Container Apps environment and migration executions can add environment, networking, execution, and Log Analytics usage charges. The dedicated `/24` also consumes VNet address space permanently.

See [Azure infrastructure](../../docs/azure-infrastructure.md) for the complete architecture, operational prerequisites, limitations, and deferred work. Interaction 012 created the original configuration without deploying it, Interaction 021 extended the configuration, and Interactions 029 and 030 document the staged custom-domain rollout and completed cutover.
