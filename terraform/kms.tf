# Customer-Managed Encryption Keys (CMEK) for Saudi Data Sovereignty Compliance (NCA ECC & SDAIA NDMO)

resource "google_kms_key_ring" "smartgrid_keyring" {
  name     = "ksa-smartgrid-keyring"
  location = var.region
  project  = var.project_id
}

resource "google_kms_crypto_key" "smartgrid_bigquery_key" {
  name            = "smartgrid-bq-key"
  key_ring        = google_kms_key_ring.smartgrid_keyring.id
  rotation_period = "7776000s" # 90 days automatic rotation

  lifecycle {
    prevent_destroy = false
  }
}

resource "google_kms_crypto_key" "smartgrid_gke_key" {
  name            = "smartgrid-gke-disk-key"
  key_ring        = google_kms_key_ring.smartgrid_keyring.id
  rotation_period = "7776000s"

  lifecycle {
    prevent_destroy = false
  }
}

# Grant BigQuery Service Agent access to use the CMEK key
resource "google_project_service_identity" "bigquery_sa" {
  provider = google-beta
  project  = var.project_id
  service  = "bigquery.googleapis.com"
}

resource "google_kms_crypto_key_iam_member" "bigquery_cmek_binding" {
  crypto_key_id = google_kms_crypto_key.smartgrid_bigquery_key.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_project_service_identity.bigquery_sa.email}"
}
