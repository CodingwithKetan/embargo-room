# STORYBOARD — the best cut (director's version)

The single source of truth for the video. Shot by shot: **screen · action ·
on-screen caption · what you say**. Target **3:10**. Record each shot as its own
clip and stitch — no live pressure, redo any clip.

Before you start: relaunch the **Switch Console** (room back), run
`npm run dashboard` (second terminal), open browser tabs `/ops`, `/`, `/desk`,
dark theme everywhere, mic on in OBS, 1920×1080. Have your `SLACK_BOT_TOKEN`
ready in a terminal.

Legend: 🎙️ = say it · 🎬 = do it · ▣ = on-screen caption (from `dashboard/captions.html`)

---

### SHOT 1 · 0:00–0:15 · COLD OPEN — agents at work
🎬 Browser `/ops` → press **Play** (speed 2×). Agents pulse and work in turn.
▣ `Coordinated disclosure — run as one Switch room`
🎙️ *"In security, the patch usually exists. What breaks is the choreography between people who don't trust each other — and the fix often doesn't fix. Embargo Room runs the whole thing in one Switch room: watch the agents work."*

### SHOT 2 · 0:15–0:40 · THE CHAT — report → reproduced ⭐ (required)
🎬 The **room** (Switch Console / Mattermost). Scroll: researcher report → **REPRODUCED**.
▣ `Repro agent runs the PoC in Docker → TRIGGERED`
🎙️ *"A researcher files a bug. The repro agent runs the exploit itself, in Docker — triggered. The agent's own run is the evidence, never the vendor's word."*

### SHOT 3 · 0:40–1:05 · 🎯 THE CATCH ⭐ (do not cut) — HOLD 2s
🎬 The **room**. Scroll to **INCOMPLETE_FIX**. Let it sit.
▣ `Vendor's real commit v1.2.5, built from source → STILL TRIGGERED`
🎙️ *"The vendor ships the fix — version 1.2.5. The agent builds their actual commit from source… and it still triggers. Incomplete fix. The timekeeper refuses to advance; the clock keeps running."*

### SHOT 4 · 1:05–1:30 · THE RESOLUTION ⭐ — published
🎬 The **room**. Scroll: **VERIFIED_FIXED → SIGNED_OFF → PUBLISHED**.
▣ `v1.2.6 SAFE · two human sign-offs → PUBLISHED`
🎙️ *"The real fix, 1.2.6 — safe. Two independent sources agree, both humans sign off, and only then is it published. The agents hold the clock; the trust decisions stay human."*

### SHOT 5 · 1:30–1:55 · WHAT EACH AGENT DID — accountability
🎬 Browser `/` (activity dashboard). Show the **scorecard + cost strips + agent lanes + failures**.
▣ `Per-agent work · SLA grade · cost · 2 INCOMPLETE_FIX caught`
🎙️ *"Every step is on the record, per agent — what each one did, graded against its SLA, and costed. The repro agent's Docker builds are where the money goes. Nothing here is hand-maintained."*

### SHOT 6 · 1:55–2:25 · CAN'T BE MISUSED — the tool defends itself
🎬 Terminal: `bash demo/play-terminal.sh` (it types itself: red-team → record tamper → assure).
▣ `5 / 5 attacks BLOCKED · verdicts attested · publish is human-only`
🎙️ *"Agents that run other people's code are a target, so it defends itself — five attacks, all blocked. No one can forge the record or fake a verdict, and nothing publishes without a human. Autonomous discovery, human-gated action."*

### SHOT 7 · 2:25–2:50 · SLACK + DISTRIBUTION — runs anywhere, survives an outage
🎬 Terminal: `SLACK_BOT_TOKEN=xoxb-… node bridge/status.js` (your live Slack workspace, active) →
then `SLACK_BOT_TOKEN=xoxb-… node bridge/status.js --down slack` (distributes / fails over to Mattermost).
▣ `Slack ⇄ Mattermost · a bridge outage doesn't stall the disclosure`
🎙️ *"It runs on whatever chat your team uses — here, Slack, live. If Slack is overloaded or down, the work distributes to another bridge, and the disclosure continues — because the truth is the portable record, not the platform."*

### SHOT 8 · 2:50–3:10 · SCALE + CLOSE — the security desk
🎬 Browser `/desk` (the portfolio). Then hold on it.
▣ `The desk a security team runs — monitored, graded, costed`
🎙️ *"Zoom out: this isn't one bug — it's the desk a security team runs. What's watched, every disclosure graded and costed, every downstream tracked. Remove Switch and it's disconnected bots and separate inboxes. As a Switch room, it's a disclosure desk you could run tomorrow. That's Embargo Room."*

---

## Order of priority if you run short on time
Keep, in this order: **SHOT 3 (the catch)** · **SHOT 2/4 (the chat)** · **SHOT 6 (security)** · **SHOT 7 (Slack)**.
Trim first: SHOT 1, then SHOT 5, then SHOT 8's length.

## Do-not-skip (hard requirement)
At least one clear look at the **chat room** (SHOTS 2–4). The email requires
"workflow running in the chat."

## After
Upload (YouTube unlisted) → paste the link into the **form**, `README.md` line 11,
`SUBMISSION.md` → `git push`. Submit the form first; edit the link in after.
