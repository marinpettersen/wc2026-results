// scripts/seed-knockout.mjs
// Tambah laga fase gugur + broadcaster ke results.json

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("results.json");

const KNOCKOUT_MATCHES = [
  // ROUND OF 32 (WIB → UTC: -7 jam)
  { idx: 1,  round: "Round of 32", kickoff: "2026-06-28T19:00:00.000Z", home: "2A",      away: "2B",      venue: "Los Angeles Stadium, Los Angeles" },
  { idx: 2,  round: "Round of 32", kickoff: "2026-06-29T17:00:00.000Z", home: "1C",      away: "2F",      venue: "Houston Stadium, Houston" },
  { idx: 3,  round: "Round of 32", kickoff: "2026-06-29T20:30:00.000Z", home: "1E",      away: "3ABCDF",  venue: "Boston Stadium, Boston" },
  { idx: 4,  round: "Round of 32", kickoff: "2026-06-30T01:00:00.000Z", home: "1F",      away: "2C",      venue: "Monterrey Stadium, Monterrey" },
  { idx: 5,  round: "Round of 32", kickoff: "2026-06-30T17:00:00.000Z", home: "2E",      away: "2I",      venue: "Dallas Stadium, Dallas" },
  { idx: 6,  round: "Round of 32", kickoff: "2026-06-30T21:00:00.000Z", home: "1I",      away: "3CDFGH",  venue: "New York/NJ Stadium, New Jersey" },
  { idx: 7,  round: "Round of 32", kickoff: "2026-07-01T01:00:00.000Z", home: "1A",      away: "3CEFHI",  venue: "Mexico City Stadium, Mexico City" },
  { idx: 8,  round: "Round of 32", kickoff: "2026-07-01T16:00:00.000Z", home: "1L",      away: "3EHIJK",  venue: "Atlanta Stadium, Atlanta" },
  { idx: 9,  round: "Round of 32", kickoff: "2026-07-01T20:00:00.000Z", home: "1G",      away: "3AEHIJ",  venue: "Seattle Stadium, Seattle" },
  { idx: 10, round: "Round of 32", kickoff: "2026-07-02T00:00:00.000Z", home: "1D",      away: "3BEFIJ",  venue: "San Francisco Bay Area Stadium, San Francisco" },
  { idx: 11, round: "Round of 32", kickoff: "2026-07-02T19:00:00.000Z", home: "1H",      away: "2J",      venue: "Los Angeles Stadium, Los Angeles" },
  { idx: 12, round: "Round of 32", kickoff: "2026-07-02T23:00:00.000Z", home: "2K",      away: "2L",      venue: "Toronto Stadium, Toronto" },
  { idx: 13, round: "Round of 32", kickoff: "2026-07-03T03:00:00.000Z", home: "1B",      away: "3EFGIJ",  venue: "BC Place Stadium, Vancouver" },
  { idx: 14, round: "Round of 32", kickoff: "2026-07-03T18:00:00.000Z", home: "2D",      away: "2G",      venue: "Dallas Stadium, Dallas" },
  { idx: 15, round: "Round of 32", kickoff: "2026-07-03T22:00:00.000Z", home: "1J",      away: "2H",      venue: "Miami Stadium, Miami" },
  { idx: 16, round: "Round of 32", kickoff: "2026-07-04T01:30:00.000Z", home: "1K",      away: "3DEIJL",  venue: "Kansas City Stadium, Kansas City" },

  // ROUND OF 16
  { idx: 1, round: "Round of 16", kickoff: "2026-07-04T17:00:00.000Z", home: "W73", away: "W75", venue: "Houston Stadium, Houston" },
  { idx: 2, round: "Round of 16", kickoff: "2026-07-04T21:00:00.000Z", home: "W74", away: "W77", venue: "Philadelphia Stadium, Philadelphia" },
  { idx: 3, round: "Round of 16", kickoff: "2026-07-05T20:00:00.000Z", home: "W76", away: "W78", venue: "New York/NJ Stadium, New Jersey" },
  { idx: 4, round: "Round of 16", kickoff: "2026-07-06T00:00:00.000Z", home: "W79", away: "W80", venue: "Mexico City Stadium, Mexico City" },
  { idx: 5, round: "Round of 16", kickoff: "2026-07-06T19:00:00.000Z", home: "W83", away: "W84", venue: "Dallas Stadium, Dallas" },
  { idx: 6, round: "Round of 16", kickoff: "2026-07-07T16:00:00.000Z", home: "W86", away: "W88", venue: "Atlanta Stadium, Atlanta" },
  { idx: 7, round: "Round of 16", kickoff: "2026-07-07T19:00:00.000Z", home: "W85", away: "W87", venue: "Vancouver Stadium, Vancouver" },
  { idx: 8, round: "Round of 16", kickoff: "2026-07-08T00:00:00.000Z", home: "W81", away: "W82", venue: "Seattle Stadium, Seattle" },

  // QUARTER FINAL
  { idx: 1, round: "Quarter Final", kickoff: "2026-07-09T20:00:00.000Z", home: "W89", away: "W90", venue: "Boston Stadium, Boston" },
  { idx: 2, round: "Quarter Final", kickoff: "2026-07-10T19:00:00.000Z", home: "W93", away: "W94", venue: "Los Angeles Stadium, Los Angeles" },
  { idx: 3, round: "Quarter Final", kickoff: "2026-07-11T21:00:00.000Z", home: "W91", away: "W92", venue: "Miami Stadium, Miami" },
  { idx: 4, round: "Quarter Final", kickoff: "2026-07-12T01:00:00.000Z", home: "W95", away: "W96", venue: "Kansas City Stadium, Kansas City" },

  // SEMI FINAL
  { idx: 1, round: "Semi Final", kickoff: "2026-07-14T19:00:00.000Z", home: "W97",  away: "W98",  venue: "Dallas Stadium, Dallas" },
  { idx: 2, round: "Semi Final", kickoff: "2026-07-15T19:00:00.000Z", home: "W99",  away: "W100", venue: "Atlanta Stadium, Atlanta" },

  // THIRD PLACE
  { idx: 1, round: "Third Place", kickoff: "2026-07-18T21:00:00.000Z", home: "RU101", away: "RU102", venue: "Miami Stadium, Miami" },

  // FINAL
  { idx: 1, round: "Final", kickoff: "2026-07-19T19:00:00.000Z", home: "W101", away: "W102", venue: "New York/New Jersey Stadium, New Jersey" },
];

