#!/usr/bin/env node
/*
 * Pluggable case runner — proves Embargo Room is a disclosure framework, not a
 * one-CVE replay. Give it a case file (declarative: package, PoC, versions,
 * expected verdicts) and it builds each pinned version in Docker, runs the
 * case's PoC offline, and cross-checks every verdict against the public OSV
 * record for that case's CVE. Two independent sources — a build-and-run and the
 * authoritative advisory DB — must agree, per version.
 *
 * Usage: node cases/run.js <case.json> [<case.json> ...]
 * Exit 0 = every version agrees (PoC == OSV == expected), 1 = a mismatch, 2 = error.
 *
 * Docker-group self-heal mirrors verify.sh: if the socket isn't reachable but
 * the user is a docker member, commands are re-run under `sg docker`.
 */
'use strict';
const fs = require('fs');
const { execSync, spawnSync } = require('child_process');

// ---- docker access (self-heal to `sg docker` like verify.sh) ----
function canDocker(prefix) {
  const r = spawnSync('sh', ['-c', `${prefix}docker info`], { stdio: 'ignore' });
  return r.status === 0;
}
let PREFIX = '';
if (!canDocker('')) {
  if (canDocker('sg docker -c "') ) PREFIX = 'SG';   // marker; handled in sh()
}
// Run a docker command through sh so the sg wrapping is uniform. Returns {status,out}.
function dockerCmd(cmd) {
  const full = PREFIX === 'SG' ? `sg docker -c ${JSON.stringify('docker ' + cmd)}` : `docker ${cmd}`;
  const r = spawnSync('sh', ['-c', full], { encoding: 'utf8' });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

// ---- OSV: is <pkg>@<version> affected by <cve>? (retries transient errors) ----
async function osvAffectedBy(pkg, version, cve) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://api.osv.dev/v1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, package: { name: pkg, ecosystem: 'npm' } }),
      });
      if (!res.ok) throw new Error('OSV HTTP ' + res.status);
      const d = await res.json();
      return (d.vulns || []).some((v) => (v.aliases || []).includes(cve) || v.id === cve);
    } catch (e) {
      last = e;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw last;
}

async function runCase(file) {
  const c = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`\n=== ${c.id} (${c.cve}) — ${c.class} ===`);
  console.log(`package ${c.package}  poc ${c.poc}  fixed ${c.fixedVersion}  source osv.dev/${c.osv}`);
  console.log('  version  | PoC build+run | OSV(' + c.cve + ') | expect    | agree');
  console.log('  ---------+---------------+' + '-'.repeat(c.cve.length + 6) + '+-----------+------');
  let allAgree = true;
  for (const [ver, expect] of Object.entries(c.versionsUnderTest)) {
    const img = `embargo-case-${c.package}-${ver}`;
    const build = dockerCmd(`build -q -f docker/Dockerfile.case --build-arg PKG=${c.package} --build-arg VER=${ver} -t ${img} .`);
    if (build.status !== 0) { console.log(`  ${ver.padEnd(8)} | BUILD FAILED  | ${build.out.trim().slice(0,60)}`); allAgree = false; continue; }
    const run = dockerCmd(`run --rm --network none ${img} ${c.poc} ${c.package}`);
    const poc = run.status === 0 ? 'TRIGGERED' : run.status === 1 ? 'SAFE' : 'ERROR';
    let osv;
    try { osv = (await osvAffectedBy(c.package, ver, c.cve)) ? 'AFFECTED' : 'not affected'; }
    catch (e) { osv = 'osv-error'; }
    const pocSaysAffected = poc === 'TRIGGERED';
    const osvSaysAffected = osv === 'AFFECTED';
    const agree = (poc === expect) && (pocSaysAffected === osvSaysAffected) && osv !== 'osv-error';
    if (!agree) allAgree = false;
    console.log(`  ${ver.padEnd(8)} | ${poc.padEnd(13)} | ${osv.padEnd(c.cve.length + 4)} | ${expect.padEnd(9)} | ${agree ? 'yes' : 'NO'}`);
  }
  return allAgree;
}

(async () => {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('usage: node cases/run.js <case.json> [...]'); process.exit(2); }
  if (PREFIX === 'SG') console.log('(docker group not active in this shell — running docker via `sg docker`)');
  let ok = true;
  for (const f of files) {
    try { ok = (await runCase(f)) && ok; }
    catch (e) { console.error(`case ${f} error:`, e.message); ok = false; }
  }
  console.log(ok ? '\nALL CASES AGREE  (PoC verdicts == OSV == expected)' : '\nMISMATCH  (a verdict disagreed with OSV or the expected value)');
  process.exit(ok ? 0 : 1);
})();
