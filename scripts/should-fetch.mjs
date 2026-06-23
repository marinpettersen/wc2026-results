// Smart scheduling: skip fetcher jika tidak ada laga dalam window aktif.
// Exit 0 = skip (tidak perlu fetch), exit 1 = ada laga, jalankan fetcher.
// Zero-dep, Node 20.

import { readFileSync } from "node:fs";

const FINAL = new Set(["FT", "AET", "PEN"]);
const LIVE  = new Set(["1H", "HT", "2H", "ET", "BT", "P"]);

const now = Date.now();
const WINDOW_BEFORE = 10 * 60_000;     // 10 menit sebelum kickoff
const WINDOW_AFTER  = 150 * 60_000;    // 150 menit setelah kickoff
const STALE_MAX     = 300 * 60_000;    // 5 jam — batas laga stale

let matches;
try {
  const raw = JSON.parse(readFileSync("results.json", "utf8"));
  matches = raw.matches || [];
} catch {
  console.log("should-fetch: results.json tidak bisa dibaca — jalankan fetcher.");
  process.exitCode = 1;
  process.exit();
}

if (!matches.length) {
  console.log("should-fetch: matches kosong — jalankan fetcher.");
  process.exitCode = 1;
  process.exit();
}

const hasActiveWindow = matches.some(m => {
  if (!m.kickoff) return false;
  const ko = new Date(m.kickoff).getTime();
  return now >= ko - WINDOW_BEFORE && now <= ko + WINDOW_AFTER;
});

const hasStale = matches.some(m => {
  if (!m.kickoff || FINAL.has(m.status)) return false;
  const elapsed = now - new Date(m.kickoff).getTime();
  return elapsed > WINDOW_BEFORE && elapsed < STALE_MAX;
});

const hasLive = matches.some(m => LIVE.has(m.status));

if (hasActiveWindow || hasStale || hasLive) {
  console.log("Fetch diperlukan:",
    hasActiveWindow ? "ada laga dalam window" : "",
    hasStale ? "ada laga stale (belum update)" : "",
    hasLive ? "ada laga live" : ""
  );
  process.exitCode = 1;
} else {
  console.log("Tidak ada laga aktif, skip.");
  process.exitCode = 0;
}
