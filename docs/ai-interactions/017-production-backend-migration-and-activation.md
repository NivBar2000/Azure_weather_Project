# Interaction 017: Production Backend Migration and Activation

## Tool

Codex

## Model

GPT-5

## Date

2026-10-20

## Objective

Run the pending production TypeORM migrations exactly once from a temporary VNet-connected Azure runner, remove all temporary resources and permissions, and activate and validate the backend only if the migration succeeds.

## Relevant decisions

- Treat migration success as a hard gate before any App Service start/restart or Front Door API validation.
- Use a one-shot Azure Container Instance on temporary subnet `10.40.3.0/24`, with `Never` restart policy and the exact approved backend image.
- Use a temporary user-assigned managed identity with only ACR-scoped `AcrPull`.
- Temporarily grant the deployment user `Key Vault Secrets User` and allow only its current public `/32`; remove both immediately after submitting the runner.
- Retrieve the two authorized secret records only in process memory, verify both are enabled, and pass only the database password as an ACI secure environment variable.
- Stop after the runner returned exit code 1 with a PostgreSQL password-authentication error; do not restart App Service or perform post-migration API validation.
- Remove and independently verify removal of every temporary resource and permission.
- Preserve all unrelated repository changes and modify only this interaction record and the interaction index.

## Exact Prompt

```text
Continue the production deployment of the Azure Weather project in the current repository.

The frontend is already deployed successfully. Complete the backend readiness work carefully and sequentially:

1. Run the pending TypeORM production migrations exactly once from a temporary Azure-hosted runner that can reach the private PostgreSQL server.
2. Clean up every temporary migration resource.
3. Verify/start or restart the existing App Service backend.
4. Validate the backend through Azure Front Door and perform all safe end-to-end checks possible without interactive human login.

Approved production resources:

- Subscription: `d2cc2668-766e-4287-b55c-757156c5d652`
- Resource group: `rg-azure-weather-prod-swc`
- Region: `swedencentral`
- Backend App Service: `azure-weather-prod-api-d2cc26`
- Backend image: `azureweatherprodacrd2cc26.azurecr.io/weather-backend:1ebd30cc0629`
- Key Vault: `azure-weather-kv-d2cc26`
- PostgreSQL host: `azure-weather-prod-psql-d2cc26.postgres.database.azure.com`
- PostgreSQL database: `azure_weather`
- PostgreSQL user: `weatheradmin`
- VNet address space: `10.40.0.0/16`
- Existing App Service subnet: `10.40.1.0/24`
- Existing PostgreSQL subnet: `10.40.2.0/24`
- Front Door URL: `https://azure-weather-prod-fd-d2cc26-epa4ddasghg4d8fr.z03.azurefd.net`
- Migration command inside the image:
  `npm run migration:run:prod --workspace=@azure-weather/backend`

Authorization and limits:

- You are authorized to create a minimal temporary Azure migration runner, a temporary subnet if required, a temporary managed identity, narrowly scoped role assignments, and temporary Key Vault network access.
- You are authorized to start or restart the existing App Service after migration success.
- You are authorized to read the two existing Key Vault secrets only in process memory when required:
  - `postgresql-administrator-password`
  - `openweather-api-key`
- Never print, log, persist, document, or expose secret values, access tokens, registry credentials, connection strings, or environment-variable contents.
- Keep ACR admin access and Storage Shared Key disabled.
- Do not modify Terraform configuration or state.
- Do not run Terraform plan/apply/destroy/import/refresh/state commands.
- Do not change application source or dependencies.
- Do not commit or push.
- Do not create a real `.env` file.
- Do not run migrations through normal App Service startup; it has multiple instances.
- Do not alter authentication registrations, Front Door configuration, PostgreSQL configuration, or permanent network topology.
- Do not delete or recreate existing production resources.
- If the configured App Service image or required infrastructure differs from the approved values, stop and report instead of correcting it outside Terraform.

Procedure:

1. Read `AGENTS.md` and the relevant deployment documentation completely.
2. Confirm the active subscription and verify the approved resources exist.
3. Inspect the existing App Service configuration without printing sensitive settings. Confirm:
   - exact approved image and tag;
   - system-managed identity;
   - ACR pull assignment;
   - Key Vault Secrets User assignment;
   - VNet integration;
   - required application setting names;
   - Key Vault reference resolution status, without retrieving their values.
