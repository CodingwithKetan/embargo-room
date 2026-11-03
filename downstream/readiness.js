#!/usr/bin/env node
/*
 * Layer B core: compute coordinated-publish readiness across downstream rooms.
 * The parent Timekeeper calls this to decide whether the embargo can lift.
 * Usage: node downstream/readiness.js <state.json>
 *   state.json: { "deadline": "ISO", "now": "ISO", "downstreams": [ {package,status} ] }
 * Exit 0 = READY to publish, 1 = HOLD.
 */
'use strict';
const fs = require('fs');
const state = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const RESOLVED = new Set(['patched', 'wont-fix', 'unreachable']);

const rows = state.downstreams.map(d => ({ ...d, resolved: RESOLVED.has(d.status) }));
const pending = rows.filter(r => !r.resolved);
const deadlinePassed = new Date(state.now) >= new Date(state.deadline);

console.log('Downstream readiness:');
for (const r of rows) {
  console.log('  ' + (r.resolved ? '[x]' : '[ ]') + ' ' + r.package.padEnd(12) + r.status);
}
console.log('  deadline: ' + state.deadline + '  now: ' + state.now +
            (deadlinePassed ? '  (PASSED)' : ''));

if (pending.length === 0) {
  console.log('DECISION: READY  all downstreams resolved — coordinated publish is safe');
  process.exit(0);
} else if (deadlinePassed) {
  console.log('DECISION: READY  embargo deadline reached — publish despite ' +
              pending.length + ' unresolved: ' + pending.map(r => r.package).join(', '));
  process.exit(0);
} else {
  console.log('DECISION: HOLD  waiting on ' + pending.length + ': ' +
              pending.map(r => r.package).join(', '));
  process.exit(1);
}
