# Private Sovereign GKE Cluster for Streaming and Ingestion Workloads

resource "google_container_cluster" "primary" {
  name     = "ksa-smartgrid-gke-${var.environment}"
  project  = var.project_id
  location = var.region

  network    = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.gke_subnet.id

  remove_default_node_pool = true
  initial_node_count       = 1

  # IP Allocation Policy for VPC-native traffic
  ip_allocation_policy {
    cluster_secondary_range_name  = "gke-pods"
    services_secondary_range_name = "gke-services"
  }

  # Strict Private Cluster Configuration
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false # Allowed via bastion/VPN
    master_ipv4_cidr_block  = var.gke_master_ipv4_cidr_block
  }

  master_authorized_networks_config {
    dynamic "cidr_blocks" {
      for_each = var.authorized_master_networks
      content {
        cidr_block   = cidr_blocks.value.cidr_block
        display_name = cidr_blocks.value.display_name
      }
    }
  }

  # Datapath v2 (Cilium-powered eBPF networking and network policies)
  datapath_provider = "ADVANCED_DATAPATH"

  # Workload Identity for keyless GCP IAM authentication from Pods
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Security Posture and Binary Authorization
  security_posture_config {
    mode               = "BASIC"
    vulnerability_mode = "VULNERABILITY_ENTERPRISE"
  }

  # Release channel
  release_channel {
    channel = "REGULAR"
  }

  maintenance_policy {
    recurring_window {
      start_time = "2026-01-01T00:00:00Z"
      end_time   = "2026-01-01T04:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=FR" # Friday night maintenance window (Saudi weekend)
    }
  }
}

# Node Pool 1: Kafka Stateful Broker Pool (High IOPS, Persistent Disks encrypted via CMEK)
resource "google_container_node_pool" "kafka_pool" {
  name       = "kafka-broker-pool"
  project    = var.project_id
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = 3

  node_config {
    machine_type = "e2-standard-4"
    disk_type    = "pd-ssd"
    disk_size_gb = 100
    boot_disk_kms_key = google_kms_crypto_key.smartgrid_gke_key.id

    service_account = google_service_account.gke_sa.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    labels = {
      workload    = "kafka"
      environment = var.environment
    }

    metadata = {
      disable-legacy-endpoints = "true"
    }
  }
}

# Node Pool 2: Flink Stream Processing & Data Simulator Pool (Autoscaling)
resource "google_container_node_pool" "compute_pool" {
  name       = "compute-streaming-pool"
  project    = var.project_id
  location   = var.region
  cluster    = google_container_cluster.primary.name

  autoscaling {
    min_node_count = 2
    max_node_count = 10
  }

  node_config {
    machine_type = "c2-standard-4" # Compute-optimized for Flink streaming transformations
    disk_size_gb = 50
    spot         = false          # Reserved instances for reliable streaming state

    service_account = google_service_account.gke_sa.email
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    labels = {
      workload    = "streaming-flink"
      environment = var.environment
    }

    metadata = {
      disable-legacy-endpoints = "true"
    }
  }
}
