# Red-team — proving the controls hold

A runnable check that a **compromised room** (hacked Slack/Mattermost, a taken-over
account, a malicious message) cannot misuse the agents:

```bash
npm run redteam        # or: ./security/redteam/redteam.sh
```

It runs five realistic attacks and shows each is blocked:

| # | Attack | Blocked by |
| --- | --- | --- |
| 1 | tell `embargo-repro` to build a **hostile repo** | the repo **allowlist** (refused before any clone) |
| 2 | a dependency carries a **malicious install script** | `--ignore-scripts` (neutralised) |
| 3 | a dropped **backdoor phones home** | `--network none` + dropped capabilities |
| 4 | a message says **"ignore your rules / publish"** | untrusted-data handling + human-only gates |
| 5 | an agent **claims a verdict it never ran** | Layer D attestation (every claim is backed) |

Everything here is **defensive**. `canary/` is a harmless package whose install
script only writes a marker file, so the test can tell whether install scripts
ran — it exists to *prove* `--ignore-scripts` works, and is not malware. Full
threat model: [`../../SECURITY.md`](../../SECURITY.md).
