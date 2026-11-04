#!/usr/bin/env node
// server.js — serve the local Embargo activity dashboard. Zero dependencies.
//
//   node dashboard/server.js                 # offline, reads the committed records
//   PORT=7070 node dashboard/server.js       # pick a port (default 7070)
//   MM_TOKEN=... MM_CHANNEL=<id> node dashboard/server.js   # also offer LIVE room
//
// Then open http://localhost:7070  (shows which agent did what, status, failures).

const http = require("http");
const fs = require("fs");
const path = require("path");
const { fromRecord, fromLive } = require("./activity");

const PORT = Number(process.env.PORT || 7070);
const DIR = __dirname;
const REPO = path.join(DIR, "..");
const MM_BASE = process.env.MM_BASE || "http://localhost:42111";
const MM_TOKEN = process.env.MM_TOKEN || "";
const MM_CHANNEL = process.env.MM_CHANNEL || "n9mgu4i143yxxqmu5cz9bb65dc"; // embargo-minimist-live
const MM_ROOM = process.env.MM_ROOM || "switch/embargo-minimist-live";

function records() {
  return fs.readdirSync(path.join(REPO, "record"))
    .filter((f) => f.endsWith(".record.json"))
    .map((f) => ({ id: f, label: f.replace(".record.json", "").replace(/^embargo-/, "") }));
}

function send(res, code, body, type = "application/json") {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return send(res, 200, fs.readFileSync(path.join(DIR, "live.html")), "text/html; charset=utf-8");
    }
    if (url.pathname === "/api/sources") {
      return send(res, 200, JSON.stringify({
        records: records(),
        live: MM_TOKEN ? { channel: MM_CHANNEL, room: MM_ROOM } : null,
      }));
    }
    if (url.pathname === "/api/activity") {
      const src = url.searchParams.get("src") || "record";
      if (src === "live") {
        if (!MM_TOKEN) return send(res, 400, JSON.stringify({ error: "live source off (set MM_TOKEN)" }));
        const model = await fromLive(MM_BASE, MM_TOKEN, MM_CHANNEL, MM_ROOM);
        return send(res, 200, JSON.stringify(model));
      }
      const file = url.searchParams.get("record") || "embargo-minimist-demo.record.json";
      const safe = path.basename(file); // no traversal
      const full = path.join(REPO, "record", safe);
      if (!fs.existsSync(full)) return send(res, 404, JSON.stringify({ error: "no such record" }));
      return send(res, 200, JSON.stringify(fromRecord(full)));
    }
    send(res, 404, JSON.stringify({ error: "not found" }));
  } catch (e) {
    send(res, 500, JSON.stringify({ error: String((e && e.message) || e) }));
  }
});

server.listen(PORT, () => {
  console.log(`\n  Embargo activity dashboard → http://localhost:${PORT}`);
  console.log(`  source: committed records${MM_TOKEN ? " + LIVE room (MM_TOKEN set)" : " (set MM_TOKEN for a live room)"}`);
  console.log(`  Ctrl-C to stop.\n`);
});
