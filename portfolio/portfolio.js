#!/usr/bin/env node
/*
 * portfolio.js — the security-team desk: the whole disclosure program in one
 * queue. Most of the repo zooms into ONE disclosure; this zooms out to how a
 * team runs many of them — what's on the monitoring radar, which disclosures
 * are active or closed (with their SLA grade and cost), and where every
 * downstream stands against the embargo deadline.
 *
 * It aggregates only committed, on-disk truth: record/*.record.json (via the
 * scorecard + cost models), downstream/state.json, and watch/watch-config.json.
 *
 * Usage:
 *   node portfolio/portfolio.js            # the desk
 *   node portfolio/portfolio.js --json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { buildScorecard } = require('../scorecard/scorecard');
const { buildCostReport } = require('../cost/cost-tracker');

const ROOT = path.join(__dirname, '..');
const DAY = 86400000;

function buildPortfolio() {
  // --- disclosures: records that actually ran an arc (advisory + transitions)
  const recDir = path.join(ROOT, 'record');
  const disclosures = [];
  for (const f of fs.readdirSync(recDir).filter((x) => x.endsWith('.record.json'))) {
    const full = path.join(recDir, f);
    const rec = JSON.parse(fs.readFileSync(full, 'utf8'));
    if (!rec.advisory || !(rec.timeline && rec.timeline.length)) continue; // a real disclosure
    const sc = buildScorecard(full);
    const cost = buildCostReport(full);
    disclosures.push({
      room: rec.room, cve: rec.advisory.id, status: sc.status, grade: sc.grade,
      cycleTime: sc.metrics.totalCycleTime, incompleteFixes: sc.metrics.incompleteFixesCaught,
      cost: cost.costPerDisclosure, daysEarly: sc.metrics.daysBeforeDeadline,
      overdue: sc.grade === 'DEADLINE MISSED',
    });
  }

  // --- downstream coordination (one program, many dependents) --------------
  let downstreams = [], deadline = null, now = null;
  try {
    const st = JSON.parse(fs.readFileSync(path.join(ROOT, 'downstream', 'state.json'), 'utf8'));
    deadline = st.deadline; now = st.now || new Date().toISOString();
    const dToDeadline = deadline ? Math.round((new Date(deadline) - new Date(now)) / DAY) : null;
    downstreams = (st.downstreams || []).map((d) => ({
      package: d.package, status: d.status,
      resolved: ['patched', 'wont-fix', 'not-affected'].includes(d.status),
      daysToDeadline: dToDeadline,
    }));
  } catch (e) {}

  // --- monitoring radar (auto-mode config = how humans set agent access) ---
  let monitoring = { watchlist: [], policy: {} };
  try {
    const wc = JSON.parse(fs.readFileSync(path.join(ROOT, 'watch', 'watch-config.json'), 'utf8'));
    monitoring = { ecosystem: wc.ecosystem, watchlist: wc.watchlist || [], policy: wc.policy || {} };
  } catch (e) {}

  const published = disclosures.filter((d) => /PUBLISHED/.test(d.status)).length;
  const overdue = disclosures.filter((d) => d.overdue).length;
  const metSla = disclosures.filter((d) => d.grade === 'MEETS SLA').length;
  const resolvedDs = downstreams.filter((d) => d.resolved).length;
  const programCost = Math.round(disclosures.reduce((s, d) => s + d.cost, 0) * 100) / 100;

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      disclosures: disclosures.length, published, overdue,
      slaAdherence: disclosures.length ? Math.round((metSla / disclosures.length) * 100) : null,
      downstreams: downstreams.length, downstreamsResolved: resolvedDs,
      monitored: monitoring.watchlist.length, programCost,
      deadline,
    },
    disclosures, downstreams, monitoring,
  };
}

module.exports = { buildPortfolio };

// --- CLI -----------------------------------------------------------------
if (require.main === module) {
  const p = buildPortfolio();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(p, null, 2)); process.exit(0); }
  const s = p.summary, bar = '─'.repeat(66);
  console.log(`\n  SECURITY DESK — disclosure program`);
  console.log(`  ${bar}`);
  console.log(`  Disclosures: ${s.disclosures} (${s.published} published, ${s.overdue} overdue)   ` +
    `SLA adherence: ${s.slaAdherence != null ? s.slaAdherence + '%' : '—'}   Program cost: $${s.programCost.toFixed(2)}`);
  console.log(`  Downstreams: ${s.downstreamsResolved}/${s.downstreams} resolved   Monitoring: ${s.monitored} packages   Deadline: ${(s.deadline || '').slice(0, 10)}`);
  console.log(`  ${bar}`);
  console.log(`\n  ACTIVE / CLOSED DISCLOSURES`);
  for (const d of p.disclosures)
    console.log(`    ${(d.cve || d.room).padEnd(18)} ${d.status.padEnd(11)} ${d.grade.padEnd(13)} cycle ${String(d.cycleTime).padEnd(8)} caught ${d.incompleteFixes} ·  $${d.cost.toFixed(2)}`);
  console.log(`\n  DOWNSTREAM COORDINATION  (deadline ${(s.deadline || '').slice(0, 10)})`);
  for (const d of p.downstreams)
    console.log(`    ${d.package.padEnd(12)} ${d.status.padEnd(14)} ${d.resolved ? '✓ resolved' : '⚠ open'}${d.daysToDeadline != null ? `   ${d.daysToDeadline}d to deadline` : ''}`);
  console.log(`\n  MONITORING RADAR  (${p.monitoring.ecosystem || 'npm'} · auto-mode, human-gated)`);
  console.log(`    watching: ${p.monitoring.watchlist.join(', ')}`);
  const pol = p.monitoring.policy || {};
  console.log(`    policy: on new CVE → ${pol.on_new_cve || '—'};  open room needs human: ${pol.require_human_to_open_room};  build needs human: ${pol.require_human_to_build}\n`);
}
