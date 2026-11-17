# IAM Roles with Strict Least-Privilege Separation of Duties

# 1. GKE Node Service Account (Minimal permissions for nodes to pull images and log)
resource "google_service_account" "gke_sa" {
  account_id   = "sa-gke-nodes"
  display_name = "GKE Node Pool Service Account"
  project      = var.project_id
}

resource "google_project_iam_member" "gke_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gke_sa.email}"
}

resource "google_project_iam_member" "gke_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.gke_sa.email}"
}

# 2. Workload Identity: Flink Streaming Application SA (BigQuery Data Editor)
resource "google_service_account" "flink_stream_sa" {
  account_id   = "sa-flink-streamer"
  display_name = "Flink Workload Identity Service Account"
  project      = var.project_id
}

resource "google_project_iam_member" "flink_bq_editor" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.flink_stream_sa.email}"
}

resource "google_project_iam_member" "flink_bq_jobuser" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.flink_stream_sa.email}"
}

# Allow K8s Service Account 'flink-processor' in namespace 'smart-grid' to impersonate flink_stream_sa
resource "google_service_account_iam_member" "flink_workload_identity_binding" {
  service_account_id = google_service_account.flink_stream_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[smart-grid/flink-serviceaccount]"
}
