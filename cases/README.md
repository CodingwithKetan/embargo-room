# Disclosure cases

A *case* makes Embargo Room's verification pluggable: a new vulnerability is
added as **data, not code**. The runner (`cases/run.js`) builds each pinned
version in Docker, runs the case's PoC offline (`--network none`), and
cross-checks every verdict against the public OSV advisory database — two
independent sources that must agree.

## Run

```bash
node cases/run.js cases/<case>.json [...]   # exit 0 if every verdict agrees with OSV + the expected value
```

(If the docker group isn't active in your shell, the runner re-runs docker under
`sg docker` automatically — same self-heal as `verify.sh`.)

## Add a case

1. **PoC** at `cases/pocs/<name>.js` (or reuse `poc/poc.js`). Contract: load the
   package (optional `argv[2]` = a checkout path), exercise the input, and exit
   `0 = TRIGGERED` (affected) / `1 = SAFE` / `2 = error`. Keep it a *verification
   check* against an already-public, already-patched CVE.
2. **Metadata** at `cases/<id>.json`:
   ```json
   {
     "id": "...", "cve": "CVE-...", "osv": "GHSA-...",
     "package": "...", "ecosystem": "npm",
     "class": "short human description of the bug class",
     "poc": "cases/pocs/<name>.js", "fixedVersion": "x.y.z",
     "repo": "https://...", "refs": { "realFix": "vX.Y.Z" },
     "versionsUnderTest": { "x.y.z": "TRIGGERED", "x.y.z": "SAFE" }
   }
   ```
3. **Run it.** The runner fails the case if the PoC verdict, OSV's record for
   that CVE, or the expected value disagree on any version.

## Shipped cases

- `minimist-cve-2021-44906.json` — Function.prototype via the constructor chain; fixed 1.2.6.
- `minimist-cve-2020-7598.json` — Object.prototype via `__proto__` (the earlier, distinct bug); fixed 1.2.3.

Both are real, public, long-patched CVEs, used here only as patch-verification
fixtures. At minimist 1.2.5 the first is live and the second already fixed —
proof they are two distinct bugs, not one restated. The same case shape works
for any npm package.
