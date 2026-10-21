variable "project_name" {
  description = "Short project name used in deterministic Azure resource names."
  type        = string
  default     = "azure-weather"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]{1,29}$", var.project_name)) && !strcontains(var.project_name, "--") && !endswith(var.project_name, "-")
    error_message = "project_name must be 2-30 letters, numbers, or single hyphens, start with a letter, and end with a letter or number."
  }
}

variable "environment" {
  description = "Deployment environment name used in resource names and tags."
  type        = string
  default     = "prod"

  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9-]{1,14}$", var.environment)) && !strcontains(var.environment, "--") && !endswith(var.environment, "-")
    error_message = "environment must be 2-15 letters, numbers, or single hyphens, start with a letter or number, and end with a letter or number."
  }
}

variable "unique_suffix" {
  description = "Globally unique 4-10 character lowercase alphanumeric suffix for globally scoped resource names."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]{4,10}$", var.unique_suffix))
    error_message = "unique_suffix must contain 4-10 lowercase letters or numbers."
  }
}

variable "resource_group_name" {
  description = "Name of the existing Azure resource group. Terraform reads it as a data source and does not create it."
  type        = string

  validation {
    condition     = length(trimspace(var.resource_group_name)) > 0
    error_message = "resource_group_name must not be empty."
  }
}

variable "location" {
  description = "Azure region for regional resources. The approved production region is Sweden Central."
  type        = string
  default     = "swedencentral"

  validation {
    condition     = var.location == "swedencentral"
    error_message = "location must remain swedencentral for the approved architecture."
  }
}

variable "vnet_address_space" {
  description = "Non-overlapping address space for the production virtual network."
  type        = list(string)
  default     = ["10.40.0.0/16"]

  validation {
    condition     = length(var.vnet_address_space) > 0 && alltrue([for cidr in var.vnet_address_space : can(cidrhost(cidr, 0))])
    error_message = "vnet_address_space must contain at least one valid CIDR block."
  }
}

variable "app_subnet_address_prefixes" {
  description = "CIDR prefixes for the delegated App Service regional-integration subnet."
  type        = list(string)
  default     = ["10.40.1.0/24"]

  validation {
    condition     = length(var.app_subnet_address_prefixes) > 0 && alltrue([for cidr in var.app_subnet_address_prefixes : can(cidrhost(cidr, 0))])
    error_message = "app_subnet_address_prefixes must contain at least one valid CIDR block."
  }
}

variable "database_subnet_address_prefixes" {
  description = "CIDR prefixes for the PostgreSQL Flexible Server delegated subnet."
  type        = list(string)
  default     = ["10.40.2.0/24"]

  validation {
    condition     = length(var.database_subnet_address_prefixes) > 0 && alltrue([for cidr in var.database_subnet_address_prefixes : can(cidrhost(cidr, 0))])
    error_message = "database_subnet_address_prefixes must contain at least one valid CIDR block."
  }
}

variable "container_apps_subnet_address_prefixes" {
  description = "Permanent CIDR prefix reserved for the workload-profiles Container Apps environment."
  type        = list(string)
  default     = ["10.40.3.0/24"]

  validation {
    condition     = length(var.container_apps_subnet_address_prefixes) == 1 && var.container_apps_subnet_address_prefixes[0] == "10.40.3.0/24"
    error_message = "container_apps_subnet_address_prefixes must remain the approved dedicated 10.40.3.0/24 allocation."
  }
}

variable "app_service_sku" {
  description = "Premium v3 App Service plan SKU. P0v3 is the cost-focused production default."
  type        = string
  default     = "P0v3"

  validation {
    condition     = can(regex("^P[0-3]v3$", var.app_service_sku))
    error_message = "app_service_sku must be a supported Premium v3 SKU from P0v3 through P3v3."
  }
}

variable "app_service_minimum_instances" {
  description = "Minimum active App Service instances."
  type        = number
  default     = 2

  validation {
    condition     = var.app_service_minimum_instances >= 2 && var.app_service_minimum_instances <= 4
    error_message = "app_service_minimum_instances must be between 2 and 4."
  }
}

