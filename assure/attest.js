#!/usr/bin/env node
/*
 * Layer D — agent work attestation. Wrap a command so its REAL execution is
 * recorded as a tamper-evident attestation: what ran, its exit code (which is the
 * verdict), a hash of its output, and when. The Repro agent runs its
 * verifications through this, so later anyone can confirm the agent's claims came
 * from actual runs — not from a hallucinated transcript. This is how you get
 * surety that the agent worked, independent of what it says in chat.
 *
 * Usage: node assure/attest.js <label> -- <command> [args...]
 * Appends one entry to assure/attestations.jsonl (append-only, hash-chained;
 * HMAC-signed when EMBARGO_ATTEST_KEY is set). The command's stdout/stderr and
 * exit code pass straight through, so it is a transparent wrapper.
 */
'use strict';
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
if (sep < 1 || sep + 1 >= argv.length) {
  console.error('usage: attest.js <label> -- <command> [args...]');
  process.exit(2);
}
const label = argv.slice(0, sep).join(' ');
const cmd = argv[sep + 1];
const cmdArgs = argv.slice(sep + 2);
const logPath = process.env.EMBARGO_ATTEST_LOG || path.join(__dirname, 'attestations.jsonl');

// Run the real command, pass its output and exit straight through.
const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8' });
const out = r.stdout || '';
const err = r.stderr || '';
process.stdout.write(out);
process.stderr.write(err);
const exit = r.status == null ? 2 : r.status;

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const key = process.env.EMBARGO_ATTEST_KEY;
const chainHash = (s) => key ? crypto.createHmac('sha256', key).update(s).digest('hex') : sha(s);

// The exit code is the mechanical verdict (0 = TRIGGERED, 1 = SAFE for the PoC);
// also capture a RESULT line if the command printed one.
const m = out.match(/RESULT:\s*(TRIGGERED|SAFE)/);
const verdict = m ? m[1] : (exit === 0 ? 'ok' : 'exit' + exit);

let prev = chainHash('embargo-room:attest');
let seq = 1;
try {
  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);
  if (lines.length) { const last = JSON.parse(lines[lines.length - 1]); prev = last.hash; seq = last.seq + 1; }
} catch (e) { /* first entry */ }

const body = {
  seq,
  ts: new Date().toISOString(),
  actor: process.env.EMBARGO_ACTOR || 'embargo-repro',
  label,
  cmd: [cmd, ...cmdArgs].join(' '),
  exit,
  verdict,
  stdout_sha256: sha(out),
  stderr_sha256: sha(err),
  stdout_bytes: Buffer.byteLength(out),
};
const hash = chainHash(prev + JSON.stringify(body, Object.keys(body).sort()));
const entry = { ...body, prev_hash: prev, hash, signed: !!key };

fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
process.stderr.write(`\n[attested #${seq} ${verdict} exit=${exit} ${hash.slice(0, 16)}…${key ? ' signed' : ''}]\n`);
process.exit(exit);
