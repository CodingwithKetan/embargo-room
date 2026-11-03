#!/usr/bin/env bash
# verify-local.sh --target vulnerable|bad-patch|patched
# Docker-free sanity check: installs the pinned minimist into a temp dir and
# runs the PoC with the real Node on this machine. Same verdict as verify.sh.
set -euo pipefail
declare -A VER=( [vulnerable]=1.2.0 [bad-patch]=1.2.5 [patched]=1.2.6 )
TARGET="vulnerable"
while [[ $# -gt 0 ]]; do case "$1" in --target) TARGET="$2"; shift 2;; *) echo "bad arg $1" >&2; exit 2;; esac; done
[[ -n "${VER[$TARGET]:-}" ]] || { echo "unknown target $TARGET" >&2; exit 2; }
V="${VER[$TARGET]}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
( cd "$TMP" && npm init -y >/dev/null 2>&1 && npm install "minimist@$V" >/dev/null 2>&1 )
NODE_PATH="$TMP/node_modules" node poc/poc.js
