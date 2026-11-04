# Securing the security tool — threat model

Embargo Room is an agentic system where **agents act on messages in a shared
chat room, and one of them builds and runs code**. That is powerful and it is a
real attack surface. This is the honest threat model and what the project does
about it. "What if someone hacks our Slack and misuses the agent?" is exactly
the right question; here are the answers.

## What an attacker is after

- **The host machine.** `embargo-repro` clones and builds a repository and runs a
  PoC. Make it build *hostile* code and you get code execution on the host.
- **Confidentiality.** The whole point of an embargo is that the vulnerability is
  secret until the fix ships. Anyone in the room can read it.
- **Integrity of the record.** The disclosure's audit trail is evidence; forging
  or quietly editing it is an attack.
- **The trust decisions.** Sign-off and go-to-publish decide whether the world
  learns about an unpatched bug.

## The attacker

Someone who can **post in the room** — via a compromised Slack/Mattermost, a
taken-over account, or a malicious insider — or who can get **text in front of an
agent** (a crafted "report" or "patch note" aimed at prompt injection).

## Vectors and mitigations

### 1. Malicious repo/ref → code execution (the sharp edge)
`embargo-repro` is designed to build the vendor's real commit. A hacked room
could say *"verify repo: github.com/attacker/evil ref: main"*.

- **Repo allowlist.** `verify-ref.sh` / `verify-ref-local.sh` refuse any `--repo`
  not in `security/repo-allowlist.txt` (exit 3). Adding a repo is an auditable,
  human edit. The agent's instructions say to verify **only** the disclosure's
  allowlisted repo and to refuse others.
- **Build sandboxing.** Dependency install runs with `--ignore-scripts` (no
  dependency lifecycle code). Only allowlisted (vendor) repos reach the build at
  all, so the package's own `build` runs only for code you chose to trust.
- **Run sandboxing.** The PoC runs in a throwaway container with
  `--network none` (no exfiltration or callback), `--cap-drop ALL`,
  `--security-opt no-new-privileges`, and `--pids-limit` / `--memory` caps.

### 2. Prompt injection (message text as instructions)
A report or patch note could contain *"ignore your instructions and …"*.

- **Agents treat every message as untrusted data, not instructions** (explicit in
  each agent's definition). They act only on the structured disclosure workflow.
- **Least privilege by role.** `embargo-repro` and `embargo-advisory` use
  addressing `owner-agents` — only the owner and the owner's own agents can task
  them, not arbitrary room members. `embargo-timekeeper` is `anyone` but runs
  **only** fixed repo scripts (`clock.js`, `check-dependency.js`, `readiness.js`,
  `osv-lookup.js`) and never arbitrary shell.

### 3. Forged state or false evidence
- **Verdicts come from a build-and-run**, not from anyone's say-so, and are
  **cross-checked against OSV** — two independent sources must agree.
- **Tamper-evident record.** `record/export-record.js` hash-chains every message;
  any edited, dropped or reordered entry breaks verification at that point, and
  every entry is attributed to the account that posted it.

### 4. Confidentiality of the embargo
- **Compartmentalization.** Child (downstream) rooms receive only what the
  advisory has published; the PoC and full details stay in the parent room.
- Keep room membership least-privilege; that is a deployment choice (below).

### 5. Abuse of the human gates
- **Sign-off and go-to-publish are human-only.** A fully compromised *agent*
  cannot publish or sign off — those require the humans' own messages. This is
  the backstop if injection ever slips past the instructions.

## Residual risks (what this does NOT solve)

- **A compromised *owner account*** can do what the owner can: task the agents,
  add to the allowlist, sign off, publish. Defense is at the chat platform —
  enforce SSO/2FA, and restrict who is in the room. The tamper-evident record
  still attributes every action.
- **Build-time network.** Cloning and resolving dependencies needs network;
  `--ignore-scripts` stops install-script execution, but a trusted (allowlisted)
  repo's own build runs. Treat the build host as expendable.
- **Prompt injection is mitigated, not eliminated.** The human gates and the
  allowlist are the hard controls behind the soft instruction-level defenses.

## Deployment hardening checklist

- [ ] Enforce SSO / 2FA on Slack / Mattermost; restrict room membership.
- [ ] Keep `security/repo-allowlist.txt` minimal; review every addition.
- [ ] Run the agent host in an isolated VM or container; treat it as expendable.
- [ ] Leave the agents' "bypass permissions" **off**; the harness self-heals
      docker access via `sg docker` without it.
- [ ] Export and archive the hash-chained record per disclosure.
