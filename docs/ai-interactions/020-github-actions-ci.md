# Interaction 020: GitHub Actions CI

## Tool

Codex

## Model

GPT-5

## Date

2026-10-21

## Objective

Implement the repository's first validation-only GitHub Actions CI workflow for application, backend-container, dependency-audit, and Terraform checks without configuring CD, accessing Azure, publishing artifacts, or changing application/infrastructure behavior.

## Relevant decisions

- Run three independent jobs so application, backend-container, and Terraform validation can execute in parallel.
- Use the repository's `.nvmrc` for Node.js 22 and the root npm lockfile for deterministic installation and caching.
- Build the frontend without environment values because the existing compile succeeds without them; do not introduce credentials or unnecessary placeholders.
- Build the backend image with the repository-root context and existing Dockerfile, using only the local `azure-weather-backend:ci` tag.
- Use Terraform 1.15.6, which satisfies the repository constraint, and initialize with the backend disabled before validation.
- Pin the official actions to immutable commit SHAs and document their release tags in comments.
- Keep production deployment claims unchanged while recording that validation CI now exists and CD remains deferred.

## Exact Prompt

```text
Implement the repository’s first GitHub Actions CI workflow. This task is CI only: do not configure CD, deploy anything, or access Azure.

Before editing:

1. Read `AGENTS.md` completely.
2. Inspect the root and workspace package scripts, lockfile, Node.js version, Dockerfile, Terraform constraints, ignored files, and existing documentation.
3. Preserve all unrelated working-tree changes.

Create `.github/workflows/ci.yml` with these requirements:

## Triggers

Run on:

- pull requests targeting `main`;
- pushes to `main`;
- manual `workflow_dispatch`.

## Security and execution controls

- Set workflow permissions to `contents: read`.
- Do not use GitHub secrets, repository variables, Azure credentials, OpenWeather credentials, or real environment files.
- Use only documented non-secret build placeholders if the frontend build requires public Vite values.
- Add concurrency grouped by workflow and Git ref, with `cancel-in-progress: true`.
- Add reasonable job timeouts.
- Use official GitHub Actions.
- Pin third-party/official actions to immutable commit SHAs where practical and add comments identifying their human-readable release versions.
- Do not upload or publish build artifacts, Docker images, test credentials, or Terraform data.

## Jobs

Create three clearly separated jobs that can run in parallel.

### 1. `application`

Use Ubuntu and the repository’s Node.js 22 version.

Steps:

- checkout;
- configure Node.js with npm caching based on the root `package-lock.json`;
- run `npm ci`;
- run the existing root formatting check;
- run the existing root lint command;
- run all existing frontend and backend tests;
- run the existing production builds for both workspaces;
- run `npm audit --audit-level=high`.

Do not silently weaken or ignore a high/critical audit failure. If the current dependency tree already fails, report it rather than changing dependencies outside this task.

### 2. `docker`

- checkout;
- build the Backend image using repository-root context and `apps/backend/Dockerfile`;
- use a local CI-only tag such as `azure-weather-backend:ci`;
- do not log in to any registry;
- do not push the image;
- verify that the build exits successfully.

### 3. `terraform`

- checkout;
- install the Terraform version compatible with `infra/terraform/versions.tf`;
- run Terraform formatting checks;
- initialize `infra/terraform` with the backend disabled;
- run `terraform validate`.

Do not run Terraform plan, apply, refresh, import, destroy, output, console, show, or state commands. Do not read `backend.hcl`, real `terraform.tfvars`, state files, saved plans, or environment-specific secrets.

## Repository validation

After implementation:

1. Run locally every existing application command represented by the workflow.
2. Build the Backend Docker image locally.
3. Run Terraform formatting check, backend-disabled initialization, and validation.
4. Validate the workflow YAML using already available tools only; do not install unapproved utilities.
5. Run Git whitespace checks.
6. Inspect the final diff for accidental secrets, credentials, state, plans, `.env` files, generated build output, or unrelated changes.
7. If any required validation fails, diagnose it and report the exact blocker. Do not weaken CI merely to make it green.

## Documentation

Create:

`docs/ai-interactions/020-github-actions-ci.md`

Include:

- this exact prompt;
- implementation summary;
- workflow triggers and job structure;
- exact tools and commands used;
- validation results;
- dependency-audit result;
- security findings;
- local-versus-GitHub validation limitations;
- assumptions;
- `Human Review: Pending`;
- `Final Status: Awaiting human review`.

Add Interaction 020 to `docs/ai-interactions/README.md`.

Add only a concise CI usage/status note to permanent project documentation if needed. Do not alter production deployment claims or application behavior.

## Prohibited actions

Do not:

- stage files;
- commit or push;
- create a branch, tag, PR, or GitHub Environment;
- modify GitHub repository settings;
- access or modify Azure;
- configure OIDC;
- implement CD;
- change application behavior, dependencies, Terraform infrastructure, or production resources.

Return a concise summary containing:

- workflow triggers;
- the three jobs and their checks;
- files changed;
- all validation results;
- audit findings;
- security review result;
- any validation limitations that require the first GitHub run;
- exact `git status --short`;
- recommended files to stage;
- recommended commit message.
```

