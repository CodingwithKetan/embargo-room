# Recording run-of-show — walk the real, completed run

This records the demo from the **already-completed** live room
`embargo-minimist-live` plus the terminal beats. Nothing needs to be created or
driven live: the room is fully populated, so it records cleanly even if the
agents go idle. Target ~3:00–3:15, one continuous take.

## Three screens to cut between

- **A — Mattermost**, room `embargo-minimist-live` (2 humans + 3 agents, the full arc).
- **B — the control-room dashboard**, `dashboard/control-room.html`, open full-screen.
- **C — a terminal** at the repo root, running `demo/terminal-beats.sh` (one keystroke per beat).
- **D — the local activity dashboard**, `npm run dashboard` → `http://localhost:7070` (per-agent lanes + failures).

## Run-of-show

| # | Time | Screen | What's on screen | Voiceover (short) |
| --- | --- | --- | --- | --- |
| 1 | 0:00 | B → A | Dashboard title + state machine, then the room header | "Coordinated disclosure is a trust-and-timing problem between parties who don't trust each other — and the fix often doesn't fix. This runs the whole thing in one Switch room: two humans, three agents." |
| 2 | 0:25 | A | Scroll: researcher **report** → **REPRODUCED** (repro ran `verify.sh`, minimist 1.2.0 → TRIGGERED) | "The agent's own Docker run is the evidence — never the vendor's word." |
| 3 | 0:55 | A | Scroll to **INCOMPLETE_FIX**: repro built `minimistjs/minimist @ v1.2.5` *from source* → still vulnerable. **Hold 2s.** | "The vendor ships the fix. The agent builds their actual commit — and it still triggers. The timekeeper refuses to advance; the clock keeps running." |
| 4 | 1:25 | A | Scroll: **VERIFIED_FIXED** (`v1.2.6` safe) → Layer B readiness **READY** → **SIGNED_OFF → PUBLISHED 🏁** | "The real fix. Two independent sources agree. Both humans sign off — nobody publishes alone." |
| 5 | 1:48 | **D** | Local dashboard (`localhost:7070`): **Scorecard (MEETS SLA)** + **per-agent cost tracker** up top, then per-agent lanes + **Failures (2× INCOMPLETE_FIX)** | "Because it's a business process, it has a scorecard and a per-agent cost line — SLA grade, cycle time, what each agent did and spent, and the failures it caught. Every number traces to the record." |
| 6 | 2:10 | C | `npm run redteam` → **5/5 BLOCKED** | "Agents that run code are a target, so the tool defends itself: hostile repo, malicious dependency, backdoor callback, 'publish anyway' injection, faked verdict — all blocked." |
| 7 | 2:36 | C | record `verify` (intact) → tamper one word (**breaks at entry 27**) → `npm run assure` (**3/3 backed**) | "Nobody can quietly rewrite 'the fix didn't work' — the record is hash-chained, and every verdict is backed by a tamper-evident attested run." |
| 8 | 2:58 | C | `npm run emit:validate` (**VALIDATED vs OSV**) → `npm test` (**18/18**) | "It emits the real public advisory — OSV, CVE 5.0, GHSA — validated against osv.dev, and the whole thing reproduces from a clean clone." |
| 9 | 3:14 | C → B | `node bridge/status.js --down slack` → fails over to Mattermost, record head unchanged; end on the dashboard | "It runs on whatever chat app your team uses. A bridge outage doesn't stall the disclosure — the truth is the portable record, not the platform." |

Never cut: the **INCOMPLETE_FIX** beat (#3) or the **prevent-hack** beat (#6). The
local-dashboard beat (#5) is the first trim for a strict 3:00.

**Strong optional framing — the Security Desk (`/desk`).** For the biggest
"business workflow" impression, open *or* close on the portfolio desk
(`npm run portfolio` → `http://localhost:7070/desk`): monitoring radar → the
disclosure with its SLA grade and cost → downstream coordination. VO: *"Zoom out:
this isn't one bug, it's the desk a security team runs — what's watched, every
disclosure graded against its SLA and costed, and every downstream tracked to the
deadline."* It reframes everything the judge just saw as one managed program.

To set up screen **D** before recording: `MM_TOKEN=<token> MM_CHANNEL=n9mgu4i143yxxqmu5cz9bb65dc npm run dashboard`,
open `localhost:7070`, pick **LIVE — embargo-minimist-live**, dark theme.

## The terminal beats

Run `bash demo/terminal-beats.sh` in screen C. It pauses before each beat so you
press a key on cue; output is the real thing (already dry-run green). See the
file for the exact commands.

## Key posts to land on in the room (for scrolling)

- **REPRODUCED** — `embargo-repro`: "REPRODUCED: minimist 1.2.0, prototype pollution via the constructor chain."
- **INCOMPLETE_FIX** — `embargo-repro`: "INCOMPLETE_FIX: minimistjs/minimist @ v1.2.5 is still vulnerable." → timekeeper: "Patch verification FAILED — incomplete fix."
- **VERIFIED_FIXED** — `embargo-repro`: "VERIFIED_FIXED: minimistjs/minimist @ v1.2.6 is safe against the PoC."
- **PUBLISHED** — `embargo-timekeeper`: "SIGNED_OFF → PUBLISHED 🏁".

(The trailing "reconcile the record honestly" exchange after PUBLISHED is a nice
honesty beat but optional — stop scrolling at PUBLISHED if trimming to 3:00.)
