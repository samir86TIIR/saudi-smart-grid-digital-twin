terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.20.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.20.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27.0"
    }
  }

  # Backend should be configured for GCS remote state in me-central2
  # backend "gcs" {
  #   bucket = "ksa-smartgrid-tfstate-me-central2"
  #   prefix = "terraform/state"
  # }
}
