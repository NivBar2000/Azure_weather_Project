output "front_door_endpoint_url" {
  description = "Public production URL to add manually to Entra SPA redirect and post-logout redirect URI configuration."
  value       = local.front_door_origin
}

output "front_door_endpoint_hostname" {
  description = "Existing Azure Front Door endpoint hostname that the future www CNAME must target."
  value       = azurerm_cdn_frontdoor_endpoint.production.host_name
}

output "front_door_custom_domain_hostname" {
  description = "Production custom-domain hostname created in Front Door."
  value       = azurerm_cdn_frontdoor_custom_domain.www.host_name
}

output "front_door_custom_domain_dns_validation_token" {
  description = "Azure-generated value for the Namecheap _dnsauth.www TXT record. Available after the Stage 1 apply; do not invent this value."
  value       = azurerm_cdn_frontdoor_custom_domain.www.validation_token
}

output "front_door_custom_domain_dns_validation_txt_record_host" {
  description = "Namecheap-relative host/name for the TXT record that validates www.nivbarweather.com."
  value       = "_dnsauth.www"
}

output "front_door_custom_domain_association_enabled" {
  description = "Whether www.nivbarweather.com is associated with both the frontend and API Front Door routes."
  value       = var.front_door_custom_domain_association_enabled
}

output "front_door_profile_resource_guid" {
  description = "Front Door profile GUID sent in X-Azure-FDID and enforced by the App Service access restriction."
  value       = azurerm_cdn_frontdoor_profile.production.resource_guid
}

output "backend_app_name" {
  description = "Linux App Service name used for operational checks and deployment targeting."
  value       = azurerm_linux_web_app.backend.name
}

output "container_registry_login_server" {
  description = "ACR login server where the immutable backend image must be pushed before deployment."
  value       = azurerm_container_registry.backend.login_server
}

output "frontend_storage_account_name" {
  description = "Storage account that receives the compiled frontend dist files outside Terraform."
  value       = azurerm_storage_account.frontend.name
}

output "key_vault_name" {
  description = "Key Vault to seed out of band with the required versionless secret names."
  value       = azurerm_key_vault.production.name
}

output "postgresql_private_fqdn" {
  description = "Private PostgreSQL hostname used by the backend through VNet integration."
  value       = azurerm_postgresql_flexible_server.production.fqdn
}

output "log_analytics_workspace_id" {
  description = "Resource ID of the central Log Analytics workspace."
  value       = azurerm_log_analytics_workspace.production.id
}

output "github_cd_client_id" {
  description = "Client ID of the GitHub production deployment identity used by future OIDC authentication."
  value       = azurerm_user_assigned_identity.github_cd.client_id
}

output "github_cd_principal_id" {
  description = "Principal ID of the resource-scoped GitHub production deployment identity."
  value       = azurerm_user_assigned_identity.github_cd.principal_id
}

output "github_cd_tenant_id" {
  description = "Microsoft Entra tenant ID for future GitHub OIDC authentication."
  value       = azurerm_user_assigned_identity.github_cd.tenant_id
}

output "github_cd_subscription_id" {
  description = "Azure subscription ID containing the production deployment targets."
  value       = data.azurerm_client_config.current.subscription_id
}

output "migration_job_name" {
  description = "Manual Container Apps Job that future CD updates and starts for one-shot migrations."
  value       = azurerm_container_app_job.migration.name
}

output "container_app_environment_name" {
  description = "Workload-profiles Container Apps environment hosting the migration job."
  value       = azurerm_container_app_environment.migration.name
}
