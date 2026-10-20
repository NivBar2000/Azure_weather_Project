resource "azurerm_key_vault" "production" {
  name                          = local.names.key_vault
  location                      = var.location
  resource_group_name           = data.azurerm_resource_group.production.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  rbac_authorization_enabled    = true
  purge_protection_enabled      = true
  soft_delete_retention_days    = var.key_vault_soft_delete_retention_days
  public_network_access_enabled = true

  network_acls {
    bypass                     = "AzureServices"
    default_action             = "Deny"
    virtual_network_subnet_ids = [azurerm_subnet.app_service.id]
  }

  tags = local.common_tags
}
