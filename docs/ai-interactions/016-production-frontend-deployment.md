# Interaction 016: Production Frontend Deployment

## Tool

Codex

## Model

GPT-5

## Date

2026-10-20

## Objective

Build, deploy, and validate only the production frontend using Microsoft Entra data-plane authentication, then add and verify the production Front Door redirect URI on the uniquely identified External ID SPA application.

## Relevant decisions

- Use only the five approved public Vite build values through the process environment; do not create an `.env` file.
- Deploy only `apps/frontend/dist` to the existing `$web` container with `--auth-mode login`.
- Preserve the existing static website configuration where both the index and 404 document are `index.html`.
- Avoid stale-file deletion because the destination container was empty before upload.
- Compare the Front Door response hash with the built `index.html` without printing content.
- Update only `spa.redirectUris` after Microsoft Graph returned exactly one application for the approved SPA client ID.
- Preserve the existing localhost redirect URI and add the required production URI exactly once.
- Preserve all unrelated worktree changes and limit repository edits to this interaction record and its index entry.

## Exact Prompt

```text
Read and follow `AGENTS.md`.

Deploy and validate the production frontend only. The Azure infrastructure already exists.

Approved resources and identifiers:

- Subscription: `d2cc2668-766e-4287-b55c-757156c5d652`
- Resource group: `rg-azure-weather-prod-swc`
- Frontend storage account: `azureweatherprowebd2cc26`
- Static website container: `$web`
- Front Door URL: `https://azure-weather-prod-fd-d2cc26-epa4ddasghg4d8fr.z03.azurefd.net`
- External ID tenant ID: `79fb97ff-3c22-4210-b16d-e210b21db3e6`
- SPA application/client ID: `ca698b88-3c0f-4279-bbb5-b60654497b31`
- API application/client ID: `637c9165-b368-48a7-aa3d-3b9852a51a67`
- External ID authority: `https://azureweatherexercise3.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6`
- Known authority: `azureweatherexercise3.ciamlogin.com`
- API scope: `api://637c9165-b368-48a7-aa3d-3b9852a51a67/access_as_user`

Perform these phases in order.

## Phase 1: Preflight

1. Confirm the active Azure subscription matches the approved subscription.
2. Confirm the storage account and Front Door endpoint exist.
3. Confirm the signed-in deployment identity has the required Blob data-plane access.
4. Do not retrieve storage account keys, SAS tokens, secrets, Terraform state, or saved plan files.

## Phase 2: Build the frontend

1. Inspect the existing frontend package and build configuration.
2. Build the production frontend from the existing source using only these public build values:
   - `VITE_API_BASE_URL=/api`
   - `VITE_ENTRA_CLIENT_ID=ca698b88-3c0f-4279-bbb5-b60654497b31`
   - `VITE_ENTRA_AUTHORITY=https://azureweatherexercise3.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6`
   - `VITE_ENTRA_KNOWN_AUTHORITY=azureweatherexercise3.ciamlogin.com`
   - `VITE_ENTRA_API_SCOPE=api://637c9165-b368-48a7-aa3d-3b9852a51a67/access_as_user`
3. Pass these values through the process environment. Do not create or commit a real `.env` file.
4. Run the relevant frontend tests/build validation before deployment.
5. Inspect the generated `dist` file list only. Do not print bundled source contents or unrelated environment data.

## Phase 3: Upload to Azure Storage

1. Authenticate using Azure CLI/Microsoft Entra and `--auth-mode login`.
2. Keep Shared Key access disabled. Do not retrieve or use storage keys or SAS tokens.
3. Upload the contents of the frontend `dist` directory to the existing `$web` container.
4. Preserve the SPA behavior where `index.html` is the index and 404 document.
5. Overwrite matching deployed files. Do not upload source files, `.env` files, Terraform files, Git metadata, or repository documentation.
6. Verify through Blob metadata/listing that `index.html` and the generated assets exist.
7. Do not delete unrelated blobs unless a stale-file cleanup is clearly necessary and can be proven safe. If uncertain, do not delete.

## Phase 4: Validate Front Door

1. Request the Front Door root URL over HTTPS.
2. Allow bounded propagation retries if the frontend origin is not immediately healthy.
3. Confirm the final response is successful HTML corresponding to the built frontend.
4. Do not treat `/api` health as part of this task because backend migration/startup is deferred.

## Phase 5: Entra SPA redirect URI

The required redirect URI is:

`https://azure-weather-prod-fd-d2cc26-epa4ddasghg4d8fr.z03.azurefd.net/`

