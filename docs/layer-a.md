# Layer A — verify the vendor's real patch

The core harness runs the PoC against *pinned* minimist versions (the three
`docker/Dockerfile.{vulnerable,bad-patch,patched}` targets). Layer A goes further:
it verifies the vendor's **actual commit, built from source**, so a patch is
confirmed against the real code — not against a package version anyone could
mislabel. The agent trusts only its own build.

## How

`verify-ref.sh --repo <url> --ref <sha|tag|branch>` clones that exact ref, builds
it from source in Docker, and runs the PoC with `--network none`:

```bash
./verify-ref.sh --repo https://github.com/minimistjs/minimist --ref v1.2.5  # TRIGGERED (incomplete fix)
./verify-ref.sh --repo https://github.com/minimistjs/minimist --ref v1.2.6  # SAFE (real fix)
# Docker-free twin: ./verify-ref-local.sh --repo <url> --ref <ref>
```

The clone happens at image-build time; the PoC runs offline. Exit 0 = TRIGGERED,
1 = SAFE, 2 = error — so the verdict is mechanical, and the agent reports the
commit it actually built.

## Why it matters — the incomplete fix

This is what catches a "fix" that doesn't fix. The vendor submits **v1.2.5**;
`embargo-repro` builds that commit from source and the PoC **still triggers** →
`INCOMPLETE_FIX`, and the timekeeper refuses to advance. A "trust the vendor's
word" process ships v1.2.5 to users; Layer A catches it, every time, from the
vendor's own code.

## Security

Only repositories on `security/repo-allowlist.txt` are built, so a compromised
room can't make the agent clone and run hostile code; dependencies install with
`--ignore-scripts`; the PoC runs `--network none` with dropped capabilities and
pid/memory limits. Full threat model: [`../SECURITY.md`](../SECURITY.md).

This feeds the rest of the pipeline: Layer A's verdict is what moves the case to
`VERIFIED_FIXED`, is attested by [Layer D](layer-d.md), and is cross-checked
against OSV before the advisory is emitted by [Layer C](layer-c.md).
