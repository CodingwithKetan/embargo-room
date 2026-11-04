# Bridge layer — resilience and portability

Embargo Room runs on whatever chat app your team uses — Slack, Microsoft Teams,
Mattermost, Discord, Telegram — because Switch bridges to all of them. The point
of this layer: **a disclosure's source of truth is its portable record and state
files, not the chat platform.** The chat is a replaceable transport.

## A bridge can fail without losing the disclosure

Everything that matters is on disk and bridge-independent:

- the hash-chained record (`record/*.record.json`),
- the downstream state and readiness (`downstream/state.json`),
- the embargo clock (`clock/`) and the attestation ledger (`assure/`).

None of it lives in Slack or Mattermost. So if a bridge is **down or overloaded**,
you re-point the room to a healthy bridge and the disclosure resumes from the same
verified state — the record head doesn't change.

## Status + failover

`bridge/bridges.json` declares a primary bridge and an ordered fallback list.
`bridge/status.js` reports each bridge's health and picks the first **enabled +
reachable** one:

```bash
node bridge/status.js                # health of every bridge + the active one
node bridge/status.js --down slack   # simulate Slack overloaded -> fails over to Mattermost
```

`enabled` (in `bridges.json`) lets an operator take a bridge out of rotation for
maintenance or rate limits; `--down` simulates an outage for a demo. The portable
state printed underneath is identical on every bridge — that is the whole point.

## Failover procedure

1. `node bridge/status.js` → pick the active bridge.
2. Create or adopt the disclosure room on that bridge (Switch Console, or invite
   the agents to a channel there).
3. The agents resume from the record + state files — nothing is re-derived, and
   the audit trail stays verifiable across the switch.