## Model Response

## Summary

Implemented the first validation-only GitHub Actions workflow. It runs for pull requests targeting `main`, pushes to `main`, and manual `workflow_dispatch`, with read-only repository permissions and concurrency cancellation by workflow/ref.

The three independent jobs are:

- `application`: Node.js 22, cached `npm ci`, formatting, lint, all workspace tests, both production builds, and a high-severity dependency audit.
- `docker`: local backend image build from the repository-root context and `apps/backend/Dockerfile`, tagged `azure-weather-backend:ci`, with no registry login or push.
- `terraform`: Terraform 1.15.6, recursive formatting check, backend-disabled initialization, and validation from `infra/terraform`.

No CD, OIDC, artifact upload, registry publication, Azure access, secret use, GitHub setting change, staging, commit, or push was performed.

## Files changed

- `.github/workflows/ci.yml`
- `README.md`
- `docs/azure-deployment-readiness.md`
- `docs/ai-interactions/README.md`
- `docs/ai-interactions/020-github-actions-ci.md`

## Validation performed

- `npm.cmd ci` — passed after the sandboxed attempt was unable to access the user npm cache; the approved retry installed 855 packages from the lockfile.
- `npm.cmd run format:check` — passed.
- `npm.cmd run lint` — passed for both workspaces.
- `npm.cmd test` — passed: backend 13 suites/87 tests; frontend 1 file/19 tests.
- `npm.cmd run build` — passed for backend and frontend.
- `npm.cmd audit --audit-level=high` — exit 0; no high or critical findings.
- `npm.cmd audit --omit=dev --audit-level=high` — exit 0; 0 production vulnerabilities.
- `docker build --file apps/backend/Dockerfile --tag azure-weather-backend:ci .` — could not run because the local Docker Desktop Linux daemon was not running. After local Docker access was approved, Docker reported that the `dockerDesktopLinuxEngine` named pipe did not exist. This is an environmental blocker; no image was built or pushed.
- Tracked Terraform source formatting check — passed without reading ignored real inputs.
- `terraform init -backend=false -input=false` and `terraform validate -no-color` — passed against a temporary clean copy containing only tracked `.tf` files and `.terraform.lock.hcl`; AzureRM 5.10.0 was installed, no backend/state/environment input was read, and the temporary copy was removed.
- Workflow YAML — parsed with the already-installed `js-yaml`; trigger/job/permission/timeout structural assertions passed. Prettier parsing passed, all five action references were verified as 40-character immutable SHAs, and prohibited-operation assertions passed.
- `git diff --check` — passed with line-ending conversion warnings only.
- Focused secret-pattern and tracked-sensitive-artifact checks — passed.

## Audit findings

