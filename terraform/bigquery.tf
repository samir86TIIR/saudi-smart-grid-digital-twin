# Sovereign BigQuery Data Warehouse for Smart Grid Analytics (Dammam Region)

resource "google_bigquery_dataset" "smartgrid_dw" {
  dataset_id  = var.dataset_id
  project     = var.project_id
  location    = var.region # me-central2 (Saudi Arabia)
  description = "Saudi Smart Grid Telemetry and Anomaly Warehouse"

  default_encryption_configuration {
    kms_key_name = google_kms_crypto_key.smartgrid_bigquery_key.id
  }

  labels = {
    env        = var.environment
    compliance = "sdaia-ndmo"
    project    = "saudi-smartgrid"
  }
}

# Table 1: 1-Minute Window Aggregates (Partitioned by Ingestion Time, Clustered by Zone)
resource "google_bigquery_table" "table_aggregates" {
  dataset_id = google_bigquery_dataset.smartgrid_dw.dataset_id
  project    = var.project_id
  table_id   = "telemetry_1min_aggregates"

  time_partitioning {
    type  = "DAY"
    field = "ingestion_time"
  }

  clustering = ["grid_zone", "city", "sector_type"]

  encryption_configuration {
    kms_key_name = google_kms_crypto_key.smartgrid_bigquery_key.id
  }

  schema = <<EOF
[
  {"name": "window_start", "type": "TIMESTAMP", "mode": "REQUIRED", "description": "Start of 1-minute aggregation window"},
  {"name": "window_end", "type": "TIMESTAMP", "mode": "REQUIRED", "description": "End of 1-minute aggregation window"},
  {"name": "grid_zone", "type": "STRING", "mode": "REQUIRED", "description": "Saudi Grid Zone ID (e.g. NEOM-OXAGON-SEC01)"},
  {"name": "city", "type": "STRING", "mode": "REQUIRED", "description": "City name"},
  {"name": "region", "type": "STRING", "mode": "REQUIRED", "description": "Saudi Administrative Province"},
  {"name": "sector_type", "type": "STRING", "mode": "NULLABLE", "description": "Residential, commercial, industrial"},
  {"name": "meter_count", "type": "INTEGER", "mode": "REQUIRED", "description": "Distinct active smart meters"},
  {"name": "total_active_power_kwh", "type": "FLOAT64", "mode": "REQUIRED", "description": "Total energy consumed in kWh"},
  {"name": "peak_active_power_kw", "type": "FLOAT64", "mode": "REQUIRED", "description": "Instantaneous peak power in window"},
  {"name": "avg_active_power_kw", "type": "FLOAT64", "mode": "REQUIRED", "description": "Average power demand in kW"},
  {"name": "avg_voltage_v", "type": "FLOAT64", "mode": "REQUIRED", "description": "Average phase voltage (nominal 230V)"},
  {"name": "min_voltage_v", "type": "FLOAT64", "mode": "REQUIRED", "description": "Minimum observed voltage"},
  {"name": "max_voltage_v", "type": "FLOAT64", "mode": "REQUIRED", "description": "Maximum observed voltage"},
  {"name": "avg_frequency_hz", "type": "FLOAT64", "mode": "REQUIRED", "description": "Average grid frequency (nominal 60.0Hz)"},
  {"name": "anomaly_count", "type": "INTEGER", "mode": "REQUIRED", "description": "Count of detected anomalous events"},
  {"name": "ingestion_time", "type": "TIMESTAMP", "mode": "REQUIRED", "description": "BigQuery insertion timestamp"}
]
EOF
}

# Table 2: Critical Grid Anomalies and Alerts
resource "google_bigquery_table" "table_anomalies" {
  dataset_id = google_bigquery_dataset.smartgrid_dw.dataset_id
  project    = var.project_id
  table_id   = "telemetry_anomalies"

  time_partitioning {
    type  = "DAY"
    field = "timestamp"
  }

  clustering = ["anomaly_type", "severity", "grid_zone"]

  encryption_configuration {
    kms_key_name = google_kms_crypto_key.smartgrid_bigquery_key.id
  }

  schema = <<EOF
[
  {"name": "alert_id", "type": "STRING", "mode": "REQUIRED", "description": "Unique UUID for anomaly"},
  {"name": "timestamp", "type": "TIMESTAMP", "mode": "REQUIRED", "description": "Event timestamp in UTC"},
  {"name": "meter_id", "type": "STRING", "mode": "REQUIRED", "description": "Smart Meter hardware identifier"},
  {"name": "grid_zone", "type": "STRING", "mode": "REQUIRED", "description": "Grid Zone ID"},
  {"name": "city", "type": "STRING", "mode": "REQUIRED", "description": "City"},
  {"name": "substation_id", "type": "STRING", "mode": "REQUIRED", "description": "Parent distribution substation"},
  {"name": "anomaly_type", "type": "STRING", "mode": "REQUIRED", "description": "VOLTAGE_SAG, VOLTAGE_SWELL, FREQ_EXCURSION"},
  {"name": "severity", "type": "STRING", "mode": "REQUIRED", "description": "WARNING, CRITICAL"},
  {"name": "observed_voltage_v", "type": "FLOAT64", "mode": "REQUIRED", "description": "Recorded voltage in Volts"},
  {"name": "observed_frequency_hz", "type": "FLOAT64", "mode": "REQUIRED", "description": "Recorded frequency in Hz"},
  {"name": "observed_power_kw", "type": "FLOAT64", "mode": "REQUIRED", "description": "Recorded power in kW"},
  {"name": "root_cause_hypothesis", "type": "STRING", "mode": "NULLABLE", "description": "Automated diagnosis"},
  {"name": "recommended_action", "type": "STRING", "mode": "NULLABLE", "description": "Grid operator action protocol"}
]
EOF
}
