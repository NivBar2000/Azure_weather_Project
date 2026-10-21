# Interaction 018: Production Backend Migration Retry

## Tool

Codex

## Model

GPT-5

## Date

2026-10-21

## Objective

Retry the production TypeORM migration exactly once after the PostgreSQL administrator credential was synchronized, remove every temporary migration resource and permission, restart the existing App Service once, and validate backend/frontend routing through Azure Front Door without interactive login.

## Relevant decisions

- Reuse the Interaction 017 one-shot ACI design with temporary subnet `10.40.3.0/24`, a temporary user-assigned identity, and ACR-scoped `AcrPull`.
- Treat migration and complete cleanup as hard gates before App Service restart.
- Retrieve authorized Key Vault values only in process memory and pass the database password only as an ACI secure environment variable.
- Remove temporary human Key Vault access immediately after runner submission and remove all remaining temporary resources before App Service activation.
- Restart App Service exactly once after successful migration and cleanup.
- Use the documented Key Vault-reference refresh operation after sanitized logs proved App Service was still using the cached pre-rotation database credential. This refetched versionless secret values without rewriting settings or issuing a second explicit restart.
- Preserve SCM deny-by-default after live log streaming returned `403 Ip Forbidden`; use sanitized Log Analytics evidence instead.
- Preserve unrelated worktree changes and restrict repository edits to this interaction record and its index entry.

## Exact Prompt

```text
The PostgreSQL administrator password has now been deliberately reset and synchronized with the existing Key Vault secret `postgresql-administrator-password`. All temporary human Key Vault permissions and firewall access were removed afterward.

Resume the previously approved production backend procedure from the migration retry point.

- Repeat the same preflight and one-shot migration approach documented in Interaction 017.
- Use the exact approved image `azureweatherprodacrd2cc26.azurecr.io/weather-backend:1ebd30cc0629`.
- Run `npm run migration:run:prod --workspace=@azure-weather/backend` exactly once from a temporary network-connected Azure runner.
- Apply the same security restrictions and mandatory cleanup from the previous prompt.
- Never display or persist secret values.
- Do not modify Terraform, application source, dependencies, authentication registrations, Front Door configuration, or permanent infrastructure.
- If migration fails again, clean up and stop with sanitized diagnostics.
- If migration succeeds, verify cleanup, restart the existing App Service once, and validate:
  - Key Vault references are resolved;
  - image pull and application startup;
  - private PostgreSQL connectivity;
  - Front Door `GET /api/health`;
  - protected API behavior without a token;
  - frontend root availability;
  - sanitized App Service logs.
- Do not perform interactive Google or Microsoft login.
- Do not commit or push.

Create Interaction 018 for this retry and update the interaction index. Include the exact prompt, sanitized commands and evidence, migration names/results, cleanup verification, App Service state, health/routing results, remaining manual browser test, and pending human-review status.

Do not claim success unless migration, cleanup, backend health, and Front Door API routing are all independently verified.
```

## Model Response

## Summary

The production backend migration retry, cleanup, activation, and non-interactive validation all succeeded.

- Migration runner: exit code 0, `Completed`, zero restarts.
- Migrations executed exactly once:
  - `CreateDatabaseFoundation1760976000000`
  - `AlignSavedForecastCursorPrecision1792512000000`
- Temporary cleanup: verified complete. The ACI group, user-assigned identity, temporary ACR `AcrPull`, `10.40.3.0/24` subnet, operator Key Vault role, and temporary vault IP rule are absent.
- Image: `azureweatherprodacrd2cc26.azurecr.io/weather-backend:1ebd30cc0629`
- Digest: `sha256:2bf7c1bbcfb5f43a603ead9c5bab5bf530fd4c9b2c1b26edb0e4005e637a6f56`
- App Service: `Running`, availability `Normal`, exact image configured, managed-identity ACR pull enabled, and restarted exactly once.
- Key Vault references: `DATABASE_PASSWORD` and `OPENWEATHER_API_KEY` both `Resolved`.
- Front Door: two final consecutive `GET /api/health` requests returned 200 with the expected backend response; unauthenticated `GET /api/auth/me` returned 401; frontend `/` returned 200 HTML.
- Direct App Service origin access returned 403, confirming the Front Door-only restriction remains enforced.

