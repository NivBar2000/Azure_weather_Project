locals {
  normalized_project     = trim(substr(replace(lower(var.project_name), "/[^a-z0-9-]/", "-"), 0, 20), "-")
  normalized_environment = trim(substr(replace(lower(var.environment), "/[^a-z0-9-]/", "-"), 0, 10), "-")
  name_prefix            = "${local.normalized_project}-${local.normalized_environment}"
  compact_prefix         = replace(local.name_prefix, "-", "")
  compact_suffix         = lower(var.unique_suffix)

  names = {
    app_service_plan = "${local.name_prefix}-asp-${local.compact_suffix}"
    backend_app      = "${local.name_prefix}-api-${local.compact_suffix}"
    container_app_environment = substr(
      "${local.name_prefix}-cae-${local.compact_suffix}",
      0,
      60,
    )
    migration_job      = "${local.name_prefix}-mig-${local.compact_suffix}"
    migration_identity = "${local.name_prefix}-migration-mi-${local.compact_suffix}"
    github_cd_identity = "${local.name_prefix}-github-cd-mi-${local.compact_suffix}"
    container_registry = substr(
      "${local.compact_prefix}acr${local.compact_suffix}",
      0,
      50,
    )
    database = "${local.name_prefix}-db-${local.compact_suffix}"
    front_door_endpoint = substr(
      "${local.name_prefix}-fd-${local.compact_suffix}",
      0,
      46,
    )
    front_door_profile   = "${local.name_prefix}-afd-${local.compact_suffix}"
    key_vault            = "${trim(substr(local.name_prefix, 0, 20 - length(local.compact_suffix)), "-")}-kv-${local.compact_suffix}"
    log_analytics        = "${local.name_prefix}-law-${local.compact_suffix}"
    application_insights = "${local.name_prefix}-appi-${local.compact_suffix}"
    postgresql = substr(
      "${local.name_prefix}-psql-${local.compact_suffix}",
      0,
      63,
    )
    storage         = "${substr(local.compact_prefix, 0, 21 - length(local.compact_suffix))}web${local.compact_suffix}"
    virtual_network = "${local.name_prefix}-vnet-${local.compact_suffix}"
  }

  common_tags = merge(
    {
      application = var.project_name
      environment = var.environment
      managed-by  = "terraform"
      workload    = "weather"
    },
    var.tags,
  )

  front_door_origin         = "https://${azurerm_cdn_frontdoor_endpoint.production.host_name}"
  backend_image             = "${var.backend_image_repository}:${var.backend_image_tag}"
  backend_image_fqdn        = "${azurerm_container_registry.backend.login_server}/${local.backend_image}"
  frontend_web_container_id = "${azurerm_storage_account.frontend.id}/blobServices/default/containers/$web"

  production_subnet_cidrs = concat(
    var.app_subnet_address_prefixes,
    var.database_subnet_address_prefixes,
    var.container_apps_subnet_address_prefixes,
  )
  production_subnet_pairs = flatten([
    for left_index, left_cidr in local.production_subnet_cidrs : [
      for right_index, right_cidr in local.production_subnet_cidrs : {
        left  = left_cidr
        right = right_cidr
      } if left_index < right_index
    ]
  ])
}
