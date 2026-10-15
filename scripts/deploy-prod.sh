#!/usr/bin/env bash
# Deploy site/ to the production Spot site, open to the whole mesh.
#
# Used by CI (.github/workflows/deploy.yml). Requires:
#   SPOT_URL          Spot apex, default https://spot.t1a.dev
#   SPOT_PUBLISH_KEY  repository publishing key (CI secret); omit to deploy
#                     with your own mesh identity as site owner/maintainer.
#   SPOT_SITE         site name, default pets-game
set -euo pipefail

cd "$(dirname "$0")/.."

export SPOT_URL="${SPOT_URL:-https://spot.t1a.dev}"
SPOT_SITE="${SPOT_SITE:-pets-game}"

# Use the installed CLI if present, otherwise fetch it from the Spot apex.
if command -v spot >/dev/null 2>&1; then
  SPOT_BIN="$(command -v spot)"
else
  SPOT_BIN="$(mktemp -d)/spot"
  curl -fsSL "$SPOT_URL/spot" -o "$SPOT_BIN"
  chmod +x "$SPOT_BIN"
fi

# Production policy: no allow list (public in the mesh), maintainers only.
# site/_access.json is gitignored, so this never clashes with local previews.
cp deploy/prod_access.json site/_access.json
trap 'rm -f site/_access.json' EXIT

"$SPOT_BIN" deploy "$SPOT_SITE" site
