# Azure production infrastructure

## Status and scope

Interaction 012 adds a production-oriented Terraform foundation under `infra/terraform`. It represents the approved architecture but has not provisioned, imported, queried, or changed an Azure resource. The existing Azure resource group and the manually configured Microsoft Entra External ID tenant/app registrations remain outside Terraform.

The selected region is `swedencentral`. Terraform deploys one cost-focused Azure Front Door Standard profile. Front Door Premium is documented only as an alternative and is not deployed alongside Standard.

## Components

| Component                              | Purpose and configuration                                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Azure Front Door Standard              | Global HTTPS entry point with a non-cached `/api/*` route and compressed/cached static-content route.                                                                      |
| Azure Storage Static Website           | Hosts the React/Vite `dist` output; secure transfer and TLS 1.2 are required, shared public blob-container access is disabled, and `index.html` is the SPA error document. |
| Azure Container Registry               | Stores the backend image; Basic is the default, the admin account is disabled, and App Service pulls with managed identity.                                                |
| Container Apps migration environment   | Uses the dedicated `10.40.3.0/24` delegated subnet and a Consumption workload profile for the manual one-shot TypeORM job `azure-weather-prod-mig-d2cc26`.                 |
| GitHub production deployment identity  | Uses a user-assigned identity and Environment-scoped OIDC federation; resource-scoped roles support the manual repository CD workflow without client secrets.              |
| Linux App Service                      | Runs the existing NestJS container on port 3000 in a P0v3 plan, with zone balancing, two baseline workers, and CPU autoscale through four.                                 |
| PostgreSQL Flexible Server             | PostgreSQL 17 by default, General Purpose compute, zone-redundant HA, private network access, configurable storage, and seven-day local backup retention.                  |
| Virtual network                        | Separate delegated App Service, PostgreSQL, and Container Apps subnets with private PostgreSQL DNS.                                                                        |
| Azure Key Vault                        | Holds externally seeded OpenWeather and database-password secrets; uses RBAC, purge protection, soft delete, and subnet-restricted access.                                 |
| Log Analytics and Application Insights | Central telemetry workspace, workspace-based application insights, and diagnostic streams from App Service, PostgreSQL, Front Door, and Key Vault.                         |

## Traffic and data flow

1. Global users connect to the generated Front Door endpoint over HTTPS.
2. Front Door matches `/api/*` before the catch-all by Azure's most-specific route matching and forwards API requests over HTTPS to App Service without enabling route caching.
3. Other paths go to the Storage static website origin. Front Door compression is enabled, while origin cache headers remain authoritative.
4. App Service reaches PostgreSQL through its regional VNet integration. The server has public network access disabled, occupies a delegated subnet, and resolves through a private DNS zone linked to the VNet.
5. App Service calls OpenWeather over outbound HTTPS. The OpenWeather key is resolved through a versionless Key Vault reference and is never present in frontend code.
6. App Service emits Application Insights telemetry and the selected Azure resources send diagnostic data to Log Analytics.
7. When explicitly started, the Container Apps migration job pulls the reviewed backend image, resolves only the database-password secret through its managed identity, and connects to PostgreSQL over the VNet.

The Terraform dependency flow is intentionally acyclic:

```text
Front Door profile + endpoint
          |
          v
App Service (FRONTEND_ORIGIN and X-Azure-FDID restriction)
          |
          v
Front Door App Service origin + /api/* route

Storage account + static website
          |
          v
Front Door storage origin + /* route
```

The endpoint hostname and profile GUID exist independently of origins. App Service can therefore consume both before Front Door creates the backend origin and route.

## Origin security

The App Service main endpoint remains technically public because Front Door Standard cannot use Private Link to an App Service origin. Its default access action is deny. The only allow rule requires both:

- source membership in the `AzureFrontDoor.Backend` service tag; and
- an `X-Azure-FDID` header matching the created profile's `resource_guid`.

The SCM endpoint deliberately does not inherit that rule. It has its own deny-by-default configuration, avoiding accidental exposure and avoiding a rule that would incorrectly treat the SCM endpoint as a Front Door origin.

The Storage static-website endpoint remains publicly reachable in the selected Standard design. Disabling that public endpoint would also make it unusable as a Standard origin. Front Door Premium with Private Link origins and a managed WAF policy is the stronger security option, at higher cost. Adopting it is a replacement architecture decision; Standard and Premium must not be deployed simultaneously.

