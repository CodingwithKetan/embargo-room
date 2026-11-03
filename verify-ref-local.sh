#!/usr/bin/env bash
# verify-ref-local.sh --repo <git-url> --ref <sha|tag|branch>
# Docker-free: clones to a temp dir and runs the PoC with local Node.
set -euo pipefail
REPO=""; REF=""
while [[ $# -gt 0 ]]; do case "$1" in
  --repo) REPO="$2"; shift 2;;
  --ref)  REF="$2";  shift 2;;
  *) echo "bad arg $1" >&2; exit 2;; esac; done
[[ -n "$REPO" && -n "$REF" ]] || { echo "usage: verify-ref-local.sh --repo <url> --ref <sha|tag|branch>" >&2; exit 2; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
git clone --depth 1 --branch "$REF" "$REPO" "$TMP/pkg" 2>/dev/null \
  || { git clone "$REPO" "$TMP/pkg" >/dev/null 2>&1; ( cd "$TMP/pkg" && git checkout "$REF" >/dev/null 2>&1 ); }
( cd "$TMP/pkg" && (npm ci --omit=dev >/dev/null 2>&1 || npm install --omit=dev >/dev/null 2>&1 || true) && (npm run build >/dev/null 2>&1 || true) )
node poc/poc.js "$TMP/pkg"
