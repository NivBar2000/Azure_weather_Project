# Interaction 021: CD Terraform Foundation

## Tool

Codex

## Model

GPT-5

## Date

2026-10-21

## Objective

Validate and implement the Terraform foundation for a future secure GitHub Actions production deployment workflow, stopping if the approved design cannot be represented with the required least-privilege boundary.

## Relevant decisions

- The AzureRM 5.10.0 provider can represent the proposed workload-profiles Container Apps environment, manual Container Apps Job, managed-identity Key Vault reference, federated identity credential, and narrow image lifecycle paths.
- Implementation stopped before adding Terraform resources because Azure Container Apps Jobs authorization cannot enforce the approved separation between deployment control and migration-secret use.
- Microsoft documents that a principal with `Microsoft.App/jobs/start/action` can use job secrets if it knows their names. A principal that can also update the job can run a container of its choosing with the database-password secret reference.
- Azure RBAC does not provide field-level constraints limiting job writes to the container image, nor does the job-start action prevent execution-time overrides. A built-in or custom role therefore cannot grant the requested update/start capability while guaranteeing that the GitHub identity cannot use the PostgreSQL credential.
- No permanent infrastructure or production documentation was changed while this architectural choice remains unresolved.

## Exact Prompt

```text
Implement the Terraform foundation required for secure GitHub Actions production CD. Do not create the deployment workflow yet, and do not mutate Azure or GitHub.

Approved design decisions:

- Repository: `NivBar2000/Azure_weather_Project`
- GitHub Environment name: `production`
- Azure subscription: `d2cc2668-766e-4287-b55c-757156c5d652`
- Azure tenant: `3d16c4fe-57a6-4332-b56d-3a89bbd4c960`
- Resource group: `rg-azure-weather-prod-swc`
- Region: `swedencentral`
- Existing VNet: `azure-weather-prod-vnet-d2cc26`
- Reserve `10.40.3.0/24` permanently for a workload-profiles Azure Container Apps environment.
- Use a manual-trigger Azure Container Apps Job for one-shot TypeORM migrations.
- Use GitHub OIDC with a user-assigned managed identity; do not use a client secret.
- Restrict the federated credential to the GitHub `production` Environment.
- GitHub Actions CD, not Terraform, will own deployed application image revisions.
- Terraform continues to own all infrastructure and non-image runtime configuration.
- CD remains manually triggered initially.
- Argo CD is out of scope because this application does not use Kubernetes.

Required work:

## 1. Preflight and documentation

1. Read `AGENTS.md` completely.
2. Inspect all Terraform files, provider lock file, current Azure infrastructure documentation, deployment-readiness runbook, migration records, and CI workflow.
3. Consult current official AzureRM provider and Microsoft documentation for:
   - workload-profiles Container Apps environments;
   - manual Container Apps Jobs;
   - Key Vault secret references with managed identity;
   - GitHub OIDC federated credentials;
   - least-privilege built-in Azure roles.
4. Preserve unrelated working-tree changes.
5. If the current AzureRM provider cannot represent the approved design safely, stop and report instead of adding CLI-created permanent infrastructure.

## 2. Migration subnet and Container Apps environment

Add Terraform-managed resources for:

- a dedicated `10.40.3.0/24` subnet in the existing VNet;
- the required `Microsoft.App/environments` delegation;
- updated CIDR containment and overlap checks covering all three subnets;
- a workload-profiles Azure Container Apps environment in Sweden Central;
- a Consumption workload profile;
- integration with the existing Log Analytics/monitoring design without exposing workspace keys or sensitive values in outputs or documentation.

Do not modify the existing App Service or PostgreSQL subnet allocations.

## 3. Persistent migration job

Create a Terraform-managed manual-trigger Container Apps Job that:

- runs only when explicitly started;
- uses the existing backend image repository and an immutable initial image tag;
- runs:
  `npm run migration:run:prod --workspace=@azure-weather/backend`
- has parallelism `1`;
- requires one successful completion;
- has zero automatic retries unless the provider requires a different safe representation;
- has a bounded timeout;
- never runs on a schedule or application startup;
- connects through the dedicated subnet to private PostgreSQL;
- receives only:
  - `DATABASE_HOST`
  - `DATABASE_PORT`
  - `DATABASE_USER`
  - `DATABASE_PASSWORD`
  - `DATABASE_NAME`
  - `DATABASE_SSL`
- receives the database password through a versionless Key Vault secret reference using managed identity;
- does not receive the OpenWeather key or unrelated application settings;
- never exposes the password in Terraform outputs, logs, command arguments, or documentation.

Create a dedicated user-assigned identity for the migration job with only:

- `AcrPull` scoped to the existing ACR;
- `Key Vault Secrets User` scoped to the existing production Key Vault.

Update Key Vault network rules so the dedicated migration subnet can resolve the versionless password secret. Preserve the existing App Service access and deny-by-default posture.

Add outputs required by future CD to identify and start/monitor the job. Outputs must contain identifiers only, never secrets.

## 4. GitHub Actions OIDC identity

Create a separate user-assigned managed identity for GitHub production deployment.

Create a federated identity credential with:

- issuer: `https://token.actions.githubusercontent.com`
- audience: `api://AzureADTokenExchange`
- subject:
  `repo:NivBar2000/Azure_weather_Project:environment:production`

