#!/usr/bin/env bash
# verify-ref.sh --repo <git-url> --ref <sha|tag|branch>
# Builds the vendor's candidate from source in Docker and runs the PoC offline.
# Exit 0 = TRIGGERED, 1 = SAFE, 2 = error.
set -euo pipefail
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
