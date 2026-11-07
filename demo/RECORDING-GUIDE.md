# In-depth recording guide (Ubuntu 24.04 · OBS · Wayland)

Everything from zero to an uploaded video. Pairs with **`demo/STORYBOARD.md`**
(the 8 shots) — this is the *how*, that is the *what to say/show*.

Two ways to do it; pick based on time left:
- **Fast path (≈30 min total):** one continuous take in OBS, trim the ends, upload. No editor.
- **Polished path (≈60–90 min):** record 8 clips, stitch in Kdenlive, add captions + music.

Start with the Fast path. If you have time after, redo as Polished.

---

## PART A — Tools

OBS is already installed. For the polished path you'll also want an editor:
```bash
sudo apt update && sudo apt install -y kdenlive        # video editor (polished path)
```
(Optional, nicer audio: `sudo apt install -y obs-studio` is already present.)

---

## PART B — Prepare every screen (do this once, before OBS)

1. **System:** Settings → Appearance → **Dark**. Close chat/email/notifications
   (OBS will capture your whole screen). Silence your phone.
2. **Services up** (you already did): Switch Console open, Mattermost running.
3. **The room:** in the Switch Console, open room **`embargo-minimist-live`**,
   scroll to the **top** so you can scroll down through the story on camera.
4. **Dashboard** — a terminal:
   ```bash
   cd ~/projects/embargo-room
   npm run dashboard
   ```
   Open three browser tabs, dark theme: `http://localhost:7070/ops` ·
   `http://localhost:7070/` · `http://localhost:7070/desk`.
   On the `/ops` tab, **don't press Play yet**.
5. **A terminal for the beats** (big font: Ctrl+Shift+`+` a few times, ~18pt):
   ```bash
   cd ~/projects/embargo-room
   ```
