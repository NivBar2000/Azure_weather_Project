# Interaction 025: Production GitHub Actions CD

## Tool

Codex

## Model

Not exposed by the client

## Date

2026-10-21

## Objective

Implement the repository's first production GitHub Actions CD workflow with manual-only, actor/ref-restricted, OIDC-authenticated, digest-qualified, migration-gated deployment behavior; synchronize permanent documentation without deploying or changing external systems.

## Relevant decisions

- Production deployment is manual-only and restricted to `NivBar2000` selecting `refs/heads/main`.
- The deployment job uses the GitHub `production` Environment and OIDC with only `contents: read` and `id-token: write`.
- Backend and migration deployments use the same verified ACR manifest digest; no `latest` tag is used for deployment.
- Migration is updated only at its configured image field, started exactly once without execution overrides, and must succeed before App Service changes.
- Backend health failure triggers a best-effort prior-image restore, but database migrations and frontend content are not automatically rolled back.
- Terraform owns infrastructure and non-image configuration; CD owns application image revisions and frontend static content.
- Required GitHub Environment reviewers are unavailable on the current private-repository plan. Manual dispatch, exact actor/ref restrictions, the Environment-scoped OIDC subject, non-cancelling concurrency, minimal permissions, and digest deployment are the accepted compensating controls.

## Exact Prompt

```text
Implement the production GitHub Actions CD workflow for this repository.

Read and follow `AGENTS.md` and inspect the existing CI workflow, application scripts, Dockerfile, Terraform CD foundation, deployment documentation, and current health endpoints before editing.

Create `.github/workflows/cd.yml` with this behavior:

1. Trigger only through `workflow_dispatch`.
2. Permit deployment only when:
   - the selected ref is `refs/heads/main`;
   - `github.actor` is exactly `NivBar2000`.
3. Use concurrency so only one production deployment can run at a time, without cancelling an active deployment.
4. Run application validation before deployment using the repository’s existing install, formatting, lint, test, and build commands.
5. Give the deployment job:
   - `environment: production`;
   - `contents: read`;
   - `id-token: write`;
   - no other write permissions.
6. Authenticate to Azure using OIDC and these existing repository variables:
   - `AZURE_CLIENT_ID`
   - `AZURE_TENANT_ID`
   - `AZURE_SUBSCRIPTION_ID`
7. Validate that every required variable is present without printing values.
8. Build the backend from the repository-root context using `apps/backend/Dockerfile`.
9. Tag the image immutably with the full Git commit SHA, never `latest`.
10. Push it to the existing ACR using:
    - `ACR_NAME`
    - `ACR_LOGIN_SERVER`
    - `BACKEND_IMAGE_REPOSITORY`
11. Resolve and verify the pushed ACR manifest digest, then use the digest-qualified image reference for deployment.
12. Update only the configured image of `MIGRATION_JOB_NAME`, without overriding its command, environment, secrets, identity, networking, retry configuration, or timeout.
13. Start exactly one migration execution and poll it with a bounded timeout. Continue only after confirmed success; fail immediately on failed/cancelled status.
14. Update `BACKEND_APP_NAME` to the same digest-qualified image. Preserve all other App Service configuration.
15. Perform a bounded health check using the actual health route found in the source. If backend health fails, perform a best-effort rollback to the previously configured backend image and fail the workflow.
16. Only after backend health succeeds:
    - build the frontend with the repository variables:
      - `VITE_API_BASE_URL`
      - `VITE_ENTRA_CLIENT_ID`
      - `VITE_ENTRA_AUTHORITY`
      - `VITE_ENTRA_KNOWN_AUTHORITY`
      - `VITE_ENTRA_API_SCOPE`
    - upload the generated files to the existing `$web` container using Entra authentication and `FRONTEND_STORAGE_ACCOUNT`;
    - preserve correct content types and overwrite matching files;
    - do not use storage keys or SAS tokens.
17. Purge the existing Front Door endpoint using:
    - `AZURE_RESOURCE_GROUP`
    - `FRONT_DOOR_PROFILE`
    - `FRONT_DOOR_ENDPOINT`
18. Run bounded smoke checks against `PRODUCTION_URL` for the frontend and the public API health endpoint.
19. Write a sanitized GitHub step summary containing commit SHA, immutable backend image digest, migration result, backend result, frontend result, purge result, and smoke-test result. Never print tokens, credentials, secret values, or complete Azure authentication responses.

Security and implementation requirements:

- Do not run Terraform in CD.
- Do not use client secrets or GitHub secrets; all configured values are public identifiers/settings.
- Do not allow automatic deployment on push.
- Do not use mutable image tags for deployment.
- Do not use migration execution overrides.
- Use strict shell behavior and safe quoting.
- Avoid direct interpolation of GitHub-controlled values inside shell scripts; map trusted values through `env`.
- Pin third-party actions to full immutable commit SHAs and annotate their upstream release versions.
- Preserve `.github/workflows/ci.yml`.
- Account for the repository’s GitHub plan limitation: required environment reviewers are unavailable for this private repository, so manual `workflow_dispatch`, exact actor restriction, exact `main` restriction, the `production` environment, and concurrency are the compensating controls.
- Do not create or change Azure resources, GitHub environments, variables, or secrets.
- Do not execute the workflow, deploy, commit, or push.

Update the relevant README/runbook/architecture documentation with the real CD sequence, failure boundaries, rollback limitations, manual trigger procedure, and the separation between Terraform infrastructure ownership and CD image/static-content ownership.

Add and index the required AI interaction record with the exact prompt and final implementation report.

Validation:

- Format the changed files.
- Run existing repository formatting and relevant application checks.
- Validate workflow YAML and expressions with available local tooling.
- Perform focused static assertions for manual-only triggering, actor/main restrictions, OIDC permissions, environment name, concurrency, immutable image usage, migration-before-backend ordering, backend-before-frontend ordering, no Terraform commands, no secrets, and no mutable `latest` deployment.
- Run `git diff --check`.
- Do not access real `.env`, `terraform.tfvars`, backend configuration, Terraform state, saved plans, Key Vault values, credentials, or tokens.

Return:

- concise workflow sequence;
- exact files changed;
- validation results;
- permissions and variable usage;
- failure and rollback behavior;
- security findings;
- exact `git status --short`;
- recommended commit message;
- manual instructions for the first human-triggered deployment, but do not trigger it.
```

