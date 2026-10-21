# Front Door Custom Domain Stage 2

## Tool

Codex

## Model

Not exposed by the client

## Date

2026-10-21

## Objective

Close out the completed production custom-domain cutover, synchronize permanent documentation with the verified live outcome, preserve the staged rollback and security decisions, validate the tracked Terraform source, and record the work without accessing sensitive production inputs.

## Relevant Decisions

- `https://www.nivbarweather.com` is the canonical production URL.
- The Azure Front Door hostname remains enabled as the rollback and operational fallback.
- Stage 2 associates the custom domain with both the frontend `/*` and API `/api/*` routes through one Terraform input.
- Namecheap DNS and Microsoft Entra External ID configuration remain manually managed outside Terraform.
- The `_dnsauth.www` TXT validation record is retained and must not be deleted.
- The first Production CD OIDC failure remains documented as historical context; the later successful manual run is the current state.
- Existing human-review decisions in older interaction records are preserved unchanged.

## Exact Prompt

```text
Read and follow `AGENTS.md` completely before taking action.

Close out and document the completed production custom-domain rollout for the Azure Weather project. Work only in the current checkout and preserve all existing user and Codex changes.

Verified human-provided production outcome:

- Canonical production URL: `https://www.nivbarweather.com`
- Azure Front Door fallback URL remains enabled:
  `https://azure-weather-prod-fd-d2cc26-epa4ddasghg4d8fr.z03.azurefd.net`
- Azure validated the custom domain and completed managed TLS certificate deployment.
- `www.nivbarweather.com` is associated with both Front Door routes: frontend `/*` and API `/api/*`.
- Namecheap CNAME:
  - Host: `www`
  - Target: `azure-weather-prod-fd-d2cc26-epa4ddasghg4d8fr.z03.azurefd.net`
- Keep the `_dnsauth.www` TXT validation record documented; do not instruct its deletion.
- Microsoft Entra SPA redirect URI `https://www.nivbarweather.com/` was added while preserving the localhost and original Front Door redirects.
- App Service `FRONTEND_ORIGIN` now uses the custom-domain hostname.
- `WEBSITES_ENABLE_APP_SERVICE_STORAGE = "false"` is explicitly represented in Terraform.
- The local ignored production input now enables the custom-domain association. Do not inspect, print, modify, or record real `terraform.tfvars`.
- GitHub repository variable `PRODUCTION_URL` now points to `https://www.nivbarweather.com`.
- A manual Production CD run completed successfully using the new URL.
- Human verification passed for HTTPS, frontend loading, `/api/health`, authentication redirect, city search, saving forecasts, and loading saved forecasts.
- Temporary Key Vault network access, role elevation, and the PostgreSQL password environment variable were cleaned up.

Required work:

1. Inspect the current Git diff and existing documentation before editing.
2. Update `README.md` so the custom domain is the primary production URL and the Azure Front Door hostname is clearly described as the retained fallback.
3. Update the relevant permanent documentation, including:
   - `infra/terraform/README.md`
   - `docs/azure-infrastructure.md`
   - `docs/azure-deployment-readiness.md`
4. Change stale statements that say the custom-domain rollout or Production CD validation is pending. Clearly distinguish historical failures from the current successful final state.
5. Update the custom-domain readiness checklist with only the items supported by the verified evidence above.
6. Preserve the staged-rollout explanation, rollback path, security decisions, and the fact that Namecheap and Entra configuration remain manually managed outside Terraform.
7. Ensure the Terraform source already changed for this rollout is canonically formatted. Do not introduce unrelated infrastructure or application changes.
8. Create the next correctly numbered AI interaction record for the completed Stage 2 custom-domain cutover and add it to `docs/ai-interactions/README.md`.
   - Include the exact prompt verbatim.
   - Record the tools and validation used.
   - Do not expose secrets, access tokens, Terraform state, saved-plan contents, or credentials.
   - Do not rewrite historical exact prompts or model-response sections.
   - Mark the new documentation interaction as awaiting human review; do not fabricate approval.
9. Audit that existing AI interaction records retain their already recorded human-review decisions. Do not replace or invent historical human review.
10. Report the exact changed files and any remaining deferred work.

Validation:

