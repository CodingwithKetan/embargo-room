# Local activity dashboard

A local web view of a disclosure room: **which agent did what task, the current
status, and every failure/flag** — served from your machine, no artifact, no
external service. Zero dependencies.

```bash
npm run dashboard                 # offline: reads the committed records
# open http://localhost:7070
```

Pick the data source from the dropdown:

- **records** (default, offline, reproducible) — parses the committed
  `record/*.record.json` files. Works from a clean clone with no token.
- **LIVE** — the running Mattermost room, if you start the server with a token:

  ```bash
  MM_TOKEN=<token> MM_CHANNEL=<channel-id> npm run dashboard
  # defaults to the embargo-minimist-live room; set MM_ROOM for a label
  ```

## What it shows

- **KPI strip** — current state, agent-action count, failures/flags, state transitions.
- **Failures & flags** (top, red) — `INCOMPLETE_FIX`, `CANNOT_REPRODUCE`,
  `[NEEDS HUMAN]`, silence/deadline flags. The point of the tool is that these are
  *caught* and loop the process back, so they're surfaced first.
- **Agent lanes** — one column per participant (Timekeeper, Repro, Advisory,
  Watch, Humans), each listing that agent's actions newest-first with a status
  badge (TRIGGERED / VERIFIED FIXED / ADVISORY / GROUNDING / …).

The model is built by `dashboard/activity.js` (also a CLI:
`node dashboard/activity.js <record.json>` prints the JSON). Parsing keys off the
agents' own posted verdicts, so the dashboard reflects the room's real history,
not a separate hand-maintained status.
