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

# SECURITY GUARD: only build repos on the disclosure allowlist. A compromised
# room must not be able to make this agent clone and build hostile code.
ALLOW="${EMBARGO_REPO_ALLOWLIST:-$(dirname "$0")/security/repo-allowlist.txt}"
norm() { printf '%s' "$1" | sed 's#\.git$##; s#/*$##'; }
want="$(norm "$REPO")"; allowed=0
if [[ -f "$ALLOW" ]]; then
  while IFS= read -r line; do
    case "$line" in ''|\#*) continue;; esac
    [[ "$(norm "$line")" == "$want" ]] && { allowed=1; break; }
  done < "$ALLOW"
fi
if [[ "$allowed" != 1 ]]; then
  echo "REFUSED: '$REPO' is not on the repo allowlist ($ALLOW)." >&2
  echo "  A compromised room could ask an agent to build hostile code. Add the vendor's" >&2
  echo "  real repository to that file (an auditable, human action) to permit it." >&2
  exit 3
fi

echo ">>> building $REPO @ $REF ..." >&2
docker build -q -f docker/Dockerfile.ref --build-arg REPO="$REPO" --build-arg REF="$REF" -t embargo-ref . >/dev/null
echo ">>> running PoC (no network, dropped caps) ..." >&2
set +e
OUT="$(docker run --rm --network none --cap-drop ALL --security-opt no-new-privileges --pids-limit 256 --memory 512m embargo-ref)"
CODE=$?
set -e
echo "$OUT"; exit $CODE
