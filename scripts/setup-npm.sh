#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${NPM_REGISTRY_URL:-}" ]]; then
  echo "Setting npm registry to ${NPM_REGISTRY_URL}"
  npm config set registry "${NPM_REGISTRY_URL}"
else
  echo "NPM_REGISTRY_URL not set; leaving npm registry unchanged."
fi

if [[ "${CLEAR_NPM_PROXY:-0}" == "1" ]]; then
  echo "Clearing npm proxy config keys"
  npm config delete proxy || true
  npm config delete https-proxy || true
  npm config delete http-proxy || true
fi

echo "Current npm registry: $(npm config get registry)"
