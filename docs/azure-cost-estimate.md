# Azure Production Cost Estimate

## Purpose and estimate basis

This document estimates the recurring production cost of Azure Weather and explains the architectural choices that drive it. It is an engineering estimate, not an invoice or a Microsoft quote.

Estimate date: **2026-10-21**.

The estimate uses:

- public Azure pay-as-you-go retail prices in USD;
- the deployed Sweden Central architecture represented by the tracked Terraform configuration;
- 730 hours in an average month;
- no subscription credits, negotiated discounts, reservations, savings plans, taxes, or currency conversion;
- a low-traffic project workload of approximately 1 million Front Door requests and 10 GB of client egress per month;
- no more than 5 GB of monthly Azure Monitor Analytics Logs ingestion in the lower estimate;
- container images remaining within the 10 GB included with ACR Basic;
- PostgreSQL backups remaining within the free allowance equal to 100% of the primary server's 32 GB provisioned storage.

The actual subscription charge can be lower because of exercise credits or higher because of traffic, log ingestion, storage growth, autoscaling, paid external-service plans, taxes, or a different commercial agreement.

## Current production configuration

The estimate covers the following production choices:

- two continuously running Linux App Service P0v3 workers, with autoscale up to four;
- PostgreSQL Flexible Server General Purpose `GP_Standard_D2s_v3`, with two vCores, 32 GB storage, and zone-redundant high availability;
- Azure Front Door Standard;
- Azure Container Registry Basic;
- Azure Storage Static Website using Standard LRS;
- Azure Key Vault Standard;
- one Private DNS zone and regional virtual networking;
- Log Analytics with the `PerGB2018` SKU and 30-day retention;
- workspace-based Application Insights;
- a Consumption-profile Container Apps migration job that runs only during releases;
- the separately purchased `nivbarweather.com` domain.

## Estimated monthly cost in Sweden Central

| Component                              |                                                                                      Calculation or assumption |  Estimated monthly cost |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------: | ----------------------: |
| App Service P0v3                       |                                                                         2 workers x USD 0.089/hour x 730 hours |          **USD 129.94** |
| PostgreSQL compute                     |                                                     2 replicas x 2 vCores x USD 0.08976/vCore-hour x 730 hours |          **USD 262.10** |
| PostgreSQL storage                     |                                                                       2 replicas x 32 GB x USD 0.1369/GB-month |            **USD 8.76** |
| Front Door Standard base fee           |                                                                                     Fixed Standard profile fee |           **USD 35.00** |
| Container Registry Basic               |                                                                                     USD 0.1666/day x 30.4 days |            **USD 5.06** |
| Core Azure subtotal                    |                                                                                          Sum of the rows above |          **USD 440.87** |
| Front Door requests and delivery       |                                                      About 1 million requests and 10 GB European client egress |      **about USD 1.73** |
| Storage, Key Vault, and Private DNS    |                                                   Small static site, low operation count, one private DNS zone |       **about USD 1-3** |
| Azure Monitor and Application Insights |        USD 0 while Analytics Logs stay within the first 5 GB/month; allow up to about 5 additional billable GB |         **USD 0-14.95** |
| Container Apps migration job           | Manual 0.5-vCPU/1-GiB job, at most 900 seconds per run; normally covered by the monthly Consumption free grant | **approximately USD 0** |
| Domain registration                    |                                                                    USD 11.48 for the first year, divided by 12 |            **USD 0.96** |

The expected low-traffic total is therefore approximately **USD 445-460 per month**, or **USD 5,340-5,520 per year**, before credits, discounts, taxes, and exchange-rate effects.

The domain estimate represents the known first-year purchase price. Renewal pricing can differ and should be checked before renewal.

## Primary cost drivers

### App Service availability

App Service is billed per active worker. The two-worker minimum costs approximately USD 129.94 per month. Each additional P0v3 worker costs approximately USD 64.97 if it remains active for an entire 730-hour month.

Autoscale can temporarily increase the worker count from two to four. If four workers remained active for a complete month, App Service would cost approximately USD 259.88 and the total solution would increase by about USD 129.94. Short scale-out events are billed only for the hours during which the extra workers exist.

The two-worker minimum and zone balancing are availability decisions, not minimum technical requirements for a small demonstration workload.

### PostgreSQL zone-redundant high availability

PostgreSQL is the largest cost component. Zone-redundant HA maintains a primary server and a synchronous standby in another availability zone. Azure charges the provisioned compute and storage for both replicas, which is why database compute and storage contribute approximately USD 270.86 per month.

The standby is already running; it is not created only after a failure. Azure can automatically fail over to it while retaining the same database hostname. The standby is not a read replica for application traffic.

Backup retention is seven days. Azure does not charge additional backup-storage cost while backup consumption remains at or below 100% of the primary server's provisioned 32 GB. Consumption above that allowance is billed separately. Geo-redundant backup is disabled, so this design protects against a zonal failure but does not provide cross-region disaster recovery.

### Front Door

Front Door Standard has an approximately USD 35 monthly base fee even at low traffic. Requests and outbound delivery add usage charges. For the low-traffic assumption, 1 million requests and 10 GB of European client egress add approximately USD 1.73.

Front Door provides the public entry point, managed TLS for the custom domain, CDN behavior, and application-layer routing between the static frontend and `/api` backend routes. It does not create a second application deployment in another Azure region.

