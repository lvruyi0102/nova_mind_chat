#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${MANUS_DEPLOY_WEBHOOK_URL:-}" ]]; then
  echo "MANUS_DEPLOY_WEBHOOK_URL is required"
  exit 1
fi

payload=$(cat <<JSON
{
  "repository": "${GITHUB_REPOSITORY:-local}",
  "ref": "${GITHUB_REF_NAME:-local}",
  "sha": "${GITHUB_SHA:-local}",
  "actor": "${GITHUB_ACTOR:-local}",
  "environment": "production"
}
JSON
)

curl --fail --show-error --silent \
  -X POST "$MANUS_DEPLOY_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Deploy-Token: ${MANUS_DEPLOY_TOKEN:-}" \
  -d "$payload"

echo "Manus deployment trigger sent"
