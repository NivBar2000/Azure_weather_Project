# 026 - Production CD Re-run Authorization

## Tool

Codex

## Model

Not exposed by the client

## Date

2026-10-21

## Objective

Harden the manual production CD workflow so an unauthorized user cannot initiate a re-run of an otherwise authorized workflow run.

## Relevant Decisions

- Require `github.actor`, `github.triggering_actor`, and `github.ref` to match the approved production identity and branch.
- Enforce the same authorization boundary in both the dedicated authorization job and the deployment job condition.
- Pass GitHub context values through job environment variables before shell evaluation.
- Preserve all existing deployment behavior and the existing CI workflow.

## Exact Prompt

Harden the new production CD workflow against unauthorized workflow re-runs.

GitHub documents that `github.actor` remains the actor from the original run, while `github.triggering_actor` identifies the user who initiated a re-run.

Update `.github/workflows/cd.yml` so production deployment requires all of the following:

- `github.actor == 'NivBar2000'`
- `github.triggering_actor == 'NivBar2000'`
- `github.ref == 'refs/heads/main'`

Enforce both actor checks in the authorization job and again in the deployment job condition. Map context values through `env` before using them in shell code.

Preserve every other workflow behavior and the existing CI workflow. Update the relevant permanent documentation and append a correction note to Interaction 025 without altering its verbatim prompt/report. Add and index a concise new interaction record if required.

Do not execute the workflow, use Azure/GitHub APIs, deploy, commit, or push. Run formatting, YAML parsing, shell syntax validation, focused authorization assertions, existing relevant checks, and `git diff --check`.

Return exact files changed and validation results.

## Model Response

## Summary

Hardened the manual production CD workflow against unauthorized re-runs. Production deployment now requires `github.actor == 'NivBar2000'`, `github.triggering_actor == 'NivBar2000'`, and `github.ref == 'refs/heads/main'` in both the authorization job and the deployment job condition. GitHub context values used by shell code are mapped through `env`. All other CD behavior and the existing CI workflow were preserved.

## Files changed

- `.github/workflows/cd.yml`
- `README.md`
- `docs/ai-interactions/README.md`
- `docs/ai-interactions/025-production-github-actions-cd.md`
- `docs/ai-interactions/026-production-cd-rerun-authorization.md`
- `docs/azure-deployment-readiness.md`
- `docs/azure-infrastructure.md`
- `infra/terraform/README.md`

No application, Terraform, architecture-diagram, CI-workflow, dependency, or production-resource behavior was changed by this task.

## Validation performed

- PASS — `npm run format:check`.
- PASS — CD YAML parsed with the repository's installed `js-yaml`; required jobs are present.
- PASS — `bash -n` accepted all 18 CD `run` blocks; none directly interpolate GitHub contexts into shell code.
- PASS — 9 focused assertions verified all three authorization values in the authorization job and deployment condition.
- PASS — `npm run lint`.
- PASS — `npm test`: backend 87/87 and frontend 19/19 tests passed.
- PASS — `npm run build`: backend and frontend production builds completed.
- PASS — Interaction 026 required sections, exact prompt, index entry, and the appended Interaction 025 correction note were verified.
- PASS — `.github/workflows/ci.yml` has no working-tree diff.
- PASS — `git diff --check`, plus explicit whitespace checks for the two untracked task files.

Two initial ad hoc validation wrappers failed because PowerShell interpreted embedded GitHub-expression syntax and native stderr handling, respectively. The checks were rerun with safe local wrappers and passed; these were command-wrapper issues, not repository failures.

## Security or dependency findings

The authorization gate now rejects an unauthorized original actor or re-run initiator before deployment and repeats that boundary on the deployment job. A focused scan found no credential-like values in the task files. No secrets, Azure/GitHub APIs, deployments, external settings, dependency changes, commits, or pushes were used. Dependency auditing was not required because dependencies did not change.

## Assumptions

`NivBar2000` remains the sole approved production workflow initiator and re-run initiator.

## Deferred work

Static YAML, shell, and assertion checks cannot prove GitHub-hosted context evaluation, Environment behavior, or OIDC access. Those remain for the first separately authorized human-triggered GitHub run.

## Exact `git status --short`

```text
 M README.md
 M docs/ai-interactions/README.md
 M docs/azure-architecture.drawio
 M docs/azure-architecture.mmd
 M docs/azure-deployment-readiness.md
 M docs/azure-infrastructure.md
 M infra/terraform/README.md
?? .github/workflows/cd.yml
?? docs/ai-interactions/021-cd-terraform-foundation.md
?? docs/ai-interactions/022-postgresql-password-validation.md
?? docs/ai-interactions/023-container-apps-job-name.md
?? docs/ai-interactions/024-azure-managed-tag-drift.md
?? docs/ai-interactions/025-production-github-actions-cd.md
?? docs/ai-interactions/026-production-cd-rerun-authorization.md
```

The architecture diagrams and Interactions 021–024 are pre-existing working-tree changes preserved untouched by this task.

## Documentation status

Permanent CD documentation now describes both actor checks and the `main` restriction. Interaction 025 has an appended correction note without changes to its verbatim prompt/report. Interaction 026 contains the exact prompt and this exact report, is indexed, and remains `Human Review: Pending` / `Final Status: Awaiting human review`.

## Files Changed

- `.github/workflows/cd.yml`
- `README.md`
- `docs/ai-interactions/README.md`
- `docs/ai-interactions/025-production-github-actions-cd.md`
- `docs/ai-interactions/026-production-cd-rerun-authorization.md`
- `docs/azure-deployment-readiness.md`
- `docs/azure-infrastructure.md`
- `infra/terraform/README.md`

## Validation

Formatting, YAML parsing, shell syntax, focused authorization assertions, lint, tests, builds, documentation checks, security scanning, and whitespace checks passed. The exact results are recorded verbatim in **Model Response**.

## Security Notes

- The authorization gate requires the approved original actor, approved re-run initiator, and exact production branch.
- No credential, secret, Azure resource, or GitHub setting is accessed or changed.

## Assumptions

- `NivBar2000` remains the sole approved production workflow initiator.
- GitHub evaluates the deployment job condition before granting its Environment and OIDC-scoped execution context.

## Deferred Work

- The first human-triggered GitHub execution remains the required live validation of workflow and Environment behavior.

## Human Review

Pending

## Final Status

Awaiting human review
