# Infrastructure

Active deployment configs:

- **Backend (Render):** [`render.yaml`](../render.yaml)
- **Backend (Cloud Run):** [`scripts/deploy-cloud-run.ps1`](../scripts/deploy-cloud-run.ps1) → service `myndora-backend-api` (europe-west3)
- **Web (Firebase Hosting):** [`web/firebase.json`](../web/firebase.json) + [`scripts/deploy-firebase-hosting.ps1`](../scripts/deploy-firebase-hosting.ps1)

Legacy VitaLink-era GCP Terraform has been archived to [`docs/archive/infra-gcp-vitalink/`](../docs/archive/infra-gcp-vitalink/README.md).
