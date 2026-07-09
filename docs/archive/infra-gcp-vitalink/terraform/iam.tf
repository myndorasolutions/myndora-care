resource "google_service_account" "cloud_run" {
  account_id   = "vitalink-run-${var.environment}"
  display_name = "VitaLink Cloud Run"
}

resource "google_service_account" "cloud_build" {
  account_id   = "vitalink-build-${var.environment}"
  display_name = "VitaLink Cloud Build"
}

resource "google_project_iam_member" "run_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_project_iam_member" "run_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_project_iam_member" "build_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.cloud_build.email}"
}
