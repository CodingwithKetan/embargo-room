#!/usr/bin/env node
/*
 * Bridge layer — resilience + portability. Embargo Room runs on whatever chat
 * app your team uses (Slack, Mattermost, …), and a disclosure's truth lives in
 * its portable record + state files, not the chat. So a bridge outage doesn't
 * stall a disclosure: this picks the first enabled + reachable bridge in
 * [primary, ...fallback], and the state carries over because it was never in
 * the chat to begin with.
 *
 * Usage:
 *   node bridge/status.js                 # health of every bridge + the active one
 *   node bridge/status.js --down <name>   # simulate a bridge down/overloaded (demo failover)
 *   node bridge/status.js --json
 * Exit: 0 = an active bridge is available, 1 = none, 2 = error.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const down = new Set();
for (let i = 0; i < args.length; i++) if (args[i] === '--down') down.add(args[++i]);
const asJson = args.includes('--json');

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'bridges.json'), 'utf8'));
const order = [cfg.primary, ...(cfg.fallback || [])].filter((b, i, a) => a.indexOf(b) === i);

async function reachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    // Slack's api.test returns {ok:true}; Mattermost ping returns a body too.
    const t = await res.text();
    return !/"ok"\s*:\s*false/.test(t);
  } catch (e) { return false; }
}

// portable, bridge-independent state (proof the disclosure doesn't live in the chat)
function portableState() {
  const out = {};
  try {
    const rec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'record', 'embargo-minimist-demo.record.json'), 'utf8'));
    out.record_head = rec.head_hash; out.record_entries = rec.entries.length;
    out.advisory = rec.advisory ? `${rec.advisory.id} (${rec.advisory.status})` : null;
  } catch (e) {}
  return out;
}

(async () => {
  const rows = [];
  for (const name of order) {
    const b = cfg.bridges[name] || {};
    const enabled = b.enabled !== false && !down.has(name);
    const reach = enabled ? await reachable(b.health) : false;
    rows.push({ name, kind: b.kind, enabled, reachable: reach, usable: enabled && reach, health: b.health });
  }
  const active = rows.find((r) => r.usable);
  const state = portableState();

  if (asJson) {
    console.log(JSON.stringify({ order, active: active ? active.name : null, bridges: rows, portableState: state }, null, 2));
    process.exit(active ? 0 : 1);
  }

  console.log('Bridge status — the disclosure lives in the record, not the chat:');
  for (const r of rows) {
    const flag = !r.enabled ? 'DISABLED' : (r.reachable ? 'UP' : 'DOWN');
    const star = active && active.name === r.name ? '  ← ACTIVE' : '';
    console.log(`  ${r.name.padEnd(11)} ${flag.padEnd(9)} ${r.health}${star}`);
  }
  console.log(active
    ? `\nActive bridge: ${active.name} (first enabled + reachable in [${order.join(' → ')}]).`
    : `\nNo bridge available — the disclosure is not lost: its record and state are on disk, ready to resume on any bridge.`);
  if (state.record_head) {
    console.log('\nPortable state (same on every bridge):');
    console.log(`  record head ${state.record_head.slice(0, 16)}…  (${state.record_entries} entries${state.advisory ? ', ' + state.advisory : ''})`);
    console.log('  Re-point the room to a healthy bridge; this record + downstream/state.json carry the disclosure forward unchanged.');
  }
  process.exit(active ? 0 : 1);
})().catch((e) => { console.error('bridge status error: ' + e.message); process.exit(2); });
