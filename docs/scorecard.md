# Disclosure scorecard (SLA / KPIs)

Coordinated disclosure is a business process, so it has SLAs and KPIs. The
scorecard turns a room's hash-chained record into the numbers a security lead
actually tracks — computed from the real transition timestamps, not entered by
hand.

```bash
npm run scorecard                               # the minimist disclosure
node scorecard/scorecard.js --json              # machine-readable
node scorecard/scorecard.js record/<other>.record.json
```

It also shows at the top of the local dashboard (`npm run dashboard`).

## What it measures

| Metric | From |
| --- | --- |
| Time to reproduce | REPORTED → first REPRODUCED verdict |
| Time to verified fix | REPORTED → VERIFIED_FIXED |
| Total cycle time | REPORTED → PUBLISHED |
| Patch cycles | number of patch submissions (incomplete fixes + the real one) |
| **Incomplete fixes caught** | INCOMPLETE_FIX verdicts — the money metric |
| Downstreams coordinated | resolved / tracked, from `downstream/state.json` |
| Attestation | tamper-evident runs backing the verdicts (`assure/`) |
| Embargo deadline | published before the 90-day backstop? |
| **Grade** | `MEETS SLA` when published before the deadline |

Every number traces to the record, so the scorecard is as trustworthy as the
hash chain it's built on — you can't improve a metric without changing the
record, and changing the record breaks `record:verify`.
