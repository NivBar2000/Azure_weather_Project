resource "azurerm_cdn_frontdoor_profile" "production" {
  name                = local.names.front_door_profile
  resource_group_name = data.azurerm_resource_group.production.name
  sku_name            = "Standard_AzureFrontDoor"
  tags                = local.common_tags

  lifecycle {
    ignore_changes = [
      tags["created_By"],
      tags["created_Date"],
    ]
  }
}

resource "azurerm_cdn_frontdoor_endpoint" "production" {
  name                     = local.names.front_door_endpoint
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.production.id
  enabled                  = true
  tags                     = local.common_tags

  lifecycle {
    ignore_changes = [
      tags["created_By"],
      tags["created_Date"],
    ]
  }
}

resource "azurerm_cdn_frontdoor_origin_group" "frontend" {
  name                     = "frontend-static-site"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.production.id
  session_affinity_enabled = false

  health_probe {
    interval_in_seconds = 120
    path                = "/"
    protocol            = "Https"
    request_type        = "GET"
  }

  load_balancing {
    additional_latency_in_milliseconds = 50
    sample_size                        = 4
    successful_samples_required        = 3
  }
}

resource "azurerm_cdn_frontdoor_origin" "frontend" {
  name                           = "storage-static-website"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.frontend.id
  enabled                        = true
  host_name                      = azurerm_storage_account.frontend.primary_web_host
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = azurerm_storage_account.frontend.primary_web_host
  priority                       = 1
  weight                         = 1000
  certificate_name_check_enabled = true

  depends_on = [azurerm_storage_account_static_website.frontend]
}

resource "azurerm_cdn_frontdoor_origin_group" "backend" {
  name                     = "backend-app-service"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.production.id
  session_affinity_enabled = false

  health_probe {
    interval_in_seconds = 30
    path                = "/api/health"
    protocol            = "Https"
    request_type        = "GET"
  }

  load_balancing {
    additional_latency_in_milliseconds = 0
    sample_size                        = 4
    successful_samples_required        = 3
  }
}

resource "azurerm_cdn_frontdoor_origin" "backend" {
  name                           = "app-service"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.backend.id
  enabled                        = true
  host_name                      = azurerm_linux_web_app.backend.default_hostname
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = azurerm_linux_web_app.backend.default_hostname
  priority                       = 1
  weight                         = 1000
  certificate_name_check_enabled = true
}

resource "azurerm_cdn_frontdoor_route" "api" {
  name                          = "api"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.production.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.backend.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.backend.id]
  patterns_to_match             = ["/api/*"]
  supported_protocols           = ["Http", "Https"]
  forwarding_protocol           = "HttpsOnly"
  https_redirect_enabled        = true
  link_to_default_domain        = true
  enabled                       = true
}

resource "azurerm_cdn_frontdoor_route" "frontend" {
  name                          = "frontend"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.production.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.frontend.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.frontend.id]
  patterns_to_match             = ["/*"]
  supported_protocols           = ["Http", "Https"]
  forwarding_protocol           = "HttpsOnly"
  https_redirect_enabled        = true
  link_to_default_domain        = true
  enabled                       = true

  cache {
    query_string_caching_behavior = "UseQueryString"
    compression_enabled           = true
    content_types_to_compress = [
      "application/javascript",
      "application/json",
      "application/xml",
      "font/otf",
      "font/ttf",
      "image/svg+xml",
      "text/css",
      "text/html",
      "text/javascript",
      "text/plain",
    ]
  }
}