Grant only the minimum roles needed for the future deployment workflow to:

- push immutable Backend images to the existing ACR;
- update and restart only the existing Backend App Service;
- upload built Frontend files to the existing frontend Storage account using Entra data-plane authentication;
- update/start/read the migration job and its executions;
- purge the existing Front Door endpoint cache if required;
- read the minimum non-sensitive resource metadata needed for validation.

Scope every role assignment to the narrowest practical existing resource or newly created migration-job resource. Do not grant subscription-level or resource-group Contributor/Owner access unless there is no safe built-in alternative; if a required action cannot be represented with least privilege, stop and report the exact permission gap.

The GitHub deployment identity must not receive:

- Key Vault secret-read access;
- PostgreSQL credentials;
- Terraform-state access;
- Owner;
- User Access Administrator;
- general subscription Contributor.

Add non-sensitive outputs needed for later GitHub configuration:

- OIDC managed-identity client ID;
- principal ID;
- tenant ID;
- subscription ID;
- migration job name;
- Container Apps environment name.

Mark sensitive outputs appropriately where required, even if they are identifiers.

## 5. Application image ownership

Adjust Terraform’s lifecycle ownership safely so future CD can update only the deployed image revision without Terraform attempting to revert it.

Requirements:

- Terraform must continue managing the App Service registry URL, managed-identity registry authentication, ports, health checks, VNet integration, access restrictions, application settings, and all other infrastructure.
- Ignore only the App Service Docker image name/tag field that CD will update.
- Apply the equivalent narrow image-only ownership rule to the migration job if future CD must update its image before execution.
- Do not ignore the entire `site_config`, job template, container block, or application settings.
- Validate the lifecycle paths against the installed AzureRM provider schema.
- Document clearly that image revisions are CD-owned while infrastructure remains Terraform-owned.

## 6. Documentation

Update:

- `infra/terraform/README.md`
- `docs/azure-infrastructure.md`
- `docs/azure-deployment-readiness.md`
- architecture source diagrams only if the persistent migration job materially changes the documented architecture.

Document:

- the permanent manual migration job;
- the safe deployment order:
  1. build and push immutable image;
  2. update migration-job image;
  3. start exactly one migration execution;
  4. require successful completion;
  5. update App Service image;
  6. deploy frontend;
  7. run health and routing checks;
- OIDC trust boundary;
- least-privilege roles;
- image-ownership boundary between Terraform and CD;
- expected additional Azure resources and cost considerations;
- rollback behavior;
- that CD remains unimplemented until the later workflow task.

Create:

