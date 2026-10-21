# Production Azure Terraform foundation

This root module represents the approved Azure production architecture now deployed in Sweden Central. The existing resource group and manually configured Microsoft Entra External ID tenant/app registrations are inputs, not managed resources.

## What the module defines

- Sweden Central virtual network with separate delegated App Service and PostgreSQL subnets.
- Private DNS and private-only PostgreSQL Flexible Server connectivity.
- Zone-redundant PostgreSQL high availability, seven-day backups by default, and one application database.
- Azure Container Registry with admin access disabled and managed-identity image pulls.
- Premium v3 Linux App Service with two baseline workers, zone balancing, CPU autoscale from two through four, regional VNet integration, health checks, and hardened TLS/FTP settings.
- RBAC-enabled Key Vault with purge protection, subnet-restricted access, and least-privilege secret-read access for the App Service identity.
- Azure Storage Static Website, Front Door Standard routes, Log Analytics, Application Insights, and focused diagnostic settings.

Terraform intentionally does not create Key Vault secret values, upload frontend files, build or push the backend image, configure Entra, create a custom domain/certificate, create alert notification destinations, or provision the existing resource group/state backend.

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
3. Push the backend image with the configured immutable tag to the created ACR. The App Service system identity receives `AcrPull`; no registry admin credentials are used.
4. Seed the versionless Key Vault secret names out of band. `openweather-api-key` contains the private OpenWeather key. `postgresql-administrator-password` must contain the exact password supplied to Terraform for PostgreSQL creation. Terraform never creates or reads either secret value.
5. Before a new backend version receives production traffic, execute its pending TypeORM migrations exactly once from a separately reviewed, network-connected deployment/release mechanism. The multi-instance App Service must not run migrations during container startup.
6. Start or update the App Service only after the one-shot migration succeeds, then verify identity propagation, ACR pull, Key Vault reference resolution, health, and private database connectivity. Terraform does not override the image command: the existing Docker `CMD` starts compiled Node directly as PID 1.
7. Build the frontend with the approved public Entra settings and upload `apps/frontend/dist` to the storage account's `$web` container outside Terraform.
8. Add the `front_door_endpoint_url` output plus its trailing-slash form where required to the Entra SPA redirect URI and post-logout redirect configuration, then perform human authentication checks.

The initial image push, one-shot production migration, secret seeding, frontend build/upload, and Entra updates were completed through separately reviewed manual deployment interactions. The deployed infrastructure, frontend, database schema, backend, authentication, and OpenWeather flow are operational. A persistent production migration runner and CI/CD are not implemented, so future releases still require separately reviewed manual procedures. Compose retains its local-only migration startup behavior. Terraform state does not contain application build artifacts.

Because the vault denies unlisted networks, secret seeding must run from an explicitly approved network path (for example, a controlled deployment runner with temporary reviewed access). Do not permanently broaden the vault firewall for convenience. The frontend uploader likewise needs a separately assigned least-privilege Storage Blob Data Contributor role; this workload module does not grant deployment-operator access.

The AzureRM provider sets `storage_use_azuread = true` so its Storage Blob/Queue data-plane operations use Microsoft Entra authentication while Shared Key remains disabled. Before Terraform creates or updates the frontend static-website configuration, grant the Terraform execution identity an appropriate Storage Blob data-plane role, normally Storage Blob Data Contributor, at the frontend storage-account scope. That operator permission is managed separately and is intentionally not assigned by this workload module.

## Traffic, routing, and dependencies

Front Door creates `/api/*` and `/*` routes on one Standard profile. Azure Front Door uses the more-specific `/api/*` match for the App Service; the API route omits a cache block, so API responses are not cached. The catch-all frontend route enables compression and honors origin caching semantics for static content. Both routes redirect HTTP to HTTPS and forward to their origins over HTTPS.

The Front Door profile and endpoint are independent of the origins. App Service then consumes the endpoint hostname as `FRONTEND_ORIGIN` and the profile `resource_guid` in its access rule. Origins/routes depend on App Service and Storage afterward. This ordering avoids a Terraform dependency cycle.

App Service allows its main endpoint only from the `AzureFrontDoor.Backend` service tag when `X-Azure-FDID` matches the created profile GUID. Unmatched requests are denied. The SCM endpoint has a separate deny-by-default policy; it does not copy the Front Door rule. Front Door Standard cannot connect to these origins through Private Link, so the App Service still has a public endpoint protected by restrictions and the Storage static-website endpoint remains publicly reachable.

PostgreSQL has no public network access. App Service resolves its private FQDN through the linked private DNS zone and reaches it through regional VNet integration. The Key Vault public endpoint is restricted to the integration subnet through a service endpoint; RBAC separately limits the App Service identity to secret reads.

## Cost and security choices

- P0v3 with two to four App Service instances and zone-redundant General Purpose PostgreSQL are the primary cost drivers.
- Front Door Standard is the selected cost-focused profile. Front Door Premium with Private Link origins and a managed WAF policy is the stronger, higher-cost alternative; it would replace Standard rather than run beside it.
- ACR Basic is the default. A private ACR endpoint requires Premium and additional private DNS/network resources.
- Storage uses locally redundant Standard storage and remains publicly readable through its static website endpoint because Standard Front Door cannot use Private Link origins.
- PostgreSQL geo-redundant backup is disabled by default for cost control; zone-redundant HA and local point-in-time backups remain enabled.
- Diagnostic ingestion and retention generate usage costs. No alerts are created because no notification destination was provided.

See [Azure infrastructure](../../docs/azure-infrastructure.md) for the complete architecture, operational prerequisites, limitations, and deferred work. Interaction 012 created configuration only; it did not deploy Azure resources.