variable "app_service_maximum_instances" {
  description = "Maximum App Service instances allowed by autoscale."
  type        = number
  default     = 4

  validation {
    condition     = var.app_service_maximum_instances >= 2 && var.app_service_maximum_instances <= 4
    error_message = "app_service_maximum_instances must be between 2 and 4."
  }
}

variable "scale_out_cpu_threshold" {
  description = "Average App Service plan CPU percentage over five minutes that adds one instance."
  type        = number
  default     = 70

  validation {
    condition     = var.scale_out_cpu_threshold >= 50 && var.scale_out_cpu_threshold <= 90
    error_message = "scale_out_cpu_threshold must be between 50 and 90."
  }
}

variable "scale_in_cpu_threshold" {
  description = "Average App Service plan CPU percentage over ten minutes that removes one instance."
  type        = number
  default     = 30

  validation {
    condition     = var.scale_in_cpu_threshold >= 10 && var.scale_in_cpu_threshold <= 50
    error_message = "scale_in_cpu_threshold must be between 10 and 50."
  }
}

variable "backend_image_repository" {
  description = "Repository name in the created Azure Container Registry for the backend image."
  type        = string
  default     = "weather-backend"

  validation {
    condition     = can(regex("^[a-z0-9]+(?:[._/-][a-z0-9]+)*$", var.backend_image_repository))
    error_message = "backend_image_repository must be a non-empty lowercase container repository path."
  }
}

variable "backend_image_tag" {
  description = "Immutable backend image tag already pushed to ACR, such as a release version or commit SHA."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$", var.backend_image_tag)) && lower(trimspace(var.backend_image_tag)) != "latest"
    error_message = "backend_image_tag must be a valid non-empty OCI tag and must not use the mutable latest tag."
  }
}

variable "container_registry_sku" {
  description = "Azure Container Registry SKU. Basic is the cost-focused default; Premium is required for private endpoints."
  type        = string
  default     = "Basic"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.container_registry_sku)
    error_message = "container_registry_sku must be Basic, Standard, or Premium."
  }
}

variable "postgresql_version" {
  description = "Supported PostgreSQL Flexible Server major version."
  type        = string
  default     = "17"

  validation {
    condition     = contains(["15", "16", "17", "18"], var.postgresql_version)
    error_message = "postgresql_version must be a currently supported standard-support version from 15 through 18."
  }
}

variable "postgresql_sku" {
  description = "General Purpose PostgreSQL SKU compatible with zone-redundant high availability."
  type        = string
  default     = "GP_Standard_D2s_v3"

  validation {
    condition     = startswith(var.postgresql_sku, "GP_")
    error_message = "postgresql_sku must be a General Purpose SKU beginning with GP_."
  }
}

variable "postgresql_storage_mb" {
  description = "PostgreSQL storage allocation in MiB. Storage can be increased but not reduced."
  type        = number
  default     = 32768

  validation {
    condition     = contains([32768, 65536, 131072, 262144, 524288, 1048576, 2097152, 4194304, 8388608, 16777216, 33553408], var.postgresql_storage_mb)
    error_message = "postgresql_storage_mb must be a supported PostgreSQL Flexible Server storage size."
  }
}

variable "postgresql_backup_retention_days" {
  description = "PostgreSQL point-in-time backup retention in days."
  type        = number
  default     = 7

  validation {
    condition     = var.postgresql_backup_retention_days >= 7 && var.postgresql_backup_retention_days <= 35
    error_message = "postgresql_backup_retention_days must be between 7 and 35."
  }
}

variable "postgresql_administrator_login" {
  description = "PostgreSQL administrator login used by the backend."
  type        = string
  default     = "weatheradmin"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]{2,62}$", var.postgresql_administrator_login))
    error_message = "postgresql_administrator_login must be 3-63 letters, numbers, or underscores and start with a letter."
  }
}

