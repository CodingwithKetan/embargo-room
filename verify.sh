#!/usr/bin/env bash
# verify.sh --target vulnerable|bad-patch|patched
#
# Builds the chosen target in a throwaway container, fires the PoC with no
# network, and reports the verdict. Exit 0 = TRIGGERED, 1 = SAFE, 2 = error.
set -euo pipefail

# Robustness: a Switch agent often runs in a shell where the docker group isn't
# active yet (fresh group membership needs a re-login), so `docker` fails with a
# permission error. If the socket isn't reachable but the user IS in the docker
# group, re-exec under `sg docker` so plain `./verify.sh` works without the
# caller needing `sg`/`newgrp`.
if [ -z "${EMBARGO_DOCKER_SG:-}" ] && ! docker info >/dev/null 2>&1; then
  if command -v sg >/dev/null 2>&1 && id -nG 2>/dev/null | tr ' ' '\n' | grep -qx docker; then
    exec sg docker -c "EMBARGO_DOCKER_SG=1 $(printf '%q ' "$0" "$@")"
  fi
fi

TARGET="vulnerable"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

DF="docker/Dockerfile.${TARGET}"
if [[ ! -f "$DF" ]]; then
  echo "no such target '${TARGET}' (expected vulnerable|bad-patch|patched)" >&2
  exit 2
fi

echo ">>> building ${TARGET} ..." >&2
docker build -q -f "$DF" -t "embargo-${TARGET}" . >/dev/null

echo ">>> running PoC (no network, dropped caps) ..." >&2
set +e
OUT="$(docker run --rm --network none --cap-drop ALL --security-opt no-new-privileges --pids-limit 256 --memory 512m "embargo-${TARGET}")"
CODE=$?
set -e

echo "$OUT"
exit $CODE
