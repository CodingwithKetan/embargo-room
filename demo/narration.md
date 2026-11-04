# Narration script — word for word, timed to ~3:25

Read at a calm ~150 wpm. Each beat has a **VO** line (say it) and a **CAPTION**
(short on-screen text / lower-third — use it even if you don't narrate). Timings
are cues, not handcuffs. Screens: **A** = room `embargo-minimist-live`,
**B** = control-room dashboard (`dashboard/control-room.html`),
**C** = terminal running `demo/terminal-beats.sh`,
**D** = local activity dashboard (`npm run dashboard` → `localhost:7070`).

Pre-roll: have all four screens open. Start on **B** (dashboard), dark theme.
For a strict 3:00, the local-dashboard beat (1:48) is the first trim — but it's a
strong differentiator; keep it if you can and drop beat 2 (0:22) instead.

---

### 0:00 — Cold open  ·  Screen B → A
**VO:** "When a security bug is found, the patch almost always exists. What breaks is the choreography between people who don't trust each other — and the fix the vendor ships often doesn't actually fix. Embargo Room runs that whole process in one Switch room: two humans, three AI agents."
**CAPTION:** `Coordinated disclosure, in one Switch room — 2 humans, 3 agents`

### 0:22 — The room  ·  Screen A (top of channel)
**VO:** "A researcher files a report. A timekeeper agent opens the embargo and holds the clock. Nobody has to trust anybody's word — because the next thing that happens is proof."
**CAPTION:** `Researcher → Timekeeper opens the embargo`

### 0:38 — Reproduced  ·  Screen A (scroll to REPRODUCED)
**VO:** "The repro agent builds minimist in Docker and runs the exploit itself. Version 1.2.0 — triggered. That's the agent's own run, not a claim from a form."
**CAPTION:** `Repro agent runs the PoC in Docker → TRIGGERED`

### 0:55 — 🎯 INCOMPLETE_FIX (the peak)  ·  Screen A (scroll, then HOLD 2s)
**VO:** "Now the important part. The vendor submits the fix — version 1.2.5. The agent doesn't take their word for it: it clones their actual commit, builds it from source, and runs the exploit again… and it still triggers. Incomplete fix. The timekeeper refuses to advance, and the clock keeps running."
**CAPTION:** `Vendor's real commit v1.2.5, built from source → STILL TRIGGERED · advance refused`

### 1:28 — Real fix + sign-off  ·  Screen A (scroll to VERIFIED_FIXED → PUBLISHED)
**VO:** "The real fix lands in 1.2.6 — built from source, safe. Two independent sources agree: the agent's run, and the public OSV record. The advisory is drafted from the room's own history. Both humans sign off — and only then, published. The agents gather evidence and hold the clock; the two trust decisions stay human."
**CAPTION:** `v1.2.6 → SAFE · OSV agrees · two human sign-offs → PUBLISHED`

### 1:48 — Accountability dashboard  ·  Screen D (browser: `localhost:7070`)
**VO:** "Every one of those steps is on the record — per agent. This local dashboard reads the room's own history: what each agent did, the current state, and the failures it caught — those two incomplete-fix flags, front and centre. Nothing here is hand-maintained."
**CAPTION:** `Local dashboard — per-agent actions · 2 INCOMPLETE_FIX caught`

### 2:10 — 🔒 Prevent-hack  ·  Screen C  (`npm run redteam`)
**VO:** "Agents that build and run other people's code are a target. So the tool defends itself. Hostile repo, malicious dependency, a backdoor phoning home, a message saying 'ignore your rules and publish', an agent faking a verdict — five attacks, all blocked."
**CAPTION:** `Red-team: 5 / 5 attacks BLOCKED`

### 2:36 — Can’t be forged  ·  Screen C  (record verify → tamper → assure)
**VO:** "And nobody can quietly rewrite history. The record is hash-chained — change one word and verification breaks at that exact entry. Every verdict the agents posted is backed by a tamper-evident, attested run. Three of three."
**CAPTION:** `Hash-chained record · tamper caught · 3/3 verdicts attested`

### 2:58 — Real advisory + reproduces  ·  Screen C  (emit:validate → npm test)
**VO:** "It emits the real public advisory — OSV, CVE 5.0, GHSA — and validates it against osv.dev. And the entire project reproduces from a clean clone: eighteen checks, green."
**CAPTION:** `Emits OSV/CVE/GHSA — VALIDATED · npm test 18/18`

### 3:14 — Bridge-agnostic close  ·  Screen C → B  (`bridge --down slack`)
**VO:** "It runs on whatever chat your team already uses — Slack, Mattermost, Teams. A bridge outage doesn't stall the disclosure, because the truth is the portable record, not the platform. The room's history is the disclosure record."
**CAPTION:** `Bridge-agnostic failover · the record is portable`

### 3:28 — End card  ·  Screen B (dashboard) or intro card
**CAPTION:** `Embargo Room — disclosure as a Switch room.  Flip the Switch · Track 1`

---

## Delivery notes for the best take
- **One continuous take if you can**, but it's fine to record each screen separately and cut — the terminal beats and the room are static, so there's no timing pressure.
- **Hold 2 seconds** on the INCOMPLETE_FIX post (0:55). It's the emotional peak — let it breathe. Everything before builds to it; everything after is proof.
- **Dark theme** on the dashboard and terminal reads best on video; keep font size up in the terminal (the beats use color + headers already).
- Speak a touch slower than feels natural. ~450 words here ≈ 3:00 at 150 wpm.
- If you must cut to 3:00 flat: shorten the 0:22 and 2:46 beats; never cut INCOMPLETE_FIX (0:55) or the red-team (1:58).
