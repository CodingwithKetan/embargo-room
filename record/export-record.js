#!/usr/bin/env node
/*
 * Audit-trail export: turn a disclosure room's history into a tamper-evident
 * record. Every substantive message becomes an entry hash-chained to the one
 * before it (hash = sha256(prev_hash + canonical(entry))), so changing, dropping
 * or reordering any entry breaks the chain. The record also carries the state
 * timeline and the final advisory extracted from the room, plus the head hash —
 * publish that alongside the advisory and anyone can re-verify the trail.
 *
 * Usage:
 *   MM_TOKEN=... node record/export-record.js export <team>/<channel> [--out FILE] [--url URL]
 *   node record/export-record.js verify <record.json>
 *
 * export reads the room through the Mattermost bridge Switch uses (MM_URL or
 * --url, default http://localhost:42111; MM_TOKEN must be a member's token).
 * The token is never written to the record. Switch's transient status pulses
 * ("Working…", "Queued…", "Worked for…") and join/leave events are skipped.
 * Exit 0 = ok / chain intact, 1 = chain broken, 2 = error.
 */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
// Stable key order so the same entry always hashes the same way.
const canonical = (o) => JSON.stringify(o, Object.keys(o).sort());
const genesis = (room) => sha256('embargo-room:' + room);
const STATUS_PULSE = /^\*\*(Working…|Queued\.|Worked for )/;

function chain(room, entries) {
  let prev = genesis(room);
  return entries.map((e, i) => {
    const body = { seq: i + 1, ts: e.ts, author: e.author, role: e.role, text: e.text };
    const hash = sha256(prev + canonical(body));
    const out = { ...body, prev_hash: prev, hash };
    prev = hash;
    return out;
  });
}

function verify(file) {
  const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
  let prev = genesis(rec.room);
  for (const e of rec.entries) {
    const body = { seq: e.seq, ts: e.ts, author: e.author, role: e.role, text: e.text };
    const hash = sha256(prev + canonical(body));
    if (e.prev_hash !== prev || e.hash !== hash) {
      console.log(`TAMPERED  chain breaks at entry ${e.seq} (${e.author} @ ${e.ts})`);
      process.exit(1);
    }
    prev = hash;
  }
  if (prev !== rec.head_hash) {
    console.log('TAMPERED  head hash does not match the chain');
    process.exit(1);
  }
  console.log(`VERIFIED  ${rec.entries.length} entries, chain intact — head ${rec.head_hash.slice(0, 16)}…`);
  console.log(`  room ${rec.room}, exported ${rec.exported_at}, ${rec.timeline.length} state events`);
  process.exit(0);
}

async function api(base, token, p, body) {
  const res = await fetch(base + p, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${p} -> HTTP ${res.status}`);
  return res.json();
}

// State transitions the Timekeeper and Repro post, e.g.
// "**[2026-11-04] STATE → REPORTED**", "STATE: REPORTED → REPRODUCED", or a
// verdict like "**INCOMPLETE_FIX**: ...". Every event carries the server's post
// timestamp, so the timeline is ordered by when it actually happened.
function extractTimeline(entries) {
  const out = [];
  for (const e of entries) {
    for (const m of e.text.matchAll(/\[\d{4}-\d{2}-\d{2}\]\s*STATE:?\s*(?:→|->)?\s*([A-Z_]+(?:\s*(?:→|->)\s*[A-Z_]+)*)/g)) {
      out.push({ seq: e.seq, ts: e.ts, by: e.author, transition: m[1].replace(/\s*->\s*/g, ' → ') });
    }
    const v = e.role === 'agent' && e.text.match(/^(?:@\S+\s*)?\*\*(INCOMPLETE_FIX|VERIFIED_FIXED|REPRODUCED)\*\*/);
    if (v) out.push({ seq: e.seq, ts: e.ts, by: e.author, transition: v[1] + ' (verdict)' });
  }
  return out;
}

// Last advisory the Advisory agent posted with status PUBLISHED (else last draft).
function extractAdvisory(entries) {
  let found = null;
  for (const e of entries) {
    if (!e.author.startsWith('embargo-advisory')) continue;
    const m = e.text.match(/```json\s*([\s\S]*?)```/);
    if (!m) continue;
    try {
      const a = JSON.parse(m[1]);
      if (!found || a.status === 'PUBLISHED' || found.status !== 'PUBLISHED') found = { ...a, _seq: e.seq };
    } catch { /* not valid JSON; skip */ }
  }
  return found;
}

async function exportRoom(spec, opts) {
  const [team, channel] = spec.split('/');
  if (!team || !channel) throw new Error('room must be <team>/<channel>');
  const base = (opts.url || process.env.MM_URL || 'http://localhost:42111').replace(/\/$/, '');
  const token = process.env.MM_TOKEN;
  if (!token) throw new Error('set MM_TOKEN to a room member\'s access token');

  const ch = await api(base, token, `/api/v4/teams/name/${team}/channels/name/${channel}`);
  const posts = [];
  for (let page = 0; ; page++) {
    const d = await api(base, token, `/api/v4/channels/${ch.id}/posts?page=${page}&per_page=200`);
    posts.push(...d.order.map((id) => d.posts[id]));
    if (d.order.length < 200) break;
  }
  posts.sort((a, b) => a.create_at - b.create_at);

  const ids = [...new Set(posts.map((p) => p.user_id))];
  const users = await api(base, token, '/api/v4/users/ids', ids);
  const name = Object.fromEntries(users.map((u) => [u.id, u.username]));
  const roleOf = (u) => u.startsWith('embargo-') ? 'agent'
    : (u === 'switch-admin' || u === 'system-bot' || u === 'admin' || u.startsWith('switch-')) ? 'system' : 'human';

  const kept = posts
    .filter((p) => !p.type && p.message && !STATUS_PULSE.test(p.message.trim()))
    .map((p) => {
      const author = name[p.user_id] || p.user_id;
      return { ts: new Date(p.create_at).toISOString(), author, role: roleOf(author), text: p.message.trim() };
    });

  const room = `${team}/${channel}`;
  const entries = chain(room, kept);
  const record = {
    format: 'embargo-room/audit-record@1',
    room,
    exported_at: new Date().toISOString(),
    source: 'Switch room via its Mattermost bridge',
    entries,
    timeline: extractTimeline(entries),
    advisory: extractAdvisory(entries),
    head_hash: entries.length ? entries[entries.length - 1].hash : genesis(room),
  };
  const out = opts.out || path.join(__dirname, `${channel}.record.json`);
  fs.writeFileSync(out, JSON.stringify(record, null, 2) + '\n');
  console.log(`EXPORTED  ${room}: ${entries.length} entries, ${record.timeline.length} state events -> ${out}`);
  console.log(`  head hash ${record.head_hash}`);
  if (record.advisory) console.log(`  advisory ${record.advisory.id} status ${record.advisory.status}`);
}

const argv = process.argv.slice(2);
const opts = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--out') opts.out = argv[++i];
  else if (argv[i] === '--url') opts.url = argv[++i];
}
const [cmd, target] = argv.filter((a, i) => !a.startsWith('--') && !['--out', '--url'].includes(argv[i - 1]));

if (cmd === 'verify' && target) verify(target);
else if (cmd === 'export' && target) {
  exportRoom(target, opts).catch((e) => { console.error('export error:', e.message); process.exit(2); });
} else {
  console.error('usage: export-record.js export <team>/<channel> [--out FILE] | verify <record.json>');
  process.exit(2);
}