1. Attempt to obtain authorized Microsoft Graph access for tenant `79fb97ff-3c22-4210-b16d-e210b21db3e6` without exposing tokens.
2. Locate exactly one application whose `appId` is `ca698b88-3c0f-4279-bbb5-b60654497b31`.
3. Read its existing `spa.redirectUris`.
4. Merge the required Front Door URI into the existing list while preserving every existing URI.
5. Update only `spa.redirectUris`. Do not modify credentials, owners, API permissions, scopes, web redirect URIs, logout settings, manifests, user flows, or any other application property.
6. Re-read the application and verify the URI exists exactly once.
7. If authentication, tenant access, Graph permissions, application lookup, or uniqueness verification fails, do not guess and do not overwrite anything. Stop only this phase and report the precise manual action required.
8. If Azure CLI account context is changed temporarily, restore the original subscription context before completion.

## Strict exclusions

- Do not run database migrations.
- Do not start, restart, stop, or reconfigure App Service.
- Do not change PostgreSQL, Key Vault, ACR, Front Door configuration, Terraform configuration/state, or backend code.
- Do not run Terraform plan/apply/destroy/import/state mutation commands.
- Do not expose tokens, passwords, secrets, storage keys, SAS values, or authentication material.
- Do not commit or push Git changes.
- Do not modify application source merely to bypass a deployment error.

## Documentation

Create the next AI interaction record using the repository’s existing format and update the interaction index. Include:

- this exact prompt;
- tools and non-secret commands used;
- public build configuration;
- tests/build result;
- upload result and deployed file metadata;
- Front Door validation;
- Entra redirect result or exact blocker;
- security notes and exclusions;
- pending human-review status.

Never record access tokens, credentials, secrets, Terraform state, saved plans, storage keys, SAS values, or unrelated environment contents.

At completion, report:

- frontend build result;
- number and names/types of deployed frontend artifacts without dumping their contents;
- Storage upload verification;
- Front Door HTTP validation result;
- Entra redirect URI verification or blocker;
- files changed for documentation;
- confirmation that backend, App Service, PostgreSQL, Key Vault, ACR image, and Terraform state were not modified;
- remaining work before the complete application is operational.
```

## Model Response

## Summary

The production frontend was built, deployed, and validated successfully.

- Frontend lint passed, all 19 tests passed, and the Vite production build succeeded.
- Three generated artifacts were uploaded to the existing `$web` container using Azure CLI/Microsoft Entra authentication:

| Artifact                    | Type                     |          Size |
| --------------------------- | ------------------------ | ------------: |
| `index.html`                | `text/html`              |     475 bytes |
| `assets/index-DNjjx20W.css` | `text/css`               |   6,692 bytes |
| `assets/index-ClBmOWPN.js`  | `application/javascript` | 498,494 bytes |

- Blob metadata verified all three files. Static website settings remain enabled with `index.html` as both the index and 404 document.
- Front Door returned HTTPS 200 with `text/html` on the first attempt; the response hash exactly matched the built `index.html`.
- Microsoft Graph returned exactly one SPA application for client ID `ca698b88-3c0f-4279-bbb5-b60654497b31`. The existing `http://localhost:8080/` redirect was preserved, the production Front Door redirect was added, and re-reading verified `https://azure-weather-prod-fd-d2cc26-epa4ddasghg4d8fr.z03.azurefd.net/` exactly once.

## Files changed

- `docs/ai-interactions/016-production-frontend-deployment.md`
- `docs/ai-interactions/README.md`

Only documentation files were changed in the repository. The ignored frontend `dist` output was generated locally and deployed.

## Validation performed

- Active Azure subscription matched `d2cc2668-766e-4287-b55c-757156c5d652`.
- Storage account and Front Door profile/endpoint resource existence were confirmed.
- Shared Key access remained disabled; Entra-authenticated `$web` listing and upload succeeded with `--auth-mode login`.
- `npm.cmd run lint --workspace=@azure-weather/frontend` — passed.
- `npm.cmd test --workspace=@azure-weather/frontend` — passed: 1 test file, 19 tests.
- `npm.cmd run build --workspace=@azure-weather/frontend` — passed with the five approved public Vite environment values.
- Blob listing confirmed the three expected deployed files, MIME types, sizes, and upload timestamps.
- Static website properties confirmed `index.html` for both index and 404 handling.
- Front Door validation confirmed status 200, `text/html`, and an exact built-file hash match.
- Graph verification confirmed the required redirect URI exactly once and the original Azure subscription context was restored.
- `npm.cmd run format:check` and `git diff --check` passed.

## Security or dependency findings

No storage keys, SAS tokens, access tokens, credentials, secrets, Terraform state, saved plans, or unrelated environment values were printed or recorded. The Graph token existed only in process memory. No real `.env` file was created. Shared Key remained disabled, and only `spa.redirectUris` was changed in Entra.

Backend code, App Service, PostgreSQL, Key Vault, the ACR image, Front Door configuration, Terraform configuration/state, and application source were not modified. No migration, Terraform deployment/state command, App Service operation, Git commit, or Git push ran. No dependency changed.

## Assumptions

The supplied public Vite values and production Front Door URI are the intended production frontend configuration. The empty pre-deployment `$web` listing made stale-file cleanup unnecessary.

## Deferred work

