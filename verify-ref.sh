#!/usr/bin/env bash
# verify-ref.sh --repo <git-url> --ref <sha|tag|branch>
# Builds the vendor's candidate from source in Docker and runs the PoC offline.
# Exit 0 = TRIGGERED, 1 = SAFE, 2 = error.
set -euo pipefail

# See verify.sh: re-exec under `sg docker` if the docker group isn't active in
# this shell but the user is a docker-group member (common for Switch agents),
# so plain `./verify-ref.sh` works without the caller needing `sg`/`newgrp`.
if [ -z "${EMBARGO_DOCKER_SG:-}" ] && ! docker info >/dev/null 2>&1; then
  if command -v sg >/dev/null 2>&1 && id -nG 2>/dev/null | tr ' ' '\n' | grep -qx docker; then
    exec sg docker -c "EMBARGO_DOCKER_SG=1 $(printf '%q ' "$0" "$@")"
  fi
fi

REPO=""; REF=""
while [[ $# -gt 0 ]]; do case "$1" in
  --repo) REPO="$2"; shift 2;;
  --ref)  REF="$2";  shift 2;;
  *) echo "bad arg $1" >&2; exit 2;; esac; done
[[ -n "$REPO" && -n "$REF" ]] || { echo "usage: verify-ref.sh --repo <url> --ref <sha|tag|branch>" >&2; exit 2; }
echo ">>> building $REPO @ $REF ..." >&2
docker build -q -f docker/Dockerfile.ref --build-arg REPO="$REPO" --build-arg REF="$REF" -t embargo-ref . >/dev/null
echo ">>> running PoC (no network) ..." >&2
set +e; OUT="$(docker run --rm --network none embargo-ref)"; CODE=$?; set -e
echo "$OUT"; exit $CODE