## Model Response

## Summary

Implemented `.github/workflows/cd.yml` as a manual-only production release pipeline. The ordered sequence is authorization gate → application validation → Azure OIDC → SHA-tagged backend build/push → ACR digest verification → one migration execution → same-digest App Service deployment and `/api/health` gate → frontend build/upload → Front Door purge → bounded frontend/API smoke checks.

Terraform is not invoked. The existing CI workflow is unchanged. No workflow, Azure operation, GitHub mutation, commit, or push was performed.

## Files changed

- `.github/workflows/cd.yml`
- `README.md`
- `docs/ai-interactions/README.md`
- `docs/ai-interactions/025-production-github-actions-cd.md`
- `docs/azure-architecture.drawio`
- `docs/azure-architecture.mmd`
- `docs/azure-deployment-readiness.md`
- `docs/azure-infrastructure.md`
- `infra/terraform/README.md`

Pre-existing Interaction 021–024 work and all unrelated changes were preserved.

## Validation results

- `npm.cmd ci` — passed after rerunning outside the filesystem sandbox so npm could read its existing cache; 855 packages installed. npm reported 20 moderate vulnerabilities. Dependencies and the lockfile were not changed.
- `npm.cmd run format:check` — passed.
- `npm.cmd run lint` — passed for both workspaces.
- `npm.cmd test` — passed: backend 87/87 and frontend 19/19 tests.
- `npm.cmd run build` — passed for backend and frontend.
- Workflow YAML parse with the already installed `js-yaml` — passed; the sole trigger is `workflow_dispatch`, with jobs `authorize`, `application`, and `deploy`.
- Bash syntax validation with the installed Git for Windows Bash — passed for all 18 workflow `run` blocks.
- Focused workflow assertions — passed for manual-only triggering, exact actor/ref restrictions, production Environment, OIDC permissions, non-cancelling concurrency, 5/5 immutable action pins, variable-to-environment mapping, SHA/digest image handling, exactly one migration start without overrides, required ordering, Entra blob authentication, MIME types, health route, rollback, no Terraform, no GitHub secrets, and no `:latest` image.
- Existing `.github/workflows/ci.yml` diff check — passed; unchanged.
- Draw.io XML/unique-ID check, focused Mermaid checks, interaction index, and exact-prompt comparison — passed.
- `git diff --check` — passed; Git emitted only existing LF-to-CRLF working-copy warnings.
- Focused sensitive-artifact and secret-pattern scan across all 13 current changed paths — passed.
- `docker build --file apps/backend/Dockerfile --tag azure-weather-backend:cd-validation .` — not completed because Docker Desktop's Linux daemon is not running (`dockerDesktopLinuxEngine` pipe not found). This is environmental, not a repository validation failure; the first GitHub run must validate the image build.

