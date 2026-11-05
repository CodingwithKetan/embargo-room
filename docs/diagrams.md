# Diagrams

Every diagram here renders on GitHub (Mermaid). They describe the real system —
the same components you run with `npm test`, `npm run dashboard` and the room.

- [1. System architecture](#1-system-architecture)
- [2. The A → B → C → D pipeline](#2-the-a--b--c--d-pipeline)
- [3. Disclosure sequence (report → published)](#3-disclosure-sequence-report--published)
- [4. State machine](#4-state-machine)
- [5. Trust & tamper-evidence](#5-trust--tamper-evidence)
- [6. Auto-mode — autonomous discovery, human-gated action](#6-auto-mode--autonomous-discovery-human-gated-action)
- [7. Bridge-agnostic failover](#7-bridge-agnostic-failover)
- [8. From record to business outputs](#8-from-record-to-business-outputs)

---

## 1. System architecture

One Switch room per disclosure: two humans and three agents on one shared
timeline, with a watch agent feeding new work in. The chat bridge is replaceable;
the disclosure's truth is the on-disk record + state.

```mermaid
flowchart TB
    subgraph Humans
        R["Researcher (human)"]
        V["Vendor maintainer (human)"]
    end

    subgraph Room["Switch room — one disclosure"]
        TK["embargo-timekeeper<br/>clock + state machine"]
        RP["embargo-repro<br/>builds & runs the PoC"]
        AD["embargo-advisory<br/>drafts the advisory"]
    end

    WT["embargo-watch<br/>auto-mode scout"]

    subgraph Bridges["Chat bridge (replaceable)"]
        SL["Slack (primary)"]
        MM["Mattermost (fallback)"]
    end

    subgraph Truth["Source of truth (on disk)"]
        REC["record/*.record.json<br/>hash-chained"]
        DS["downstream/state.json"]
        AT["assure/attestations.jsonl"]
    end

    OSV["osv.dev<br/>public advisory DB"]
    DOCK["Docker<br/>hardened sandbox"]

    R <--> Room
    V <--> Room
    WT -. proposes new CVEs .-> R
    Room <--> Bridges
    RP --> DOCK
    RP --> AT
    TK --> DS
    AD --> OSV
    RP --> OSV
    Room --> REC

    REC --> DASH["dashboards /<br/>scorecard / cost / report / desk"]
```

---

## 2. The A → B → C → D pipeline

Trust-but-verify, applied to the vendor *and* the agent.

```mermaid
flowchart LR
    A["A · Verify the real fix<br/>build the vendor's commit from source"] -->
    B["B · Downstream coordination<br/>parent + child rooms, readiness gate"] -->
    C["C · Public disclosure<br/>OSV + CVE 5.0 + GHSA, validated vs OSV"] -->
    D["D · Agent attestation<br/>every verdict backed by a tamper-evident run"]
```

---

## 3. Disclosure sequence (report → published)

The incomplete-fix loop is the heart of it: the agent builds the vendor's *actual
commit* and it still triggers, so the Timekeeper refuses to advance.

```mermaid
sequenceDiagram
    actor R as Researcher
    participant TK as Timekeeper
    participant RP as Repro
    actor V as Vendor
    participant AD as Advisory

    R->>TK: file report + PoC
    TK->>RP: @repro confirm
    RP->>RP: verify.sh (Docker) → TRIGGERED
    RP-->>TK: REPRODUCED
    TK->>V: VENDOR_NOTIFIED (clock running)
    V->>TK: patch v1.2.5
    TK->>RP: verify the real commit
    RP->>RP: build v1.2.5 from source → STILL TRIGGERED
    RP-->>TK: INCOMPLETE_FIX
    Note over TK: refuses to advance — clock keeps running
    V->>TK: patch v1.2.6
    RP->>RP: build v1.2.6 from source → SAFE
    RP-->>TK: VERIFIED_FIXED
    TK->>AD: draft the advisory
    AD->>AD: ground in OSV (two sources must agree)
    AD-->>R: DRAFT (redline)
    R->>TK: sign-off (human gate)
    V->>TK: sign-off (relayed, human gate)
    TK->>TK: readiness READY → PUBLISHED
```

---

## 4. State machine

```mermaid
stateDiagram-v2
    [*] --> REPORTED
    REPORTED --> REPRODUCED: repro builds & runs the PoC
    REPRODUCED --> VENDOR_NOTIFIED
    VENDOR_NOTIFIED --> PATCH_SUBMITTED: vendor ships a fix
    PATCH_SUBMITTED --> PATCH_SUBMITTED: INCOMPLETE_FIX — built from source, still TRIGGERED
    PATCH_SUBMITTED --> VERIFIED_FIXED: repro builds the ref → SAFE
    VERIFIED_FIXED --> ADVISORY_DRAFTED: grounded in OSV
    ADVISORY_DRAFTED --> SIGNED_OFF: both humans sign off
    SIGNED_OFF --> PUBLISHED: readiness READY + go-to-publish
    PUBLISHED --> [*]
```

---

## 5. Trust & tamper-evidence

Two independent sources must agree, every verdict is attested, and the whole
history is a hash chain that a single edit breaks.

```mermaid
flowchart TB
    BUILD["Repro builds vendor's commit<br/>in Docker"] --> VERDICT["verdict<br/>TRIGGERED / SAFE"]
    OSV["osv.dev"] --> AGREE{"two sources<br/>agree?"}
    VERDICT --> AGREE
    AGREE -- no --> HUMAN["[NEEDS HUMAN]"]
    AGREE -- yes --> ATT["attestation<br/>(stdout hash + exit code)"]
    ATT --> CHAIN["hash-chained record<br/>entry = sha256(prev + entry)"]
    CHAIN --> HEAD["head hash<br/>= disclosure fingerprint"]
    HEAD --> SIG["signs the report;<br/>edit anything → record:verify FAILS"]
```

---

## 6. Auto-mode — autonomous discovery, human-gated action

The agent discovers on its own; every consequential action waits for a human.

```mermaid
flowchart LR
    WATCH["watch OSV<br/>(watchlist)"] --> NEW{"new CVE<br/>≥ min_cvss?"}
    NEW -- no --> WATCH
    NEW -- yes --> PROPOSE["PROPOSE to humans<br/>(never acts)"]
    PROPOSE --> G1{"human approves<br/>open room?"}
    G1 -- no --> WATCH
    G1 -- yes --> ROOM["open disclosure room"]
    ROOM --> G2{"human approves<br/>build/run?"}
    G2 -- yes --> RUN["repro builds & runs"]
    G2 -- no --> HOLD["hold"]
```

---

## 7. Bridge-agnostic failover

The disclosure's truth is the portable record, not the chat platform.

```mermaid
flowchart LR
    ROOM["disclosure room"] --> PICK{"first enabled<br/>+ reachable"}
    PICK --> SLACK["Slack (primary)"]
    PICK -. Slack down/overloaded .-> MM["Mattermost (fallback)"]
    SLACK --> REC["portable record<br/>(head hash unchanged)"]
    MM --> REC
    REC --> RESUME["re-point to any bridge<br/>→ disclosure continues"]
```

---

## 8. From record to business outputs

One hash-chained record; every management view is derived from it, so nothing is
hand-maintained.

```mermaid
flowchart LR
    REC["record/*.record.json"] --> SC["Scorecard<br/>SLA / KPIs"]
    REC --> COST["Cost tracker<br/>per agent"]
    REC --> REP["Disclosure report<br/>(PDF)"]
    REC --> ACT["Activity dashboard<br/>/ + /ops replay"]
    REC --> DESK["Security desk<br/>/desk portfolio"]
    DS["downstream/state.json"] --> DESK
    WC["watch/watch-config.json"] --> DESK
```