`docs/ai-interactions/021-cd-terraform-foundation.md`

Include:

- this exact prompt;
- decisions and tradeoffs;
- files changed;
- Terraform resources introduced;
- role assignments and scopes;
- validation performed;
- security and cost findings;
- assumptions;
- deferred GitHub and CD work;
- `Human Review: Pending`;
- `Final Status: Awaiting human review`.

Add Interaction 021 to the interaction index.

## 7. Validation

Run only local, non-mutating validation:

- Terraform formatting;
- backend-disabled Terraform initialization;
- `terraform validate`;
- provider-schema validation of lifecycle ignore paths where possible;
- documentation formatting;
- Git whitespace checks;
- focused secret/sensitive-artifact checks.

Use a temporary clean validation copy containing tracked Terraform configuration if required to avoid reading real ignored environment inputs.

Do not run:

- Terraform plan, apply, refresh, import, destroy, output, console, show, or state commands;
- Azure CLI mutation commands;
- GitHub CLI mutation commands;
- Container Apps creation;
- role-assignment creation;
- Git staging, commit, push, tag, branch, or PR operations.

Do not inspect real `.env`, `terraform.tfvars`, backend configuration, state files, saved plans, credentials, or secret values.

Return:

- proposed resources and names;
- exact role assignments and scopes;
- image-ownership implementation;
- files changed;
- validation results;
- provider/documentation references used;
- cost and security findings;
- any blockers;
- exact `git status --short`;
- recommended commit message;
- exact human commands needed later to create and review a Terraform plan, but do not execute them.
```

## Model Response

## Summary

Stopped before implementing Terraform, as required by the prompt’s least-privilege stop condition. AzureRM 5.10.0 can model the requested infrastructure, but Azure authorization cannot enforce the approved boundary for the migration job.

Microsoft documents that a principal with `Microsoft.App/jobs/start/action` can use a Container Apps Job’s secrets when it knows their names, including by supplying a container of its choosing. Granting the GitHub identity job update/start access would therefore give it effective use of `DATABASE_PASSWORD` and the job identity, even without direct Key Vault RBAC. Azure RBAC has no field-level condition that limits a job write to only `template.container.image`, and no start permission variant that disables execution overrides.

No Terraform, Azure, GitHub, application, or permanent deployment-documentation change was made. Interaction 021 records the blocked preflight and is indexed.

## Proposed resources and names

These are proposals only; none were added:

- Subnet `container-apps-environment`, `10.40.3.0/24`, delegated to `Microsoft.App/environments`.
- Workload-profiles environment `azure-weather-prod-cae-d2cc26`, with a Consumption profile and existing Log Analytics integration.
- Migration identity `azure-weather-prod-migration-mi-d2cc26`.
- Manual migration job `azure-weather-prod-migrate-d2cc26`.
- GitHub deployment identity `azure-weather-prod-github-cd-mi-d2cc26`.
- Federated credential `github-production`, restricted to `repo:NivBar2000/Azure_weather_Project:environment:production`.
- Identifier-only outputs for the two Container Apps names and OIDC identity/subscription/tenant metadata.

## Proposed role assignments and scopes

None were created. The intended assignments were:

- Migration identity: `AcrPull` (`7f951dda-4ed3-4680-a7ca-43fe172d538d`) at the existing ACR.
- Migration identity: `Key Vault Secrets User` (`4633458b-17de-408a-b874-0445c86b69e6`) at the production Key Vault.
- GitHub identity: `AcrPush` (`8311e382-0749-4cb8-b61a-304f252e45ec`) at the existing ACR.
- GitHub identity: `Website Contributor` (`de139f84-1756-47ae-9be6-808fbbe84772`) at the backend App Service only.
- GitHub identity: `Storage Blob Data Contributor` (`ba92f5b4-2d11-453d-a403-e96b0029c9fe`) at the frontend `$web` container.
- GitHub identity: `CDN Profile Contributor` (`ec156ff8-a8d1-4d15-830c-5b80698ca432`) at the existing Front Door endpoint.
- Blocked assignment: `Container Apps Jobs Contributor` (`4e3d2b60-56ae-4dc6-a233-09c8e5a82e68`) at the migration job. Even at job scope, this permits the secret-use path described above. A custom role omitting delete would not fix that gap because job write/start remain sufficient.

No subscription-level or resource-group role, general Reader, Owner, User Access Administrator, direct Key Vault role for GitHub, database credential, or Terraform-state permission was proposed.

## Intended image ownership

Provider-schema inspection confirmed these narrow lifecycle paths are structurally valid:

```hcl
site_config[0].application_stack[0].docker_image_name
template[0].container[0].image
```

They would leave registry authentication, settings, networking, health checks, access restrictions, job command/environment/identity, and all other infrastructure under Terraform ownership. They were not added because the authorization design is unresolved.

## Files changed

- `docs/ai-interactions/README.md`
- `docs/ai-interactions/021-cd-terraform-foundation.md`

## Validation results

- Full repository/Terraform/documentation preflight — completed without reading secret values or Azure/GitHub state.
- AzureRM 5.10.0 provider-schema inspection in an isolated provider-only directory — passed for the proposed resource blocks and narrow lifecycle paths.
- `npm.cmd run format:check` — passed.
- Tracked-only `terraform fmt -check -recursive` in a temporary clean archive — passed.
- Tracked-only `terraform init -backend=false -input=false -no-color` — passed with AzureRM 5.10.0.
- Tracked-only `terraform validate -no-color` — passed.
- `git diff --check` — passed; Git emitted only the existing LF-to-CRLF working-copy warning for the interaction index.
- Exact-prompt comparison against the supplied attachment — passed.
- Focused secret-pattern scan of the intended changes — passed.
- Temporary validation directories were removed; no provider data, state, plan, or generated output remains in the working tree.

An initial direct `terraform fmt -check -recursive infra/terraform` attempt encountered the inaccessible user Terraform CLI directory and reported the path of the ignored real `infra/terraform/terraform.tfvars`. The command may have parsed that file for formatting, contrary to the requested isolation rule; it printed no file content or value. I stopped using the live directory and ran all successful Terraform checks from a tracked-only temporary archive. No backend configuration, state, plan, credential, or secret value was displayed, copied, persisted, or committed.

## Documentation and provider references

- [AzureRM Container App Environment](https://registry.terraform.io/providers/hashicorp/azurerm/5.10.0/docs/resources/container_app_environment)
- [AzureRM Container App Job](https://registry.terraform.io/providers/hashicorp/azurerm/5.10.0/docs/resources/container_app_job)
- [AzureRM Federated Identity Credential](https://registry.terraform.io/providers/hashicorp/azurerm/5.10.0/docs/resources/federated_identity_credential)
- [Microsoft: Jobs in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/jobs)
- [Microsoft: Manage secrets in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets)
- [Microsoft: Networking in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/custom-virtual-networks)
- [Microsoft: GitHub OIDC with Azure](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect)
- [Microsoft: Azure built-in roles for containers](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/containers)

## Security and cost findings

The blocker is an effective-secret-access problem, not missing provider syntax. GitHub Environment approval protects workflow entry, but it does not create an Azure authorization boundary once the federated identity receives job start/update rights.

No resources were created, so this interaction adds no cost. If later approved, expected cost areas are Container Apps job execution, Container Apps environment/network consumption, and Log Analytics ingestion; the dedicated `/24` also permanently consumes VNet address space. Managed identities, federated credentials, and role assignments have no direct service charge.

## Required architectural decision

Choose one trust model before implementation:

1. Explicitly trust the protected GitHub production deployment identity with effective use of the migration secret. This is the smallest implementation, but relaxes the stated credential-isolation requirement.
2. Keep GitHub away from migration-job update/start permissions and require a separate trusted human/operator identity to update and start the job. This preserves separation but prevents fully automated ordered CD.
3. Replace password-based migration authentication with PostgreSQL Microsoft Entra authentication for the migration identity. This best preserves automated CD and credential isolation, but is a broader database/application design change.
4. Introduce a trusted deployment broker that validates an allowed immutable ACR digest and starts the job. This preserves automation but adds a new service, authorization surface, operational burden, and cost.

Recommendation: option 3 for the strongest durable boundary; option 2 if minimizing current scope is more important than full CD automation.

## Exact `git status --short`

```text
 M docs/ai-interactions/README.md
