#!/usr/bin/env node
/*
 * Layer B helper: confirm a downstream package really depends on the target.
 * Keeps the downstream list honest — only real dependents get a child room.
 * Usage: node downstream/check-dependency.js <downstream-pkg> <target-pkg>
 * Exit 0 = edge confirmed, 1 = not a dependent, 2 = error.
 */
'use strict';
const https = require('https');
const [downstream, target] = process.argv.slice(2);
if (!downstream || !target) {
  console.error('usage: check-dependency.js <downstream-pkg> <target-pkg>');
  process.exit(2);
}
https.get('https://registry.npmjs.org/' + encodeURIComponent(downstream) + '/latest', (res) => {
  let body = '';
  res.on('data', (c) => body += c);
  res.on('end', () => {
    try {
      const d = JSON.parse(body);
      const deps = Object.assign({}, d.dependencies, d.peerDependencies);
      if (deps[target]) {
        console.log(`CONFIRMED  ${downstream}@${d.version} depends on ${target} (${deps[target]})`);
        process.exit(0);
      } else {
        console.log(`NOT A DEPENDENT  ${downstream}@${d.version} does not list ${target}`);
        process.exit(1);
      }
    } catch (e) { console.error('parse error:', e.message); process.exit(2); }
  });
}).on('error', (e) => { console.error('fetch error:', e.message); process.exit(2); });
