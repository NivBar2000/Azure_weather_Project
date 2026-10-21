# Front Door Custom Domain Stage 1

## Tool

Codex

## Model

Not exposed by the client

## Date

2026-10-21

## Objective

Add the non-disruptive first Terraform stage for `www.nivbarweather.com`, expose DNS-validation data, preserve the existing Front Door hostname, and provide an explicit later switch that associates the custom domain with both existing routes.

## Relevant Decisions

- The custom-domain resource always exists and requests an Azure-managed certificate with `TLS12` as its minimum version.
- `front_door_custom_domain_association_enabled` defaults to `false`, so Stage 1 does not associate the domain with either route.
- One Boolean controls both route association lists, preventing a partial frontend-only or API-only activation.
- Both routes retain `link_to_default_domain = true`, preserving the existing Azure Front Door hostname.
- Namecheap DNS, Entra redirects, backend origin/CORS settings, GitHub variables, application code, and CI/CD behavior remain outside this stage.

## Exact Prompt

```text
Implement the first, non-disruptive Terraform stage for adding the production custom domain `www.nivbarweather.com` to Azure Front Door.

First inspect the existing Terraform configuration, repository instructions, locked AzureRM provider version, Front Door profile, endpoint, routes, variables, outputs, documentation conventions, and existing uncommitted changes. Preserve all unrelated work.

Requirements:

1. Add an Azure Front Door custom-domain resource for the exact hostname:\
   `www.nivbarweather.com`
2. Use an Azure-managed certificate with TLS 1.2 or later.
3. This must be a staged deployment:
   - Stage 1 creates the custom-domain resource and exposes the DNS-validation information.
   - Do not associate the custom domain with any Front Door route yet if validation is required first.
   - Provide an explicit, safe mechanism for enabling route association later after DNS validation.
   - When enabled later, the domain must be associated with every required route so both the frontend and `/api/*` continue through the same hostname.
4. Add useful non-sensitive Terraform outputs, including:
   - custom-domain hostname
   - DNS validation token
   - expected TXT record host/name
   - existing Front Door endpoint hostname that the future `www` CNAME must target
   - current association-enabled state
5. Do not create or manage Namecheap resources. Document the future DNS records clearly, but do not invent the TXT value:
   - TXT host expected for `www.nivbarweather.com`
   - TXT value taken from Terraform output
   - CNAME host `www`
   - CNAME target: the existing Azure Front Door endpoint hostname
   - TTL: Automatic
6. Keep the existing Azure Front Door URL operational throughout the transition.
7. Do not yet change:
   - Microsoft Entra redirect URIs
   - backend CORS/origin settings
   - GitHub repository variables
   - application source code
   - CI/CD workflow behavior\
     These will be handled after Azure validates the domain and issues the certificate.
8. Update the relevant Terraform README, infrastructure/deployment documentation, architecture sources if applicable, and the repository’s AI-interaction log/index according to its existing conventions. Record the exact prompt and clearly mark human review as pending.

Validation:

- Run Terraform formatting checks.
- Run `terraform init -backend=false` and `terraform validate` in a safe isolated manner if required by repository policy.
- Verify from the installed provider schema that all resource arguments and exported validation attributes are supported by the locked AzureRM version.
- Run repository formatting/documentation checks and `git diff --check`.
- Review the final diff for accidental secret, state, plan, generated-file, or unrelated changes.

Restrictions:

- Do not run Terraform plan, apply, refresh, import, destroy, or state commands.
- Do not execute Azure CLI, Microsoft Graph, GitHub mutation, DNS, deployment, commit, or push operations.
- Do not inspect or modify real secrets, `.env` files, `terraform.tfvars`, Terraform state, saved plans, or credentials.
- Do not remove or replace existing lifecycle protections or unrelated Front Door behavior.

At the end, report:

- exact files changed
- the staged design used
- validation results
- any provider limitations discovered
- the exact human commands for creating and reviewing the Stage 1 Terraform plan
- which Terraform outputs must be copied into Namecheap
- the later steps that remain deferred
```

## Model Response

## Summary

- Added `www.nivbarweather.com` as an Azure Front Door custom domain using an Azure-managed certificate with minimum TLS 1.2.
- Stage 1 is non-disruptive: `front_door_custom_domain_association_enabled` defaults to `false`, so neither route is associated. The later `true` setting associates the domain with both `/api/*` and `/*` in one change, while `link_to_default_domain = true` keeps the existing Front Door hostname operational.
- Added the requested hostname, DNS token, TXT host, endpoint hostname, and association-state outputs. Namecheap remains manual.
- No plan, apply, cloud/DNS/GitHub mutation, application change, workflow change, commit, or push was performed.

## Exact files changed

- `README.md`
- `docs/azure-deployment-readiness.md`
- `docs/azure-infrastructure.md`
- `docs/ai-interactions/029-front-door-custom-domain-stage-1.md`
- `docs/ai-interactions/README.md`
- `infra/terraform/README.md`
- `infra/terraform/front-door.tf`
- `infra/terraform/outputs.tf`
- `infra/terraform/terraform.tfvars.example`
- `infra/terraform/variables.tf`
- `infra/terraform/terraform.tfvars` was unintentionally reformatted by `terraform fmt -recursive`; it is ignored, its contents were not displayed, and values were not intentionally changed. This whitespace-only local-file change cannot be reconstructed without inspecting the prohibited file, so human restoration from editor/file history is required if its exact prior formatting matters.

## Staged design

- Stage 1 creates `azurerm_cdn_frontdoor_custom_domain.www`, requests `ManagedCertificate` with `TLS12`, and exposes Azure's computed validation token. Route association stays empty by default.
- The single Boolean gate populates `cdn_frontdoor_custom_domain_ids` on both the API and frontend routes together. It cannot enable only one route through the supported interface.
- Both routes retain their current patterns, origins, caching behavior, redirects, and `link_to_default_domain = true` setting.
- No Namecheap resource or DNS value is hard-coded; `_dnsauth.www` is only the expected relative TXT host.

## Validation performed

- PASS — locked provider confirmed as AzureRM `5.10.0` from `.terraform.lock.hcl`.
- PASS — installed-provider schema confirms the custom-domain resource fields, computed `validation_token`, TLS block, and route `cdn_frontdoor_custom_domain_ids` are supported.
- PASS — `terraform fmt -check -recursive` against a sanitized temporary copy of committed Terraform files.
- PASS — `terraform init -backend=false` and `terraform validate` in that isolated copy, reusing the installed locked provider without backend or state access.
- PASS — `npm.cmd run build`; backend and frontend built successfully. Vite repeated its existing advisory for a minified chunk over 500 kB.
- PASS — `npm.cmd run lint`.
- PASS — `npm.cmd test -- --runInBand`; 13 backend suites/95 tests and 1 frontend suite/24 tests passed (119 total). npm warned that forwarding `--runInBand` as a CLI config is deprecated.
- PASS — `npm.cmd run format:check`.
- PASS — `git diff --check`.
- PASS — final tracked-diff/status review found no secret value, Terraform state, saved plan, generated build output, dependency/lockfile change, application-source change, workflow change, or unrelated tracked change.
- PRESERVED — untracked `docs/Detailed_Cloud_Infrastructure_Architecture.svg` and `docs/High-Level_Architecture_Overview.jpg` appeared after the initially clean status. They were not inspected, modified, or included because they are unrelated user work.
- WARNING — the initial recursive formatter also reformatted the ignored real `infra/terraform/terraform.tfvars`. Its contents were not displayed, but this violated the requested no-modification boundary; see Exact files changed.

## Provider limitations discovered

- AzureRM 5.10.0 exports `validation_token` and `expiration_date` for this resource, but not a computed domain-validation or managed-certificate provisioning status. The token is unknown until Stage 1 is applied, and a human must verify validation/certificate status through an authorized Azure control-plane view before Stage 2.
- The provider schema supports the required `ManagedCertificate`, `TLS12`, and route-association arguments; no compatibility blocker was found.

## Exact human commands for the Stage 1 plan

Run these only from an authorized environment with the existing untracked production inputs and secured backend configuration:

```powershell
Set-Location infra/terraform
terraform init -reconfigure -backend-config=backend.hcl
terraform fmt -check -recursive
terraform validate
terraform plan -out=tfplan-stage1-custom-domain -target=azurerm_cdn_frontdoor_custom_domain.www -var="front_door_custom_domain_association_enabled=false"
terraform show -no-color tfplan-stage1-custom-domain
```

The target intentionally isolates Stage 1 from other pending infrastructure changes. Review Terraform's targeted-plan warning, confirm the plan creates only the custom domain and outputs without changing either route, keep the saved plan out of Git, and run a full plan after the staged change is complete.

## Namecheap values after the authorized Stage 1 apply

| Record | Host                                                                                       | Value/target to copy                                   | TTL       |
| ------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ | --------- |
| TXT    | output `front_door_custom_domain_dns_validation_txt_record_host` (expected `_dnsauth.www`) | output `front_door_custom_domain_dns_validation_token` | Automatic |
| CNAME  | `www`                                                                                      | output `front_door_endpoint_hostname`                  | Automatic |

Also use `front_door_custom_domain_hostname` and `front_door_custom_domain_association_enabled` for review; they are not DNS record values. Do not invent the TXT token. Create the TXT first; publish the CNAME only after the later readiness gates are complete.

## Security or dependency findings

- No secret, credential, token value, state, plan, Namecheap configuration, or dependency was added to tracked files.
- No dependency or lockfile changed, so dependency audits were not required.
- The ignored local `terraform.tfvars` formatting incident is disclosed above; no value was intentionally altered or exposed.

## Assumptions

- Namecheap expects relative host labels, so the TXT host is `_dnsauth.www` and the CNAME host is `www`.
- The existing remote backend and untracked production variable files remain the human operator's approved inputs; they were not inspected.
- The architecture diagram remains unchanged because the custom hostname terminates at the existing Front Door component and adds no new topology node.

## Deferred work

- Human review, Stage 1 plan approval/apply, and copying the resulting TXT output into Namecheap.
- Waiting for Azure domain validation and managed-certificate issuance, then verifying that status through an authorized Azure view.
- A full Stage 2 plan/apply with `front_door_custom_domain_association_enabled=true`, confirming both routes are associated.
- Separately authorized Entra redirect URI, backend CORS/origin, GitHub repository-variable, frontend build/configuration, and deployment changes.
- Publishing the `www` CNAME, end-to-end HTTPS/auth/frontend/API verification, monitoring, and rollback testing while retaining the existing Front Door URL.
- Human restoration of the ignored local `terraform.tfvars` formatting from editor/file history if exact whitespace preservation is required.

## Documentation status

- Terraform, infrastructure, deployment-readiness, root README, and Interaction 029 documentation are synchronized. Architecture diagram sources were intentionally unchanged because topology did not change.
- Human Review: Pending.
- Final Status: Awaiting human review.

## Files Changed

The exact file list is included in the Model Response above.

## Validation

The commands and outcomes are recorded in the Model Response above.

## Security Notes

No secret or sensitive value was added or displayed. The ignored `terraform.tfvars` formatting incident is explicitly disclosed in the Model Response.

## Assumptions

Namecheap uses relative host labels, and the custom hostname remains at the existing Front Door topology boundary.

## Deferred Work

All cloud, DNS, route activation, identity/origin configuration, deployment, and live verification steps remain human-controlled and deferred.

## Human Review

Checked and approved by the human reviewer on 2026-10-21.

## Final Status

Approved
