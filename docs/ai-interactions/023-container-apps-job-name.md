# Interaction 023: Container Apps Job Name-Length Correction

## Tool

Codex

## Model

GPT-5

## Date

2026-10-21

## Objective

Correct the proposed production Container Apps migration-job name so it complies with Azure's 32-character resource-name limit without changing any other resource name or behavior.

## Relevant decisions

- Shorten only the migration-job name token from `migrate` to `mig`.
- Use the exact effective production name `azure-weather-prod-mig-d2cc26`.
- Preserve the old proposed name inside the immutable historical Model Response in Interaction 021, while adding a correction note that supersedes it.
- Update permanent documentation and both architecture source diagrams to show the corrected exact name.

## Exact Prompt

```text
Fix the Azure Container Apps Job name-length validation error.
The current proposed name `azure-weather-prod-migrate-d2cc26` exceeds Azure’s 32-character limit. Change the Terraform naming definition to use:
`azure-weather-prod-mig-d2cc26`
Update every repository documentation and diagram reference to the exact new name, including Interaction 021 where applicable. Add/index a concise new AI interaction record if required by repository instructions.
Do not change any other resource name or behavior. Do not inspect secrets or real environment input/state/plan files. Do not run Terraform plan/apply, Azure commands, commit, or push.
Run safe formatting, isolated `terraform init -backend=false`, `terraform validate`, documentation checks, and `git diff --check`. Preserve all existing changes and report the exact files changed and validation results.
```

## Model Response

## Summary

Changed only the Container Apps migration-job naming token from `migrate` to `mig`. With the approved production inputs, Terraform now produces the exact 29-character name `azure-weather-prod-mig-d2cc26`, within Azure's 32-character limit. No other resource name or runtime behavior changed.

Permanent documentation and both architecture source diagrams now show the corrected exact name. Interaction 021 has an appended correction note. Its original prompt/model response remains verbatim as required by the repository, so the obsolete proposal appears there only as immutable historical context and is explicitly superseded.

## Exact files changed by this interaction

- `infra/terraform/locals.tf`
- `infra/terraform/README.md`
- `docs/azure-infrastructure.md`
- `docs/azure-deployment-readiness.md`
- `docs/azure-architecture.mmd`
- `docs/azure-architecture.drawio`
- `docs/ai-interactions/021-cd-terraform-foundation.md`
- `docs/ai-interactions/README.md`
- `docs/ai-interactions/023-container-apps-job-name.md`

All existing CD-foundation and Interaction 022 changes were preserved.

## Validation results

- Isolated `terraform fmt -check` — passed against the complete current Terraform configuration.
- Isolated `terraform init -backend=false -input=false -no-color` — passed with locked AzureRM 5.10.0.
- Isolated `terraform validate -no-color` — passed.
- `npm.cmd run format:check` — passed after formatting the two changed Markdown tables.
- `git diff --check` — passed; Git emitted only LF-to-CRLF working-copy warnings.
- Corrected-name length assertion — passed at 29 characters.
- Terraform naming-expression assertion — passed; the implemented expression is `${local.name_prefix}-mig-${local.compact_suffix}` and the old `migrate` expression is absent.
- Permanent documentation/diagram assertions — passed; all five relevant sources contain `azure-weather-prod-mig-d2cc26` and none contains the obsolete exact name.
- Draw.io XML parsing — passed.

## Security and deferred work

No secret, real `.env`, `terraform.tfvars`, backend configuration, state, or saved plan was inspected or modified. No Terraform plan/apply, Azure command, commit, or push was run. Planning, deployment, and live Azure name validation remain human-controlled and deferred.

## Documentation status

Interaction 023 contains the exact prompt and is indexed with Human Review pending and Final Status awaiting human review.

## Files Changed

- `infra/terraform/locals.tf`
- `infra/terraform/README.md`
- `docs/azure-infrastructure.md`
- `docs/azure-deployment-readiness.md`
- `docs/azure-architecture.mmd`
- `docs/azure-architecture.drawio`
- `docs/ai-interactions/021-cd-terraform-foundation.md`
- `docs/ai-interactions/README.md`
- `docs/ai-interactions/023-container-apps-job-name.md`

## Validation

- Terraform formatting, backend-disabled initialization, and validation passed in an isolated copy.
- Documentation formatting, exact-name assertions, Draw.io XML parsing, and Git whitespace checks passed.

## Security Notes

No secret, real environment input, Terraform state, backend configuration, or saved plan was inspected or changed.

## Assumptions

- The production naming inputs remain the approved `azure-weather`, `prod`, and `d2cc26` values already documented by the user.
- The historical response in Interaction 021 must remain verbatim; its appended correction note is authoritative for implementation.

## Deferred Work

- Terraform planning, deployment, and live Azure name validation remain human-controlled and outside this interaction.

## Human Review

Checked and approved by the human reviewer on 2026-10-21.

## Final Status

Approved
