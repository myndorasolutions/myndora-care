resource "google_secret_manager_secret" "mongo_uri" {
  secret_id = "vitalink-mongodb-uri-${var.environment}"
  replication { auto {} }
}

resource "google_secret_manager_secret" "paystack_secret" {
  secret_id = "vitalink-paystack-secret-${var.environment}"
  replication { auto {} }
}

resource "google_secret_manager_secret" "firebase_sa" {
  secret_id = "vitalink-firebase-sa-${var.environment}"
  replication { auto {} }
}

resource "google_secret_manager_secret" "at_api_key" {
  secret_id = "vitalink-at-api-key-${var.environment}"
  replication { auto {} }
}
