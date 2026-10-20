output "front_door_endpoint_url" {
  description = "Public production URL to add manually to Entra SPA redirect and post-logout redirect URI configuration."
  value       = local.front_door_origin
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
