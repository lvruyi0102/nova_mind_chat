#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${MANUS_HEALTHCHECK_URL:-}" ]]; then
  echo "MANUS_HEALTHCHECK_URL is required"
  exit 1
fi

RETRIES="${MANUS_HEALTHCHECK_RETRIES:-5}"
DELAY="${MANUS_HEALTHCHECK_DELAY:-5}"
EXPECTED_TEXT="${MANUS_HEALTHCHECK_EXPECTED_TEXT:-}"

attempt=1
while [[ "$attempt" -le "$RETRIES" ]]; do
  echo "Health check attempt $attempt/$RETRIES: $MANUS_HEALTHCHECK_URL"

  if [[ -n "$EXPECTED_TEXT" ]]; then
    body=$(curl --fail --show-error --silent "$MANUS_HEALTHCHECK_URL") || body=""
    if [[ "$body" == *"$EXPECTED_TEXT"* ]]; then
      echo "Health check passed with expected text match"
      exit 0
    fi
  else
    if curl --fail --show-error --silent "$MANUS_HEALTHCHECK_URL" > /dev/null; then
      echo "Health check passed"
      exit 0
    fi
  fi

  if [[ "$attempt" -lt "$RETRIES" ]]; then
    sleep "$DELAY"
  fi

  attempt=$((attempt + 1))
done

echo "Health check failed after $RETRIES attempts"
exit 1
