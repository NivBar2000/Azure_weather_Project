resource "azurerm_service_plan" "backend" {
  name                   = local.names.app_service_plan
  resource_group_name    = data.azurerm_resource_group.production.name
  location               = var.location
  os_type                = "Linux"
  sku_name               = var.app_service_sku
  worker_count           = var.app_service_minimum_instances
  zone_balancing_enabled = true
  tags                   = local.common_tags

  lifecycle {
    ignore_changes = [
      tags["created_By"],
      tags["created_Date"],
    ]
  }
}

resource "azurerm_linux_web_app" "backend" {
  name                          = local.names.backend_app
  resource_group_name           = data.azurerm_resource_group.production.name
  location                      = var.location
  service_plan_id               = azurerm_service_plan.backend.id
  virtual_network_subnet_id     = azurerm_subnet.app_service.id
  https_only                    = true
  client_affinity_enabled       = false
  public_network_access_enabled = true

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on                               = true
    container_registry_use_managed_identity = true
    ftps_state                              = "Disabled"
    health_check_path                       = "/api/health"
    health_check_eviction_time_in_min       = 5
    http2_enabled                           = true
    ip_restriction_default_action           = "Deny"
    minimum_tls_version                     = "1.2"
    scm_ip_restriction_default_action       = "Deny"
    scm_minimum_tls_version                 = "1.2"
    scm_use_main_ip_restriction             = false
    vnet_route_all_enabled                  = true
    websockets_enabled                      = false

    application_stack {
      docker_image_name   = local.backend_image
      docker_registry_url = "https://${azurerm_container_registry.backend.login_server}"
    }

    ip_restriction {
      name        = "AllowFrontDoorProfile"
      priority    = 100
      action      = "Allow"
      service_tag = "AzureFrontDoor.Backend"

      headers {
        x_azure_fdid = [azurerm_cdn_frontdoor_profile.production.resource_guid]
      }
    }
  }

  app_settings = {
    NODE_ENV                              = "production"
    PORT                                  = "3000"
    WEBSITES_PORT                         = "3000"
    FRONTEND_ORIGIN                       = "https://${azurerm_cdn_frontdoor_custom_domain.www.host_name}"
    OPENWEATHER_API_KEY                   = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.production.vault_uri}secrets/${var.openweather_secret_name})"
    DATABASE_HOST                         = azurerm_postgresql_flexible_server.production.fqdn
    DATABASE_PORT                         = "5432"
    DATABASE_USER                         = var.postgresql_administrator_login
    DATABASE_PASSWORD                     = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.production.vault_uri}secrets/${var.database_password_secret_name})"
    DATABASE_NAME                         = azurerm_postgresql_flexible_server_database.application.name
    DATABASE_SSL                          = "true"
    ENTRA_TENANT_ID                       = var.entra_tenant_id
    ENTRA_API_CLIENT_ID                   = var.entra_api_client_id
    ENTRA_ALLOWED_CLIENT_ID               = var.entra_allowed_client_id
    ENTRA_OIDC_METADATA_URL               = var.entra_oidc_metadata_url
    ENTRA_EXPECTED_ISSUER                 = var.entra_expected_issuer
    ENTRA_REQUIRED_SCOPE                  = var.entra_required_scope
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.backend.connection_string
    WEBSITES_ENABLE_APP_SERVICE_STORAGE   = "false"
  }

  lifecycle {
    ignore_changes = [
      site_config[0].application_stack[0].docker_image_name,
      tags["created_By"],
      tags["created_Date"],
    ]

    precondition {
      condition     = var.app_service_minimum_instances <= var.app_service_maximum_instances
      error_message = "app_service_minimum_instances must not exceed app_service_maximum_instances."
    }
  }

  tags = local.common_tags
}

resource "azurerm_role_assignment" "backend_acr_pull" {
  name                 = uuidv5("url", "${azurerm_container_registry.backend.id}/AcrPull/${azurerm_linux_web_app.backend.name}")
  scope                = azurerm_container_registry.backend.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_web_app.backend.identity[0].principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "backend_key_vault_secrets" {
  name                 = uuidv5("url", "${azurerm_key_vault.production.id}/KeyVaultSecretsUser/${azurerm_linux_web_app.backend.name}")
  scope                = azurerm_key_vault.production.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_web_app.backend.identity[0].principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_monitor_autoscale_setting" "backend" {
  name                = "${local.name_prefix}-autoscale"
  resource_group_name = data.azurerm_resource_group.production.name
  location            = var.location
  target_resource_id  = azurerm_service_plan.backend.id
  enabled             = true

  profile {
    name = "cpu-based"

    capacity {
      default = tostring(var.app_service_minimum_instances)
      minimum = tostring(var.app_service_minimum_instances)
      maximum = tostring(var.app_service_maximum_instances)
    }

    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.backend.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = var.scale_out_cpu_threshold
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }

    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.backend.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT10M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = var.scale_in_cpu_threshold
      }

      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT10M"
      }
    }
  }

  tags = local.common_tags

  lifecycle {
    ignore_changes = [
      tags["created_By"],
      tags["created_Date"],
    ]
  }
}
