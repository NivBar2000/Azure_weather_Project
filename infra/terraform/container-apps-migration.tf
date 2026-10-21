resource "azurerm_user_assigned_identity" "migration" {
  name                = local.names.migration_identity
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

resource "azurerm_role_assignment" "migration_acr_pull" {
  name                 = uuidv5("url", "${azurerm_container_registry.backend.id}/AcrPull/${azurerm_user_assigned_identity.migration.name}")
  scope                = azurerm_container_registry.backend.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.migration.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "migration_key_vault_secrets" {
  name                 = uuidv5("url", "${azurerm_key_vault.production.id}/KeyVaultSecretsUser/${azurerm_user_assigned_identity.migration.name}")
  scope                = azurerm_key_vault.production.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.migration.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_container_app_environment" "migration" {
  name                       = local.names.container_app_environment
  location                   = var.location
  resource_group_name        = data.azurerm_resource_group.production.name
  infrastructure_subnet_id   = azurerm_subnet.container_apps.id
  logs_destination           = "log-analytics"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.production.id

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  tags = local.common_tags

  lifecycle {
    ignore_changes = [
      tags["created_By"],
      tags["created_Date"],
    ]
  }
}

resource "azurerm_container_app_job" "migration" {
  name                         = local.names.migration_job
  location                     = var.location
  resource_group_name          = data.azurerm_resource_group.production.name
  container_app_environment_id = azurerm_container_app_environment.migration.id
  workload_profile_name        = "Consumption"
  replica_timeout_in_seconds   = 900
  replica_retry_limit          = 0

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.migration.id]
  }

  registry {
    server   = azurerm_container_registry.backend.login_server
    identity = azurerm_user_assigned_identity.migration.id
  }

  secret {
    name                = "database-password"
    identity            = azurerm_user_assigned_identity.migration.id
    key_vault_secret_id = "${azurerm_key_vault.production.vault_uri}secrets/${var.database_password_secret_name}"
  }

  manual_trigger_config {
    parallelism              = 1
    replica_completion_count = 1
  }

  template {
    container {
      name    = "database-migration"
      image   = local.backend_image_fqdn
      cpu     = 0.5
      memory  = "1Gi"
      command = ["npm"]
      args    = ["run", "migration:run:prod", "--workspace=@azure-weather/backend"]

      env {
        name  = "DATABASE_HOST"
        value = azurerm_postgresql_flexible_server.production.fqdn
      }

      env {
        name  = "DATABASE_PORT"
        value = "5432"
      }

      env {
        name  = "DATABASE_USER"
        value = var.postgresql_administrator_login
      }

      env {
        name        = "DATABASE_PASSWORD"
        secret_name = "database-password"
      }

      env {
        name  = "DATABASE_NAME"
        value = azurerm_postgresql_flexible_server_database.application.name
      }

      env {
        name  = "DATABASE_SSL"
        value = "true"
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
      tags["created_By"],
      tags["created_Date"],
    ]
  }

  depends_on = [
    azurerm_role_assignment.migration_acr_pull,
    azurerm_role_assignment.migration_key_vault_secrets,
  ]

  tags = local.common_tags
}