GitHub Actions expression semantics and live Azure CLI behavior could not be fully validated locally because `actionlint` is not installed and the workflow was intentionally not executed. Azure CLI syntax was cross-checked against the official [Container Apps Job](https://learn.microsoft.com/en-us/cli/azure/containerapp/job), [App Service container](https://learn.microsoft.com/en-us/cli/azure/webapp/config/container), [Storage blob](https://learn.microsoft.com/en-us/cli/azure/storage/blob), and [Front Door endpoint](https://learn.microsoft.com/en-us/cli/azure/afd/endpoint) references.

## Permissions and variables

Workflow default and validation jobs have `contents: read`. The deployment job declares `environment: production` and exactly `contents: read` plus `id-token: write`. Azure login uses OIDC with `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID` repository variables.

The workflow validates and uses these additional public repository variables without printing their values: `AZURE_RESOURCE_GROUP`, `ACR_NAME`, `ACR_LOGIN_SERVER`, `BACKEND_IMAGE_REPOSITORY`, `MIGRATION_JOB_NAME`, `BACKEND_APP_NAME`, `FRONTEND_STORAGE_ACCOUNT`, `FRONT_DOOR_PROFILE`, `FRONT_DOOR_ENDPOINT`, `PRODUCTION_URL`, `VITE_API_BASE_URL`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_AUTHORITY`, `VITE_ENTRA_KNOWN_AUTHORITY`, and `VITE_ENTRA_API_SCOPE`.

## Failure and rollback behavior

- Authorization, validation, variable, OIDC, build, push, or digest failure stops before production resource updates.
- Migration update/start/failure/cancellation/timeout stops before App Service and frontend deployment.
- App Service restart or bounded health failure triggers a best-effort restore of the previously configured image, then fails the workflow.
- A backend image rollback does not reverse a successful database migration; schema compatibility still requires human judgment.
- Frontend uploads overwrite matching files with explicit MIME types but are not atomic. Upload, purge, or final smoke failure does not restore prior static files.
- Every path writes a sanitized result summary without credentials or Azure authentication responses.

## Security findings

No secret values, credentials, tokens, real environment files, Terraform inputs/state/plans, generated build output, storage keys, SAS tokens, client secrets, or sensitive artifacts are present in the intended changes. Storage upload uses `--auth-mode login`; deployment references the verified `sha256` digest rather than the mutable SHA tag.

Trust model 1 remains the material accepted risk: migration-job update/start rights give the protected GitHub identity effective use of the job's database secret and identity without direct Key Vault access. Required Environment reviewers are unavailable on the current private-repository plan; manual dispatch, exact `NivBar2000`/`main` restrictions, the `production` Environment/OIDC subject, concurrency, least-privilege workflow permissions, and digest deployment are the compensating controls.

A local Azure CLI `--help` attempt was blocked by the sandbox before startup when the CLI tried to open `.azure/azureProfile.json`; no credential content was read, no token was obtained, and no Azure request or mutation occurred.

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
```

Recommended commit message:

```text
feat: add manual production CD workflow
```

## First human-triggered deployment

1. Review and commit the complete intended Terraform foundation and CD/documentation set, then push it to `main` yourself.
2. Before running CD, complete the separately authorized Terraform plan/apply and live validation for the migration job, federated identity, and five resource-scoped role assignments if that foundation is not already live.
3. Verify the GitHub `production` Environment and all documented public repository variables. Do not add credentials or secret values.
4. In **Actions → Production CD → Run workflow**, select `main`, confirm the exact commit SHA, and start the run while signed in as `NivBar2000`.
5. Observe the migration execution and every subsequent gate. Do not blindly rerun a failed or timed-out migration; inspect its sanitized status and database recovery implications first.
6. After success, review the step summary and manually verify the frontend, `/api/health`, Google/Microsoft sign-in, live weather, saved-forecast isolation, and sign-out.

## Assumptions and deferred work

The first GitHub run must prove live OIDC federation, role propagation and scopes, ACR manifest lookup, migration polling, App Service digest acceptance/rollback, `$web` data-plane upload, endpoint-scoped Front Door purge, and public smoke behavior. Artifact signing/SBOM policy, atomic frontend promotion/rollback, database rollback orchestration, and Terraform plan/apply automation remain deferred.

## Documentation status

Interaction 025 contains the exact prompt and this exact report, is indexed, and remains `Human Review: Pending` / `Final Status: Awaiting human review`.

## Files Changed

- `.github/workflows/cd.yml`
- `README.md`
- `docs/ai-interactions/README.md`
- `docs/ai-interactions/025-production-github-actions-cd.md`
- `docs/azure-architecture.drawio`
- `docs/azure-architecture.mmd`
- `docs/azure-deployment-readiness.md`
- `docs/azure-infrastructure.md`
- `infra/terraform/README.md`

## Validation

Final validation results are recorded verbatim in **Model Response**.

## Security Notes

- The workflow uses OIDC and repository variables only; it does not reference GitHub secrets, client secrets, storage keys, SAS tokens, Terraform state, or Key Vault values.
- Trust model 1 remains accepted: the deployment identity's migration-job update/start role provides effective use of the configured database secret and attached identity without direct Key Vault access.
- The workflow never supplies migration execution overrides and deploys the verified digest rather than the SHA tag.

## Assumptions

- The Terraform CD foundation, `production` Environment, and documented repository variables will be reviewed and available before the first workflow run.
- The existing resource-scoped roles are sufficient for the exact Azure CLI operations, subject to first-run live validation.

## Deferred Work

- First human-triggered GitHub/Azure execution and live validation.
- Terraform foundation apply/live validation, artifact signing/provenance policy, automatic frontend rollback, and database rollback orchestration remain separately authorized work.

## Human Review

Pending

## Final Status

Awaiting human review

---

## Follow-up Correction Note: Re-run Initiator Authorization

Interaction 026 hardens the production authorization boundary by requiring both the original run actor (`github.actor`) and the user who initiates the current run or re-run (`github.triggering_actor`) to equal `NivBar2000`, while retaining the exact `refs/heads/main` restriction. The checks are enforced in both the authorization job and the deployment job condition. This note does not alter Interaction 025's verbatim prompt or Model Response.
