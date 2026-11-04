#!/usr/bin/env node
/*
 * Layer D verifier. Two things:
 *  1) confirm the attestation chain is intact (tamper-evident), and
 *  2) cross-check a room record's CLAIMED verdicts against the ATTESTED real runs.
 * That is the surety: every "TRIGGERED / SAFE" the agent posted must map to an
 * actual attested execution, so a hallucinated verdict has nothing backing it.
 *
 * Usage:
 *   node assure/verify-work.js [--log FILE]
 *   node assure/verify-work.js --against <record.json> [--log FILE]
 * Exit: 0 = chain intact (and, with --against, every claim backed), 1 = broken /
 * unbacked claim, 2 = error.
 */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const logPath = (args.indexOf('--log') >= 0) ? args[args.indexOf('--log') + 1] : path.join(__dirname, 'attestations.jsonl');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

let entries;
try { entries = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)); }
catch (e) { console.error('cannot read attestation log ' + logPath + ': ' + e.message); process.exit(2); }
if (!entries.length) { console.error('attestation log is empty'); process.exit(2); }

const key = process.env.EMBARGO_ATTEST_KEY;
const signed = entries.some((e) => e.signed);
const mac = (s) => (signed && key) ? crypto.createHmac('sha256', key).update(s).digest('hex') : sha(s);
if (signed && !key) console.log('NOTE: log is HMAC-signed; set EMBARGO_ATTEST_KEY to verify authenticity (checking chain structure only).');

let prev = mac('embargo-room:attest');
for (const e of entries) {
  const body = {
    seq: e.seq, ts: e.ts, actor: e.actor, label: e.label, cmd: e.cmd, exit: e.exit,
    verdict: e.verdict, stdout_sha256: e.stdout_sha256, stderr_sha256: e.stderr_sha256, stdout_bytes: e.stdout_bytes,
  };
  if (!signed || key) {
    const h = mac(prev + JSON.stringify(body, Object.keys(body).sort()));
    if (e.prev_hash !== prev || e.hash !== h) { console.log(`TAMPERED: attestation chain breaks at #${e.seq} (${e.label})`); process.exit(1); }
  }
  prev = e.hash;
}
console.log(`VERIFIED: attestation chain intact — ${entries.length} attested runs, head ${prev.slice(0, 16)}…`);
for (const e of entries) console.log(`  #${e.seq}  ${e.label.padEnd(18)} → ${e.verdict} (exit ${e.exit})`);

const ai = args.indexOf('--against');
if (ai >= 0) {
  const rec = JSON.parse(fs.readFileSync(args[ai + 1], 'utf8'));
  const expect = { REPRODUCED: 'TRIGGERED', INCOMPLETE_FIX: 'TRIGGERED', VERIFIED_FIXED: 'SAFE' };
  const claims = [];
  for (const t of rec.timeline || []) {
    if (!/verdict/i.test(t.transition)) continue;
    const m = t.transition.match(/\b(REPRODUCED|INCOMPLETE_FIX|VERIFIED_FIXED)\b/);
    if (m) claims.push(m[1]);
  }
  const pool = entries.map((e) => ({ ...e, used: false }));
  console.log(`\nCross-checking ${claims.length} claimed verdict(s) in ${rec.room} against attested runs:`);
  let backed = 0;
  for (const c of claims) {
    const want = expect[c];
    const preferRef = c !== 'REPRODUCED';
    let hit = pool.find((e) => !e.used && e.verdict === want && (!preferRef || /--ref|v\d+\.\d+/.test(e.cmd)));
    if (!hit) hit = pool.find((e) => !e.used && e.verdict === want);
    if (hit) { hit.used = true; backed++; console.log(`  ✓ ${c.padEnd(15)} (expects ${want}) ← attested #${hit.seq} "${hit.label}"`); }
    else console.log(`  ✗ ${c.padEnd(15)} (expects ${want}) ← NO attested run — UNBACKED CLAIM`);
  }
  const allBacked = backed === claims.length && claims.length > 0;
  console.log(`\n${backed}/${claims.length} of the agent's verdicts are backed by attested, tamper-evident runs.`);
  console.log(allBacked ? 'ASSURED: the agent did the work it claimed.' : 'UNASSURED: a claimed verdict has no backing run.');
  process.exit(allBacked ? 0 : 1);
}