### Monitoring and logs

Monitoring cost is primarily driven by the amount of data ingested into Log Analytics rather than by the existence of the workspace itself. The first 5 GB per billing account per month in the pay-as-you-go Analytics Logs tier are free. The Sweden Central retail rate used for sensitivity analysis is approximately USD 2.99 for every additional ingested GB. The configured 30-day retention is within the included Analytics Logs retention period.

Examples:

| Monthly Analytics Logs ingestion | Approximate ingestion cost |
| -------------------------------: | -------------------------: |
|                       Up to 5 GB |                      USD 0 |
|                            10 GB |                  USD 14.95 |
|                            20 GB |                  USD 44.85 |

This makes uncontrolled diagnostic volume the most important variable cost to watch in the current low-traffic system.

## Monitoring coverage implemented today

The current Terraform configuration creates a central Log Analytics workspace and a workspace-based Application Insights resource. The following telemetry is configured:

| Source                                   | Destination                   | Configured data                                                                                  |
| ---------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| App Service backend                      | Log Analytics                 | `allLogs` and `AllMetrics` through an Azure Monitor diagnostic setting                           |
| PostgreSQL Flexible Server               | Log Analytics                 | `allLogs` and `AllMetrics`                                                                       |
| Azure Front Door profile                 | Log Analytics                 | `allLogs` and `AllMetrics`                                                                       |
| Key Vault                                | Log Analytics                 | `audit` logs and `AllMetrics`                                                                    |
| Container Apps migration environment/job | Log Analytics                 | Container Apps environment and job execution logs                                                |
| Backend application                      | Application Insights resource | The connection string is supplied to App Service through `APPLICATIONINSIGHTS_CONNECTION_STRING` |

The implemented coverage is therefore centered on searchable platform logs, metrics, audit activity, and migration execution logs in one workspace. The Terraform retention setting is 30 days. CPU metrics are also used by the App Service autoscale policy. The connection string prepares the backend for Application Insights, while the repository does not add explicit custom telemetry or metrics through an Application Insights SDK.

## Region comparison

The following comparison holds the architecture constant and changes only the regional App Service and PostgreSQL retail rates. The global Front Door base fee and the ACR Basic estimate remain the same.

| Azure region   | Estimated monthly core cost | Difference from Sweden Central |
| -------------- | --------------------------: | -----------------------------: |
| Sweden Central |              **USD 440.87** |                       Baseline |
| North Europe   |              **USD 446.74** |                      +USD 5.87 |
| West Europe    |              **USD 475.15** |                     +USD 34.28 |

For these exact SKUs and the public rates captured on the estimate date, Sweden Central is the least expensive of the three compared European regions. Region selection still also depends on service availability, data residency, latency, and availability-zone support; price alone is not sufficient.

## Availability-versus-cost alternatives

These are comparison scenarios only. They are not approved infrastructure changes.

| Scenario                                                          | Approximate monthly core cost | Trade-off                                                              |
| ----------------------------------------------------------------- | ----------------------------: | ---------------------------------------------------------------------- |
| Current: two App Service workers and PostgreSQL zone-redundant HA |                **USD 440.87** | Current zonal availability design                                      |
| Remove PostgreSQL HA only                                         |          **about USD 305.44** | Saves about USD 135.43 but loses the ready cross-zone database standby |
| Reduce App Service minimum from two workers to one                |          **about USD 375.90** | Saves about USD 64.97 but removes the two-worker availability baseline |
| Remove PostgreSQL HA and use one App Service worker               |          **about USD 240.47** | Lowest like-for-like comparison, with materially weaker availability   |

A true development-only environment could be cheaper still by selecting smaller App Service and burstable PostgreSQL SKUs or by stopping/deleting resources when unused. That would be a different architecture and is not represented as production-equivalent.

## Items not included or not guaranteed

- subscription credits, educational grants, negotiated pricing, reservations, and savings plans;
- VAT, currency conversion, or registrar renewal pricing;
- a paid OpenWeather plan, if one is introduced later;
- Entra External ID charges if usage exceeds its applicable free allowance or pricing model;
- unusual internet egress, denial-of-service traffic, high log volume, or storage growth;
- support-plan fees;
- future Front Door Premium, WAF, Private Link, multi-region deployment, geo-redundant backup, or additional operational services.

## Cost governance recommendation

The project should use an initial monthly budget threshold near **USD 500**. That is not an expected invoice; it is a practical early-warning threshold above the USD 445-460 low-traffic estimate while allowing limited autoscaling and log variation. Recommended notifications are:

- 50% of budget: informational review;
- 80% of budget: investigate scaling, logs, and unexpected traffic;
- 100% of budget: immediate owner review;
- forecasted 100%: early warning before the month closes.

## Sources

- [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices)
- [Azure App Service for Linux pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/linux/)
- [Azure Database for PostgreSQL Flexible Server pricing](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/)
- [Azure Front Door pricing](https://azure.microsoft.com/en-us/pricing/details/frontdoor/)
- [Azure Monitor pricing](https://azure.microsoft.com/en-us/pricing/details/monitor/)
- [Azure Container Registry pricing](https://azure.microsoft.com/en-us/pricing/details/container-registry/)
- [Azure Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/)

Prices should be refreshed from the official sources before a real budget approval or material architecture change.
