# Security desk (portfolio view)

Most of Embargo Room zooms into one disclosure. The **security desk** zooms out
to how a team runs the whole program — the view a security lead actually works
from.

```bash
npm run portfolio                 # the desk in the terminal
npm run dashboard                 # then open http://localhost:7070/desk
```

Three bands, one queue:

1. **Monitoring radar** — what auto-mode watches (`watch/watch-config.json`) and
   the human-gated policy (propose, not act).
2. **Active / closed disclosures** — each real disclosure with its status, **SLA
   grade**, cycle time, incomplete-fixes caught, and **estimated cost** (from the
   scorecard + cost models).
3. **Downstream coordination** — every dependent's status against the shared
   embargo deadline.

Plus a rollup: disclosures published, **SLA adherence %**, program cost, and
downstreams resolved.

It aggregates only committed, on-disk truth — `record/*.record.json`,
`downstream/state.json`, `watch/watch-config.json` — so it scales to N
disclosures with no extra wiring: drop in more records and the desk fills.

**Why it matters:** it reframes the project from "a clever tool for one bug" to
"the desk a security team runs" — discovery through coordinated publication,
measured and costed. That's the business workflow, end to end.
