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
