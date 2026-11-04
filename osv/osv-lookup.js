#!/usr/bin/env node
/*
 * Grounding helper: look a package up in the public OSV advisory database
 * (osv.dev, which aggregates GitHub Security Advisories, NVD and others).
 * The Advisory agent uses it to back CVE IDs and affected/fixed ranges with the
 * authoritative record instead of asserting them, and to cross-check that the
 * room's own Docker verdicts agree with that record.
 * Usage: node osv/osv-lookup.js <npm-package> [version]
 *   no version: list every known advisory with its affected ranges.
 *   version:    list only advisories that affect that exact version.
 * Exit 0 = ok (with a version: NOT affected), 1 = version AFFECTED, 2 = error.
 */
'use strict';
const https = require('https');
const [pkg, version] = process.argv.slice(2);
if (!pkg) {
  console.error('usage: osv-lookup.js <npm-package> [version]');
  process.exit(2);
}

function query(pageToken) {
  const body = { package: { name: pkg, ecosystem: 'npm' } };
  if (version) body.version = version;
  if (pageToken) body.page_token = pageToken;
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error('OSV HTTP ' + res.statusCode));
        try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end(data);
  });
}

// Turn OSV range events into "introduced X -> fixed Y" spans.
function spans(affected) {
  const out = [];
  for (const a of affected) {
    if (!a.package || a.package.name !== pkg) continue;
    for (const r of a.ranges || []) {
      let intro = null;
      for (const e of r.events || []) {
        if (e.introduced !== undefined) intro = e.introduced;
        if (e.fixed !== undefined) { out.push(`>=${intro} <${e.fixed} (fixed ${e.fixed})`); intro = null; }
        if (e.last_affected !== undefined) { out.push(`>=${intro} <=${e.last_affected} (no fix)`); intro = null; }
      }
      if (intro !== null) out.push(`>=${intro} (no fix)`);
    }
  }
  return out;
}

(async () => {
  try {
    const vulns = [];
    let token;
    do {
      const d = await query(token);
      vulns.push(...(d.vulns || []));
      token = d.next_page_token;
    } while (token);

    const label = version ? `${pkg}@${version}` : pkg;
    if (!vulns.length) {
      console.log(version ? `NOT AFFECTED  OSV lists no advisory affecting ${label}`
                          : `NO ADVISORIES  OSV lists nothing for ${label}`);
      process.exit(0);
    }
    console.log(`${version ? 'AFFECTED' : 'ADVISORIES'}  ${label}: ${vulns.length} known advisor${vulns.length === 1 ? 'y' : 'ies'} (source: osv.dev)`);
    for (const v of vulns) {
      const cves = (v.aliases || []).filter((a) => a.startsWith('CVE-'));
      console.log(`  ${v.id}${cves.length ? ' (' + cves.join(', ') + ')' : ''}  ${(v.summary || '').trim()}`);
      for (const s of spans(v.affected || [])) console.log('    affected ' + s);
    }
    process.exit(version ? 1 : 0);
  } catch (e) {
    console.error('osv error:', e.message);
    process.exit(2);
  }
})();
