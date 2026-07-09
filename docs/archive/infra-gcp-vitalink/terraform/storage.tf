resource "google_storage_bucket" "patient_files" {
  name          = "vitalink-patient-files-${var.environment}"
  location      = var.region
  force_destroy = var.environment == "dev"
  uniform_bucket_level_access = true
  lifecycle_rule {
    condition { age = 365 }
    action { type = "Delete" }
  }
}

resource "google_storage_bucket" "provider_docs" {
  name          = "vitalink-provider-docs-${var.environment}"
  location      = var.region
  force_destroy = var.environment == "dev"
  uniform_bucket_level_access = true
}

resource "google_storage_bucket" "vitals_exports" {
  name          = "vitalink-vitals-exports-${var.environment}"
  location      = var.region
  force_destroy = var.environment == "dev"
  uniform_bucket_level_access = true
  lifecycle_rule {
    condition { age = 90 }
    action { type = "Delete" }
  }
}
