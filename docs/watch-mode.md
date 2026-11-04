# Auto mode — continuous watch, human-gated action

Embargo Room's core flow is reactive: a researcher files a report. **Auto mode**
makes it proactive — an `embargo-watch` agent monitors the public advisory
database for new CVEs on your dependencies and **proposes** disclosures, but a
human approves before anything happens.

The design rule, same as the rest of the project: **autonomous discovery,
human-gated action.**

## The pieces

- **`watch/watch-config.json`** — the policy. This is how a human configures the
  agents' access: the `watchlist` (which packages to monitor), `min_cvss` (a
  severity floor), and `on_new_cve` / `require_human_to_*` (what the agent may do
  on its own). Editing it is an auditable change.
- **`watch/watch.js`** — the checkup. Queries [OSV](https://osv.dev) for the
  watchlist, diffs against a baseline (`watch/seen.json`), and reports NEW
  advisories with the policy's required approvals. It never opens a room or builds
  anything — it only reports.
- **`embargo-watch`** (agent, `embargo-intake.template.yaml`) — runs the checkup,
  posts proposals to the intake room, `@mention`s the owner, and **waits**.

## The loop

1. **Checkup** (regularly — see scheduling): `embargo-watch` runs
   `node watch/watch.js`.
2. **Propose**: for each new advisory it posts a proposal (package, CVE, summary,
   affected ranges) and asks the owner. With the default policy it takes **no**
   further action.
3. **Human decides**: the owner approves a specific advisory (or ignores it).
4. **Open**: on approval, a disclosure room is opened from
   `embargo-room.template.yaml` and the normal flow runs (reproduce → verify →
   advisory → sign-off → publish).
5. **Baseline**: `node watch/watch.js --mark` records the handled advisories so
   they are not proposed again.

```bash
node watch/watch.js          # checkup: NEW advisories since the baseline (exit 10 if any)
node watch/watch.js --json   # machine-readable, for the agent
node watch/watch.js --mark   # baseline once handled
```

## Configuring the agents' access

Everything the agent may do is in `watch/watch-config.json`:

| Setting | Effect |
| --- | --- |
| `watchlist` | which packages are monitored |
| `min_cvss` | only surface advisories at/above this CVSS base score (0 = all) |
| `on_new_cve` | `propose` (ask a human) · `auto-triage` (also open a room, still bounded by the gates below) · `off` |
| `require_human_to_open_room` | a human must approve before any disclosure room opens |
| `require_human_to_build` | `embargo-repro` must be approved before it builds/runs a repo |

Defaults require human approval for every consequential step. Combined with the
repo allowlist (`security/repo-allowlist.txt`) and Switch's per-agent addressing,
these are the knobs that bound what the agents can do. See [`SECURITY.md`](../SECURITY.md).

## Regular checkup (scheduling)

Run the checkup on a schedule and have the agent present anything new. For
example, a daily cron that runs the checkup and pings the intake room:

```cron
# every weekday at 09:00 — checkup; the agent proposes, humans approve
0 9 * * 1-5  cd /path/to/embargo-room && node watch/watch.js >> watch/checkup.log 2>&1
```

A Console-run agent only acts while Switch Console is running, so schedule the
checkup on a host that stays up, and let `embargo-watch` present results when the
owner is in the room.
