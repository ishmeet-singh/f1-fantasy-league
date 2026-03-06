#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT_DIR}/exports"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="${OUT_DIR}/f1-fantasy-league-offline-${STAMP}.tar.gz"
LATEST_LINK="${OUT_DIR}/f1-fantasy-league-offline-latest.tar.gz"

mkdir -p "${OUT_DIR}"

cd "${ROOT_DIR}"

tar \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='exports/*.tar.gz' \
  -czf "${OUT_FILE}" \
  .

ln -sfn "$(basename "${OUT_FILE}")" "${LATEST_LINK}"

echo "Created export: ${OUT_FILE}"
echo "Latest symlink: ${LATEST_LINK}"
