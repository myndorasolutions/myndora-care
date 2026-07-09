resource "google_cloud_run_v2_service" "backend" {
  name     = "vitalink-backend-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run.email
    containers {
      image = "gcr.io/${var.project_id}/vitalink-backend:latest"
      ports { container_port = 8080 }
      env {
        name  = "APP_ENV"
        value = var.environment
      }
      env {
        name = "MONGODB_URI"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.mongo_uri.secret_id
            version = "latest"
          }
        }
      }
      resources {
        limits = { cpu = "2", memory = "1Gi" }
      }
    }
    scaling { min_instance_count = 0; max_instance_count = 10 }
  }
}

resource "google_cloud_run_v2_service" "web" {
  name     = "vitalink-web-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "gcr.io/${var.project_id}/vitalink-web:latest"
      ports { container_port = 8080 }
      env {
        name  = "VITE_API_BASE_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "web_public" {
  location = google_cloud_run_v2_service.web.location
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
