// activity.js — turn a disclosure room's history into an activity model:
// which agent did what task, the current status, and every failure/flag.
// Source is either a committed record file (offline, default) or the live
// Mattermost room (when MM_TOKEN is set). Zero dependencies.

const fs = require("fs");
const http = require("http");

// --- display metadata for the participants in a disclosure room ----------
const LANES = {
  "embargo-timekeeper": { name: "Timekeeper", role: "agent", blurb: "Owns the clock + state" },
  "embargo-repro":      { name: "Repro",      role: "agent", blurb: "Builds & runs the PoC" },
  "embargo-advisory":   { name: "Advisory",   role: "agent", blurb: "Drafts the CVE / advisory" },
  "embargo-watch":      { name: "Watch",      role: "agent", blurb: "Auto-mode CVE scout" },
  "user":               { name: "Humans",     role: "human", blurb: "Researcher + vendor" },
};

const NOISE = [
  /^worked for\b/i, /^starting a session/i, /standing by/i, /^on it\b/i,
  /added to the channel/i, /joined the channel/i, /^(hi|hey|hello)\b/i,
  /i'?m here to help/i, /tag @embargo/i, /ping @embargo/i, /template kickoff/i,
];

// classify one entry's text into a task {kind, status, sev}
function classify(text) {
  const t = text.toLowerCase();
  const has = (re) => re.test(t);
  if (has(/incomplete_fix|incomplete fix|verification failed/))
    return { kind: "failure", status: "INCOMPLETE FIX", sev: "crit" };
  if (has(/cannot_reproduce|cannot reproduce/))
    return { kind: "failure", status: "CANNOT REPRODUCE", sev: "crit" };
  if (has(/\[needs human\]|needs human/))
    return { kind: "attention", status: "NEEDS HUMAN", sev: "warn" };
  if (has(/silence_exceeded|deadline_passed|mismatch|disagree/))
    return { kind: "attention", status: "FLAG", sev: "warn" };
  if (has(/published/))       return { kind: "state", status: "PUBLISHED", sev: "good" };
  if (has(/verified_fixed|→ safe\b|: safe\b|\bis safe\b/))
    return { kind: "fixed", status: "VERIFIED FIXED", sev: "good" };
  if (has(/signed_off|sign-?off/)) return { kind: "state", status: "SIGNED OFF", sev: "good" };
  if (has(/reproduced|triggered|still vulnerable/))
    return { kind: "triggered", status: "TRIGGERED", sev: "crit" };
  if (has(/readiness|ready\b/))    return { kind: "state", status: "READINESS", sev: "info" };
  if (has(/draft|advisory|redline|cvss/)) return { kind: "task", status: "ADVISORY", sev: "info" };
  if (has(/osv|grounding|cross-?check|osv\.dev/)) return { kind: "task", status: "GROUNDING", sev: "info" };
  if (has(/clock|day \d+ of|embargo|deadline/)) return { kind: "info", status: "CLOCK", sev: "info" };
  if (has(/downstream|dependent|layer b/)) return { kind: "task", status: "DOWNSTREAM", sev: "info" };
  if (has(/→|->|state[:\s]/)) return { kind: "state", status: "STATE", sev: "info" };
  return { kind: "task", status: "", sev: "info" };
}

