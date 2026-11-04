# Recorded terminal beats

A real, timed recording of `demo/terminal-beats.sh` (made with `script`), so the
terminal half of the demo can **play itself** while you screen-record it — no
live typing, no mistakes.

- `terminal-beats.rec` — the captured session (ANSI output).
- `terminal-beats.timing` — the timing track for replay.

## Play it (screen-record this in OBS)

```bash
bash demo/play-terminal.sh          # natural speed
SPEED=2 bash demo/play-terminal.sh  # 2x faster
```

It streams the whole sequence with the original pacing: red-team **5/5 BLOCKED**
→ record **verify + tamper (TAMPERED)** → **assure 3/3** → **emit:validate
VALIDATED** → **npm test 18/18** → **bridge: Slack active → fail over to
Mattermost**.

## Re-record it yourself (optional)

```bash
# natural, interactive (press Enter per beat):
script -t"demo/recordings/terminal-beats.timing" \
  -c "bash demo/terminal-beats.sh" demo/recordings/terminal-beats.rec

# auto-paced (no keypresses), e.g. 3s per beat:
AUTO=1 AUTO_DELAY=3 script -t"demo/recordings/terminal-beats.timing" \
  -c "AUTO=1 AUTO_DELAY=3 bash demo/terminal-beats.sh" demo/recordings/terminal-beats.rec
```

## Live Slack workspace in the bridge beat

The recorded bridge beat shows Slack reachable via the public `api.test`. To show
your **actual connected Slack workspace** in the row, run the bridge beat with a
bot token in the env (never stored in a file):

```bash
SLACK_BOT_TOKEN=xoxb-… node bridge/status.js        # → "connected — <workspace> (bot …)"
SLACK_BOT_TOKEN=xoxb-… node bridge/status.js --down slack   # → fails over to Mattermost
```
