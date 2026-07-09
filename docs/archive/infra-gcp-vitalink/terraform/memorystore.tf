resource "google_redis_instance" "cache" {
  name           = "vitalink-redis-${var.environment}"
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region
  redis_version  = "REDIS_7_0"
}

output "redis_host" {
  value = google_redis_instance.cache.host
}
