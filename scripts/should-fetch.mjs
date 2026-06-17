// Smart scheduling: skip fetcher jika tidak ada laga dalam window aktif.
// Exit 0 = skip (tidak perlu fetch), exit 1 = ada laga, jalankan fetcher.
// Zero-dep, Node 20.

import { readFileSync } from "node:fs";

const WINDOW_BEFORE = 10 * 60_000;   // 10 menit sebelum kickoff
const WINDOW_AFTER  = 120 * 60_000;  // 120 menit setelah kickoff

const now = Date.now();

let matches;
try {
  const raw = JSON.parse(readFileSync("results.json", "utf8"));
  matches = raw.matches || [];
} catch {
  console.log("should-fetch: results.json tidak bisa dibaca — jalankan fetcher.");
  process.exit(1);
}

if (!matches.length) {
  console.log("should-fetch: matches kosong — jalankan fetcher.");
  process.exit(1);
}

const active = matches.some(m => {
  if (!m.kickoff) return false;
  const ko = new Date(m.kickoff).getTime();
  return now >= ko - WINDOW_BEFORE && now <= ko + WINDOW_AFTER;
});

if (active) {
  console.log("should-fetch: ada laga dalam window aktif — jalankan fetcher.");
  process.exit(1);
} else {
  console.log("should-fetch: tidak ada laga dalam window — skip, hemat kuota.");
  process.exit(0);
}
