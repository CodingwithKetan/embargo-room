# Layer C — coordinated public disclosure

Layer A verifies the upstream fix (build the vendor's real commit); Layer B
coordinates the downstreams; **Layer C turns the room's verified record into the
public advisory the ecosystem actually consumes.** It is the capstone: report →
reproduce → fix → verify → coordinate → *publish, correctly, to the world*.

## What it emits

When a disclosure reaches PUBLISHED, `publish/emit-advisory.js` reads the
hash-chained record (`record/*.record.json`) and emits, for the CVE:

- `<cve>.osv.json` — **OSV schema** (what osv.dev and the GitHub Advisory DB ingest)
- `<cve>.cve.json` — **CVE Record Format 5.0** (the official CVE record, CNA container)
- `<cve>.advisory.md` — a human-readable **GHSA-style** writeup
- `<cve>.checklist.md` — where to publish + the **Layer B downstream notifications**

Every artifact carries the record's **head hash**, so anyone can trace the public
advisory back to the verified disclosure trail that produced it.

```bash
node publish/emit-advisory.js record/embargo-minimist-demo.record.json --state downstream/state.json
node publish/emit-advisory.js --validate record/embargo-minimist-demo.record.json
# VALIDATED: our emitted advisory matches the authoritative OSV record.
```

## Grounded, not asserted

`--validate` compares the emitted OSV against the authoritative record on osv.dev
— the CVE id/alias and the fixed version (a multi-line CVE has several fixes, and
ours must be one of them). The pipeline does not just produce *an* advisory; it
produces one that matches what the ecosystem publishes.

## Still Switch-central

The advisory is emitted **from the room's shared, verified history** — the same
record Layer A and Layer B built. The room's message history becomes the public
record, and the checklist routes notifications back to the Layer B downstream
rooms. Remove the shared room and there is no single verified source to publish
from — only scattered claims.
