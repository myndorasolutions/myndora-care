resource "google_cloudbuild_trigger" "deploy" {
  name        = "vitalink-deploy-${var.environment}"
  description = "Deploy VitaLink on push to main"

  github {
    owner = "your-org"
    name  = "vitalink-africa"
    push { branch = "^main$" }
  }

  filename = "infra/cloudbuild.yaml"
  service_account = google_service_account.cloud_build.id
}

output "backend_url" {
  value = google_cloud_run_v2_service.backend.uri
}

output "web_url" {
  value = google_cloud_run_v2_service.web.uri
}
