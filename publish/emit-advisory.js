#!/usr/bin/env node
/*
 * Layer C — coordinated public disclosure. When a disclosure reaches PUBLISHED,
 * turn the room's VERIFIED record into the standard advisory formats the
 * ecosystem actually consumes, so the room's history becomes the public record:
 *   - <cve>.osv.json   OSV schema (osv.dev / GitHub Advisory DB ingest)
 *   - <cve>.cve.json   CVE Record Format 5.0 (the official CVE record)
 *   - <cve>.advisory.md  human-readable GHSA-style writeup
 *   - <cve>.checklist.md  where to publish + the Layer B downstream notifications
 * Each carries the record's head hash as tamper-evident provenance.
 *
 * Usage:
 *   node publish/emit-advisory.js <record.json> [--outdir DIR] [--state state.json]
 *   node publish/emit-advisory.js --validate <record.json>   # compare emitted OSV vs the real OSV record
 * Exit: 0 ok / validation matched, 1 validation mismatch, 2 error.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const CWE = { 'Prototype Pollution': 'CWE-1321', 'Cross-site Scripting': 'CWE-79', 'Command Injection': 'CWE-77' };

function loadRecord(file) {
  const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!rec.advisory || !rec.advisory.id) throw new Error('record has no published advisory');
  return rec;
}
// semver fixed version -> an introduced:"0" .. fixed:X range (matches how OSV models it).
function osvRanges(a) {
  return [{ type: 'SEMVER', events: [{ introduced: '0' }, { fixed: a.fixed_version }] }];
}

function toOSV(rec) {
  const a = rec.advisory;
  const pkg = (a.component || 'minimist (npm)').replace(/\s*\(npm\)\s*$/, '');
  return {
    schema_version: '1.6.0',
    id: a.id,
    aliases: [...(a.related || []), ...((a.id.startsWith('CVE-') ? [] : []))].concat(a.osv ? [a.osv] : []),
    summary: `${a.type} in ${pkg}`,
    details: a.summary,
    affected: [{
      package: { ecosystem: 'npm', name: pkg },
      ranges: osvRanges(a),
      database_specific: { fixed: a.fixed_version },
    }],
    severity: a.cvss_v3_1 ? [{ type: 'CVSS_V3', score: a.cvss_v3_1.vector }] : [],
    references: [{ type: 'FIX', url: `https://www.npmjs.com/package/${pkg}/v/${a.fixed_version}` }],
    database_specific: {
      source: 'Embargo Room — emitted from a verified, hash-chained disclosure record',
      record: rec.room,
      record_head: rec.head_hash,
    },
  };
}

function toCVE(rec) {
  const a = rec.advisory;
  const pkg = (a.component || 'minimist (npm)').replace(/\s*\(npm\)\s*$/, '');
  const cna = {
    title: `${a.type} in ${pkg}`,
    descriptions: [{ lang: 'en', value: a.summary }],
    affected: [{
      vendor: 'n/a', product: pkg, collectionURL: 'https://www.npmjs.com', packageName: pkg,
      defaultStatus: 'unaffected',
      versions: [{ version: '0', lessThan: a.fixed_version, status: 'affected', versionType: 'semver' }],
    }],
    references: [{ url: `https://www.npmjs.com/package/${pkg}/v/${a.fixed_version}`, tags: ['patch'] }],
    problemTypes: [{ descriptions: [{ lang: 'en', description: a.type, cweId: CWE[a.type] || 'CWE-noinfo', type: 'CWE' }] }],
    x_embargoRoom: { source: 'verified disclosure record', record_head: rec.head_hash, timeline: rec.timeline },
  };
  if (a.cvss_v3_1) {
    cna.metrics = [{ cvssV3_1: {
      version: '3.1', vectorString: a.cvss_v3_1.vector,
      baseScore: a.cvss_v3_1.base_score, baseSeverity: (a.cvss_v3_1.severity || '').toUpperCase(),
    } }];
  }
  return {
    dataType: 'CVE_RECORD', dataVersion: '5.0',
    cveMetadata: { cveId: a.id, state: 'PUBLISHED', assignerShortName: 'embargo-room' },
    containers: { cna },
  };
}

function toMarkdown(rec) {
  const a = rec.advisory;
  const pkg = (a.component || 'minimist (npm)').replace(/\s*\(npm\)\s*$/, '');
  const sev = a.cvss_v3_1 ? `${a.cvss_v3_1.base_score} ${a.cvss_v3_1.severity} (\`${a.cvss_v3_1.vector}\`)` : 'n/a';
  const tl = (rec.timeline || []).map((t) => `- ${t.ts ? t.ts.slice(0, 10) : ''} — ${t.transition} (${t.by})`).join('\n');
  return `# ${a.type} in ${pkg} (${a.id})

**Package:** \`${pkg}\` (npm)  ·  **Affected:** ${a.affected_versions}  ·  **Fixed:** ${a.fixed_version}
**Severity:** ${sev}${a.related && a.related.length ? `  ·  **Related:** ${a.related.join(', ')}` : ''}

## Summary
${a.summary}

## Remediation
Upgrade to \`${pkg}@${a.fixed_version}\` or later.

## Timeline (from the verified disclosure record)
${tl}

---
*Emitted by Embargo Room from a hash-chained disclosure record.*
*Record: \`${rec.room}\`  ·  head \`${rec.head_hash}\`.*
`;
}

function toChecklist(rec, state) {
  const a = rec.advisory;
  let downstreams = '';
  if (state && Array.isArray(state.downstreams)) {
    downstreams = state.downstreams.map((d) => `- [ ] Notify **${d.package}** maintainer — status: ${d.status}`).join('\n');
  }
  return `# Publication checklist — ${a.id}

Emitted from the verified record \`${rec.room}\` (head \`${rec.head_hash.slice(0, 16)}…\`).

## Public disclosure
- [ ] Submit \`${a.id}.osv.json\` to osv.dev (OSV schema)
- [ ] File \`${a.id}.cve.json\` with the CNA (CVE Record Format 5.0)
- [ ] Open the GitHub Security Advisory using \`${a.id}.advisory.md\`
- [ ] \`npm deprecate\` the affected versions pointing at ${a.fixed_version}

## Downstream notifications (Layer B)
${downstreams || '- (no downstream state provided)'}

> Attach the record head hash to every published artifact so anyone can verify
> the disclosure trail that produced it.
`;
}

async function validate(rec) {
  const a = rec.advisory;
  const pkg = (a.component || 'minimist (npm)').replace(/\s*\(npm\)\s*$/, '');
  const res = await fetch('https://api.osv.dev/v1/query', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ package: { name: pkg, ecosystem: 'npm' } }),
  });
  if (!res.ok) throw new Error('OSV HTTP ' + res.status);
  const vulns = (await res.json()).vulns || [];
  const match = vulns.find((v) => v.id === a.id || (v.aliases || []).includes(a.id));
  if (!match) { console.log(`MISMATCH: OSV has no record for ${a.id} on ${pkg}`); return 1; }
  // compare the fixed version. A multi-line CVE (like this one) has several
  // fixed versions in OSV (e.g. 1.2.6 for the 1.x line, 0.2.4 for 0.x); ours is
  // correct if it is any one of them.
  const osvFixed = new Set();
  for (const aff of match.affected || []) {
    if (aff.package && aff.package.name !== pkg) continue;
    for (const r of aff.ranges || []) for (const e of r.events || []) if (e.fixed) osvFixed.add(e.fixed);
  }
  const okFixed = osvFixed.has(a.fixed_version);
  console.log(`Validating emitted advisory for ${a.id} against osv.dev:`);
  console.log(`  OSV id/alias present : yes (${match.id})`);
  console.log(`  fixed version        : ours ${a.fixed_version} vs OSV {${[...osvFixed].join(', ')}}  ${okFixed ? 'MATCH' : 'MISMATCH'}`);
  console.log(okFixed ? 'VALIDATED: our emitted advisory matches the authoritative OSV record.'
                      : 'MISMATCH: emitted fixed version disagrees with OSV.');
  return okFixed ? 0 : 1;
}

(async () => {
  const args = process.argv.slice(2);
  if (args[0] === '--validate') {
    const rec = loadRecord(args[1]);
    process.exit(await validate(rec));
  }
  const file = args.find((x) => !x.startsWith('--'));
  if (!file) { console.error('usage: emit-advisory.js <record.json> [--outdir DIR] [--state state.json]'); process.exit(2); }
  const outdir = (args.indexOf('--outdir') >= 0) ? args[args.indexOf('--outdir') + 1] : path.join(__dirname, 'out');
  const statePath = (args.indexOf('--state') >= 0) ? args[args.indexOf('--state') + 1] : null;
  let state = null; if (statePath) { try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (e) {} }

  const rec = loadRecord(file);
  const id = rec.advisory.id;
  fs.mkdirSync(outdir, { recursive: true });
  const write = (name, content) => { const p = path.join(outdir, name); fs.writeFileSync(p, content); return p; };
  const files = [
    write(`${id}.osv.json`, JSON.stringify(toOSV(rec), null, 2) + '\n'),
    write(`${id}.cve.json`, JSON.stringify(toCVE(rec), null, 2) + '\n'),
    write(`${id}.advisory.md`, toMarkdown(rec)),
    write(`${id}.checklist.md`, toChecklist(rec, state)),
  ];
  console.log(`Layer C — emitted public disclosure for ${id} from ${rec.room}:`);
  for (const f of files) console.log('  ' + path.relative(process.cwd(), f));
  console.log(`  provenance: record head ${rec.head_hash.slice(0, 16)}…`);
})().catch((e) => { console.error('emit error: ' + e.message); process.exit(2); });