4. Verify the two required Key Vault secrets exist and are enabled without displaying their values.
5. Verify the exact image tag and digest exist in ACR.
6. Inspect the current VNet/subnets. Use `10.40.3.0/24` for a temporary migration subnet only if Azure confirms it is unused and non-overlapping. Delegate it only as required by the selected temporary runner.
7. Prefer a minimal Azure Container Instance one-shot runner connected to the VNet. Use a temporary user-assigned managed identity for ACR pull where supported.
8. If the runner cannot consume Key Vault references directly, temporarily grant the current deployment identity only `Key Vault Secrets User`, temporarily allow its current public IP through the Key Vault firewall, retrieve required values into process memory without output, and pass the database password as a secure environment variable. Never place a secret directly in a displayed command, generated file, documentation, or ordinary environment output.
9. Pass only these migration environment variables:
   - `DATABASE_HOST`
   - `DATABASE_PORT=5432`
   - `DATABASE_USER=weatheradmin`
   - `DATABASE_PASSWORD` as a secure value
   - `DATABASE_NAME=azure_weather`
   - `DATABASE_SSL=true`
10. Override the container command so it runs only:
    `npm run migration:run:prod --workspace=@azure-weather/backend`
11. Wait for the runner to terminate. Treat only exit code zero and clear TypeORM success/no-pending-migrations output as success. Sanitize logs before displaying or recording them.
12. Whether migration succeeds or fails, remove:
    - the temporary container group;
    - temporary identity;
    - temporary role assignments;
    - temporary subnet;
    - temporary Key Vault firewall rule;
    - temporary operator Key Vault role if one was added.
    Verify cleanup. Preserve evidence needed for review, but no secrets.
13. If migration fails, do not start/restart the App Service. Diagnose using sanitized evidence, document the blocker, and stop.
14. After migration succeeds:
    - re-check that the App Service still references the exact approved image;
    - start it if stopped, otherwise restart it once;
    - do not rewrite existing application settings unless a required Key Vault reference is unresolved;
    - if a setting is incorrect and fixing it would create Terraform drift, stop and report.
15. Wait a bounded amount of time for startup and query sanitized App Service/container logs if necessary.
16. Validate through Front Door:
    - `GET /api/health` returns HTTPS 200 and the expected healthy response;
    - static frontend root still returns HTTPS 200;
    - a protected API endpoint without a token rejects the request appropriately rather than returning a routing or server error;
    - Front Door `/api/*` routing reaches the backend;
    - no secret values appear in responses or logs.
17. Inspect App Service health, image-pull status, Key Vault reference status, private PostgreSQL connectivity, and recent errors. Do not weaken access restrictions to make validation pass.
18. Do not attempt automated interactive Google/Microsoft sign-in. Report the exact final manual test the user must perform in the browser.
19. Run repository documentation formatting checks where available.
20. Create `docs/ai-interactions/017-production-backend-migration-and-activation.md` containing:
    - this exact prompt;
    - tools and sanitized commands used;
    - migration result;
    - temporary resources created and cleanup verification;
    - App Service result;
    - validation evidence;
    - security findings;
    - assumptions and remaining manual test;
    - `Human Review: Pending`;
    - `Final Status: Awaiting human review`.
21. Add Interaction 017 to `docs/ai-interactions/README.md`.

Return a concise summary containing:

- whether migration succeeded;
- which migrations ran, without sensitive data;
- confirmation that temporary resources and permissions were removed;
- the exact deployed image tag and digest;
- App Service state and Key Vault reference status;
- `/api/health` and routing results;
- any sanitized errors;
- files changed;
- the exact browser test still required;
- documentation status.

