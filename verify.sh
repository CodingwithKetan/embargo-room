#!/usr/bin/env bash
# verify.sh --target vulnerable|bad-patch|patched
#
# Builds the chosen target in a throwaway container, fires the PoC with no
# network, and reports the verdict. Exit 0 = TRIGGERED, 1 = SAFE, 2 = error.
set -euo pipefail

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

echo ">>> running PoC (no network) ..." >&2
set +e
OUT="$(docker run --rm --network none "embargo-${TARGET}")"
CODE=$?
set -e

echo "$OUT"
exit $CODE
