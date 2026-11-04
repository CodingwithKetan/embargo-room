# Embargo Room — demo script (final)

**Thesis in one line:** coordinated vulnerability disclosure is a trust-and-timing
problem between parties who don't trust each other — and the "fix" often doesn't
fix. Embargo Room runs the whole thing in **one Switch room**: agents verify and
keep the clock, humans hold the two decisions that must stay human.

Target: **~3:15** (a strict 3:00 cut is noted at the end). One continuous take.

---

## Pre-production (do this once, before recording)

1. **Re-import the templates** so the agents have every capability baked in:
   - `embargo-room.template.yaml` (the 3 disclosure agents)
   - `embargo-intake.template.yaml` (the `embargo-watch` auto-mode agent)
   Use a **fresh room** so there's no build-session clutter on screen.
2. **Accelerate the clock:** set `CLOCK_SCALE=30` in the agent environment so the
   90-day embargo and the countdown play out in seconds.
3. **Three screens to cut between:**
   - **A — Mattermost** (the room: 2 humans + 3 agents)
   - **B — the dashboard** (`dashboard/control-room.html`, open full-screen)
   - **C — a terminal** at the repo (for the red-team, the record tamper, `npm test`)
4. **Driving:** Claude posts the human messages into the room live via the
   Mattermost API on cue (same as the proven run); you narrate and switch screens.
   Terminal beats are pre-typed so they're one keystroke.

---

## Run-of-show

| Time | Beat | Screen | Voiceover (short) | What happens / exact message |
| --- | --- | --- | --- | --- |
| 0:00 | **Cold open** | B → A | "In security, the patch usually exists. What breaks is the *choreography* — and the fix often doesn't fix." | Dashboard, then the room: one Switch room, 2 humans + 3 agents. "Remove Switch and this is disconnected bots and separate inboxes." |
| 0:18 | **Auto mode** | A | "It starts on its own — but a human decides." | Post: `@embargo-watch run a checkup`. It proposes new CVEs (incl. a real **malware** advisory in `rc`) → **AWAITING HUMAN APPROVAL**. Post: `@embargo-watch approved — open the minimist disclosure`. |
| 0:40 | **Report → Reproduced** | A | "The agent's own run — attested — is the evidence, never the vendor's word." | Paste the researcher report (`demo/seed-report.md`). Timekeeper opens the embargo (clock ticking), pings repro; repro runs `verify.sh` → **TRIGGERED**. |
| 1:05 | **🎯 INCOMPLETE_FIX** | A | "The vendor ships the fix. The agent builds their *actual commit* — and it still triggers." | Post the bad patch (`v1.2.5`, from `demo/vendor-patch-refs.md`). Repro builds from source → still **TRIGGERED** → **INCOMPLETE_FIX**. Timekeeper **refuses** VERIFIED_FIXED; clock keeps running. **Hold 2s.** |
| 1:40 | **Real fix + grounding** | A | "The real fix — and two independent sources have to agree." | Post the real patch (`v1.2.6`). Repro → **SAFE** → VERIFIED_FIXED. Advisory drafted, **"OSV agrees."** |
| 2:00 | **Human gate + Layer B** | A | "The two trust decisions stay human. And nobody publishes alone." | Both humans sign off (human-only). Layer B readiness → **READY** → **PUBLISHED**. |
| 2:15 | **🔒 Prevent-hack** | C | "Agents that run code are a target. So what if your Slack gets hacked?" | Terminal: `npm run redteam` → **5/5 BLOCKED** (hostile repo, malicious dependency, backdoor callback, "publish anyway" injection, faked verdict). |
| 2:45 | **Can't be forged** | C | "And nobody can quietly rewrite 'the fix didn't work.'" | `node record/export-record.js verify …` → intact. Change one word → **verify FAILS** at that entry. `npm run assure` → "ASSURED: the agent did the work it claimed." |
| 3:05 | **Close + reproduce** | C → B | "It even emits the real public advisory — and the whole thing reproduces from a clone." | `npm run emit:validate` → **VALIDATED vs OSV**. `npm test` → **16/16**. End on the dashboard. "The room's history *is* the disclosure record." |

---

## The prevent-hack segment (2:15, in detail)

This is the beat you asked for. Narrate over `npm run redteam`:

```
1) build a hostile repo          -> BLOCKED (allowlist, before any clone)
2) malicious dependency script   -> BLOCKED (--ignore-scripts; baseline: RAN)
3) dropped backdoor phones home  -> BLOCKED (--network none)
4) "ignore your rules / publish" -> BLOCKED (untrusted data + human-only gates)
5) agent fakes a verdict         -> BLOCKED (Layer D attestation)
ALL ATTACKS BLOCKED
```

Line to land: *"The tool verifies other people's patches — and it defends itself.
Autonomous discovery, but every consequential action still needs a human."*

---

## Exact messages Claude posts (as `@user`)

- **Checkup:** `@embargo-watch run a checkup and propose anything new.`
- **Approve:** `@embargo-watch approved — open a disclosure room for minimist (CVE-2021-44906).`
- **Report:** the body of `demo/seed-report.md`.
- **Bad patch:** `@embargo-timekeeper Patch submitted. Please verify. repo: https://github.com/minimistjs/minimist  ref: v1.2.5`
- **Real patch:** `@embargo-timekeeper New patch. Please re-verify. repo: https://github.com/minimistjs/minimist  ref: v1.2.6`
- **Sign-off:** `Researcher sign-off: APPROVED. Vendor sign-off (relayed): APPROVED.`
- **Publish:** `Readiness READY — this is my go-to-publish. Advance to PUBLISHED and stamp the timeline.`

---

## Trim to a strict 3:00

Cut in this order until you fit:
1. Compress Layer B to a 5s glance at the readiness view (don't narrate each downstream).
2. Drop the auto-mode opener (start at the report) — reclaim ~20s. *(Keep it if you can; it's a differentiator.)*
3. Shorten the close: `npm test → 16/16` flash only, skip `emit:validate`.

Never cut: the **INCOMPLETE_FIX** beat (1:05) or the **prevent-hack** beat (2:15).

---

## B-roll / backup (for the README GIF or a longer cut)

- The **control-room dashboard** panning (state machine → CVE matrix → defenses panel).
- `node cases/run.js …` — the two-CVE matrix agreeing with OSV.
- The **mermaid state diagram** in the README.
- `publish/out/CVE-2021-44906.osv.json` — the emitted standard advisory.
