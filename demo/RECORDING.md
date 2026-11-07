# RECORDING — do this, top to bottom

Deadline-night checklist. The email requires the video to **show your workflow
running in the chat**, so the **room is mandatory** — that's the centerpiece.
Everything else is supporting. ~3 minutes.

> **If the room is blank / "offline":** relaunch the **Switch Console app** — it
> restarts its bundled Mattermost and the room. (Mattermost can't be started on
> its own; the Console manages it.)

## What to emphasize (the four things you asked to show)

| You want to show | Where / command | No room needed? |
|---|---|---|
| **Slack + distribution** | `SLACK_BOT_TOKEN=xoxb-… node bridge/status.js` (Slack connected), then `… --down slack` → traffic **distributes/fails over to Mattermost**, record head unchanged | ✅ terminal |
| **Can't be used for harm** | `npm run redteam` → **5/5 attacks BLOCKED** · sign-off/publish are **human-only gates** · `npm run assure` (no faked verdicts) | ✅ terminal |
| **What each agent did** | `/ops` replay (agents working, one at a time) · the activity dashboard lanes · `npm run cost` (per-agent) · `npm run assure` (agent did the work it claimed) | ✅ dashboard |
| **The workflow in the chat** (required) | the **room** — report → INCOMPLETE_FIX → published | needs the Console up |

---

## 0. Pre-flight (2 min)

Open **three things**, dark theme everywhere, terminal font ~16pt:

1. **The room (REQUIRED):** Switch Console → room **`embargo-minimist-live`**
   (or Mattermost at `http://localhost:42111` → that channel). Scroll to the top.
2. **A terminal** at the repo:
   ```bash
   cd ~/projects/embargo-room
   ```
3. **The dashboard** (second terminal tab), then open the browser tabs:
   ```bash
   npm run dashboard
   ```
   Browser tabs: `http://localhost:7070/ops` · `http://localhost:7070` · `http://localhost:7070/desk`

**OBS:** Sources → **Screen Capture (PipeWire)** + **Audio Input Capture** (your mic).
Output 1920×1080. You can record each screen as a **separate clip** and stitch —
no pressure, redo any clip.

---

## 1. Record, in this order (read lines from `demo/narration.md` / `demo/pitch.md`)

| # | Screen | Do | Say (short) |
|---|---|---|---|
| 1 | **/ops** | Hit **Play** (speed 2×) — agents light up and work | "Coordinated disclosure, run as one Switch room: agents keep the clock, reproduce, and verify — watch them work." |
| 2 | **ROOM** ⭐ | Scroll: the **report → REPRODUCED** | "A researcher files a bug. The repro agent runs the exploit itself in Docker — TRIGGERED. Never the vendor's word." |
| 3 | **ROOM** ⭐ | Scroll to **INCOMPLETE_FIX** — *hold 2s* | "The vendor ships the fix — v1.2.5. The agent builds their **actual commit** and it **still triggers**. It refuses to advance." |
| 4 | **ROOM** ⭐ | Scroll: **VERIFIED_FIXED → SIGNED_OFF → PUBLISHED** | "The real fix, v1.2.6 — safe. Both humans sign off. Only then, published." |
| 5 | **terminal** | `bash demo/play-terminal.sh` (it types itself) | "It defends itself — 5 of 5 attacks blocked — and the record can't be forged. 18 checks green." |
| 6 | **/desk** | Show the Security Desk | "Zoom out: the whole program — graded against its SLA, costed per agent, downstreams tracked. The desk a security team runs." |

⭐ = the chat room. **These three beats are what the judges require — do not skip them.**

**Close line:** *"Remove Switch and this is disconnected bots and separate inboxes. As a Switch room, it's a disclosure desk you could run tomorrow."*

---

## ⚡ If you're crunched (90-second valid cut)

Record only: **/ops Play (10s)** → **ROOM: report → INCOMPLETE_FIX → PUBLISHED (50s)** →
**terminal `npm run redteam` + `npm test` (20s)** → **/desk (10s)**. Still satisfies
"workflow running in the chat."

---

## 2. After recording

1. Upload (YouTube **unlisted** / Loom) → copy the link.
2. Paste the link into the **submission form**, into `README.md` line 11, and `SUBMISSION.md`.
3. Push the edit: `git add -A && git commit -m "Add demo video link" && git push`
4. Revoke the demo token:
   ```bash
   docker exec switchdash-local-mattermost-mattermost-1 mmctl --local token list user
   docker exec switchdash-local-mattermost-mattermost-1 mmctl --local token revoke <id>
   ```

**Submit the form now even before the video is final — you can keep editing until 11:59 PM IST.**
