# Interaction 024: Azure-Managed Tag Drift

## Tool

Codex

## Model

GPT-5

## Date

2026-10-21

## Objective

Prevent perpetual Terraform drift from the externally managed `created_By` and `created_Date` tag keys while retaining Terraform ownership of every project-defined tag and all existing lifecycle behavior.

## Relevant decisions

- Apply lifecycle ignores to the two exact tag map entries on every managed resource using `local.common_tags`.
- Never ignore the complete `tags` attribute.
- Merge the two tag paths into existing App Service, migration-job, and PostgreSQL lifecycle blocks without removing image ownership or database availability safeguards.
- Make no resource-name, networking, RBAC, secret, image, or runtime behavior change.

## Exact Prompt

```text
Fix the perpetual Terraform drift caused by Azure-managed tags `created_By` and `created_Date`.

Inspect the current Terraform configuration and add narrow lifecycle ignores for exactly:

- `tags["created_By"]`
- `tags["created_Date"]`

Apply this to every managed resource that uses the project’s common tags and can receive these externally managed tags.

Requirements:

- Do not ignore the entire `tags` attribute.
- Preserve Terraform ownership of all project tags.
- Where a resource already has a `lifecycle` block, merge these tag paths into it.
- Preserve the existing image-only lifecycle ignores for App Service and the Container Apps migration job.
- Do not change infrastructure behavior, resource names, role assignments, networking, secrets, or image ownership.
- Update relevant documentation and add/index the AI interaction record required by repository instructions.

Do not inspect real `.env`, `terraform.tfvars`, backend configuration, state, or saved plans. Do not run Terraform plan/apply, Azure commands, commit, or push.

Run safe formatting, isolated `terraform init -backend=false`, `terraform validate`, documentation checks, focused assertions that only the two tag keys are ignored, and `git diff --check`.

Return the exact resources/files changed, validation results, and any resource where the lifecycle ignore could not be applied safely.
```

## Model Response

## Summary

Added narrow lifecycle ignores for exactly `tags["created_By"]` and `tags["created_Date"]` to all 18 managed resources that use `local.common_tags`. No resource ignores the complete `tags` map, so Terraform continues to own every project-defined tag.

Existing lifecycle behavior was merged rather than replaced: App Service and the migration job retain their image-only ignores, while PostgreSQL retains its availability-zone ignores and destruction protection. No resource name, role, network, secret, image-ownership boundary, or runtime behavior changed.

## Exact resources changed

- `azurerm_service_plan.backend`
- `azurerm_linux_web_app.backend`
- `azurerm_monitor_autoscale_setting.backend`
- `azurerm_container_registry.backend`
- `azurerm_postgresql_flexible_server.production`
- `azurerm_cdn_frontdoor_profile.production`
- `azurerm_cdn_frontdoor_endpoint.production`
- `azurerm_key_vault.production`
- `azurerm_log_analytics_workspace.production`
- `azurerm_application_insights.backend`
- `azurerm_virtual_network.production`
- `azurerm_private_dns_zone.postgresql`
- `azurerm_private_dns_zone_virtual_network_link.postgresql`
- `azurerm_storage_account.frontend`
- `azurerm_user_assigned_identity.migration`
- `azurerm_container_app_environment.migration`
- `azurerm_container_app_job.migration`
- `azurerm_user_assigned_identity.github_cd`

No common-tag resource was excluded or found unsafe for the two key-level lifecycle paths.

## Exact files changed by this interaction

- `infra/terraform/app-service.tf`
- `infra/terraform/container-apps-migration.tf`
- `infra/terraform/container-registry.tf`
- `infra/terraform/database.tf`
- `infra/terraform/front-door.tf`
- `infra/terraform/github-cd-identity.tf`
- `infra/terraform/key-vault.tf`
- `infra/terraform/monitoring.tf`
- `infra/terraform/networking.tf`
- `infra/terraform/storage.tf`
- `infra/terraform/README.md`
- `docs/azure-infrastructure.md`
- `docs/azure-deployment-readiness.md`
- `docs/ai-interactions/README.md`
- `docs/ai-interactions/024-azure-managed-tag-drift.md`

All earlier CD-foundation and correction changes were preserved.

## Validation results

- Isolated `terraform fmt -check` — passed against the complete current Terraform configuration.
- Isolated `terraform init -backend=false -input=false -no-color` — passed with locked AzureRM 5.10.0.
- Isolated `terraform validate -no-color` — passed.
- Resource-by-resource lifecycle assertions — passed for all 18 common-tag resources.
- Exact-key count assertions — passed with 18 `created_By` and 18 `created_Date` paths.
- Whole-attribute assertion — passed; no `tags` attribute is ignored as a whole.
- Existing App Service and migration-job image-ignore assertions — passed.
- `npm.cmd run format:check` — passed.
- `git diff --check` — passed; Git emitted only LF-to-CRLF working-copy warnings.
- Sensitive/generated-artifact scope check — passed.

## Security and deferred work

No secret, real `.env`, `terraform.tfvars`, backend configuration, state, or saved plan was inspected or modified. No Terraform plan/apply, Azure command, commit, or push was run. A future human-reviewed plan must confirm that the two governance tags no longer produce drift while all other tag changes remain visible.

## Documentation status

Permanent Terraform and Azure documentation explains the two-key ownership exception. Interaction 024 contains the exact prompt and is indexed with Human Review pending and Final Status awaiting human review.

## Files Changed

- `infra/terraform/app-service.tf`
- `infra/terraform/container-apps-migration.tf`
- `infra/terraform/container-registry.tf`
- `infra/terraform/database.tf`
- `infra/terraform/front-door.tf`
- `infra/terraform/github-cd-identity.tf`
- `infra/terraform/key-vault.tf`
- `infra/terraform/monitoring.tf`
- `infra/terraform/networking.tf`
- `infra/terraform/storage.tf`
- `infra/terraform/README.md`
- `docs/azure-infrastructure.md`
- `docs/azure-deployment-readiness.md`
- `docs/ai-interactions/README.md`
- `docs/ai-interactions/024-azure-managed-tag-drift.md`

## Validation

- Terraform formatting, backend-disabled initialization, and validation passed in an isolated copy.
- All 18 common-tag resources passed exact-key and whole-tag ownership assertions.
- Documentation formatting, Git whitespace, and sensitive-artifact checks passed.

## Security Notes

No secret, environment input, backend configuration, state, or saved plan was inspected or changed.

## Assumptions

- `created_By` and `created_Date` are externally managed governance tags and their exact case is stable.
- Every Azure resource in this module that receives project common tags can safely use Terraform lifecycle metadata for individual map keys.

## Deferred Work

- Terraform planning, deployment, and live drift confirmation remain human-controlled and outside this interaction.

## Human Review

Checked and approved by the human reviewer on 2026-10-21.

## Final Status

Approved
