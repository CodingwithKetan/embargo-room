# Architecture

One room per disclosure. Two humans, three agents. Each agent keeps its own
memory per room (Switch default), so the room is a self-contained audit trail.

## Participants

| Participant | Type | Role | addressing |
| --- | --- | --- | --- |
| Researcher | Human | Files report; holds go-to-publish | — |
| Vendor maintainer | Human | Acknowledges; ships patch; signs off | — |
| embargo-timekeeper | Agent | Owns embargo clock; chases silence; logs state | anyone |
| embargo-repro | Agent | Runs PoC in Docker vs vulnerable/patched builds | owner-agents |
| embargo-advisory | Agent | Drafts CVE text + advisory from room history | owner-agents |

## State machine (maintained by Timekeeper, posted into the room)

REPORTED -> REPRODUCED -> VENDOR_NOTIFIED -> PATCH_SUBMITTED
  -> VERIFIED_FIXED        (advance)
  -> PATCH_SUBMITTED       (loop back on INCOMPLETE_FIX)
  -> ADVISORY_DRAFTED -> SIGNED_OFF -> PUBLISHED

## Embargo clock (clock/clock.js)

The Timekeeper drives a scalable clock so the embargo countdown is a live
mechanism, not a quoted date. `CLOCK_SCALE` compresses embargo-days into real
seconds (default 90-day deadline, 14-day silence window). The Timekeeper runs
`clock.js init` on the report, `notify` on VENDOR_NOTIFIED, `ack` on a vendor
reply, and `status` for every countdown. `status` raises SILENCE_EXCEEDED (vendor
silent past the window -> escalate) and DEADLINE_PASSED (forced coordinated lift,
matching the deadline backstop in readiness.js).

## Grounding (osv/osv-lookup.js)

Evidence comes from two independent sources that must agree: repro's build-and-
run of the vendor's real commit, and the public OSV advisory database. The
Advisory agent takes CVE IDs and affected/fixed ranges from OSV (never from
memory) and checks each tested version's OSV status against repro's verdict;
a disagreement becomes [NEEDS HUMAN]. The Timekeeper uses the same lookup to
assess whether a downstream's resolved version is actually exposed.

## Audit record (record/export-record.js)

The room's history exports to a hash-chained record (each entry's hash covers
the previous hash plus the entry), with the state timeline and final advisory
extracted. `verify` recomputes the chain; any edited, dropped or reordered entry
breaks it at that point. The head hash is the citable fingerprint of the whole
disclosure.

## Handoff (every arrow is a visible room message)

Researcher --report--> Timekeeper --@repro--> Repro --TRIGGERED--> Timekeeper
  --@vendor--> Vendor --patch--> Timekeeper --@repro--> Repro
  --INCOMPLETE_FIX--> (clock keeps running) ... Vendor --real patch-->
  Repro --VERIFIED_FIXED--> Advisory --draft--> humans redline -->
  Vendor signs off --> Researcher publishes --> Timekeeper stamps timeline

No agent decides publish or sign-off. Agents gather evidence and hold the
clock; humans make the two trust decisions.


## Layer B (downstream fan-out)

Parent room + one child room per confirmed dependent, same Timekeeper in all. See docs/layer-b.md for the protocol and the readiness rule.

## The full stack

Every capability, and where it's documented:

| Capability | What it adds | Docs |
| --- | --- | --- |
| Core harness | The PoC + pinned Docker targets; the verified arc (1.2.0/1.2.5/1.2.6) | README "Verify the harness" |
| **Layer A** | Verify the vendor's REAL commit, built from source | [layer-a.md](layer-a.md) |
| **Layer B** | Downstream coordination across rooms; the readiness gate | [layer-b.md](layer-b.md) |
| **Layer C** | Emit the public advisory (OSV + CVE 5.0 + GHSA), validated vs OSV | [layer-c.md](layer-c.md) |
| **Layer D** | Attest the agent's work — verdicts backed by tamper-evident runs | [layer-d.md](layer-d.md) |
| Auto mode | Watch OSV for new CVEs; propose, wait for a human | [watch-mode.md](watch-mode.md) |
| Embargo clock | Scalable countdown + silence escalation | this doc, above |
| Grounding | Two-source agreement (build + OSV) | this doc, above |
| Audit record | Tamper-evident, hash-chained export | this doc, above |
| Security | Threat model, repo allowlist, sandbox, runnable red-team | [../SECURITY.md](../SECURITY.md) |
| Bridge layer | Bridge-agnostic failover (Slack ⇄ Mattermost) | [bridges.md](bridges.md) |
| Activity dashboard | Local web view: which agent did what, status, failures | [dashboard.md](dashboard.md) |
| Disclosure scorecard | SLA/KPIs from the record: cycle time, incomplete fixes caught, grade | [scorecard.md](scorecard.md) |

The pipeline is **A → B → C → D**: verify the upstream fix, coordinate the
downstreams, publish the standard advisory, and attest that the agent did the
work. Trust-but-verify, applied to both the vendor *and* the agent.
