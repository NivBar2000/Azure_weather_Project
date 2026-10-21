resource "azurerm_virtual_network" "production" {
  name                = local.names.virtual_network
  location            = var.location
  resource_group_name = data.azurerm_resource_group.production.name
  address_space       = var.vnet_address_space
  tags                = local.common_tags

  lifecycle {
    ignore_changes = [
      tags["created_By"],
      tags["created_Date"],
    ]
  }
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

resource "azurerm_subnet" "container_apps" {
  name                 = "container-apps-environment"
  resource_group_name  = data.azurerm_resource_group.production.name
  virtual_network_name = azurerm_virtual_network.production.name
  address_prefixes     = var.container_apps_subnet_address_prefixes

  service_endpoint {
    service = "Microsoft.KeyVault"
  }

  delegation {
    name = "container-apps-environment-delegation"

    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_private_dns_zone" "postgresql" {
  name                = "${local.name_prefix}.${local.compact_suffix}.postgres.database.azure.com"
  resource_group_name = data.azurerm_resource_group.production.name
  tags                = local.common_tags

  lifecycle {
    ignore_changes = [
      tags["created_By"],
      tags["created_Date"],
    ]
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgresql" {
  name                 = "${local.name_prefix}-postgresql-link"
  private_dns_zone_id  = azurerm_private_dns_zone.postgresql.id
  virtual_network_id   = azurerm_virtual_network.production.id
  registration_enabled = false
  tags                 = local.common_tags

  lifecycle {
    ignore_changes = [
      tags["created_By"],
      tags["created_Date"],
    ]
  }
}

check "subnets_are_inside_vnet" {
  assert {
    condition = alltrue([
      for subnet in local.production_subnet_cidrs :
      anytrue([
        for vnet_cidr in var.vnet_address_space :
        tonumber(split("/", subnet)[1]) >= tonumber(split("/", vnet_cidr)[1]) &&
        cidrhost(vnet_cidr, 0) == cidrhost("${cidrhost(subnet, 0)}/${split("/", vnet_cidr)[1]}", 0)
      ])
    ])
    error_message = "Every App Service, PostgreSQL, and Container Apps subnet prefix must be contained in vnet_address_space."
  }
}

check "subnets_do_not_overlap" {
  assert {
    condition = alltrue([
      for pair in local.production_subnet_pairs :
      !(
        (
          tonumber(split("/", pair.left)[1]) <= tonumber(split("/", pair.right)[1]) &&
          cidrhost(pair.left, 0) == cidrhost("${cidrhost(pair.right, 0)}/${split("/", pair.left)[1]}", 0)
        ) ||
        (
          tonumber(split("/", pair.right)[1]) <= tonumber(split("/", pair.left)[1]) &&
          cidrhost(pair.right, 0) == cidrhost("${cidrhost(pair.left, 0)}/${split("/", pair.right)[1]}", 0)
        )
      )
    ])
    error_message = "App Service, PostgreSQL, and Container Apps subnet prefixes must not overlap."
  }
}
