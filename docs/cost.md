# Agent cost tracker

Switch's model is **one agent, many rooms** — so a running cost question follows
immediately: *what does each agent spend across the workflow?* This attributes
estimated **LLM + infrastructure cost per agent**, from the room's recorded
activity, using a transparent rate card.

```bash
npm run cost                        # per-agent cost for the minimist disclosure
node cost/cost-tracker.js --json    # machine-readable
```

It also shows on the local dashboard (`npm run dashboard`).

## How it's computed (and how to make it exact)

- **Turns per agent** come from the room's record (each substantive post is a turn).
- **Verify runs** by `embargo-repro` are counted separately — those are the Docker
  builds, the real infrastructure cost.
- Cost = turns × per-turn token estimate × price, plus verify-runs × build cost,
  using `cost/rates.json`.

The figures are **estimates derived from recorded activity** — labelled as such.
In a real Switch deployment you replace the per-turn averages in `cost/rates.json`
with the provider's **actual token telemetry**, and the same report becomes exact.
The shape — cost attributed per agent, per disclosure — is the point: it turns
"we ran some agents" into a line a finance or platform team can govern.

## Why it's a good Switch use-case

Orchestrating many agents across many rooms is Switch's whole value; cost
attribution is what makes that operable at scale. A security team running dozens
of disclosures a quarter needs to know the Timekeeper's chat turns are cheap and
the Repro agent's Docker builds are where the money goes — exactly what this
surfaces.