?? docs/ai-interactions/021-cd-terraform-foundation.md
```

Recommended commit message:

```text
docs: record CD Terraform authorization blocker
```

## Human plan commands

Do not run these yet: the requested Terraform foundation has not been implemented. After selecting a trust model, completing and reviewing the implementation, run from the repository root:

```powershell
Set-Location infra/terraform
terraform fmt -check -recursive
terraform init -backend-config=backend.hcl -reconfigure
terraform validate
terraform plan -var-file=terraform.tfvars -out=tfplan-cd-foundation
terraform show -no-color tfplan-cd-foundation
```

Treat the saved plan and `terraform show` output as sensitive, keep them out of Git, and review resource replacements, role scopes, network rules, lifecycle ignores, outputs, and all secret-bearing fields before any apply. No apply command is recommended until the permission model is approved.

## Files Changed

- `docs/ai-interactions/README.md`
- `docs/ai-interactions/021-cd-terraform-foundation.md`

## Terraform Resources Introduced

None. The required authorization boundary cannot be represented safely, so implementation stopped before infrastructure changes.

## Role Assignments and Scopes

None introduced. The proposed deployment identity's migration-job permission is the unresolved blocker.

## Validation

- AzureRM 5.10.0 provider schema was inspected in a temporary provider-only configuration.
- Official AzureRM and Microsoft documentation was reviewed for the proposed resources and authorization behavior.
- Repository checks are recorded in the final report.

## Security Notes

Granting the deployment identity the required job update and start actions would give it effective use of the job's database-password secret and migration managed identity, despite withholding direct Key Vault access.

## Cost Findings

No Azure resource was created. The proposed design would add Container Apps environment/job execution and Log Analytics ingestion costs, plus permanent subnet address-space consumption; managed identities, federated credentials, and role assignments do not themselves add service charges.

## Assumptions

- The requirement that the GitHub identity must not receive PostgreSQL credentials includes indirect ability to inject the configured database-password secret into a chosen container.
- The GitHub environment approval boundary does not replace Azure least-privilege enforcement.

## Deferred Work

- Terraform infrastructure, OIDC identity, role assignments, image ownership, and permanent deployment documentation await a human architectural decision.
- The GitHub Actions CD workflow remains unimplemented.

## Human Review

Pending

## Final Status

Awaiting human review

---

## Follow-up Review Note: Trust Model 1 Implementation

The human selected trust model 1 and explicitly accepted that the protected GitHub production deployment identity will have effective use of the migration job's database secret through its job update/start permissions. This resolves the authorization blocker recorded in the original response without rewriting the original prompt or response.

### Exact Follow-up Prompt

```text
Continue from Interaction 021 and implement the previously proposed Terraform CD foundation.

