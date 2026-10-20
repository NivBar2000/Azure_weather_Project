resource "azurerm_virtual_network" "production" {
  name                = local.names.virtual_network
  location            = var.location
  resource_group_name = data.azurerm_resource_group.production.name
  address_space       = var.vnet_address_space
  tags                = local.common_tags
}

resource "azurerm_subnet" "app_service" {
  name                 = "app-service-integration"
  resource_group_name  = data.azurerm_resource_group.production.name
  virtual_network_name = azurerm_virtual_network.production.name
  address_prefixes     = var.app_subnet_address_prefixes

  service_endpoint {
    service = "Microsoft.KeyVault"
  }

  delegation {
    name = "app-service-delegation"

    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet" "postgresql" {
  name                 = "postgresql-flexible-server"
  resource_group_name  = data.azurerm_resource_group.production.name
  virtual_network_name = azurerm_virtual_network.production.name
  address_prefixes     = var.database_subnet_address_prefixes

  service_endpoint {
    service = "Microsoft.Storage"
  }

  delegation {
    name = "postgresql-flexible-server-delegation"

    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_private_dns_zone" "postgresql" {
  name                = "${local.name_prefix}.${local.compact_suffix}.postgres.database.azure.com"
  resource_group_name = data.azurerm_resource_group.production.name
  tags                = local.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgresql" {
  name                 = "${local.name_prefix}-postgresql-link"
  private_dns_zone_id  = azurerm_private_dns_zone.postgresql.id
  virtual_network_id   = azurerm_virtual_network.production.id
  registration_enabled = false
  tags                 = local.common_tags
}

check "subnets_are_inside_vnet" {
  assert {
    condition = alltrue([
      for subnet in concat(var.app_subnet_address_prefixes, var.database_subnet_address_prefixes) :
      anytrue([for vnet_cidr in var.vnet_address_space : cidrcontains(vnet_cidr, cidrhost(subnet, 0))])
    ])
    error_message = "Every App Service and PostgreSQL subnet prefix must be contained in vnet_address_space."
  }
}

check "subnets_do_not_overlap" {
  assert {
    condition = alltrue(flatten([
      for app_cidr in var.app_subnet_address_prefixes : [
        for database_cidr in var.database_subnet_address_prefixes :
        !cidrcontains(app_cidr, cidrhost(database_cidr, 0)) && !cidrcontains(database_cidr, cidrhost(app_cidr, 0))
      ]
    ]))
    error_message = "App Service and PostgreSQL subnet prefixes must not overlap."
  }
}
