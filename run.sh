#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js is missing. Install Node.js 22.19+ (22.x), 24.11+ (24.x), or 26+ from https://nodejs.org/' >&2
  exit 1
fi
exec node scripts/run-local.mjs "$@"
