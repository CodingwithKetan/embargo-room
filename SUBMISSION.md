# Embargo Room — submission

**Track 1 · Best Business Workflow** — Flip the Switch (WeMakeDevs × DevTools Academy × Switch)

**One line:** Coordinated vulnerability disclosure is a high-stakes business process run between companies that don't trust each other — Embargo Room runs that whole process in a single Switch room, where AI agents verify and keep the clock and the two trust decisions stay human.

**Demo video:** _(link)_ · **Run it:** `git clone … && npm test` → `ALL CHECKS PASS` (18/18, zero dependencies)

---

## The business problem

Every software vendor runs **coordinated vulnerability disclosure (CVD)** — the workflow from "a researcher reports a bug" to "a public advisory ships." It is a real business process with real money and legal exposure, and today it is run by hand across email threads, private forks, and spreadsheets:

- **The fix often doesn't fix.** Vendors ship a patch that *looks* done; it isn't. minimist's own history proves it — `1.2.5` was shipped as the fix and was **still vulnerable** (CVE-2021-44906). "Trust the vendor's word" ships that to users.
- **Embargoes get blown or run forever.** No neutral clock → either a party goes public early, or the bug sits in indefinite secrecy. Neither is acceptable.
- **Downstreams get forgotten.** A library bug exposes every dependent; coordinating them is manual and lossy.
- **Nobody trusts the record.** When it matters (legal, CNA, post-incident), "who knew what, when" is reconstructed from inboxes.

These are the costs a business feels: shipped-but-unfixed CVEs, blown embargoes, un-notified downstreams, and an audit trail that doesn't hold up.

## The solution

One **room per disclosure**: two humans (researcher, vendor) and three AI agents on one shared timeline.

- **Timekeeper** owns a real embargo clock and the state machine; escalates on silence, never allows indefinite secrecy.
- **Repro** reproduces the bug and, crucially, **builds the vendor's actual commit from source** and re-runs the exploit — so a patch is confirmed against real code, not a version label anyone can mislabel. This is what catches the incomplete fix, every time.
- **Advisory** drafts the CVE/advisory from the room's own history, grounded in the public OSV database, and flags any disagreement for a human.

The agents gather evidence and hold the clock. **Publishing and sign-off stay human.** Autonomous discovery, human-gated action.

## Why this *must* be a Switch room

This is the part that makes it a Switch project and not "three bots":

- The participants **mutually distrust** each other, yet must act on **one shared state** (the timeline, the evidence, the clock). That shared, multi-party, agent-acted state *is* a room.
- Remove Switch and you have disconnected bots and separate inboxes — exactly the broken status quo. One agent, many rooms (Switch's model) is also how the **same Timekeeper** coordinates a parent disclosure and every downstream child room at once.
- The disclosure is **bridge-agnostic**: it runs on Slack, Mattermost, Teams — and because the source of truth is a portable, hash-chained record (not the chat), a bridge outage **fails over** without stalling the disclosure.

## What's actually built (all real, all reproducible)

A full **A → B → C → D** pipeline, plus the operational layers around it:

- **A — verify the real fix:** build the vendor's commit from source in Docker; catch the incomplete fix (`v1.2.5` still triggers).
- **B — downstream coordination:** parent + child rooms, a readiness gate before anyone publishes.
- **C — public disclosure:** emit OSV + CVE Record 5.0 + GHSA, **validated against osv.dev**.
- **D — agent attestation:** every verdict backed by a tamper-evident, attested run (`ASSURED: 3/3`).
- **Auto-mode:** watches OSV for new CVEs and *proposes* — a human approves before any room opens.
- **Security:** it verifies other people's patches **and defends itself** — a runnable red-team blocks all 5 attacks (hostile repo, malicious dependency, backdoor callback, prompt-injection, faked verdict).
- **Tamper-evident record:** the room's history is a hash chain; change one word and verification breaks at that entry. The head hash is the citable fingerprint of the whole disclosure.
- **Local activity dashboard:** which agent did what, current status, and the failures it caught.

Proof it's real: two actual CVEs (CVE-2021-44906, CVE-2020-7598), real Docker builds of real vendor commits, OSV cross-checks, and a clean-clone self-check that prints `ALL CHECKS PASS` (18/18) with **zero dependencies**.

## The demo in one beat

The vendor submits the fix. The agent builds their **actual commit** and runs the exploit — **it still triggers**. The Timekeeper refuses to advance; the clock keeps running. A "trust the vendor" process ships that patch; Embargo Room catches it, from the vendor's own code — then confirms the real fix, grounds the advisory in OSV, takes two human sign-offs, and publishes.

## Stack

Node (zero dependencies), Docker (hardened: `--network none`, dropped caps, `--ignore-scripts`, pid/memory limits), the OSV database for grounding, SHA-256 hash-chained records, Switch for orchestration across chat bridges. Everything runs locally and reproduces from a clean clone.
