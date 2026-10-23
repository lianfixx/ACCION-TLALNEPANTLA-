#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

command -v timeout || {
  echo "build-verified.sh requires GNU timeout." >&2
  exit 69
}

vite="${SITES_PROJECT_ROOT}/node_modules/.bin/vite"
if [[ ! -x "${vite}" ]]; then
  echo "Vite is unavailable. Run npm run install:ci and wait for it to finish before building." >&2
  exit 69
fi

# The vinext CLI uses its Node build path and may leave an old Worker behind.
# Build through the configured Cloudflare Vite environment and clear artifacts.
rm -rf -- "${SITES_PROJECT_ROOT}/dist"
echo "Running bounded Cloudflare Worker build..."
timeout \
  --signal=TERM \
  --kill-after="${SITES_BUILD_KILL_AFTER:-10s}" \
  "${SITES_BUILD_TIMEOUT:-3m}" \
  "${vite}" build

"${script_dir}/validate-artifact.sh"
