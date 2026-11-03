# Embargo Room

**A Switch room that runs a software vulnerability disclosure from report to
public advisory — with AI agents doing the clock-keeping, the verification and
the drafting, and humans holding the two decisions that must stay human: the
vendor's sign-off and the researcher's go-to-publish.**

Built for the Flip the Switch hackathon (WeMakeDevs × DevTools Academy ×
Switch). Track 1: Best Business Workflow.

> **Watch the 3-minute demo:** _(link here)_

## The problem

Coordinated vulnerability disclosure is a multi-party coordination problem
between people who don't fully trust each other and are racing a clock. It runs
on scattered email threads and fails in predictable ways: embargo deadlines
slip, vendors go silent, downstream never finds out, and — the one this project
makes unmissable — the "fix" often doesn't actually fix the bug. The patch
usually exists; the choreography around it breaks.

## How Switch is central (not decorative)

Disclosure is **mutually distrusting parties who must share exactly one timeline
and one set of evidence, while agents act on that same shared state.** That is
precisely what a Switch room is and what a point-to-point chatbot can never be.
One room per vulnerability; the researcher, the vendor and three agents all read
and write the *same* room, with per-party addressing rules, handoffs by name,
and a persistent shared history that becomes the disclosure's audit trail.
**Remove Switch and you are left with three disconnected bots and five separate
inboxes — the broken status quo this project replaces.**

## Architecture

One room, two humans, three agents. See `docs/architecture.md` for the full
handoff flow and state machine.

| Participant | Role | addressing |
| --- | --- | --- |
| Researcher (human) | Files report; holds go-to-publish | — |
| Vendor (human) | Acknowledges; ships patch; signs off | — |
| `embargo-timekeeper` | Owns embargo clock; chases silence; logs state | anyone |
| `embargo-repro` | Runs the PoC in Docker vs vulnerable/patched builds | owner-agents |
| `embargo-advisory` | Drafts the advisory from room history | owner-agents |

The Repro agent is told to **trust only its own run, never the vendor's claim.**
That is the whole thesis.

## Run it yourself

### 1. Verify the harness (no Switch needed — ~15s)

The PoC is a real prototype pollution in `minimist` (CVE-2020-7598 /
CVE-2021-44906). Three pinned versions reproduce a genuine *incomplete fix*:

```bash
# With Docker (as the Repro agent runs it):
./verify.sh --target vulnerable   # minimist 1.2.0 -> TRIGGERED
./verify.sh --target bad-patch    # minimist 1.2.5 -> TRIGGERED  (incomplete fix)
./verify.sh --target patched      # minimist 1.2.6 -> SAFE

# No Docker? Same verdicts via local Node:
./verify-local.sh --target vulnerable   # TRIGGERED
./verify-local.sh --target bad-patch     # TRIGGERED
./verify-local.sh --target patched       # SAFE
```

The 1.2.5 "fix" guarded `__proto__` and the Object/Number/String/Array
prototypes but missed `Function.prototype`, so the bug is still reachable — the
exact gap the Repro agent catches in the demo.

### Layer A — verify a real patch from a git ref

Instead of only pre-pinned versions, the Repro agent verifies the vendor's
*actual* commit, built from source:

```bash
./verify-ref.sh --repo https://github.com/minimistjs/minimist --ref v1.2.5  # TRIGGERED (incomplete fix)
./verify-ref.sh --repo https://github.com/minimistjs/minimist --ref v1.2.6  # SAFE (real fix)
# Docker-free twin: ./verify-ref-local.sh --repo <url> --ref <ref>
```

The clone happens at image-build time; the PoC runs with `--network none`.
This turns the project from a historical replay into a live patch verifier.

### Layer B — downstream coordination across rooms

A library bug is also a bug in everything that depends on it. Layer B opens a
child room per real dependent (same Timekeeper agent in all of them) and holds
the embargo until a coordinated publish is safe:

```bash
# confirm a dependent is real (queries npm)
node downstream/check-dependency.js rc minimist      # CONFIRMED
# decide whether a coordinated publish is safe yet
node downstream/readiness.js downstream/state.example.json
```

`readiness.js` is READY when every downstream is resolved, or the deadline has
passed; otherwise HOLD, naming who we're waiting on. See `docs/layer-b.md`.

### 2. Run the full room

1. Install Switch Console + Docker; run the Switch quickstart.
2. Load `embargo-room.template.yaml` in Console (fill the `{...}` placeholders).
3. Paste `demo/seed-report.md` into the room as the researcher.
4. Watch the agents work through the state machine, including the
   `INCOMPLETE_FIX` loop, up to the human sign-off gate.

## Built during the hackathon

The Switch room setup, the three agents' instructions, the verification harness
(`verify.sh`, `poc.js`, the three Dockerfiles) and this workflow were all built
during the event. `minimist`, the CVEs and Switch itself are off-the-shelf.

## Layout

```
embargo-room.template.yaml   Switch agents + room
verify.sh / verify-local.sh  verification harness (Docker / local)
poc/poc.js                   the proof of concept
docker/Dockerfile.*          vulnerable (1.2.0) / bad-patch (1.2.5) / patched (1.2.6)
demo/                        seed report + 3-minute script
docs/architecture.md         room, state machine, handoff flow
advisory.example.json        sample machine-readable output
```
