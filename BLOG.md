# The fix that didn't fix: running a CVE disclosure with AI agents in one shared room

Here's a thing about security that nobody puts on a slide: in coordinated vulnerability disclosure, the patch almost always exists. What breaks is the *choreography* around it — and often enough, the "fix" the vendor ships doesn't actually fix the bug.

I built a project for the Flip the Switch hackathon that goes straight at that failure mode. It's called **Embargo Room**, and the short version is: a single [Switch](https://switchagents.ai) room runs a whole disclosure from first report to published advisory, with three AI agents doing the clock-keeping, the verification, and the drafting — and two humans holding the only two decisions that must stay human.

The longer version is more fun, because when I actually ran it, one of the agents caught a real incomplete fix from the real CVE history. Live. Let me walk you through it.

## Disclosure is a coordination problem, not a code problem

Coordinated disclosure is a bunch of people who don't fully trust each other, racing a clock, trying to agree on one story. A researcher finds a bug. A vendor has to acknowledge it, fix it, and prove the fix works. Downstream projects that depend on the vulnerable package need to patch too — ideally *before* the world finds out. And there's an embargo deadline hanging over all of it.

Today this runs on email threads and DMs. The predictable failures:

- **Embargo deadlines slip** because nobody's authoritatively holding the clock.
- **Vendors go silent** and there's no shared record that they were even pinged.
- **Downstream dependents never find out** until they read the public advisory like everyone else.
- **The fix doesn't fix it.** The vendor patches, says "done," and everyone believes them — because re-deriving the exploit against the new build is tedious, so nobody does.

Every one of those is a *coordination* breakdown. The technical fix usually exists. The glue around it is what fails.

## Why this is a Switch room, structurally

Here's the insight the whole project rests on. Disclosure is **mutually distrusting parties who must share exactly one timeline and one set of evidence, while agents act on that same shared state.**

Read that again and it's a description of a Switch room. One persistent, shared space. Multiple humans *and* multiple agents, all reading and writing the same history, with per-party addressing rules and handoffs by name.

This matters because it's the difference between "we used an AI tool" and "this collapses without the platform." If you tried to build Embargo Room as point-to-point chatbots, you'd get three disconnected bots and five separate inboxes — which is exactly the broken status quo it replaces. There's no shared timeline for an email thread. There's no agent that can watch the vendor's message *and* the researcher's message *and* its own verification run, all in one place, and act on the combination. The room **is** the mechanism.

## One room, two humans, three agents

The cast:

- **`embargo-timekeeper`** (addressing: anyone) — the neutral coordinator. Owns the embargo clock, runs the state machine, logs every transition as a dated line, chases silence, and decides when a coordinated publish is actually safe. It never judges the bug and never writes code.
- **`embargo-repro`** (addressing: owner-agents) — runs the proof-of-concept in Docker against real builds. Its one rule: **trust only its own run, never the vendor's claim.**
- **`embargo-advisory`** (addressing: owner-agents) — drafts the CVE advisory from the room's own history, marking anything uncertain for a human.

And the two decisions that stay human, full stop: **the vendor's sign-off** and **the researcher's go-to-publish.** The agents gather evidence and hold the clock. Humans make the trust calls.

## The technical core, honestly

The bug is real and the history is real. It's a prototype-pollution vulnerability in [`minimist`](https://www.npmjs.com/package/minimist), the argument parser (CVE-2020-7598 / CVE-2021-44906). The vector:

```
--x.constructor.constructor.prototype.polluted yes
```

That walks the constructor chain all the way up to `Function.prototype` and writes a property there — which every function in the process then inherits. The PoC checks `(function(){}).polluted` afterward.

What makes minimist perfect for this demo is its actual version history:

- **1.2.0** — vulnerable.
- **1.2.5** — the *incomplete* fix. It guarded `__proto__` and the `Object` / `Number` / `String` / `Array` prototypes… but missed `Function.prototype`. So the bug above still works.
- **1.2.6** — the real fix.

The harness (`verify.sh` / `verify-ref.sh`) doesn't rely on pre-pinned versions. Given a repo URL and a git ref, it **clones that exact commit, builds it from source in Docker, and runs the PoC with `--network none`:**

```bash
./verify-ref.sh --repo https://github.com/minimistjs/minimist --ref v1.2.5
# builds v1.2.5 from source, runs the PoC offline -> TRIGGERED
```

