resource "azurerm_user_assigned_identity" "github_cd" {
  name                = local.names.github_cd_identity
  location            = var.location
  resource_group_name = data.azurerm_resource_group.production.name
  tags                = local.common_tags

  lifecycle {
    ignore_changes = [
      tags["created_By"],
      tags["created_Date"],
    ]
  }
}

resource "azurerm_federated_identity_credential" "github_production" {
  name                      = "github-production"
  user_assigned_identity_id = azurerm_user_assigned_identity.github_cd.id
  audience                  = ["api://AzureADTokenExchange"]
  issuer                    = "https://token.actions.githubusercontent.com"
  subject                   = "repo:NivBar2000/Azure_weather_Project:environment:production"
}

resource "azurerm_role_assignment" "github_acr_push" {
  name                 = uuidv5("url", "${azurerm_container_registry.backend.id}/AcrPush/${azurerm_user_assigned_identity.github_cd.name}")
  scope                = azurerm_container_registry.backend.id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_user_assigned_identity.github_cd.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "github_backend_deploy" {
  name                 = uuidv5("url", "${azurerm_linux_web_app.backend.id}/WebsiteContributor/${azurerm_user_assigned_identity.github_cd.name}")
  scope                = azurerm_linux_web_app.backend.id
  role_definition_name = "Website Contributor"
  principal_id         = azurerm_user_assigned_identity.github_cd.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "github_frontend_deploy" {
  name                 = uuidv5("url", "${local.frontend_web_container_id}/StorageBlobDataContributor/${azurerm_user_assigned_identity.github_cd.name}")
  scope                = local.frontend_web_container_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.github_cd.principal_id
  principal_type       = "ServicePrincipal"

  depends_on = [azurerm_storage_account_static_website.frontend]
}

resource "azurerm_role_assignment" "github_front_door_purge" {
  name                 = uuidv5("url", "${azurerm_cdn_frontdoor_endpoint.production.id}/CDNProfileContributor/${azurerm_user_assigned_identity.github_cd.name}")
  scope                = azurerm_cdn_frontdoor_endpoint.production.id
  role_definition_name = "CDN Profile Contributor"
  principal_id         = azurerm_user_assigned_identity.github_cd.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "github_migration_job" {
  name                 = uuidv5("url", "${azurerm_container_app_job.migration.id}/ContainerAppsJobsContributor/${azurerm_user_assigned_identity.github_cd.name}")
  scope                = azurerm_container_app_job.migration.id
  role_definition_name = "Container Apps Jobs Contributor"
  principal_id         = azurerm_user_assigned_identity.github_cd.principal_id
  principal_type       = "ServicePrincipal"
}
