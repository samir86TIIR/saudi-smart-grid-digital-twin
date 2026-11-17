variable "project_id" {
  description = "Google Cloud Project ID dedicated to Saudi Smart Grid Digital Twin"
  type        = string
  default     = "ksa-smartgrid-prod"
}

variable "region" {
  description = "Google Cloud Saudi Region (Dammam - me-central2)"
  type        = string
  default     = "me-central2"
}

variable "zones" {
  description = "Availability zones within Saudi Dammam region"
  type        = list(string)
  default     = ["me-central2-a", "me-central2-b", "me-central2-c"]
}

variable "environment" {
  description = "Deployment environment (production, staging, sandbox)"
  type        = string
  default     = "production"
}

variable "network_name" {
  description = "VPC network name"
  type        = string
  default     = "ksa-smartgrid-vpc"
}

variable "subnet_cidr" {
  description = "Primary CIDR block for GKE cluster nodes"
  type        = string
  default     = "10.100.0.0/20"
}

variable "pods_cidr" {
  description = "Secondary CIDR block for GKE Pods"
  type        = string
  default     = "10.101.0.0/16"
}

variable "services_cidr" {
  description = "Secondary CIDR block for GKE Services"
  type        = string
  default     = "10.102.0.0/20"
}

variable "gke_master_ipv4_cidr_block" {
  description = "Private CIDR block for GKE Control Plane"
  type        = string
  default     = "172.16.0.0/28"
}

variable "dataset_id" {
  description = "BigQuery dataset ID"
  type        = string
  default     = "smart_grid_ksa_dw"
}

variable "authorized_master_networks" {
  description = "List of authorized IP ranges allowed to connect to GKE control plane"
  type = list(object({
    cidr_block   = string
    display_name = string
  }))
  default = [
    {
      cidr_block   = "10.200.0.0/24"
      display_name = "Saudi-SEC-SOC-Bastion"
    }
  ]
}
