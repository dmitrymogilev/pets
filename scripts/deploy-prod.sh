#!/usr/bin/env bash
# Deploy site/ to the production Spot site, open to the whole mesh.
#
# Run it from a clean checkout of main, under your own mesh identity. The
# first deploy claims site ownership; after that only the owner and the
# maintainers listed in deploy/prod_access.json can redeploy.
#
#   SPOT_URL   Spot apex, default https://spot.t1a.dev
#   SPOT_SITE  site name, default pets
set -euo pipefail

cd "$(dirname "$0")/.."

export SPOT_URL="${SPOT_URL:-https://spot.t1a.dev}"
SPOT_SITE="${SPOT_SITE:-pets}"

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "deploy-prod: must run from main (on $branch)" >&2
  exit 1
fi
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "deploy-prod: working tree has uncommitted changes; commit or stash first" >&2
  exit 1
fi

# Production policy: no allow list (public in the mesh), maintainers only.
# site/_access.json is gitignored and holds the local preview policy, so stash
# it while deploying and put it back afterwards.
local_access=""
if [ -f site/_access.json ]; then
  local_access="$(mktemp)"
  cp site/_access.json "$local_access"
fi
restore() {
  if [ -n "$local_access" ]; then
    mv "$local_access" site/_access.json
  else
    rm -f site/_access.json
  fi
}
trap restore EXIT

cp deploy/prod_access.json site/_access.json
spot deploy "$SPOT_SITE" site
echo "deployed $(git rev-parse --short HEAD) -> https://$SPOT_SITE.spot.t1a.dev/"