Architectural decision: use trust model 1. We explicitly accept that the protected GitHub production deployment identity will have effective use of the migration job’s database secret through its job update/start permissions. Document this accepted risk clearly.

Requirements:

- Create the dedicated `10.40.3.0/24` Container Apps subnet.
- Create the Container Apps environment and manual migration job.
- Use a dedicated managed identity for the migration job with only `AcrPull` and `Key Vault Secrets User`.
- Reference the existing versionless Key Vault database-password secret. Never expose its value.
- Create the GitHub CD managed identity and federated credential restricted to:\
  `repo:NivBar2000/Azure_weather_Project:environment:production`
- Grant only the previously proposed resource-scoped deployment roles for ACR, App Service, frontend storage, Front Door purge, and the migration job.
- Do not grant subscription/resource-group Contributor, Owner, User Access Administrator, Terraform-state access, or direct Key Vault access to GitHub.
- Add narrow lifecycle ignores only for backend and migration container image fields so CD owns image revisions while Terraform owns all remaining configuration.
- Add safe identifier-only outputs required by the future CD workflow.
- Update relevant documentation and Interaction 021 with the decision and implementation.

Safety constraints:

- Read and follow `AGENTS.md`.
- Do not inspect or modify real `.env`, `terraform.tfvars`, Terraform state, or saved plan files.
- Do not run Azure/GitHub mutations, Terraform plan/apply/destroy/import/refresh, commit, or push.
- Validate only with formatting, `terraform init -backend=false`, `terraform validate`, documentation checks, and `git diff --check`.
- Preserve unrelated changes.
- Stop and report if implementation requires permissions broader than those explicitly approved.