No custom domain, DNS record, or certificate is defined because no domain information was supplied.

## Identity, RBAC, and secrets

App Service has a system-assigned managed identity. Terraform assigns it only:

- `AcrPull` at the created registry scope; and
- `Key Vault Secrets User` at the created vault scope.

The ACR admin account is disabled. App settings contain versionless Key Vault references for `OPENWEATHER_API_KEY` and `DATABASE_PASSWORD`; they do not contain either secret value. The vault permits network traffic from the App Service integration subnet through a Key Vault service endpoint, while RBAC controls data-plane authorization.

Terraform does not create, read, or output the OpenWeather secret or database-password secret. After infrastructure deployment, an authorized operator must seed the configured secret names out of band. The database-password secret must exactly match the PostgreSQL administrator password supplied during deployment.

Because the vault firewall denies unlisted networks, the seeding operation needs a separately approved network path, such as a controlled deployment runner with temporary reviewed access. The module does not permanently open the vault to an operator workstation. Frontend artifact upload similarly requires a separately assigned least-privilege Storage Blob Data Contributor role; workload Terraform does not grant deployment-operator access.

Azure requires that administrator password on the PostgreSQL resource. The variable is marked sensitive to reduce CLI disclosure, but it can still enter Terraform state. `sensitive = true` does not encrypt or omit it. Production state must use an encrypted, access-controlled remote Azure Storage backend with Azure AD authentication, least-privilege RBAC, restricted network access, recovery/versioning controls, and protected backend configuration.

The Entra tenant/client identifiers and OIDC URLs are public environment configuration, but remain variables. Terraform does not configure the External ID tenant, Google/Microsoft Account federation, app registrations, permissions, or redirect URIs.

The migration job has a dedicated user-assigned identity with only `AcrPull` at ACR and `Key Vault Secrets User` at the production vault. Its versionless secret reference supplies only `DATABASE_PASSWORD`; the job also receives the five non-secret database connection settings and no OpenWeather or application-authentication configuration.

The separate GitHub CD identity trusts only `repo:NivBar2000/Azure_weather_Project:environment:production`. Its assignments are scoped to ACR (`AcrPush`), the backend App Service (`Website Contributor`), the frontend `$web` container (`Storage Blob Data Contributor`), the Front Door endpoint (`CDN Profile Contributor`), and the migration job (`Container Apps Jobs Contributor`). It has no direct Key Vault role, database output, Terraform-state permission, or broad subscription/resource-group role.

Trust model 1 is an explicit accepted risk: job update/start permission allows the protected GitHub identity to make effective use of the migration job's database secret and attached identity, even though it cannot read Key Vault directly. Azure RBAC cannot constrain a job write to only the image field or disable execution overrides. Control of the backend image similarly makes this identity a trusted production release principal capable of running code with App Service runtime configuration. Required Environment reviewers are unavailable on the current private-repository plan; manual dispatch, exact original-actor, triggering-actor, and main-ref checks, the Environment-scoped OIDC subject, immutable image digests, workflow concurrency, minimal permissions, and sanitized logs are the compensating controls.

Terraform retains ownership of the complete project tag set except for the externally managed `created_By` and `created_Date` keys. Lifecycle rules ignore those two map entries individually on every resource that uses `local.common_tags`; no resource ignores the entire `tags` attribute, so drift in all declared project tags remains actionable.

## Backend runtime contract

Terraform maps the existing NestJS configuration without changing application behavior:

- `NODE_ENV=production`, `PORT=3000`, and `WEBSITES_PORT=3000`;
- `FRONTEND_ORIGIN` set to the generated Front Door origin;
- OpenWeather and database password values resolved through Key Vault references;
- private PostgreSQL FQDN, port 5432, administrator login, application database, and `DATABASE_SSL=true`;
- the six environment-specific `ENTRA_*` settings, with `access_as_user` fixed as the required scope;
- the workspace-based Application Insights connection string.

Terraform does not override the production image command. The existing Docker `CMD` starts compiled Node directly as PID 1, without npm or a persistent shell wrapper. App Service instances do not run TypeORM migrations during startup; doing so would allow two to four instances to race on the same schema.

