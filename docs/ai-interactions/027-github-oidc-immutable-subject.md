# 027 - GitHub OIDC Immutable Subject Correction

## Tool

Codex

## Model

Not exposed by the client

## Date

2026-10-21

## Objective

Align the Azure federated identity credential with the immutable GitHub OIDC subject observed during the first safe production CD attempt.

## Relevant Decisions

- Replace only the obsolete name-only federated credential subject with the exact observed owner-ID and repository-ID subject.
- Preserve the existing user-assigned identity, issuer, audience, GitHub Environment, role assignments, workflow, and all other infrastructure behavior.
- Record the failed first attempt as safe and pre-deployment, with the correction pending the normal reviewed Terraform process.

## Exact Prompt

Fix the production GitHub OIDC federated credential to match GitHub’s observed immutable subject claim.
The first CD run failed safely before deployment with AADSTS700213. GitHub presented this exact subject:
`repo:NivBar2000@262624074/Azure_weather_Project@1426703721:environment:production`
Terraform currently configures the obsolete name-only subject:
`repo:NivBar2000/Azure_weather_Project:environment:production`
Update the Terraform federated identity credential to the exact observed immutable subject. Update permanent infrastructure/deployment documentation accordingly. Preserve immutable historical prompts/reports and append correction notes where required. Add and index a concise new AI interaction record.
Do not change the workflow, identity, role assignments, environment name, issuer, audience, or any other infrastructure behavior. Do not inspect secrets, real Terraform inputs, backend configuration, state, or plans. Do not run Terraform plan/apply, Azure/GitHub mutations, commit, or push.
Run formatting, isolated `terraform init -backend=false`, `terraform validate`, focused exact-subject assertions, documentation checks, and `git diff --check`.
Return the exact files changed, validation results, and the human plan commands required to deploy only this correction through the normal reviewed Terraform process.

## Model Response

## Summary

Updated only `azurerm_federated_identity_credential.github_production.subject` to GitHub's observed immutable claim:

`repo:NivBar2000@262624074/Azure_weather_Project@1426703721:environment:production`

The workflow, managed identity, Environment name, issuer, audience, role assignments, and all other infrastructure behavior are unchanged. Documentation now records that the first CD run failed safely at OIDC authentication before deployment and that the correction still requires a reviewed Terraform deployment.

## Files changed

- `README.md`
- `docs/ai-interactions/021-cd-terraform-foundation.md`
- `docs/ai-interactions/027-github-oidc-immutable-subject.md`
- `docs/ai-interactions/README.md`
- `docs/azure-deployment-readiness.md`
- `docs/azure-infrastructure.md`
- `infra/terraform/README.md`
- `infra/terraform/github-cd-identity.tf`

## Validation performed

- PASS — `terraform fmt -check` on all 16 tracked `.tf` files only.
- PASS — isolated `terraform init -backend=false -input=false -no-color` using the locked AzureRM 5.10.0 provider; the temporary data directory was removed.
- PASS — `terraform validate -no-color`: configuration is valid.
- PASS — `npm run format:check` after mechanically formatting the updated readiness table.
- PASS — focused assertions confirmed the exact immutable subject appears once in Terraform, the obsolete subject is absent from active Terraform, and only one Terraform line changed.
- PASS — focused assertions confirmed the identity, issuer, audience, role assignments, all other `.tf` files, and `.github/workflows/cd.yml` are unchanged.
- PASS — permanent-documentation checks, Interaction 021 correction note, Interaction 027 required sections/exact prompt, and index entry.
- PASS — focused credential scan found no credential-like value in the task files.
- PASS — `git diff --check` and the explicit whitespace check for the untracked Interaction 027 file.

The first recursive Terraform formatting invocation failed because it attempted to use an inaccessible global CLI configuration and listed the ignored `infra/terraform/terraform.tfvars`; no file content or value was printed. It was not retried recursively. All subsequent Terraform formatting was restricted to Git-tracked `.tf` paths with an isolated CLI configuration. The first isolated init was blocked by sandbox networking; the approved retry downloaded only the locked provider and passed. One initial scope assertion incorrectly counted `infra/terraform/README.md` as a Terraform code file; the corrected `*.tf` assertion passed.

## Security or dependency findings

The immutable owner and repository IDs are trust selectors, not credentials. No secret value, real Terraform input, backend configuration, state, saved plan, Azure/GitHub API, deployment, commit, or push was used. No dependency changed. The name-only subject remains only inside immutable historical prompts/reports and explicit correction notes.

## Assumptions

The supplied subject is the exact claim emitted by the intended GitHub `production` Environment. A human will use the existing protected Terraform inputs and backend only during the separately reviewed plan process.

## Human-reviewed plan commands

Run these from PowerShell only after reviewing the repository diff and confirming the intended Azure subscription and Terraform execution identity. This creates a targeted plan only; it does not apply it.

```powershell
Set-Location C:\DevOps_Projects\Azure_weather_Project\infra\terraform
terraform fmt -check
terraform init -backend-config=backend.hcl -reconfigure -input=false
terraform validate
terraform plan -input=false -var-file=terraform.tfvars -target="azurerm_federated_identity_credential.github_production" -out=tfplan-oidc-subject-correction
terraform show -no-color tfplan-oidc-subject-correction
```

Review the rendered plan for exactly the federated credential subject correction, with no identity, issuer, audience, role, workflow, or unrelated infrastructure changes. Keep the saved plan and its rendered output out of Git and unapproved logs. Applying the reviewed saved plan and retrying CD remain separately authorized actions.

## Exact `git status --short`

```text
 M README.md
 M docs/ai-interactions/021-cd-terraform-foundation.md
 M docs/ai-interactions/README.md
 M docs/azure-deployment-readiness.md
 M docs/azure-infrastructure.md
 M infra/terraform/README.md
 M infra/terraform/github-cd-identity.tf
?? docs/ai-interactions/027-github-oidc-immutable-subject.md
```

## Deferred work

- Human review of the targeted plan.
- Separately authorized apply of the reviewed saved plan.
- Federated credential verification and human-triggered CD retry.

## Documentation status

Permanent infrastructure, deployment-readiness, Terraform, and project documentation are synchronized with the observed subject and safe first-run failure. Interaction 021 has an appended correction note without altering its historical prompts or reports. Interaction 027 contains the exact prompt and this exact report, is indexed, and remains `Human Review: Pending` / `Final Status: Awaiting human review`.

## Files Changed

- `README.md`
- `docs/ai-interactions/021-cd-terraform-foundation.md`
- `docs/ai-interactions/027-github-oidc-immutable-subject.md`
- `docs/ai-interactions/README.md`
- `docs/azure-deployment-readiness.md`
- `docs/azure-infrastructure.md`
- `infra/terraform/README.md`
- `infra/terraform/github-cd-identity.tf`

## Validation

Terraform formatting, isolated backend-disabled initialization, validation, exact-subject assertions, documentation checks, credential scanning, and whitespace checks passed. The exact results and initial command-wrapper limitations are recorded verbatim in **Model Response**.

## Security Notes

- The immutable GitHub owner and repository identifiers are federated-identity selectors, not credentials or secret values.
- No secret, real Terraform input, backend configuration, state, saved plan, Azure resource, GitHub setting, or workflow was accessed or changed.

## Assumptions

- The subject supplied in the prompt is the exact claim emitted by the intended GitHub `production` Environment.
- The existing Terraform execution process and protected input files remain available to the human reviewer.

## Deferred Work

- Human review, targeted Terraform plan/apply, Azure credential verification, and the production CD retry.

## Human Review

Checked and approved by the human reviewer on 2026-10-21.

## Final Status

Approved
