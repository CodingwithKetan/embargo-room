# Embargo Room — documentation

Start here. Every doc describes something you can actually run.

## Orientation
- [**architecture.md**](architecture.md) — participants, state machine, the full-stack index.
- [**diagrams.md**](diagrams.md) — the full visual gallery (system, pipeline, sequence, trust chain, auto-mode, bridges).
- [`../SUBMISSION.md`](../SUBMISSION.md) — the one-page pitch (problem → why Switch → what's built).

## The pipeline (A → B → C → D)
- [**layer-a.md**](layer-a.md) — verify the vendor's *real* commit, built from source (the incomplete-fix catch).
- [**layer-b.md**](layer-b.md) — downstream coordination across rooms; the readiness gate.
- [**layer-c.md**](layer-c.md) — emit the public advisory (OSV + CVE 5.0 + GHSA), validated vs OSV.
- [**layer-d.md**](layer-d.md) — attest the agent's work; verdicts backed by tamper-evident runs.

## Operating it
- [**watch-mode.md**](watch-mode.md) — auto-mode: watch OSV, propose, wait for a human.
- [**bridges.md**](bridges.md) — bridge-agnostic resilience and failover.
- [`../SECURITY.md`](../SECURITY.md) — threat model, sandboxing, the runnable red-team.

## Management views (derived from the record)
- [**scorecard.md**](scorecard.md) — SLA / KPIs (`npm run scorecard`).
- [**cost.md**](cost.md) — per-agent cost tracker (`npm run cost`).
- [**portfolio.md**](portfolio.md) — the security desk / portfolio (`/desk`).
- [**dashboard.md**](dashboard.md) — the local dashboard, the `/ops` replay, and the `/desk` view (`npm run dashboard`).

## Demo
- [`../demo/record-live.md`](../demo/record-live.md) — the recording run-of-show.
- [`../demo/narration.md`](../demo/narration.md) — the word-for-word, timed script.
- [`../demo/pitch.md`](../demo/pitch.md) — the 45-second open + close.