That turns the project from a historical replay into a live patch verifier. The agent isn't reading a CVE database; it's compiling the vendor's code and attacking it.

To be clear about what's off-the-shelf: `minimist`, the CVEs, and Switch itself are pre-existing. The room, the three agents' instructions, the harness, and the workflow were all built during the event.

## The moment it earned its keep

I ran the whole thing live. Researcher files the report. `embargo-timekeeper` restates it, opens a 90-day embargo, and pings `embargo-repro`. Repro builds minimist 1.2.0, fires the PoC, posts `REPRODUCED` with the real output. State advances.

Then the vendor "ships the fix": **v1.2.5.**

`embargo-repro` built that exact GitHub commit from source and ran the PoC against it:

```
>>> building https://github.com/minimistjs/minimist @ v1.2.5 ...
>>> running PoC (no network) ...
RESULT: TRIGGERED  Function.prototype.polluted === "yes"
  minimist: 1.2.5  (/app/pkg)
EXIT=0
```

Still triggered. The agent posted **`INCOMPLETE_FIX`**, and the timekeeper *refused to advance to VERIFIED_FIXED* and kept the clock running. The vendor then submitted **v1.2.6**, repro rebuilt it — `SAFE` — and only then did the case move to `VERIFIED_FIXED`.

That's the whole pitch in one beat. A "trust the vendor's word" process marks v1.2.5 as fixed and ships it to users. An agent that builds the actual commit and re-runs the exploit catches the gap. No fabrication — it's the genuine 1.2.5 source with the genuine missed `Function.prototype` guard.

## Two more things the agents did that I didn't script

**They found a downstream that was actually exposed.** When the advisory agent drafted the writeup, it noticed that a dependent, `optimist`, pins minimist at `~0.0.1` — which resolves to minimist **0.0.10**. It flagged that the exposure might be real rather than theoretical. The timekeeper picked that up, ordered a verification, and `embargo-repro` built `minimist@0.0.10` and confirmed: **TRIGGERED.** Three agents collaborating to chase down a nuance a tired human would've hand-waved.

**An agent refused to publish unapproved text.** At publish time, the advisory agent noticed its latest draft contained wording that hadn't been through human sign-off, and it *dropped that wording* rather than ship it, keeping the published record byte-for-byte to what the humans approved. Governance you can watch happen, not a bullet point.

## Layer B: nobody publishes alone

A library bug is a bug in everything that depends on it. Layer B models that as one parent room plus a child room per confirmed dependent, with the same `embargo-timekeeper` present in all of them — Switch's "one agent, many rooms" doing exactly what it's for.

The readiness rule is the whole value in one function:

```
READY  if  every downstream is resolved (patched | wont-fix | unreachable)
READY  if  the deadline has passed            (forced lift; names who's unresolved)
HOLD   otherwise                              (names who we're waiting on)
```

A coordinated embargo lift that is neither premature (exposing unpatched dependents) nor indefinite (held hostage to one silent maintainer). In the live run: `rc` and `subarg` patched, `optimist` marked wont-fix (it's unmaintained) → **READY** → coordinated publish.

## The whole machine, and why the room matters

Here's the state machine that actually executed, end to end:

```
REPORTED → REPRODUCED → VENDOR_NOTIFIED → PATCH_SUBMITTED
  → INCOMPLETE_FIX    (v1.2.5 built from source — still TRIGGERED)
  → PATCH_SUBMITTED → VERIFIED_FIXED    (v1.2.6 built from source — SAFE)
  → ADVISORY_DRAFTED → SIGNED_OFF → PUBLISHED
```

The published artifact: **CVE-2021-44906**, affected ≤ 1.2.5, fixed 1.2.6, CVSS 5.6 Medium.

And this is the part email threads and disconnected bots can never give you: **the room's message history *is* the disclosure's audit trail.** Every handoff, every verification with its real output, every incomplete fix, every human sign-off — in one shared, persistent, append-only place that the researcher, the vendor, and all three agents saw the same way. That shared state isn't a nice-to-have bolted onto the workflow. It's the thing that makes the workflow possible.

---

*Embargo Room is open and reproducible — the README has run-it-yourself steps (you can verify the incomplete fix in about 15 seconds, no Switch required).*