Return a concise summary of resources, role assignments and scopes, files changed, validation results, security/cost findings, exact `git status --short`, and the commands I should run later for human-reviewed Terraform plan only.
```

### Follow-up Implementation Summary

- Added the permanent Container Apps subnet, workload-profiles environment, manual migration job, job identity, GitHub CD identity, federated credential, narrowly scoped role assignments, identifier-only outputs, and image-only lifecycle ownership boundaries.
- Preserved Terraform ownership of every non-image App Service and migration-job field.
- Documented trust model 1 as an accepted secret-use capability and retained CD workflow implementation as deferred work.
- Updated both architecture source diagrams to show the persistent migration job and OIDC deployment boundary.

### Follow-up Model Response

## Summary

Implemented the Terraform CD foundation under the approved trust model 1. No Azure or GitHub resource was queried or changed, and no Terraform plan or deployment command was run.

The configuration adds:

- Dedicated `10.40.3.0/24` subnet `container-apps-environment`, delegated to `Microsoft.App/environments`, included in three-way containment/overlap checks and the existing deny-by-default Key Vault network allowlist.
- Workload-profiles Container Apps environment with a Consumption profile and existing Log Analytics integration.
- Manual migration job with one replica, one required completion, zero retries, a 900-second timeout, and the exact production TypeORM command. It receives only the six database environment variables and resolves `DATABASE_PASSWORD` from the existing versionless Key Vault reference.
- Dedicated migration identity with only `AcrPull` at the existing ACR and `Key Vault Secrets User` at the production vault.
- Separate GitHub CD identity and federated credential restricted to `repo:NivBar2000/Azure_weather_Project:environment:production`.
- Identifier-only outputs for GitHub client/principal/tenant/subscription IDs and the migration job/environment names. Existing outputs already identify ACR, App Service, frontend storage, and Front Door.
- Image-only lifecycle ownership: CD owns the App Service Docker image and migration-job container image; Terraform retains every other configuration field.

## Role assignments and scopes

The GitHub identity receives exactly five resource-scoped roles:

- `AcrPush` — existing backend ACR.
- `Website Contributor` — existing backend App Service only.
- `Storage Blob Data Contributor` — frontend `$web` container only.
- `CDN Profile Contributor` — existing Front Door endpoint only.
- `Container Apps Jobs Contributor` — migration job only.

It receives no subscription/resource-group Contributor, Owner, User Access Administrator, direct Key Vault role, Terraform-state permission, or database credential output.

## Files changed

- `docs/ai-interactions/README.md`
- `docs/ai-interactions/021-cd-terraform-foundation.md`
- `docs/azure-architecture.drawio`
- `docs/azure-architecture.mmd`
- `docs/azure-deployment-readiness.md`
- `docs/azure-infrastructure.md`
- `infra/terraform/README.md`
- `infra/terraform/app-service.tf`
- `infra/terraform/container-apps-migration.tf`
- `infra/terraform/github-cd-identity.tf`
- `infra/terraform/key-vault.tf`
- `infra/terraform/locals.tf`
- `infra/terraform/networking.tf`
- `infra/terraform/outputs.tf`
- `infra/terraform/variables.tf`

## Validation results

- Explicit-file Terraform formatting — passed without reading ignored input files.
- Tracked/current Terraform configuration copied to an isolated temporary directory — passed `terraform fmt -check`.
- `terraform init -backend=false -input=false -no-color` — passed with locked AzureRM 5.10.0.
- `terraform validate -no-color` — passed.
- `npm.cmd run format:check` — passed.
- Draw.io XML parsing and focused Mermaid node checks — passed.
- `git diff --check` — passed; only Git LF-to-CRLF working-copy warnings were emitted.
- RBAC-count, prohibited-role, exact OIDC-subject, six-variable migration environment, and versionless-secret-reference assertions — passed.
- Focused secret and sensitive/generated-artifact checks — passed.
- Temporary validation directories were removed. No state, plan, `.env`, real variable/backend file, credential, secret value, or generated application output is present in the intended changes.

## Security and cost findings

Trust model 1 is documented as an accepted risk: job update/start access gives the protected GitHub identity effective use of the migration database secret and attached job identity, consistent with the [Microsoft Container Apps Jobs security guidance](https://learn.microsoft.com/en-us/azure/container-apps/jobs). Because it also controls the backend image, it is a trusted production release principal capable of deploying code that runs with App Service runtime configuration. Withholding direct Key Vault RBAC does not eliminate those workload-control capabilities.

Compensating controls required for the later workflow are protected GitHub Environment approval, immutable image digests, deployment concurrency, minimal workflow permissions, sanitized logs, and strict ordered migration/application gates. The CD workflow remains unimplemented.

No cost was created by this repository-only task. A later apply would add Container Apps environment/job execution and Log Analytics usage, and permanently consume the `/24` VNet allocation. Managed identities, federation, and RBAC assignments have no direct service charge.

## Exact `git status --short`

```text
 M docs/ai-interactions/README.md
 M docs/azure-architecture.drawio
 M docs/azure-architecture.mmd
 M docs/azure-deployment-readiness.md
 M docs/azure-infrastructure.md
 M infra/terraform/README.md
 M infra/terraform/app-service.tf
 M infra/terraform/key-vault.tf
 M infra/terraform/locals.tf
 M infra/terraform/networking.tf
 M infra/terraform/outputs.tf
 M infra/terraform/variables.tf
