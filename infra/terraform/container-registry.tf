resource "azurerm_container_registry" "backend" {
  name                          = local.names.container_registry
  resource_group_name           = data.azurerm_resource_group.production.name
  location                      = var.location
  sku                           = var.container_registry_sku
  admin_enabled                 = false
  public_network_access_enabled = true
  tags                          = local.common_tags
}