The frontend is live, but the complete application still requires the deferred backend readiness work: populate and validate production Key Vault secrets, run the production database migration through an authorized process, then configure/start or restart App Service as appropriate and validate `/api`, authentication, database connectivity, and end-to-end frontend/API behavior.

## Documentation status

Interaction 016 and its index entry were added. Human review is pending; final status is awaiting human review.

## Tools and non-secret commands used

- PowerShell, Git, npm, Azure CLI, Azure Resource Manager, HTTPS, and Microsoft Graph.
- `az account show --query "{subscriptionId:id,userType:user.type}" -o json`
- `az storage account show --subscription d2cc2668-766e-4287-b55c-757156c5d652 --resource-group rg-azure-weather-prod-swc --name azureweatherprowebd2cc26 ...`
- `az resource list --subscription d2cc2668-766e-4287-b55c-757156c5d652 --resource-group rg-azure-weather-prod-swc ...`
- `az storage blob service-properties show --subscription d2cc2668-766e-4287-b55c-757156c5d652 --account-name azureweatherprowebd2cc26 --auth-mode login ...`
- `az storage blob list --subscription d2cc2668-766e-4287-b55c-757156c5d652 --account-name azureweatherprowebd2cc26 --container-name '$web' --auth-mode login ...`
- `npm.cmd run lint --workspace=@azure-weather/frontend`
- `npm.cmd test --workspace=@azure-weather/frontend`
- `npm.cmd run build --workspace=@azure-weather/frontend`
- `az storage blob upload-batch --subscription d2cc2668-766e-4287-b55c-757156c5d652 --account-name azureweatherprowebd2cc26 --auth-mode login --destination '$web' --source apps/frontend/dist --overwrite true`
- `Invoke-WebRequest` against the approved Front Door root, with status/content-type checks and SHA-256 comparison to the local built index.
- Microsoft Graph `GET /v1.0/applications` filtered by the approved `appId`, `PATCH /v1.0/applications/{id}` containing only `spa.redirectUris`, and a repeated filtered `GET` for verification. Authentication material was never printed.

The first `az afd` lookup could not run because the optional Front Door CLI extension was unavailable and the CLI attempted an interactive installation prompt. No extension was installed and no state changed; core `az resource list` successfully confirmed the existing profile and endpoint instead. A post-build file-list display initially used an unavailable local .NET method; the build was unaffected, and a compatible file-list command then succeeded.

## Public build configuration

- `VITE_API_BASE_URL=/api`
- `VITE_ENTRA_CLIENT_ID=ca698b88-3c0f-4279-bbb5-b60654497b31`
- `VITE_ENTRA_AUTHORITY=https://azureweatherexercise3.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6`
- `VITE_ENTRA_KNOWN_AUTHORITY=azureweatherexercise3.ciamlogin.com`
- `VITE_ENTRA_API_SCOPE=api://637c9165-b368-48a7-aa3d-3b9852a51a67/access_as_user`

## Files Changed

- `docs/ai-interactions/016-production-frontend-deployment.md`
- `docs/ai-interactions/README.md`

## Validation

- Preflight confirmed the approved subscription, successful storage provisioning in Sweden Central, disabled Shared Key access, existing Front Door resources, enabled static hosting, SPA index/404 settings, and working Entra Blob data-plane access.
- Frontend lint, 19 tests, and the production build passed.
- Exactly three generated artifacts were uploaded and then verified through Blob metadata.
- Front Door returned the exact built frontend with HTTPS 200 and `text/html`.
- The Entra application lookup was unique; the production redirect was added without removing the localhost redirect and was verified exactly once.
- The Azure subscription context was restored to the approved subscription.
- Documentation formatting and Git whitespace validation passed.

## Security Notes

- Azure Storage authentication used Microsoft Entra and `--auth-mode login`; Shared Key stayed disabled.
- No keys, SAS values, access tokens, credentials, secrets, Terraform state, saved plans, or unrelated environment values were retrieved for display or recorded.
- Only public Vite configuration entered the frontend bundle.
- Only built `dist` artifacts were uploaded.
- The Graph patch body contained only `spa.redirectUris`.
- No backend, App Service, PostgreSQL, Key Vault, ACR image, Front Door configuration, Terraform, or application-source operation occurred.

## Assumptions

- The provided public identifiers and Front Door host are the intended production frontend values.
- The existing static website and Front Door routing configuration are already managed by the deployed infrastructure.

## Deferred Work

- Populate and validate production Key Vault secrets.
- Run the production database migration through a separately authorized process.
- Configure/start or restart App Service only after backend prerequisites are ready.
- Validate `/api`, login/token acquisition, authenticated API calls, database connectivity, and complete end-to-end behavior.

## Human Review

Approved after independent review. The documented build artifacts match the local `dist` output, and a fresh HTTPS request to the production Front Door endpoint returned status `200`, `text/html`, 475 bytes, and Azure Weather content.

## Final Status

Approved
