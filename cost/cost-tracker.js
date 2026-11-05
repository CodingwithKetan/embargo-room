#!/usr/bin/env node
/*
 * cost-tracker.js — what does each agent cost to run this disclosure?
 *
 * Switch's model is "one agent, many rooms" — which is exactly why you need to
 * know what each agent spends across the workflow. This attributes estimated
 * LLM + infrastructure cost PER AGENT from the room's recorded activity, using
 * the transparent rate card in cost/rates.json. Swap the per-turn averages for
 * real provider token telemetry and the same report becomes exact.
 *
 * Usage:
 *   node cost/cost-tracker.js [record.json]      # default: the minimist demo
 *   node cost/cost-tracker.js --json [record.json]
 * Also exports buildCostReport(recordPath) for the dashboard.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const AGENTS = {
  'embargo-timekeeper': 'Timekeeper',
  'embargo-repro': 'Repro',
  'embargo-advisory': 'Advisory',
  'embargo-watch': 'Watch',
};
const NOISE = [/^worked for\b/i, /^starting a session/i, /standing by/i, /^on it\b/i,
  /added to the channel/i, /joined the channel/i, /^(hi|hey|hello)\b/i, /i'?m here to help/i,
  /tag @embargo/i, /ping @embargo/i, /template kickoff/i];
const isVerify = (t) => /\bTRIGGERED\b|\bREPRODUCED\b|INCOMPLETE_FIX|VERIFIED_FIXED|\bSAFE\b/.test(t);

function round(n, d = 2) { const p = 10 ** d; return Math.round(n * p) / p; }

function buildCostReport(recPath) {
  const rec = JSON.parse(fs.readFileSync(recPath, 'utf8'));
  const rates = JSON.parse(fs.readFileSync(path.join(__dirname, 'rates.json'), 'utf8'));
  const inTok = rates.avg_input_tokens_per_turn, outTok = rates.avg_output_tokens_per_turn;
  const costPerTurn = (inTok / 1000) * rates.price_per_1k_input_usd + (outTok / 1000) * rates.price_per_1k_output_usd;
  const buildCost = rates.docker_build.est_minutes_per_verify * rates.docker_build.usd_per_minute;

  const agents = {};
  for (const key of Object.keys(AGENTS)) agents[key] = { id: key, name: AGENTS[key], turns: 0, verifies: 0 };

  for (const e of rec.entries || []) {
    if (!AGENTS[e.author]) continue;
    const text = (e.text || '').trim();
    if (!text || NOISE.some((re) => re.test(text))) continue;
    agents[e.author].turns += 1;
    if (e.author === 'embargo-repro' && isVerify(text)) agents[e.author].verifies += 1;
  }

  const rows = Object.values(agents).filter((a) => a.turns > 0).map((a) => {
    const tokens = a.turns * (inTok + outTok);
    const llm = a.turns * costPerTurn;
    const infra = a.verifies * buildCost;
    return { ...a, tokens, llm: round(llm, 3), infra: round(infra, 3), total: round(llm + infra, 3) };
  });
  rows.sort((x, y) => y.total - x.total);

  const totalLlm = round(rows.reduce((s, r) => s + r.llm, 0), 2);
  const totalInfra = round(rows.reduce((s, r) => s + r.infra, 0), 3);
  const total = round(totalLlm + totalInfra, 2);
  const totalTurns = rows.reduce((s, r) => s + r.turns, 0);
  const totalTokens = rows.reduce((s, r) => s + r.tokens, 0);

  return {
    record: path.basename(recPath),
    advisory: (rec.advisory || {}).id || null,
    model: rates.model, currency: rates.currency,
    agents: rows,
    totals: { turns: totalTurns, tokens: totalTokens, llm: totalLlm, infra: totalInfra, total },
    costPerDisclosure: total,
    mostExpensive: rows[0] ? rows[0].name : null,
    estimated: true,
  };
}

module.exports = { buildCostReport };

// --- CLI -----------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const recPath = args.find((a) => a.endsWith('.json') && !a.startsWith('--'))
    || path.join(ROOT, 'record', 'embargo-minimist-demo.record.json');
  const r = buildCostReport(recPath);
  if (asJson) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
  const bar = '─'.repeat(64);
  console.log(`\n  AGENT COST TRACKER — ${r.advisory || r.record}   (model: ${r.model})`);
  console.log(`  ${bar}`);
  console.log(`  ${'Agent'.padEnd(13)}${'Turns'.padStart(6)}${'Est. tokens'.padStart(14)}${'LLM $'.padStart(9)}${'Verify'.padStart(8)}${'Infra $'.padStart(9)}`);
  for (const a of r.agents) {
    console.log(`  ${a.name.padEnd(13)}${String(a.turns).padStart(6)}${a.tokens.toLocaleString().padStart(14)}${('$' + a.llm.toFixed(2)).padStart(9)}${String(a.verifies || '—').padStart(8)}${(a.infra ? '$' + a.infra.toFixed(2) : '—').padStart(9)}`);
  }
  console.log(`  ${bar}`);
  console.log(`  TOTAL${String(r.totals.turns).padStart(14)}${r.totals.tokens.toLocaleString().padStart(14)}${('$' + r.totals.llm.toFixed(2)).padStart(9)}${''.padStart(8)}${('$' + r.totals.infra.toFixed(2)).padStart(9)}`);
  console.log(`\n  Cost per disclosure:  $${r.costPerDisclosure.toFixed(2)}   ·   most expensive agent: ${r.mostExpensive}`);
  console.log(`  Estimate from recorded activity — plug in real token telemetry for exact figures (cost/rates.json).\n`);
}
