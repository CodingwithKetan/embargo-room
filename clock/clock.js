#!/usr/bin/env node
// clock.js — a scalable embargo clock for the Embargo Room.
//
// A real disclosure embargo runs ~90 days; a demo runs ~3 minutes. CLOCK_SCALE
// compresses embargo-time into real-time so the countdown actually moves and a
// silent vendor actually trips an escalation — instead of the timekeeper just
// quoting a static date.
//
// The clock advances by WALL TIME: elapsed embargo-days = real-seconds-since-init
// * scale, where scale is embargo-days per real second (CLOCK_SCALE, default 1,
// so a 90-day embargo plays out in ~90s; --scale overrides). The timekeeper reads
// it when it acts; it does not need to tick on its own.
//
// Usage:
//   node clock/clock.js init  [--deadline-days N] [--silence-days N] [--scale S] [--start ISO] [--state PATH]
//   node clock/clock.js notify [--state PATH]   # vendor notified now -> starts the silence timer
//   node clock/clock.js ack    [--state PATH]   # vendor acknowledged -> clears silence
//   node clock/clock.js status [--json] [--state PATH]
//
// `status` prints a live countdown plus flags: SILENCE_EXCEEDED (vendor notified,
// not acknowledged, silent longer than the window) and DEADLINE_PASSED (embargo
// over -> the backstop that forces a coordinated publish rather than indefinite
// secrecy). It always exits 0; read the flags from its output.

const fs = require('fs');
const path = require('path');
const DAY_MS = 86400000;

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const key = t.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) a[key] = true;
      else { a[key] = next; i++; }
    } else a._.push(t);
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];
const statePath = (args.state && args.state !== true) ? args.state
  : path.join(__dirname, 'embargo-clock.json');
const r1 = (x) => Math.round(x * 10) / 10;
const load = () => JSON.parse(fs.readFileSync(statePath, 'utf8'));
const save = (s) => {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(s, null, 2) + '\n');
};
// embargo-days elapsed since the clock was initialized
const elapsedDays = (s, nowMs = Date.now()) => ((nowMs - s.realT0Ms) / 1000) * s.scale;

if (cmd === 'init') {
  const scaleArg = (args.scale != null && args.scale !== true) ? args.scale : process.env.CLOCK_SCALE;
  const scale = Number(scaleArg != null ? scaleArg : 1);
  if (!(scale > 0)) { console.error(`bad scale: ${scaleArg}`); process.exit(2); }
  const s = {
    startIso: (args.start && args.start !== true) ? args.start : new Date().toISOString(),
    realT0Ms: Date.now(),
    scale,                                    // embargo-days per real second
    deadlineDays: Number(args['deadline-days'] || 90),
    silenceDays: Number(args['silence-days'] || 14),
    notifiedAtDays: null,                     // embargo-day the vendor was notified
    acknowledged: false,
  };
  save(s);
  console.log(`clock initialized -> ${statePath}`);
  console.log(`  deadline ${s.deadlineDays}d, silence window ${s.silenceDays}d, scale ${s.scale} embargo-days/sec`);
  console.log(`  a ${s.deadlineDays}-day embargo plays out in ~${r1(s.deadlineDays / s.scale)}s real time`);
  process.exit(0);
}

if (cmd === 'notify') {
  const s = load();
  s.notifiedAtDays = elapsedDays(s);
  s.acknowledged = false;
  save(s);
  console.log(`vendor NOTIFIED at embargo-day ${r1(s.notifiedAtDays)} (silence window ${s.silenceDays}d)`);
  process.exit(0);
}

if (cmd === 'ack') {
  const s = load();
  s.acknowledged = true;
  save(s);
  console.log(`vendor ACKNOWLEDGED at embargo-day ${r1(elapsedDays(s))}; silence cleared`);
  process.exit(0);
}

if (cmd === 'status') {
  const s = load();
  const elapsed = elapsedDays(s);
  const remaining = s.deadlineDays - elapsed;
  const deadlinePassed = remaining <= 0;
  const startMs = Date.parse(s.startIso);
  const deadlineMs = startMs + s.deadlineDays * DAY_MS;
  const embargoNowMs = startMs + elapsed * DAY_MS;
  let silence = null, silenceExceeded = false;
  if (s.notifiedAtDays != null && !s.acknowledged) {
    silence = elapsed - s.notifiedAtDays;
    silenceExceeded = silence > s.silenceDays;
  }
  const flags = [];
  if (deadlinePassed) flags.push('DEADLINE_PASSED');
  if (silenceExceeded) flags.push('SILENCE_EXCEEDED');

  if (args.json) {
    console.log(JSON.stringify({
      embargoDay: r1(elapsed),
      daysRemaining: r1(Math.max(0, remaining)),
      embargoNow: new Date(embargoNowMs).toISOString().slice(0, 10),
      deadline: new Date(deadlineMs).toISOString().slice(0, 10),
      vendorNotified: s.notifiedAtDays != null,
      vendorAcknowledged: s.acknowledged,
      silentForDays: silence == null ? null : r1(silence),
      silenceWindowDays: s.silenceDays,
      flags,
    }, null, 2));
  } else {
    console.log('Embargo clock:');
    console.log(`  day ${r1(elapsed)} of ${s.deadlineDays}  (${deadlinePassed ? 'DEADLINE PASSED' : r1(Math.max(0, remaining)) + ' days remaining'})`);
    console.log(`  embargo-now ${new Date(embargoNowMs).toISOString().slice(0, 10)}   deadline ${new Date(deadlineMs).toISOString().slice(0, 10)}`);
    if (s.notifiedAtDays != null) {
      console.log(s.acknowledged
        ? '  vendor: acknowledged'
        : `  vendor: silent ${r1(silence)}d / ${s.silenceDays}d window${silenceExceeded ? '  -> ESCALATE' : ''}`);
    }
    console.log(`  flags: ${flags.length ? flags.join(', ') : 'none'}`);
  }
  process.exit(0);
}

console.error('usage: node clock/clock.js init|notify|ack|status [--flags]');
process.exit(2);
