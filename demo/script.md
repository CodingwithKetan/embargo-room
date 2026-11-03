# 3-minute demo script

Accelerated clock on (CLOCK_SCALE). One take.

| Time | Beat | On screen |
| --- | --- | --- |
| 0:00 | The room | Mattermost channel `embargo-minimist-demo`; members: you (researcher), vendor handle, 3 agents |
| 0:20 | Report | Paste demo/seed-report.md. Timekeeper restates, opens 90-day embargo (accelerated), pings Repro |
| 0:50 | Reproduced | Repro runs `verify.sh --target vulnerable` -> TRIGGERED output in room; state REPRODUCED |
| 1:20 | Silence -> escalation | Clock jumps; Timekeeper escalates unacknowledged report to vendor |
| 1:35 | MIC-DROP | Vendor submits bad-patch (1.2.5). Repro -> still TRIGGERED -> INCOMPLETE_FIX. Clock keeps running. HOLD 1s. |
| 2:10 | Real fix | Vendor submits patched (1.2.6). Repro -> VERIFIED_FIXED. Advisory agent drafts advisory |
| 2:35 | Human gate | Both humans redline; vendor signs off; researcher posts go-to-publish; Timekeeper stamps timeline |
| 2:50 | Close | Show exported room log: "this log IS the disclosure record" |

The INCOMPLETE_FIX beat at ~1:40 is the whole pitch. Everything else is setup.
