#!/usr/bin/env node
/*
 * scorecard.js — turn a disclosure's record into a management scorecard.
 *
 * Coordinated disclosure is a business process, so it has SLAs and KPIs. This
 * reads a room's hash-chained record (+ downstream state + attestations) and
 * reports the numbers a security lead actually tracks: cycle time, patch
 * cycles, incomplete fixes caught, downstream coverage, attestation coverage,
 * and whether the embargo deadline was met.
 *
 * Usage:
 *   node scorecard/scorecard.js [record.json]      # default: the minimist demo
 *   node scorecard/scorecard.js --json [record.json]
 * Also exports buildScorecard(recordPath) for the dashboard.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const msBetween = (a, b) => (a && b ? new Date(b) - new Date(a) : null);
function dur(m) {
  if (m == null) return '—';
  const s = Math.round(m / 1000);
  if (s < 90) return `${s}s`;
  const mnt = Math.floor(s / 60), sec = s % 60;
  if (mnt < 90) return `${mnt}m ${sec}s`;
  const h = Math.floor(mnt / 60); return `${h}h ${mnt % 60}m`;
}
const daysBetween = (a, b) => { const m = msBetween(a, b); return m == null ? null : m / 86400000; };

function buildScorecard(recPath) {
  const rec = JSON.parse(fs.readFileSync(recPath, 'utf8'));
  const tl = rec.timeline || [];
  const firstTs = (re) => { const e = tl.find((t) => re.test(t.transition)); return e ? e.ts : null; };

  const reportedTs = tl.length ? tl[0].ts : null;
  const reproducedTs = firstTs(/REPRODUCED/);
  const verifiedTs = firstTs(/VERIFIED_FIXED/);
  const publishedTs = firstTs(/PUBLISHED/);
  const incompleteFixes = tl.filter((t) => /INCOMPLETE_FIX/.test(t.transition)).length;
  const patchCycles = verifiedTs ? incompleteFixes + 1 : incompleteFixes;

  let downstream = null;
  try {
    const st = JSON.parse(fs.readFileSync(path.join(ROOT, 'downstream', 'state.json'), 'utf8'));
    const ds = st.downstreams || [];
    const resolved = ds.filter((d) => ['patched', 'wont-fix', 'not-affected'].includes(d.status)).length;
    downstream = { total: ds.length, resolved, deadline: st.deadline, items: ds };
  } catch (e) {}

  let attest = null;
  try {
    const lines = fs.readFileSync(path.join(ROOT, 'assure', 'attestations.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map((l) => JSON.parse(l));
    attest = { runs: lines.length, verdicts: lines.filter((a) => a.verdict).length };
  } catch (e) {}

  const deadline = downstream && downstream.deadline;
  const metDeadline = publishedTs && deadline ? new Date(publishedTs) < new Date(deadline) : !!publishedTs;
  const daysToDeadline = deadline && publishedTs ? daysBetween(publishedTs, deadline) : null;
  const adv = rec.advisory || {};

  return {
    record: path.basename(recPath),
    advisory: adv.id || null,
    status: adv.status || (publishedTs ? 'PUBLISHED' : '—'),
    head: (rec.head_hash || '').slice(0, 12),
    metrics: {
      timeToReproduce: dur(msBetween(reportedTs, reproducedTs)),
      timeToVerifiedFix: dur(msBetween(reportedTs, verifiedTs)),
      totalCycleTime: dur(msBetween(reportedTs, publishedTs)),
      patchCycles,
      incompleteFixesCaught: incompleteFixes,
      downstream: downstream ? `${downstream.resolved}/${downstream.total} resolved` : 'n/a',
      attestation: attest ? `${attest.runs} tamper-evident runs` : 'n/a',
      deadlineMet: metDeadline,
      daysBeforeDeadline: daysToDeadline == null ? null : Math.round(daysToDeadline),
    },
    grade: publishedTs ? (metDeadline ? 'MEETS SLA' : 'DEADLINE MISSED') : 'IN PROGRESS',
  };
}

module.exports = { buildScorecard };

// --- CLI -----------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const recPath = args.find((a) => a.endsWith('.json') && !a.startsWith('--'))
    || path.join(ROOT, 'record', 'embargo-minimist-demo.record.json');
  const model = buildScorecard(recPath);
  if (asJson) { console.log(JSON.stringify(model, null, 2)); process.exit(0); }
  const m = model.metrics, bar = '─'.repeat(52);
  console.log(`\n  DISCLOSURE SCORECARD — ${model.advisory || model.record}`);
  console.log(`  ${bar}`);
  const row = (k, v) => console.log(`  ${k.padEnd(26)} ${v}`);
  row('Status', `${model.status}   (record ${model.head}…)`);
  row('Time to reproduce', m.timeToReproduce);
  row('Time to verified fix', m.timeToVerifiedFix);
  row('Total cycle time', m.totalCycleTime);
  row('Patch cycles', `${m.patchCycles}`);
  row('Incomplete fixes caught', `${m.incompleteFixesCaught}${m.incompleteFixesCaught ? '  ← the catch' : ''}`);
  row('Downstreams coordinated', m.downstream);
  row('Verdicts attested', m.attestation);
  row('Embargo deadline', m.daysBeforeDeadline != null
    ? `met — published ${m.daysBeforeDeadline} days before backstop`
    : (m.deadlineMet ? 'met' : 'not yet published'));
  console.log(`  ${bar}`);
  console.log(`  GRADE:  ${model.grade}\n`);
}
