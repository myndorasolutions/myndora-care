# Archived GCP Infrastructure (VitaLink era)

**Archived:** June 2025 sprint — superseded by:

- **Backend (legacy):** [Render](https://render.com) via [`render.yaml`](../../../render.yaml)
- **Web frontend:** Firebase Hosting (Classic) in `web/`
- **API proxy target:** Cloud Run service `myndora-backend-api` (region `africa-south1`)

## Why archived

This Terraform and Cloud Build config targets the old VitaLink stack:

- MongoDB (not PostgreSQL / Prisma)
- Wrong Docker build context for the current monorepo layout
- Unwired Redis, GCS buckets, and Cloud Armor WAF
- Service names and project IDs (`vitalink-africa-dev`) no longer match Myndora Care

## Do not apply

Do **not** run `terraform apply` on these files without a full rewrite for the current NestJS + PostgreSQL + Firebase Hosting architecture.

## Contents

- `terraform/` — GCP resources (Cloud Run, Memorystore, GCS, IAM, secrets)
- `cloudbuild.yaml` — CI deploy to `vitalink-backend-dev` / `vitalink-web-dev`
