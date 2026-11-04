#!/usr/bin/env node
/*
 * embargo-watch — auto-mode intake. A regular checkup that queries the public
 * OSV database for new advisories affecting the configured watchlist, applies
 * the human-set policy (watch/watch-config.json), and emits PROPOSALS.
 *
 * Autonomous DISCOVERY, human-gated ACTION: by default it proposes and waits —
 * it never opens a disclosure room or builds a repo on its own. The policy file
 * is where a human configures the agents' access; this script only reports what
 * the policy permits, and the agent still asks before acting.
 *
 * Usage:
 *   node watch/watch.js                 # checkup: report NEW advisories vs the baseline
 *   node watch/watch.js --json          # same, machine-readable (for the agent)
 *   node watch/watch.js --mark          # baseline: mark all current advisories as seen
 *   [--config <file>] [--seen <file>]
 * Exit: 0 = nothing new, 10 = new advisories found, 2 = error.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const has = (name) => args.includes(name);
const configPath = opt('--config', path.join(__dirname, 'watch-config.json'));
const seenPath = opt('--seen', path.join(__dirname, 'seen.json'));

let cfg;
try { cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
catch (e) { console.error('cannot read config ' + configPath + ': ' + e.message); process.exit(2); }
const ecosystem = cfg.ecosystem || 'npm';
const watchlist = cfg.watchlist || [];
const policy = cfg.policy || {};
const minCvss = Number(policy.min_cvss || 0);

let seen = new Set();
try { seen = new Set(JSON.parse(fs.readFileSync(seenPath, 'utf8')).ids || []); } catch (e) {}

async function osv(pkg) {
  const res = await fetch('https://api.osv.dev/v1/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ package: { name: pkg, ecosystem } }),
  });
  if (!res.ok) throw new Error('OSV HTTP ' + res.status + ' for ' + pkg);
  return (await res.json()).vulns || [];
}

// Best-effort numeric CVSS base score if OSV carries one (vector math is out of scope).
function cvssScore(v) {
  const ds = v.database_specific || {};
  if (typeof ds.cvss === 'number') return ds.cvss;
  if (ds.cvss && typeof ds.cvss.score === 'number') return ds.cvss.score;
  for (const s of v.severity || []) { const n = Number(s.score); if (!Number.isNaN(n)) return n; }
  return null; // unknown
}
function ranges(v, pkg) {
  const out = [];
  for (const a of v.affected || []) {
    if (a.package && a.package.name !== pkg) continue;
    for (const r of a.ranges || []) {
      let intro = null;
      for (const e of r.events || []) {
        if (e.introduced !== undefined) intro = e.introduced;
        if (e.fixed !== undefined) { out.push(`>=${intro} <${e.fixed}`); intro = null; }
      }
    }
  }
  return out;
}

(async () => {
  const all = [];       // every advisory id currently known for the watchlist
  const findings = [];  // new ones to surface
  for (const pkg of watchlist) {
    let vulns;
    try { vulns = await osv(pkg); }
    catch (e) { console.error('warn: ' + e.message); continue; }
    for (const v of vulns) {
      all.push(v.id);
      if (seen.has(v.id)) continue;
      const score = cvssScore(v);
      if (score !== null && score < minCvss) continue;
      findings.push({
        package: pkg, id: v.id,
        cves: (v.aliases || []).filter((a) => a.startsWith('CVE-')),
        summary: (v.summary || '').trim(),
        affected: ranges(v, pkg),
        cvss: score,
      });
    }
  }

  if (has('--mark')) {
    fs.mkdirSync(path.dirname(seenPath), { recursive: true });
    fs.writeFileSync(seenPath, JSON.stringify({ ids: [...new Set(all)] }, null, 2) + '\n');
    console.log(`baseline set: ${new Set(all).size} advisories across ${watchlist.length} packages marked seen (${seenPath}).`);
    process.exit(0);
  }

  if (has('--json')) {
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), watchlist, policy, newAdvisories: findings }, null, 2));
    process.exit(findings.length ? 10 : 0);
  }

  const mode = policy.on_new_cve || 'propose';
  console.log(`embargo-watch — checkup ${new Date().toISOString().slice(0, 16)}Z`);
  console.log(`watchlist: ${watchlist.join(', ')}  ·  policy: on_new_cve=${mode}, open-room approval=${policy.require_human_to_open_room !== false}, build approval=${policy.require_human_to_build !== false}`);
  if (mode === 'off') { console.log('\nwatch is OFF (policy.on_new_cve = off). Nothing checked.'); process.exit(0); }

  if (!findings.length) {
    console.log('\nNo new advisories since the last baseline. Next checkup will look again.');
    process.exit(0);
  }

  console.log(`\n${findings.length} NEW advisor${findings.length === 1 ? 'y' : 'ies'} — PROPOSALS (no action taken; a human approves before anything opens or builds):\n`);
  for (const f of findings) {
    const cve = f.cves.length ? ' (' + f.cves.join(', ') + ')' : '';
    const sev = f.cvss !== null ? `CVSS ${f.cvss}` : 'CVSS n/a';
    console.log(`  ${f.package}: ${f.id}${cve}  [${sev}]`);
    if (f.summary) console.log(`    ${f.summary}`);
    if (f.affected.length) console.log(`    affected: ${f.affected.join(' ; ')}`);
    const open = policy.require_human_to_open_room !== false ? 'AWAITING HUMAN APPROVAL' : (mode === 'auto-triage' ? 'auto-open permitted by policy' : 'AWAITING HUMAN APPROVAL');
    console.log(`    → PROPOSE: open a disclosure room for ${f.package}. ${open}.`);
  }
  console.log(`\nSource: osv.dev. A human decides; run \`node watch/watch.js --mark\` to baseline once handled.`);
  process.exit(10);
})().catch((e) => { console.error('watch error: ' + e.message); process.exit(2); });
