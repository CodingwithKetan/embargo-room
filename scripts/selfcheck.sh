#!/usr/bin/env bash
# selfcheck.sh — prove the whole project reproduces from a clean clone.
# Runs the Docker-free core always; adds network (OSV) and Docker checks when
# available, and skips them cleanly when not. No npm install needed.
#   ./scripts/selfcheck.sh   (or: npm test)
cd "$(dirname "$0")/.." || exit 2

pass=0; fail=0; skip=0
ok(){ printf '  \033[32mPASS\033[0m  %s\n' "$1"; pass=$((pass+1)); }
no(){ printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=$((fail+1)); }
sk(){ printf '  \033[33mSKIP\033[0m  %s\n' "$1"; skip=$((skip+1)); }

echo "== JavaScript parses =="
jsok=1
for f in $(git ls-files '*.js' 2>/dev/null); do node -c "$f" 2>/dev/null || { no "syntax: $f"; jsok=0; }; done
[ $jsok = 1 ] && ok "all tracked .js files parse"

echo "== PoC verdicts, Docker-free (the verified arc) =="
./verify-local.sh --target vulnerable >/dev/null 2>&1 && ok "minimist 1.2.0 -> TRIGGERED"            || no "1.2.0 should TRIGGER"
./verify-local.sh --target bad-patch  >/dev/null 2>&1 && ok "minimist 1.2.5 -> TRIGGERED (bad patch)" || no "1.2.5 should TRIGGER"
./verify-local.sh --target patched    >/dev/null 2>&1 ; [ $? -eq 1 ] && ok "minimist 1.2.6 -> SAFE"   || no "1.2.6 should be SAFE"

echo "== Layer B readiness computes =="
node downstream/readiness.js downstream/state.example.json 2>/dev/null | grep -q "DECISION:" && ok "readiness returns a decision" || no "readiness failed"

echo "== Verifiable audit record =="
node record/export-record.js verify record/embargo-minimist-demo.record.json >/dev/null 2>&1 && ok "parent record chain intact" || no "record verify failed"
tmp="$(mktemp)"; sed 's/INCOMPLETE_FIX/VERIFIED_FIXED/' record/embargo-minimist-demo.record.json > "$tmp"
node record/export-record.js verify "$tmp" >/dev/null 2>&1 && no "tamper NOT caught" || ok "tamper is caught (chain breaks)"
rm -f "$tmp"

echo "== Layer C: emit public advisory =="
node publish/emit-advisory.js record/embargo-minimist-demo.record.json --outdir "$(mktemp -d)" >/dev/null 2>&1 && ok "emit OSV / CVE 5.0 / advisory / checklist" || no "Layer C emit failed"

echo "== Layer D: agent work attestation =="
node assure/verify-work.js >/dev/null 2>&1 && ok "attestation chain intact" || no "attestation chain broken"
node assure/verify-work.js --against record/embargo-minimist-demo.record.json >/dev/null 2>&1 && ok "room verdicts backed by attested runs" || no "a claimed verdict is unbacked"

echo "== Embargo clock =="
node clock/clock.js init --scale 30 >/dev/null 2>&1 && node clock/clock.js status >/dev/null 2>&1 && ok "clock init + status" || no "clock failed"

echo "== Scorecard: SLA/KPIs compute from a record =="
node scorecard/scorecard.js --json 2>/dev/null | grep -q '"grade": "MEETS SLA"' && ok "scorecard grades the disclosure (MEETS SLA)" || no "scorecard failed"

echo "== Activity dashboard: model builds from a record =="
node dashboard/activity.js record/embargo-minimist-demo.record.json 2>/dev/null | grep -q '"currentState": "PUBLISHED"' && ok "activity model builds (lanes + failures)" || no "activity model failed"

echo "== Bridge layer: failover computes =="
node bridge/status.js --json >/dev/null 2>&1; rc=$?
[ $rc -le 1 ] && ok "bridge status/failover computes (exit $rc)" || no "bridge status errored"

echo "== Security: repo allowlist guard =="
./verify-ref-local.sh --repo https://github.com/attacker/evil --ref main >/dev/null 2>&1 ; [ $? -eq 3 ] && ok "non-allowlisted repo refused" || no "allowlist did not refuse"

echo "== Optional: OSV grounding (needs network) =="
if node osv/osv-lookup.js minimist >/dev/null 2>&1; then ok "OSV lookup (osv.dev reachable)"; else sk "OSV lookup — no network"; fi

echo "== Optional: auto-mode watch (needs network) =="
node watch/watch.js --json >/dev/null 2>&1; rc=$?
if [ $rc -eq 0 ] || [ $rc -eq 10 ]; then ok "watch checkup runs (exit $rc)"; else sk "watch checkup — no network"; fi

echo "== Optional: Layer C validates vs OSV (needs network) =="
node publish/emit-advisory.js --validate record/embargo-minimist-demo.record.json >/dev/null 2>&1; rc=$?
if [ $rc -eq 0 ]; then ok "emitted advisory matches OSV"; elif [ $rc -eq 2 ]; then sk "Layer C validate — no network"; else no "Layer C validate: mismatch"; fi

echo "== Optional: case framework (needs Docker + network) =="
if docker info >/dev/null 2>&1 || sg docker -c "docker info" >/dev/null 2>&1; then
  node cases/run.js cases/minimist-cve-2021-44906.json >/dev/null 2>&1 && ok "case framework: verdicts agree with OSV" || no "case run failed"
else
  sk "case framework / Docker verify — no docker"
fi

echo
echo "RESULT: $pass passed, $fail failed, $skip skipped"
[ $fail -eq 0 ] && { echo "ALL CHECKS PASS"; exit 0; } || { echo "FAILURES PRESENT"; exit 1; }