The full dependency audit reports 20 moderate findings in development/test tooling through the `ts-jest`/Jest dependency path to `sprintf-js`. The suggested complete remediation requires a forced breaking dependency change, so no dependency or lockfile change was made in this CI-only task. The production-only audit reports 0 vulnerabilities. The workflow intentionally preserves the requested high/critical failure threshold and does not suppress failures at those levels.

## Security review result

The workflow uses only official `actions/checkout`, `actions/setup-node`, and `hashicorp/setup-terraform` actions pinned to verified immutable SHAs with release-version comments. It defines only `contents: read`, contains no `secrets`, repository variables, credentials, real environment files, Azure/OIDC steps, registry authentication, upload/publish steps, or Terraform deployment/state commands. No generated `dist`, Terraform data/state/plan, real `.env`, credentials, or secret-like values are included in the Git changes.

## Validation limitations

- The local host has Node.js 24.15.0 and no `nvm`; application checks passed locally, but exact Node.js 22 behavior requires the first GitHub-hosted run.
- The local Docker daemon blocker prevents local confirmation of the Docker job. The unchanged backend Dockerfile previously defined the intended build, but this workflow's Docker build must be confirmed by the first GitHub run or by a human after starting Docker Desktop.
- `actionlint` and `yamllint` were not available. YAML parsing, Prettier, and custom structural/security assertions passed, but GitHub-specific workflow schema and hosted-runner behavior require the first GitHub run.
- Trigger delivery, npm cache behavior, action execution, and the Ubuntu runner environment can only be confirmed on GitHub.

## Assumptions

- GitHub-hosted `ubuntu-latest` continues to provide Docker for the local image-build command.
- Terraform 1.15.6 and AzureRM 5.10.0 remain available to the pinned setup and provider initialization steps.

## Deferred work

- Continuous deployment, artifact publishing, registry authentication/push, OIDC, GitHub Environments, production migrations, and all Azure operations remain outside this CI-only workflow.
- Dependency remediation for the moderate development-tooling findings requires a separate reviewed dependency task.

## Documentation status

Interaction 020 is indexed with Human Review pending and Final Status awaiting human review. Permanent documentation now identifies validation CI as implemented while CD remains deferred; production deployment claims and application behavior were not changed.

## Exact `git status --short`

```text
 M README.md
 M docs/ai-interactions/README.md
 M docs/azure-deployment-readiness.md
?? .github/
?? docs/ai-interactions/020-github-actions-ci.md
```

## Recommended files to stage

```powershell
git add -- .github/workflows/ci.yml README.md docs/azure-deployment-readiness.md docs/ai-interactions/README.md docs/ai-interactions/020-github-actions-ci.md
```

Recommended commit message:

```text
ci: add GitHub Actions validation workflow
```

## Files Changed

- `.github/workflows/ci.yml`
- `README.md`
- `docs/azure-deployment-readiness.md`
- `docs/ai-interactions/README.md`
- `docs/ai-interactions/020-github-actions-ci.md`

## Validation

- Application install, formatting, lint, tests, builds, and audits passed.
- Terraform formatting, backend-disabled initialization, and validation passed using only tracked configuration.
- YAML parsing, structural assertions, immutable-action pin checks, prohibited-operation checks, Git whitespace, and focused security checks passed.
- The backend Docker build could not run because the local Docker Desktop Linux daemon is not running; this environmental limitation requires the first GitHub run or a human-started local daemon.

## Security Notes

- The workflow has read-only repository contents permission and contains no secret, variable, environment-file, Azure, registry-login, artifact-upload, OIDC, or deployment references.
- Docker output remains local to the runner, and Terraform uses backend-disabled initialization and validation only.

## Assumptions

- GitHub-hosted `ubuntu-latest` runners provide the Docker engine used by the Docker job.
- The first GitHub run is required to prove hosted-runner behavior and event configuration in the repository.

## Deferred Work

- Continuous deployment, artifact publishing, registry authentication/push, OIDC, environment protections, and production migration automation remain outside this CI-only interaction.

## Human Review

The workflow works as expected. by push and manuly 

## Final Status

Aproved 