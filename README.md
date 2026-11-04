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

### A framework, not a one-off — any CVE is a case

The harness isn't hardcoded to one bug. A disclosure *case* is declarative — a
small JSON naming the package, the PoC, the versions to test, and the authoritative
OSV advisory — so a new vulnerability plugs in as data, not code. The repo ships
two **real, independent** minimist CVEs with different vectors and different fix
points, and the runner proves each verdict against OSV, per version:

```bash
node cases/run.js cases/minimist-cve-2021-44906.json cases/minimist-cve-2020-7598.json
```

```
CVE-2021-44906 (Function.prototype):  1.2.0 TRIGGERED · 1.2.5 TRIGGERED · 1.2.6 SAFE
CVE-2020-7598  (Object.prototype):    1.2.0 TRIGGERED · 1.2.3 SAFE      · 1.2.6 SAFE
```

Every row agrees three ways: the Docker build-and-run, the OSV record, and the
case's expected value. Note **1.2.5** — `CVE-2021-44906` is live while
`CVE-2020-7598` is already fixed: proof the two are distinct bugs, not one
restated. See `cases/README.md` to add your own.

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

### The embargo clock (accelerated)

The embargo countdown is a real mechanism, not a quoted date. `clock/clock.js`
compresses embargo-time into real-time via `CLOCK_SCALE` (embargo-days per real
second), so a 90-day embargo — and a silent vendor tripping an escalation — plays
out inside a short demo:

```bash
CLOCK_SCALE=1 node clock/clock.js init   # 90-day embargo in ~90s; 14-day silence window
node clock/clock.js notify               # vendor pinged -> silence timer starts
node clock/clock.js status               # live countdown + flags
# ... vendor stays quiet past the window ...
node clock/clock.js status               # -> flag SILENCE_EXCEEDED: Timekeeper escalates
node clock/clock.js ack                  # vendor responds -> silence cleared
```

The Timekeeper runs these as it drives the state machine (`init` on report,
`notify` on VENDOR_NOTIFIED, `ack` on a vendor reply, `status` for every
countdown). `SILENCE_EXCEEDED` makes it escalate; `DEADLINE_PASSED` forces the
coordinated lift — the same backstop `readiness.js` uses.

### Grounding — every claim checked against the public record

The Advisory agent never asserts a CVE ID or a version range from memory. It
looks them up in [OSV](https://osv.dev) (which aggregates GitHub Security
Advisories, NVD and others) and cross-checks the room's own Docker verdicts:

```bash
node osv/osv-lookup.js minimist          # both CVEs with exact affected/fixed ranges
node osv/osv-lookup.js minimist 1.2.5    # AFFECTED (1 advisory)  <- matches repro: TRIGGERED
node osv/osv-lookup.js minimist 1.2.6    # NOT AFFECTED           <- matches repro: SAFE
```

Two independent sources — a build-and-run of the vendor's real commit, and the
authoritative advisory database — have to agree. If they don't, the agent flags
the conflict for a human instead of picking one. (OSV also confirms the
incomplete-fix story on its own: at 1.2.5 only CVE-2021-44906 still applies,
because 1.2.5 had fixed CVE-2020-7598 but not its bypass.)

### Verifiable audit record — the room *is* the record, provably

`record/export-record.js` exports a room's history into a tamper-evident record:
every message is an entry hash-chained to the one before it, with the state
timeline and the final advisory extracted alongside. Publish the head hash next
to the advisory, and anyone can re-verify the whole trail:

```bash
node record/export-record.js verify record/embargo-minimist-demo.record.json
# VERIFIED  64 entries, chain intact — head f8f0152af0469112…
```

The records of the real run (parent + the three Layer B rooms) are committed in
`record/`. Change one word — say, rewrite repro's `INCOMPLETE_FIX` as
`VERIFIED_FIXED` — and verification fails at that exact entry. Nobody can
quietly rewrite "the fix didn't work." (Export a live room with
`MM_TOKEN=… node record/export-record.js export switch/<channel>`.)

### 2. Run the full room

1. Install Switch Console + Docker; run the Switch quickstart.
2. Load `embargo-room.template.yaml` in Console (provider = `claude`; Console
   prompts for the machine, the bundled Mattermost, and the vendor handle).
3. Paste `demo/seed-report.md` into the room as the researcher.
4. Watch the agents work through the state machine, including the
   `INCOMPLETE_FIX` loop, up to the human sign-off gate.

## Proven end-to-end (live run)

This isn't a mockup. The full disclosure was run live in a Switch room — two
humans (researcher + vendor) and the three agents — and walked the **entire**
state machine to a published advisory. Every verdict came from an agent building
a **real vendor commit in Docker** and running the PoC against it, with no network:

```
REPORTED → REPRODUCED → VENDOR_NOTIFIED → PATCH_SUBMITTED
  → INCOMPLETE_FIX    (v1.2.5 built from source — still TRIGGERED)
  → PATCH_SUBMITTED → VERIFIED_FIXED    (v1.2.6 built from source — SAFE)
  → ADVISORY_DRAFTED → SIGNED_OFF → PUBLISHED
```

- **embargo-repro** confirmed 1.2.0 TRIGGERED, caught `v1.2.5` as still TRIGGERED
  (the incomplete fix), then verified `v1.2.6` SAFE — trusting only its own runs.
- **embargo-timekeeper** held the 90-day embargo clock, logged every transition,
  ran the Layer B dependency checks, and gated PUBLISHED on `readiness.js`.
- **embargo-advisory** drafted **CVE-2021-44906** (affected ≤ 1.2.5, fixed 1.2.6,
  CVSS 5.6) — and when told to publish, *dropped wording that hadn't been signed
  off*, refusing to put unapproved text in the public record.
- The three agents together proved a downstream (`optimist`) was genuinely
  exposed, by building `minimist@0.0.10` and running the PoC against it.

The room's message history **is** the disclosure's audit trail.

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