?? docs/ai-interactions/021-cd-terraform-foundation.md
?? infra/terraform/container-apps-migration.tf
?? infra/terraform/github-cd-identity.tf
```

## Human-reviewed plan commands

Run only after reviewing these repository changes and confirming the intended Azure identity/context. The saved plan and rendered plan may contain sensitive infrastructure data; keep both out of Git and approved logs.

```powershell
Set-Location infra/terraform
terraform fmt -check -recursive
terraform init -backend-config=backend.hcl -reconfigure
terraform validate
terraform plan -var-file=terraform.tfvars -out=tfplan-cd-foundation
terraform show -no-color tfplan-cd-foundation
```

Do not apply until the plan has been independently reviewed for replacements, role scopes, Key Vault network changes, Container Apps networking, lifecycle behavior, outputs, and secret-bearing fields. The first plan/live validation must also confirm provider registration, regional availability, role-assignment authority, identity propagation, and whether the endpoint-scoped Front Door role permits the required purge operation.

### Follow-up Human Review

Pending

### Follow-up Final Status

Awaiting human review

### Review Note: Migration Job Name-Length Correction

The historical preflight response above proposed `azure-weather-prod-migrate-d2cc26`; it is preserved verbatim under the interaction-log rules. Before any plan or deployment, Interaction 023 corrected the implemented Terraform name to `azure-weather-prod-mig-d2cc26`, which is the sole effective migration-job name for this foundation.
