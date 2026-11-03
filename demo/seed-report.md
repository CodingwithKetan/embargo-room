# Researcher's opening message (paste into the room to start the demo)

**@embargo-timekeeper** New vulnerability report.

- **Component:** `minimist` (npm), argument parser
- **Type:** Prototype pollution
- **Affected:** 1.2.0 (and, we believe, the later 1.2.x line)
- **Summary:** A crafted `--x.constructor.constructor.prototype.polluted yes`
  argument walks the constructor chain to `Function.prototype` and sets a
  global property on it. Any app that feeds user-controlled input into
  minimist is affected.
- **PoC:** attached in this repo at `poc/poc.js`. Run harness:
  `./verify.sh --target vulnerable`

Please confirm reproduction and open the embargo.