variable "postgresql_administrator_password" {
  description = "Required PostgreSQL administrator password. Sensitive masking does not keep it out of Terraform state."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.postgresql_administrator_password) >= 8
    error_message = "postgresql_administrator_password must contain at least 8 characters."
  }
}

variable "database_name" {
  description = "Application database created on the PostgreSQL server."
  type        = string
  default     = "azure_weather"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]{0,62}$", var.database_name))
    error_message = "database_name must be 1-63 letters, numbers, or underscores and start with a letter."
  }
}

variable "openweather_secret_name" {
  description = "Name of the externally seeded Key Vault secret containing the OpenWeather API key."
  type        = string
  default     = "openweather-api-key"

  validation {
    condition     = can(regex("^[0-9A-Za-z-]{1,127}$", var.openweather_secret_name))
    error_message = "openweather_secret_name must be a valid Key Vault secret name."
  }
}

variable "database_password_secret_name" {
  description = "Name of the externally seeded Key Vault secret containing the same PostgreSQL administrator password supplied to Terraform."
  type        = string
  default     = "postgresql-administrator-password"

  validation {
    condition     = can(regex("^[0-9A-Za-z-]{1,127}$", var.database_password_secret_name))
    error_message = "database_password_secret_name must be a valid Key Vault secret name."
  }
}

variable "key_vault_soft_delete_retention_days" {
  description = "Key Vault soft-delete retention period."
  type        = number
  default     = 90

  validation {
    condition     = var.key_vault_soft_delete_retention_days >= 7 && var.key_vault_soft_delete_retention_days <= 90
    error_message = "key_vault_soft_delete_retention_days must be between 7 and 90."
  }
}

variable "log_analytics_retention_days" {
  description = "Log Analytics retention period in days."
  type        = number
  default     = 30

  validation {
    condition     = var.log_analytics_retention_days >= 30 && var.log_analytics_retention_days <= 730
    error_message = "log_analytics_retention_days must be between 30 and 730."
  }
}

variable "entra_tenant_id" {
  description = "Public Microsoft Entra External ID tenant GUID used for backend token validation."
  type        = string

  validation {
    condition     = can(regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$", var.entra_tenant_id))
    error_message = "entra_tenant_id must be a valid GUID."
  }
}

variable "entra_api_client_id" {
  description = "Public Entra API application client GUID expected as the access-token audience."
  type        = string

  validation {
    condition     = can(regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$", var.entra_api_client_id))
    error_message = "entra_api_client_id must be a valid GUID."
  }
}

variable "entra_allowed_client_id" {
  description = "Public Entra SPA client GUID allowed to call the backend."
  type        = string

  validation {
    condition     = can(regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$", var.entra_allowed_client_id))
    error_message = "entra_allowed_client_id must be a valid GUID."
  }
}

variable "entra_oidc_metadata_url" {
  description = "HTTPS OpenID Connect metadata URL published by the External ID tenant."
  type        = string

  validation {
    condition     = can(regex("^https://[^[:space:]]+$", var.entra_oidc_metadata_url))
    error_message = "entra_oidc_metadata_url must use HTTPS."
  }
}

variable "entra_expected_issuer" {
  description = "Exact HTTPS issuer published by the External ID metadata document."
  type        = string

  validation {
    condition     = can(regex("^https://[^[:space:]]+$", var.entra_expected_issuer))
    error_message = "entra_expected_issuer must use HTTPS."
  }
}

variable "entra_required_scope" {
  description = "Delegated scope required by the backend."
  type        = string
  default     = "access_as_user"

  validation {
    condition     = var.entra_required_scope == "access_as_user"
    error_message = "entra_required_scope must remain access_as_user for the current application contract."
  }
}

variable "front_door_custom_domain_association_enabled" {
  description = "Associates www.nivbarweather.com with both Front Door routes after DNS validation and managed-certificate issuance. Keep false for Stage 1."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional non-sensitive tags merged with the standard project tags."
  type        = map(string)
  default     = {}
}
