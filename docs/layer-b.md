# Layer B — downstream coordination across rooms

A vulnerability in a library isn't one disclosure; it's one upstream plus every
dependent that needs to patch under the same embargo. Layer B models that as
**one parent room plus one child room per confirmed dependent**, with the same
`embargo-timekeeper` agent present in all of them — Switch's "one agent, many
rooms" doing the thing it was built for.

## Why this is pure Switch

A single-room bot cannot do this. Coordinating N parties under one embargo, each
in their own private space but sharing one deadline and one aggregate state, IS
multi-room shared state. Remove Switch and it's N disconnected threads with no
shared clock — the exact failure mode (downstream finds out from the public
advisory) that this layer fixes.

## The protocol

1. **Discover + confirm.** From `downstream/downstream.yaml`, confirm each edge
   is real with `check-dependency.js <pkg> <target>` (queries the npm registry).
   Only real dependents get a room.
2. **Fan out.** Create one child room per confirmed dependent from
   `embargo-downstream.template.yaml`. The shared Timekeeper joins each and
   shares the embargo under the same deadline + secrecy.
3. **Track per-room status.** Each downstream maintainer's state moves
   pending -> notified -> patched | wont-fix | unreachable, in their own room.
   A downstream can verify its own fix in-room via `verify-ref.sh`.
4. **Aggregate.** The Timekeeper keeps `downstream/state.json` current and runs
   `readiness.js` after every change. It posts the readiness view to the parent.
5. **Coordinated publish.** The parent advances to PUBLISHED only when readiness
   is READY: every downstream resolved, OR the embargo deadline reached (then
   publish anyway — the clock is the backstop, never indefinite secrecy).

## Readiness rule (readiness.js)

```
READY  if   all downstreams in {patched, wont-fix, unreachable}
READY  if   now >= deadline            (forced publish; names who's unresolved)
HOLD   otherwise                        (names who we're waiting on)
```

This is the whole value in one function: a coordinated embargo lift that is
neither premature (exposing unpatched dependents) nor indefinite (holding a fix
hostage to one silent maintainer).

## Demo beat (adds ~30s)

After the upstream VERIFIED_FIXED, cut to the parent room's readiness view:
rc patched, optimist patched, subarg still pending -> HOLD. Flip subarg to
wont-fix -> READY -> coordinated publish. Shows the fan-out paying off live.
