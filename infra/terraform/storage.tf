resource "azurerm_storage_account" "frontend" {
  name                            = local.names.storage
  resource_group_name             = data.azurerm_resource_group.production.name
  location                        = var.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  account_kind                    = "StorageV2"
  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  public_network_access           = "Enabled"
  tags                            = local.common_tags

  lifecycle {
    ignore_changes = [
      tags["created_By"],
      tags["created_Date"],
    ]
  }
}

resource "azurerm_storage_account_static_website" "frontend" {
  storage_account_id = azurerm_storage_account.frontend.id
  index_document     = "index.html"
  error_404_document = "index.html"
}
