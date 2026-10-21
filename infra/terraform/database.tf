resource "azurerm_postgresql_flexible_server" "production" {
  name                          = local.names.postgresql
  resource_group_name           = data.azurerm_resource_group.production.name
  location                      = var.location
  version                       = var.postgresql_version
  delegated_subnet_id           = azurerm_subnet.postgresql.id
  private_dns_zone_id           = azurerm_private_dns_zone.postgresql.id
  public_network_access_enabled = false

  administrator_login    = var.postgresql_administrator_login
  administrator_password = var.postgresql_administrator_password

  sku_name                     = var.postgresql_sku
  storage_mb                   = var.postgresql_storage_mb
  auto_grow_enabled            = true
  backup_retention_days        = var.postgresql_backup_retention_days
  geo_redundant_backup_enabled = false

  high_availability {
    mode = "ZoneRedundant"
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      zone,
      high_availability[0].standby_availability_zone,
      tags["created_By"],
      tags["created_Date"],
    ]
  }

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgresql]

  tags = local.common_tags
}

resource "azurerm_postgresql_flexible_server_database" "application" {
  name      = var.database_name
  server_id = azurerm_postgresql_flexible_server.production.id
  charset   = "UTF8"
  collation = "en_US.utf8"

  lifecycle {
    prevent_destroy = true
  }
}
