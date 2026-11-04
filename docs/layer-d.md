# Layer D — agent work attestation (assurance)

Layers A–C take a trust-but-verify posture toward the **vendor**. Layer D takes
the same posture toward the **agent**: it gives surety that the agent actually did
the work it claims, rather than hallucinating a transcript. "Did the AI really do
that, or make it up?" is the core doubt about agentic systems — Layer D answers it
with evidence.

## How it works

The Repro agent runs its verifications through `assure/attest.js`, a transparent
wrapper that passes the command's output and exit code straight through while
recording a tamper-evident **attestation** of the real run — the command, its
exit code (which is the verdict), a hash of its output, and when — to an
append-only, hash-chained log (`assure/attestations.jsonl`). The log is
HMAC-signed when `EMBARGO_ATTEST_KEY` is set.

```bash
node assure/attest.js "verify-ref v1.2.5" -- ./verify-ref.sh --repo <url> --ref v1.2.5
# ... real output ...
# [attested #4 TRIGGERED exit=0 331bbff8082f…]
```

## The assurance

`assure/verify-work.js` confirms the chain is intact and cross-checks the room's
**claimed** verdicts against the **attested** runs:

```bash
node assure/verify-work.js --against record/embargo-minimist-demo.record.json
# VERIFIED: attestation chain intact — 5 attested runs
# ✓ REPRODUCED      ← attested #1 "verify vulnerable"
# ✓ INCOMPLETE_FIX  ← attested #4 "verify-ref v1.2.5"
# ✓ VERIFIED_FIXED  ← attested #5 "verify-ref v1.2.6"
# ASSURED: the agent did the work it claimed.  (3/3 verdicts backed)
```

Every `TRIGGERED` / `SAFE` the agent posted maps to an actual attested execution.
A hallucinated verdict would have **nothing** backing it, and any edit to the log
breaks the chain. Now two independent records must agree: the room's hash-chained
history (what was *said*) and the attestation log (what was actually *run*).

## Where it sits

- `record/export-record.js` — the room's messages weren't altered.
- `assure/` (Layer D) — the agent's claims came from real executions.

Together they make the agent's work auditable end to end, the same way the agent
makes the vendor's patch auditable.