function label(text) {
  // first meaningful line, stripped of markdown + leading mentions
  let line = (text.split("\n").find((l) => l.trim()) || "").trim();
  line = line.replace(/\*\*/g, "").replace(/^(@\S+\s*)+/,"").replace(/^#+\s*/,"").trim();
  return line.length > 110 ? line.slice(0, 108) + "…" : line;
}

// build the activity model from a normalized entry list + meta
function buildActivity(entries, meta) {
  const lanes = {};
  const order = [];
  const failures = [];
  for (const e of entries) {
    const key = LANES[e.author] ? e.author : (e.role === "agent" ? e.author : "user");
    if (!lanes[key]) {
      lanes[key] = { id: key, ...(LANES[key] || { name: e.author, role: e.role, blurb: "" }), tasks: [] };
      order.push(key);
    }
    const text = (e.text || "").trim();
    if (!text || NOISE.some((re) => re.test(text))) continue;
    const lab = label(text);               // classify on the header line, not the
    const c = classify(lab);               // body (bodies often *mention* a verdict)
    const task = { ts: e.ts, label: lab, kind: c.kind, status: c.status, sev: c.sev };
    lanes[key].tasks.push(task);
    if (c.kind === "failure" || c.kind === "attention")
      failures.push({ ts: e.ts, author: lanes[key].name, label: task.label, status: c.status, sev: c.sev });
  }
  // keep lanes in a sensible order
  const laneOrder = ["embargo-timekeeper", "embargo-repro", "embargo-advisory", "embargo-watch", "user"];
  const outLanes = laneOrder.filter((k) => lanes[k]).map((k) => lanes[k]);
  const timeline = meta.timeline || [];
  const currentState =
    (timeline.length && (timeline[timeline.length - 1].transition || "").split(/→|->/).pop().trim()) ||
    (meta.advisory && meta.advisory.status) || "—";
  return {
    room: meta.room,
    source: meta.source,
    exportedAt: meta.exportedAt || new Date().toISOString(),
    head: meta.head,
    advisory: meta.advisory || null,
    currentState,
    counts: {
      tasks: outLanes.reduce((n, l) => n + l.tasks.length, 0),
      failures: failures.length,
      states: timeline.length,
    },
    lanes: outLanes,
    failures,
    timeline,
  };
}

// --- source: a committed record file -------------------------------------
function fromRecord(path) {
  const r = JSON.parse(fs.readFileSync(path, "utf8"));
  const entries = (r.entries || []).map((e) => ({
    seq: e.seq, ts: e.ts, author: e.author, role: e.role, text: e.text,
  }));
  return buildActivity(entries, {
    room: r.room, source: `record:${path.split("/").pop()}`,
    exportedAt: r.exported_at, head: (r.head_hash || "").slice(0, 16),
    advisory: r.advisory, timeline: r.timeline,
  });
}

// --- source: the live Mattermost room ------------------------------------
function mmGet(base, token, path) {
  return new Promise((resolve, reject) => {
    const u = new URL(base + path);
    http.get(u, { headers: { Authorization: `Bearer ${token}` } }, (res) => {
      let b = ""; res.on("data", (d) => (b += d));
      res.on("end", () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    }).on("error", reject);
  });
}

async function fromLive(base, token, channelId, roomName) {
  const d = await mmGet(base, token, `/api/v4/channels/${channelId}/posts?per_page=200`);
  const posts = d.posts || {}, orderIds = d.order || [];
  const rows = orderIds.map((id) => posts[id]).sort((a, b) => a.create_at - b.create_at);
  // resolve usernames (cached)
  const nameCache = {};
  async function uname(uid) {
    if (nameCache[uid]) return nameCache[uid];
    try { const u = await mmGet(base, token, `/api/v4/users/${uid}`); nameCache[uid] = u.username; }
    catch { nameCache[uid] = uid.slice(0, 8); }
    return nameCache[uid];
  }
  const entries = [];
  for (const p of rows) {
    const name = await uname(p.user_id);
    entries.push({
      ts: new Date(p.create_at).toISOString(), author: name,
      role: LANES[name] && LANES[name].role === "agent" ? "agent" : "human",
      text: p.message,
    });
  }
  // derive a timeline from the timekeeper's transition posts
  const timeline = entries
    .filter((e) => e.author === "embargo-timekeeper" && /→|->/.test(e.text))
    .map((e) => ({ ts: e.ts, by: e.author, transition: label(e.text) }));
  return buildActivity(entries, {
    room: roomName || `live:${channelId}`, source: "live:mattermost",
    exportedAt: new Date().toISOString(), head: null, advisory: null, timeline,
  });
}

module.exports = { buildActivity, fromRecord, fromLive, LANES };

// CLI: node dashboard/activity.js [record-path]   → prints the model as JSON
if (require.main === module) {
  const p = process.argv[2] || "record/embargo-minimist-demo.record.json";
  console.log(JSON.stringify(fromRecord(p), null, 2));
}