- Run formatting checks appropriate to the files changed.
- Run `terraform fmt -check` against tracked Terraform source files.
- Run `terraform validate` only if it can be performed without reading real environment inputs, state, saved plans, or secrets.
- Run `npm.cmd run format:check`.
- Run `git diff --check`.
- Verify that permanent documentation consistently presents `https://www.nivbarweather.com` as production and the Azure Front Door URL as fallback.
- Verify that no real secret, `.env`, `terraform.tfvars`, state file, or saved plan was inspected or modified.

Restrictions:

- Do not run Terraform plan, apply, destroy, import, refresh, or state commands.
- Do not run Azure CLI, GitHub CLI, DNS mutation, Entra mutation, or deployment commands.
- Do not alter Namecheap, Azure, Entra, GitHub variables, application runtime, or live resources.
- Do not retrieve or print secrets.
- Do not commit or push.
- Do not delete or overwrite unrelated worktree changes.
```

## Model Response

## Summary

- Closed out the Stage 2 custom-domain rollout in permanent documentation. `https://www.nivbarweather.com` is now the canonical production URL, and `https://azure-weather-prod-fd-d2cc26-epa4ddasghg4d8fr.z03.azurefd.net` is the retained fallback.
- Documented the completed managed-TLS deployment, both-route association, manual Namecheap and Entra boundaries, retained `_dnsauth.www` record, custom `FRONTEND_ORIGIN`, successful Production CD run, human verification, and cleanup of temporary access.
- Kept the initial OIDC failure as historical context while replacing stale pending-validation language with the successful final state.

## Files changed

This closeout changed exactly:

- `README.md`
- `docs/azure-deployment-readiness.md`
- `docs/azure-infrastructure.md`
- `infra/terraform/README.md`
- `docs/ai-interactions/030-front-door-custom-domain-stage-2.md`
- `docs/ai-interactions/README.md`

Existing rollout Terraform changes and pre-existing human-review updates were preserved. No application source, architecture diagram, dependency file, workflow, or live resource was changed.

## Validation performed

- PASS — `terraform fmt -check` against the tracked `infra/terraform/*.tf` files.
- PASS — isolated `terraform init -backend=false -input=false` and `terraform validate` using only tracked Terraform source plus `.terraform.lock.hcl`; no production input, backend, state, or saved plan was read.
- PASS — `npm.cmd run format:check`.
- PASS — `git diff --check`.
- PASS — permanent-documentation searches confirmed the custom hostname is presented as canonical production, the Azure Front Door hostname as fallback, and pending rollout/CD language has been removed or identified as historical.
- PASS — the interaction-log audit confirmed existing recorded human-review decisions remain unchanged.

## Security or dependency findings

- No secret, token, credential, real `.env`, real `terraform.tfvars`, Terraform state, or saved plan was inspected, printed, modified, or recorded during this closeout.
- Terraform validation ran from an isolated temporary directory populated only from tracked source and the provider lock file.
- No dependencies changed, so dependency audits were not required.

## Assumptions

- The human-provided production outcomes are authoritative; no live Azure, Namecheap, Entra, GitHub, application, or DNS query was performed.
- The ignored production association input is enabled as reported, but its file was not inspected or modified.

## Deferred work

- No custom-domain cutover or Production CD first-run validation remains deferred.
- Ongoing manual ownership remains for Namecheap DNS, Entra redirect configuration, future production releases, and any rollback.
- Existing roadmap items remain deferred: alert destinations, distributed caching, automated rollback/evidence improvements, and any separately approved Front Door Premium/Private Link/WAF or ACR private-endpoint decision.

## Documentation status

- Root, Terraform, infrastructure, deployment-readiness, and AI-interaction documentation are synchronized with the verified Stage 2 outcome.
- Existing historical interaction prompts, model responses, and human-review decisions were not rewritten.
- Human Review: Pending.
- Final Status: Awaiting human review.

## Files Changed

The exact file list is included in the Model Response above.

## Validation

The commands and outcomes are recorded in the Model Response above.

## Security Notes

No secret, access token, credential, production input, Terraform state, or saved-plan content was accessed or recorded.

## Assumptions

The verified production outcomes supplied by the human reviewer are authoritative and were documented without querying live systems.

## Deferred Work

Ongoing external-system ownership and the existing roadmap items are listed in the Model Response above.

## Human Review

Checked and approved by the human reviewer on 2026-10-21.

## Final Status

Approved