Do not claim success unless migration, cleanup, backend health, and Front Door API routing are all independently verified.
```

## Model Response

## Summary

The production migration did not succeed, so backend activation stopped at the required safety gate.

- Migrations run: none. The one-shot TypeORM command exited 1 before schema migration with the sanitized error `password authentication failed for user "weatheradmin"`.
- Temporary cleanup: verified complete. The ACI container group, user-assigned identity, ACR `AcrPull` assignment, `10.40.3.0/24` subnet, operator Key Vault role, and temporary Key Vault IP rule were all removed.
- Deployed image remains `azureweatherprodacrd2cc26.azurecr.io/weather-backend:1ebd30cc0629`, with verified ACR digest `sha256:2bf7c1bbcfb5f43a603ead9c5bab5bf530fd4c9b2c1b26edb0e4005e637a6f56`.
- App Service remains `Running` on that exact image. It was not started or restarted.
- `DATABASE_PASSWORD` and `OPENWEATHER_API_KEY` Key Vault references both report `Resolved`. This confirms App Service can resolve the secrets, but does not prove that the stored database password matches PostgreSQL.
- `/api/health`, protected-route behavior, and Front Door `/api/*` routing were not tested because the migration failed and the procedure required stopping before activation.

## Files changed

- `docs/ai-interactions/017-production-backend-migration-and-activation.md`
- `docs/ai-interactions/README.md`

Only documentation was changed in the repository. Existing unrelated worktree changes were preserved.

## Validation performed

- Confirmed the approved subscription, resource group, Sweden Central region, App Service, ACR, Key Vault, PostgreSQL server, VNet, and permanent subnets.
- Confirmed App Service system identity, VNet integration, managed-identity ACR pull, permanent ACR `AcrPull`, permanent Key Vault `Key Vault Secrets User`, required setting names, and exact image.
- Confirmed ACR admin access is disabled and PostgreSQL public access is disabled.
- Confirmed the exact tag/digest exists in ACR.
- Confirmed both required Key Vault secrets exist and are enabled without displaying their values.
- Confirmed both App Service Key Vault references are `Resolved` using the official [App Service reference-status REST operation](https://learn.microsoft.com/en-us/rest/api/appservice/web-apps/get-app-settings-key-vault-references?view=rest-appservice-2025-03-01).
- Confirmed `10.40.3.0/24` was unused and non-overlapping before temporary creation.
- ACI used the exact image, a private IP, `Never` restart policy, zero restarts, and only the approved migration command/environment names.
- Runner provisioning succeeded, but its terminated state reported exit code 1 and `detailStatus: Error`.
- Final cleanup verification reported the container, identity, and subnet absent; temporary ACR role count 0; temporary operator vault role count 0; and vault IP rule count 0.
- Final read-only checks confirmed the permanent App Service identity, image, VNet integration, permanent ACR role, and Key Vault reference statuses remained unchanged.
- Documentation formatting and Git whitespace checks passed.

## Security or dependency findings

The runner reached the private PostgreSQL service far enough to receive a PostgreSQL authentication response, so the sanitized evidence is consistent with a credential mismatch rather than an ACR pull, DNS, routing, or TLS-connectivity failure. The exact cause must still be reconciled by the database owner; no password value was compared, displayed, or read from Terraform state.

Secret values and tokens were never printed, logged, persisted to files, or documented. The database password was held only in process memory and sent as an ACI secure environment variable. No `.env` file was created. ACR admin and Storage Shared Key remained disabled. No application source, dependency, Terraform configuration/state, PostgreSQL configuration, Front Door configuration, authentication registration, or permanent network topology was changed.

## Assumptions

The Key Vault database-password secret is stale or otherwise differs from the active PostgreSQL administrator credential. That is an evidence-based diagnosis, not a confirmed value comparison. Key Vault `Resolved` status only proves reference retrieval.

## Deferred work

Before retrying migration, an authorized database/secret owner must reconcile `postgresql-administrator-password` with the active `weatheradmin` credential. If the correct current password is unavailable, separately authorize a coordinated PostgreSQL administrator-password rotation and Key Vault secret update; do not inspect or expose Terraform state to recover it.

After credential reconciliation, rerun the one-shot migration in a new reviewed interaction. Only after migration and cleanup succeed should App Service be restarted and `/api/health`, protected routing, private database connectivity, image pull, logs, and Front Door `/api/*` behavior be validated.

The final browser test still required after backend health succeeds is: open `https://azure-weather-prod-fd-d2cc26-epa4ddasghg4d8fr.z03.azurefd.net/`; complete Microsoft Account and Google sign-in separately; for each identity verify weather search/forecast and save/list/detail history; verify a second identity cannot access the first identity’s saved-forecast UUID; then sign out and confirm return to the Front Door origin.

## Documentation status

Interaction 017 and its index entry were added. Human review is pending; final status is awaiting human review.

## Tools and sanitized commands used

- PowerShell, Git, Azure CLI, Azure Resource Manager REST, npm formatting checks, and official Microsoft App Service REST documentation.
- Read-only inventory used `az account show`, `az group show`, `az webapp show`, `az webapp config show`, `az webapp config container show`, `az webapp config appsettings list`, `az role assignment list`, `az acr show`, `az acr repository show-tags`, `az keyvault show`, `az postgres flexible-server show`, `az network vnet show`, and `az network vnet subnet list` with non-secret projections.
- Key Vault reference status used `GET .../config/configreferences/appsettings?api-version=2025-03-01` and printed only setting name, vault name, secret name, and resolution status.
- Temporary runner resources used `az network vnet subnet create`, `az identity create`, `az role assignment create`, `az keyvault network-rule add`, and `az container create`.
- The ACI command was `npm run migration:run:prod --workspace=@azure-weather/backend` with the six approved database environment variable names; `DATABASE_PASSWORD` was supplied only through `--secure-environment-variables` from an in-memory value.
- Runner evidence used `az container show` and `az container logs`; displayed log lines were filtered and sanitized.
- Cleanup used `az container delete`, `az role assignment delete`, `az identity delete`, `az network vnet subnet delete`, and `az keyvault network-rule remove`, followed by independent list/show verification.

## Migration result

- Container provisioning: `Succeeded`.
- Runtime state: `Terminated`.
- Exit code: `1`.
- Restart count: `0`.
- TypeORM migrations executed: none.
- Sanitized error: `password authentication failed for user "weatheradmin"`.

## Temporary resources and cleanup verification

- Container group `azure-weather-migrate-017`: removed and verified absent.
- User-assigned identity `azure-weather-migrate-mi-017`: removed and verified absent.
- Temporary identity ACR `AcrPull`: removed; matching assignment count 0.
- Subnet `migration-runner-temp-017` (`10.40.3.0/24`): removed and verified absent.
- Deployment-operator `Key Vault Secrets User`: removed; matching assignment count 0.
- Temporary Key Vault public `/32` rule: removed; total vault IP rule count restored to 0.

## App Service result

App Service was not started, stopped, restarted, or reconfigured because migration failed. It remains `Running` on the exact approved image with its original system identity, VNet integration, health path, managed-identity ACR configuration, permanent scoped roles, and resolved Key Vault references.

## Validation

- Infrastructure and release preflight passed.
- Private runner provisioning and secret delivery succeeded.
- Migration failed the required success gate with a sanitized PostgreSQL authentication error.
- Cleanup passed independently.
- Backend health and Front Door API routing were intentionally not tested after the failure.
- Documentation formatting and Git whitespace validation passed.

## Security Notes

- No secret value, access token, registry credential, connection string, or environment-variable content was printed or recorded.
- Temporary access was least privilege and fully removed.
- App Service and all permanent infrastructure/configuration remained unchanged.
- No Terraform, migration retry, App Service operation, commit, or push occurred after the failure.

## Assumptions

- The authentication error indicates that the secret-delivered password was rejected for the approved administrator user; the exact credential discrepancy remains a database-owner investigation.

## Deferred Work

- Reconcile or separately authorize rotation of the PostgreSQL administrator password and corresponding Key Vault secret.
- Rerun the migration once in a new authorized interaction.
- After successful migration and cleanup, restart App Service and complete backend/Front Door validation.
- Perform the documented interactive Microsoft/Google authentication and cross-user isolation browser test.

## Human Review

Reviewed. This record accurately documents a failed migration attempt: no migration ran, the backend activation gate was not passed, and all temporary access and resources were removed. The attempt is closed and superseded by the successful migration and activation documented in Interaction 018.

## Final Status

Closed — failed attempt superseded by approved Interaction 018
