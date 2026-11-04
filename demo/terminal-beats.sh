#!/usr/bin/env bash
# terminal-beats.sh — the "screen C" beats for the Embargo Room demo, one keystroke
# each. Every command is the real thing (no mocks). Run from the repo root:
#   bash demo/terminal-beats.sh
# Press Enter on cue to run the next beat. Ctrl-C to stop.
set -u
cd "$(dirname "$0")/.." || exit 2

pause(){ printf '\n\033[2m— press Enter: %s —\033[0m'  "$1"; read -r _; clear; }
title(){ printf '\033[1;36m\n=== %s ===\033[0m\n\n' "$1"; }

clear
printf '\033[1mEmbargo Room — terminal beats\033[0m   (press Enter to advance)\n'

pause "BEAT 1 — prevent-hack: npm run redteam"
title "Can a compromised room weaponise the agents?"
npm run redteam

pause "BEAT 2 — the record can't be forged"
title "The disclosure record is hash-chained"
node record/export-record.js verify record/embargo-minimist-demo.record.json
printf '\n\033[2m…now change one word (INCOMPLETE_FIX -> VERIFIED_FIXED) and re-verify:\033[0m\n\n'
tmp="$(mktemp)"; sed 's/INCOMPLETE_FIX/VERIFIED_FIXED/' record/embargo-minimist-demo.record.json > "$tmp"
node record/export-record.js verify "$tmp"; rm -f "$tmp"

pause "BEAT 3 — the agent's verdicts are attested"
title "Every verdict is backed by a tamper-evident run"
npm run assure

pause "BEAT 4 — emit the real public advisory, validated vs OSV"
title "Layer C: OSV / CVE 5.0 / GHSA, checked against osv.dev"
npm run emit:validate

pause "BEAT 5 — the whole thing reproduces from a clean clone"
title "npm test"
npm test

pause "BEAT 6 — bridge-agnostic: survive a Slack outage"
title "Fail over Slack -> Mattermost; the record is portable"
node bridge/status.js --down slack

printf '\n\033[1;32mEnd of terminal beats.\033[0m  Cut back to the dashboard.\n\n'