6. **A terminal for the Slack beat** with your token ready to paste (don't run yet):
   ```bash
   SLACK_BOT_TOKEN=xoxb-YOUR-TOKEN node bridge/status.js
   ```
7. **Arrange windows** so each is easy to bring forward: Room, Browser, Terminal.

---

## PART C — Configure OBS (one time, ~4 min)

1. Launch **OBS Studio**. If the **Auto-Configuration Wizard** appears → **Optimize
   just for recording** → **1920×1080**, **30 FPS** → Apply.
2. **Settings → Output:**
   - Output Mode: **Simple**
   - Recording Path: `~/Videos`
   - Recording Quality: **High Quality, Medium File Size**
   - Recording Format: **MP4**
   - Encoder: **Hardware (VAAPI)** if offered, else **Software (x264)**.
3. **Settings → Video:** Base & Output Resolution **1920×1080**, FPS **30**. OK.
4. **Settings → Audio:** Sample Rate **48 kHz**; **Mic/Auxiliary Audio** → your
   microphone. OK.
5. **Sources panel** (bottom), click **＋**:
   - **Screen Capture (PipeWire)** → OK → in the portal dialog pick your monitor →
     **Share**. You should see your screen in the preview.
   - **＋ → Audio Input Capture** → OK → select your mic. Speak — the audio meter
     should move. If it doesn't, reselect the device in its Properties.
6. **Test levels:** talk normally; the mic meter should peak around **-20 to -12 dB**
   (yellow, not red). Adjust the mic slider if needed.

---

## PART D — 20-second test (don't skip)

Click **Start Recording**, say one sentence, switch to the room and scroll once,
click **Stop Recording**. Open `~/Videos/` and play the file. Confirm: screen is
sharp, your voice is clear and in sync. If good, delete it and continue.

---

## PART E — Record

### Fast path (one take)
1. Open **`demo/STORYBOARD.md`** on your phone or a second monitor.
2. Click **Start Recording** in OBS.
3. Walk all 8 shots in order, bringing the right window forward for each and
   reading the 🎙️ line. Pace: **slow and clear**. Hold **2 seconds** on
   INCOMPLETE_FIX (Shot 3). Don't rush the chat shots (2–4).
4. Click **Stop Recording**. That's your video (`~/Videos/…​.mp4`).
5. Trim dead air at the start/end: open it in Kdenlive (or any trimmer), cut the
   first/last seconds, export. Done.

> Fumble a line? Pause 2 seconds and say it again — you'll cut the fumble out, and
> the pause makes it easy to find.

### Polished path (8 clips)
Record each shot as its own file: **Start Recording → do the shot → Stop
Recording**, renaming nothing (they land in `~/Videos/` by timestamp — do them in
order so they sort correctly). Redo any shot freely. Then go to PART F.

**Per-shot actions (full detail in `demo/STORYBOARD.md`):**
- **Shot 1** `/ops` tab → press **Play**, speed **2×**. ~12s of agents working.
- **Shot 2** Room → scroll report → **REPRODUCED**.
- **Shot 3** Room → scroll to **INCOMPLETE_FIX** → **hold 2s**. (The money shot.)
- **Shot 4** Room → scroll **VERIFIED_FIXED → SIGNED_OFF → PUBLISHED**.
- **Shot 5** `/` tab → show scorecard + cost + lanes + failures.
- **Shot 6** Terminal → `bash demo/play-terminal.sh` (it types itself; narrate over it).
- **Shot 7** Slack terminal → run the token command, then
  `SLACK_BOT_TOKEN=xoxb-… node bridge/status.js --down slack`.
- **Shot 8** `/desk` tab → hold on the portfolio; deliver the close.

---

## PART F — Edit in Kdenlive (polished path only)

1. Open **Kdenlive**. Project → set profile **HD 1080p 30fps**.
2. Drag all 8 clips from `~/Videos/` into the **Project Bin**, then onto the
   **timeline** in order (1 → 8).
3. **Trim** each clip's dead ends: click a clip edge and drag inward.
4. **Captions (optional, strong):** open `dashboard/captions.html` in the browser,
   click **green screen**, screenshot each lower-third (Shift+PrtSc → region).
   Drag each screenshot onto the **video track above** its clip; with it selected,
   add Effect **"Chroma Key / Blue Screen (Greenscreen)"** and pick the green — now
   only the text overlays.
5. **Music (optional):** drop a soft royalty-free track on the audio track; set its
   volume **low (-20 dB)** so your voice stays on top.
6. **Watch it once** end to end. Fix any clip that drags.

---

## PART G — Export

- **Fast path:** if you trimmed in Kdenlive → **Render** → preset **MP4 (H.264/AAC)**,
  1920×1080, 30fps → Render to File.
- Keep the final under **~3:30** and a reasonable size (a few hundred MB is fine).

---

## PART H — Upload & submit

1. Upload to **YouTube** (set to **Unlisted**) or Loom. Copy the share link.
2. **Submit the hackathon form NOW** (if you haven't): repo
   `https://github.com/CodingwithKetan/embargo-room`, the Switch answer from
   `SUBMISSION.md`, and the video link. You can keep editing until 11:59 PM IST.
3. Put the link in the repo too:
   - `README.md` line 11 (replace `_(video link on submission)_`)
   - `SUBMISSION.md` (the Demo line)
   ```bash
   git add -A && git commit -m "Add demo video link" && git push
   ```
4. **Revoke the demo token** when done:
   ```bash
   docker exec switchdash-local-mattermost-mattermost-1 mmctl --local token list user
   docker exec switchdash-local-mattermost-mattermost-1 mmctl --local token revoke <id>
   ```

---

## Troubleshooting

- **Black screen in OBS (Wayland):** use **Screen Capture (PipeWire)**, not
  "Screen Capture (XSHM)". Re-add the source and pick the monitor in the portal.
- **No audio:** OBS → Audio Input Capture → Properties → reselect your mic; check
  it's not muted in the Mixer (no red mute icon).
- **Room looks empty/offline:** open `embargo-minimist-live` in the Console and
  wait ~30s; the posts are static and will show even if agent dots are grey.
- **`/ops` won't load:** make sure `npm run dashboard` is still running in its
  terminal; reload the tab.
- **Slack beat shows "reachable (public)" not your workspace:** you forgot the
  `SLACK_BOT_TOKEN=xoxb-…` prefix on the command.
- **Out of time:** record only Shots **3, 2, 4, 6, 7** (chat catch + security +
  Slack) — still a valid, strong submission.
