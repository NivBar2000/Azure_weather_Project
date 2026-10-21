# Interaction 014: Storage Data-Plane Authentication

## Tool

Codex

## Model

GPT-5

## Date

2026-10-20

## Objective

Correct AzureRM Storage data-plane authentication after the first production apply partially failed while preserving disabled Shared Key access and keeping deployment-operator role assignment outside the workload module.

## Relevant decisions

- Configure AzureRM with `storage_use_azuread = true` so Storage Blob/Queue data-plane operations use Microsoft Entra authentication.
- Keep `shared_access_key_enabled = false` on the frontend storage account.
- Require the Terraform execution identity to receive an appropriate Storage Blob data-plane role through a separately controlled manual process.
- Do not add a named human or deployment-operator role assignment to this workload module.
- Preserve the remaining reviewed architecture and unrelated in-progress deployment files.

## Exact Prompt

```text
Read and follow `AGENTS.md`.

The first production Terraform apply partially succeeded. Most Azure resources were created, but `azurerm_storage_account_static_website.frontend` failed with:

`403 KeyBasedAuthenticationNotPermitted: Key based authentication is not permitted on this storage account.`

The frontend storage account intentionally has `shared_access_key_enabled = false`. Keep this security setting disabled.

Implement the smallest safe correction:

1. Configure the AzureRM provider to use Microsoft Entra authentication for Azure Storage Blob/Queue data-plane operations by adding the appropriate `storage_use_azuread` provider setting.
2. Do not enable Shared Key access.
3. Do not add a specific human user or deployment-operator role assignment to Terraform; that permission will be granted separately outside the workload module.
4. Review the surrounding Terraform for consistency, but do not make unrelated architecture changes.
5. Run `terraform fmt -check -recursive` and `terraform validate`. If the local environment prevents provider execution, report that limitation precisely rather than changing the configuration to bypass it.
6. Update the relevant infrastructure/readiness documentation with a short note explaining that the operator running Terraform requires an appropriate Storage Blob data-plane role when Shared Key is disabled.
7. Create/update the next AI interaction record following the repository’s existing documentation format, including this exact prompt, the tools used, changes made, validation results, and review status.
8. Do not run `terraform plan`, `terraform apply`, `terraform destroy`, Azure CLI mutations, commit, or push.

At the end, report:

- files changed;
- the exact provider correction;
- documentation changes;
- validation commands and results;
- the manual Azure permission still required before the next plan/apply.
```

## Model Response

## Summary

Implemented the smallest safe correction for the failed static-website configuration. AzureRM now uses Microsoft Entra authentication for Storage Blob/Queue data-plane operations; Shared Key remains disabled, and no deployment-operator role assignment was added to Terraform.

The exact provider correction in `infra/terraform/providers.tf` is:

```hcl
provider "azurerm" {
  features {}
  storage_use_azuread = true
}
```

## Files changed

- `infra/terraform/providers.tf` — enabled Azure AD authentication for AzureRM Storage data-plane operations.
- `infra/terraform/README.md` — documented the provider behavior and separately managed operator permission.
- `docs/azure-deployment-readiness.md` — added the Terraform execution identity's Blob data-plane requirement to the operator-permissions table.
- `docs/ai-interactions/README.md` — indexed Interaction 014.
- `docs/ai-interactions/014-storage-data-plane-authentication.md` — recorded the exact prompt, correction, validation, and pending review status.

Pre-existing changes in `infra/terraform/locals.tf`, `infra/terraform/networking.tf`, and the untracked `infra/terraform/tfplan` were preserved and not included in this correction. The plan file was not inspected.

## Validation performed

- `terraform fmt -check -recursive` — exit 1. Initially it identified `providers.tf` and an existing ignored `terraform.tfvars`; after formatting only `providers.tf`, it identified only `terraform.tfvars`. The real variable file was not inspected or modified because the task prohibits inspecting or changing real environment inputs.
- `terraform fmt providers.tf` — exit 0; only the changed provider file was formatted.
- `$trackedTerraformFiles = git ls-files 'infra/terraform/*.tf'; terraform fmt -check $trackedTerraformFiles` — exit 0, confirming every tracked Terraform source file is canonically formatted.
- `terraform validate` — exit 0: `Success! The configuration is valid.` Provider execution was available locally.
- `npm.cmd run format:check` — exit 0 after formatting the updated readiness document.
- `git diff --check` — exit 0; Git emitted only existing LF-to-CRLF working-tree warnings.

No Terraform plan, apply, destroy, import, or refresh ran. No Azure CLI command or live Azure query/mutation ran, and no deployment, commit, or push occurred.

## Security or dependency findings

`shared_access_key_enabled = false` remains unchanged. No secret, credential, human identity, or operator role assignment was added to Terraform. There were no dependency changes.

## Assumptions

The existing partially applied infrastructure and its state remain managed by the authorized deployment operator. This correction does not inspect or alter that state.

## Deferred work

Before the next plan/apply, an authorized administrator must separately grant the Terraform execution identity Storage Blob Data Contributor, or an appropriate equivalent Storage Blob data-plane role, scoped to the frontend storage account. Role propagation should be allowed to complete before retrying. The workload module intentionally does not manage this operator access.

## Documentation status

The Terraform README, deployment-readiness runbook, and interaction index are synchronized with the correction. Interaction 014 remains `Human Review: Pending` and `Final Status: Awaiting human review`.

## Files Changed

- `infra/terraform/providers.tf`
- `infra/terraform/README.md`
- `docs/azure-deployment-readiness.md`
- `docs/ai-interactions/README.md`
- `docs/ai-interactions/014-storage-data-plane-authentication.md`

## Validation

- `terraform fmt -check -recursive` — exit 1 because an existing ignored `terraform.tfvars` is not canonically formatted; it was not inspected or modified. After `providers.tf` was formatted, no tracked Terraform file was reported.
- `terraform fmt providers.tf` — exit 0.
- `$trackedTerraformFiles = git ls-files 'infra/terraform/*.tf'; terraform fmt -check $trackedTerraformFiles` — exit 0.
- `terraform validate` — exit 0; configuration valid.
- `npm.cmd run format:check` — exit 0.
- `git diff --check` — exit 0 with line-ending warnings only.
- No Terraform deployment/state command or Azure operation ran.

## Security Notes

- Shared Key access remains disabled.
- No secret values or operator identities are added to Terraform.
- No live Azure operation is required for this correction.

## Assumptions

- The identity used for the next Terraform plan/apply will be granted the documented Blob data-plane permission outside this workload module.
- Existing partially created resources and Terraform state remain under the deployment operator's control and are not inspected or changed by this correction.

## Deferred Work

- Granting and verifying the Terraform execution identity's Storage Blob data-plane role in Azure.
- Re-running plan/apply through the separately authorized deployment process.

## Human Review

Approved after senior review

## Final Status

Approved