Production migrations run through the Terraform-defined manual Container Apps Job before a new application version receives traffic. The job has parallelism one, one required completion, zero automatic retries, a bounded timeout, private database connectivity, and no schedule. The repository CD workflow updates only its image, starts exactly one execution without overrides, and gates App Service deployment on confirmed success. The job configuration still requires a separately reviewed Terraform apply and live validation before the first workflow run. Automatic migration startup remains specific to the local Docker Compose workflow.

Terraform owns all non-image runtime configuration. CD owns only the App Service Docker image and migration-job container image, enforced by narrow lifecycle ignores for those two image fields rather than entire configuration blocks. CD additionally owns the uploaded frontend static content; Terraform owns the Storage account, static-website configuration, Front Door, identities, networking, and RBAC.

## Availability and scaling

The Premium v3 Linux plan starts with two workers and has zone balancing enabled. Azure Monitor autoscale adds one instance when average plan CPU exceeds 70% over five minutes and removes one when average CPU is below 30% over ten minutes. Capacity remains between two and four. Longer scale-in observation/cooldown reduces oscillation.

App Service health checks use `/api/health`. Front Door probes the same public health path over HTTPS. PostgreSQL uses zone-redundant synchronous HA; Azure selects and manages the primary/standby zones. Terraform ignores post-failover zone drift while preventing accidental server and application-database destruction.

## Cost decisions

Exact prices are intentionally not stated because they vary by agreement, usage, and time. Primary qualitative drivers are:

- P0v3 compute running at two to four instances;
- General Purpose PostgreSQL with zone-redundant HA;
- Front Door request/egress volume;
- Log Analytics ingestion and retention.

Front Door Standard is the cost-focused selection. Premium adds stronger WAF and Private Link origin options at higher cost. ACR Basic is the default; ACR private endpoints require Premium and additional networking/private DNS. Storage uses LRS. PostgreSQL geo-redundant backup is off by default for cost control, while seven-day local point-in-time backups and zone-redundant HA remain enabled.

## Manual CD prerequisites and deployment order

Before the first human-triggered workflow run:

1. Verify the existing resource group, provider registrations, Sweden Central SKU/zone availability, subscription quotas, RBAC permissions, and a secured remote-state container.
2. Review and supply non-committed variables, including a globally unique suffix, immutable image tag, PostgreSQL administrator password, and public Entra configuration.
3. Initialize the remote backend and execute review/deployment commands only in a separately approved interaction.
4. Confirm the `production` GitHub Environment and every documented public repository variable without placing credentials in GitHub secrets or `VITE_*` values.
5. Seed the two configured Key Vault secrets out of band without exposing their values in Terraform or logs.
6. From GitHub Actions, manually select **Production CD**, choose `main`, verify the exact commit, and run it as `NivBar2000`.
7. Review the sanitized summary and live evidence for the ACR digest, one migration execution, App Service health, frontend deployment, Front Door purge, and public smoke checks.

The persistent migration and OIDC/RBAC foundations are represented in Terraform but not yet applied or live-validated. The separately maintained CD workflow owns immutable backend image build/push, the exactly-once migration gate, App Service image updates, frontend build/upload, Front Door purge, and post-deployment smoke tests. It has no Terraform-state or direct Key Vault access and does not run Terraform.

Failure boundaries are deliberate. Migration failure stops before App Service or frontend changes. Backend restart/health failure triggers a best-effort restore of the previous image, but a successful migration is never reversed automatically and schema compatibility is not guaranteed. Frontend uploads overwrite matching files but are not atomic; purge or smoke failure does not restore previous static content. Recovery after those points requires a separately authorized known-good release.

## Deliberately deferred

- Any Terraform plan, apply, import, refresh, or destroy operation.
- Any Azure CLI query or mutation and all resource provisioning.
- Remote-state resource creation.
- Secret values and secret seeding.
- Applying and live-validating the persistent migration runner and GitHub OIDC/RBAC resources.
- Entra changes, custom domains, certificates, and browser verification.
- The first live GitHub CD run, alert destinations, distributed caching, Front Door Premium/Private Link/WAF, and ACR private endpoints.

Interaction 012 changes configuration and documentation only. It creates no Azure cost until a later authorized deployment applies it.
