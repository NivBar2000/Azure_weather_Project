resource "azurerm_log_analytics_workspace" "production" {
  name                = local.names.log_analytics
  location            = var.location
  resource_group_name = data.azurerm_resource_group.production.name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_analytics_retention_days
  tags                = local.common_tags
}

resource "azurerm_application_insights" "backend" {
  name                = local.names.application_insights
  location            = var.location
  resource_group_name = data.azurerm_resource_group.production.name
  workspace_id        = azurerm_log_analytics_workspace.production.id
  application_type    = "web"
  tags                = local.common_tags
}

resource "azurerm_monitor_diagnostic_setting" "backend" {
  name                       = "send-to-log-analytics"
  target_resource_id         = azurerm_linux_web_app.backend.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.production.id

  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}

resource "azurerm_monitor_diagnostic_setting" "postgresql" {
  name                       = "send-to-log-analytics"
  target_resource_id         = azurerm_postgresql_flexible_server.production.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.production.id

  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}

resource "azurerm_monitor_diagnostic_setting" "front_door" {
  name                       = "send-to-log-analytics"
  target_resource_id         = azurerm_cdn_frontdoor_profile.production.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.production.id

  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}

resource "azurerm_monitor_diagnostic_setting" "key_vault" {
  name                       = "send-to-log-analytics"
  target_resource_id         = azurerm_key_vault.production.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.production.id

  enabled_log {
    category_group = "audit"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
