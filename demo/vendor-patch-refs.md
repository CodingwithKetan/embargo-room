# Vendor patch messages (Layer A — real git refs)

## Incomplete fix (the mic-drop)
**@embargo-timekeeper** Patch submitted. Please verify.
- repo: https://github.com/minimistjs/minimist
- ref: v1.2.5
(Repro will run: ./verify-ref.sh --repo https://github.com/minimistjs/minimist --ref v1.2.5
 -> still TRIGGERED -> INCOMPLETE_FIX, clock keeps running.)

## Real fix
**@embargo-timekeeper** New patch. Please re-verify.
- repo: https://github.com/minimistjs/minimist
- ref: v1.2.6
(Repro runs the same harness -> SAFE -> VERIFIED_FIXED.)
