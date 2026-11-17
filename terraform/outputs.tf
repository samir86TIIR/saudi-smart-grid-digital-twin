output "gke_cluster_name" {
  description = "GKE Cluster identifier"
  value       = google_container_cluster.primary.name
}

output "gke_cluster_endpoint" {
  description = "GKE Cluster Control Plane Endpoint"
  value       = google_container_cluster.primary.endpoint
}

output "vpc_id" {
  description = "VPC Network ID"
  value       = google_compute_network.vpc.id
}

output "bigquery_dataset_id" {
  description = "BigQuery Dataset ID"
  value       = google_bigquery_dataset.smartgrid_dw.dataset_id
}

output "bigquery_aggregates_table" {
  description = "BigQuery Table for 1-minute aggregates"
  value       = google_bigquery_table.table_aggregates.id
}

output "bigquery_anomalies_table" {
  description = "BigQuery Table for anomaly alerts"
  value       = google_bigquery_table.table_anomalies.id
}

output "flink_workload_identity_sa" {
  description = "Email of Workload Identity SA for Flink"
  value       = google_service_account.flink_stream_sa.email
}