function roundSlug(round) {
  return round.toLowerCase().replace(/\s+/g, "-");
}

async function main() {
  const data = JSON.parse(await readFile(OUT, "utf8"));

  // Tambah broadcaster ke semua laga grup yang sudah ada
  let broadcasterAdded = 0;
  for (const m of data.matches) {
    if (m.broadcaster === undefined) {
      m.broadcaster = m.round ? null : "TVRI Sport";
      broadcasterAdded++;
    }
  }
  console.log(`broadcaster ditambahkan ke ${broadcasterAdded} laga yang ada.`);

  // Tambah laga fase gugur (skip jika sudah ada berdasarkan kickoff+round)
  const existingKeys = new Set(
    data.matches.map(m => `${m.kickoff}|${m.round || ""}`)
  );

  let added = 0;
  for (const ko of KNOCKOUT_MATCHES) {
    const key = `${ko.kickoff}|${ko.round}`;
    if (existingKeys.has(key)) {
      console.log(`  skip (sudah ada): ${ko.round} #${ko.idx}`);
      continue;
    }

    data.matches.push({
      id: `ko-${roundSlug(ko.round)}-${ko.idx}`,
      kickoff: ko.kickoff,
      group: null,
      round: ko.round,
      venue: ko.venue,
      status: "NS",
      home: { name: ko.home, flag: "🏳️", goals: null },
      away: { name: ko.away, flag: "🏳️", goals: null },
      penalty: null,
      events: [],
      stats: null,
      clock: null,
      referee: null,
      broadcaster: null,
      _tbd: true,
    });
    added++;
  }

  // Sort semua laga berdasarkan kickoff
  data.matches.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  await writeFile(OUT, JSON.stringify(data, null, 2));
  console.log(`Selesai. ${added} laga fase gugur ditambahkan. Total: ${data.matches.length} laga.`);
}

main().catch(e => { console.error(e); process.exit(1); });