## Files changed

- `docs/ai-interactions/018-production-backend-migration-retry.md`
- `docs/ai-interactions/README.md`

Only documentation files changed in the repository. Existing unrelated worktree changes were preserved.

## Validation performed

- Repeated the Interaction 017 preflight: approved subscription/resource group/region, exact image and digest, system identity, permanent `AcrPull`, permanent `Key Vault Secrets User`, VNet integration, required setting names, resolved references, private PostgreSQL, unused `10.40.3.0/24`, disabled ACR admin, and disabled Storage Shared Key.
- Confirmed no temporary container, identity, subnet, human vault role, or vault IP rule existed before the retry.
- Confirmed both required Key Vault secrets exist and are enabled without displaying their values.
- The one-shot runner used the exact approved image, private VNet placement, `Never` restart policy, and only the approved migration command and database environment-variable names.
- TypeORM reported zero existing migrations, two source migrations, and successful execution of both named migrations.
- Cleanup verification returned: container absent, identity absent, subnet absent, temporary ACR role count 0, temporary operator vault role count 0, and vault IP rule count 0.
- App Service was restarted exactly once after migration and cleanup success.
- Initial post-restart Front Door checks returned 503. Sanitized Log Analytics records showed App Service still using the cached pre-rotation database credential and receiving PostgreSQL `auth_failed`.
- Used Microsoft’s supported [Key Vault reference refresh operation](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references#understand-rotation) to refetch versionless secrets without changing application settings or issuing another explicit restart.
- Health recovered after refresh: expected `/api/health` response on attempt 6, followed by two additional consecutive successful health checks.
- Protected API behavior, frontend availability, exact image/runtime configuration, resolved references, and direct-origin denial were independently verified.
- Successful migrations proved private runner-to-PostgreSQL connectivity. Successful Nest responses after reference refresh independently proved App Service startup and database initialization, because the application had previously failed startup at TypeORM initialization while the cached credential was invalid.
- Sanitized logs were inspected through Log Analytics. Live SCM log streaming remained blocked with `403 Ip Forbidden`, as intended by the deny-by-default SCM policy; no restriction was weakened.
- Documentation formatting and Git whitespace checks passed.

## Security or dependency findings

No secret value, access token, registry credential, connection string, or environment-variable content was displayed, logged, persisted, or documented. Secret values existed only in process memory, and the database password was passed as an ACI secure environment variable.

The temporary access path was least privilege and fully removed. ACR admin and Storage Shared Key remained disabled. No Terraform configuration/state, application source, dependency, authentication registration, Front Door configuration, PostgreSQL configuration, or permanent network topology was modified. No second explicit App Service restart, interactive login, commit, or push occurred.

Sanitized historical App Service logs contain the expected pre-refresh PostgreSQL authentication failures caused by the cached old secret value. The last ingested failures ended before reference refresh; the live health/routing checks subsequently passed. Log Analytics had not yet ingested the successful startup lines during the final bounded query.

## Assumptions

The user-authorized PostgreSQL password reset and Key Vault synchronization were completed correctly before this retry. The successful migration and recovered App Service startup support that assumption.

## Deferred work

The remaining manual browser test is: open `https://azure-weather-prod-fd-d2cc26-epa4ddasghg4d8fr.z03.azurefd.net/`; complete Microsoft Account and Google sign-in separately; for each identity verify weather search/forecast and save/list/detail history; verify a second identity cannot access the first identity’s saved-forecast UUID; then sign out and confirm return to the Front Door origin.

## Documentation status

Interaction 018 and its index entry were added. Human review is pending; final status is awaiting human review.

## Tools and sanitized commands used

- PowerShell, Git, Azure CLI, Azure Resource Manager REST, Log Analytics REST, HTTPS, and npm formatting checks.
- Read-only preflight used `az account show`, `az group show`, `az webapp show`, `az webapp config show`, `az webapp config appsettings list`, `az role assignment list`, `az acr show`, `az acr repository show-tags`, `az keyvault show`, `az postgres flexible-server show`, `az storage account show`, `az network vnet show`, and `az network vnet subnet list` with non-secret projections.
- App Service Key Vault reference status used the App Service configuration-reference REST API and emitted only names/statuses.
- Temporary resources used `az network vnet subnet create`, `az identity create`, `az role assignment create`, `az keyvault network-rule add`, and `az container create`.
- The ACI command was `npm run migration:run:prod --workspace=@azure-weather/backend`; only the six approved database environment names were passed, with the password supplied from memory through `--secure-environment-variables`.
- Migration evidence used `az container show` and sanitized `az container logs` output.
- Cleanup used `az container delete`, `az role assignment delete`, `az identity delete`, `az network vnet subnet delete`, and `az keyvault network-rule remove`, followed by independent absence/count checks.
- Activation used one `az webapp restart` after all migration and cleanup gates passed.
- Cached-reference recovery used authenticated `POST .../config/configreferences/appsettings/refresh?api-version=2022-03-01`; no setting value was rewritten.
- Validation used HTTPS requests through Front Door, direct-origin denial testing, App Service/reference status reads, and in-memory Log Analytics queries with sanitized output.

## Migration result

- Provisioning state: `Succeeded`.
- Runtime state: `Terminated` / `Completed`.
- Exit code: `0`.
- Restart count: `0`.
- `CreateDatabaseFoundation1760976000000`: executed successfully.
- `AlignSavedForecastCursorPrecision1792512000000`: executed successfully.

## Temporary resources and cleanup verification

- `azure-weather-migrate-018`: removed; verified absent.
- `azure-weather-migrate-mi-018`: removed; verified absent.
- Temporary identity ACR `AcrPull`: removed; matching count 0.
- `migration-runner-temp-018` / `10.40.3.0/24`: removed; verified absent.
- Temporary operator `Key Vault Secrets User`: removed; matching count 0.
- Temporary Key Vault `/32` firewall rule: removed; vault IP rule count restored to 0.

## App Service and routing result

- State: `Running`; availability: `Normal`.
- Explicit restarts in this interaction: 1.
- Image and managed-identity pull configuration: exact and verified.
- Key Vault references: both `Resolved`.
- `/api/health`: final checks 200 with expected JSON.
- `/api/auth/me` without a token: 401 JSON.
- Frontend `/`: 200 HTML.
- Direct App Service `/api/health`: 403.
- Private database initialization: successful after supported Key Vault-reference refresh.

## Validation

- Migration succeeded independently.
- Temporary-resource and permission cleanup succeeded independently.
- Backend health and Front Door API routing succeeded independently.
- Protected routing, frontend availability, secret-reference status, exact image configuration, database initialization, and origin restriction were verified.
- Sanitized logging checks completed without weakening SCM restrictions.
- Documentation checks passed.

## Security Notes

- No secret or authentication material was exposed or persisted.
- Temporary access was narrow and fully removed.
- Permanent infrastructure/configuration remained unchanged except for the authorized runtime restart and Key Vault-reference cache refresh.
- No Terraform, source, dependency, Entra, Front Door, PostgreSQL-configuration, commit, or push operation ran.

## Assumptions

- Successful TypeORM execution and post-refresh Nest startup demonstrate that the synchronized credential is now accepted through both the temporary runner and App Service paths.

## Deferred Work

- Implement CI/CD and a persistent, controlled production migration runner in a future reviewed interaction.

## Human validation outcome

Human browser validation completed successfully on 2026-10-21:

- Google sign-in worked.
- Microsoft Account sign-in worked.
- City search and live forecasts worked after the active OpenWeather key was reconciled as documented in Interaction 019.
- Saving, listing, and opening saved forecasts worked.
- Saved forecasts remained isolated between two tested identities.
- Sign-out worked.

## Human Review

Approved

## Final Status

Approved
