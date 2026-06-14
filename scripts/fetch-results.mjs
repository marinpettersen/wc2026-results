// scripts/fetch-results.mjs
// PoC fetcher hasil Piala Dunia 2026 — RESULTS ONLY.
// Hanya menyimpan/meng-update laga yang sudah SELESAI (FT/AET/PEN).
// Laga yang sudah final + punya events dianggap "beku" (frozen) -> tidak di-fetch ulang
// supaya hemat kuota free tier.
//
// Default adapter: API-Football v3 (https://www.api-sports.io/documentation/football/v3)
//   - Header  : x-apisports-key  (akses langsung api-sports.io)
//   - League 1 = FIFA World Cup, season 2026
// Mau ganti provider? Cukup ubah fungsi di blok "ADAPTER".
//
// Tanpa API key, script keluar tanpa mengubah results.json (frontend tetap pakai seed).

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT       = path.resolve("results.json");
const API_KEY   = process.env.API_FOOTBALL_KEY || "";
const API_HOST  = process.env.API_FOOTBALL_HOST || "v3.football.api-sports.io";
const LEAGUE_ID = process.env.WC_LEAGUE_ID || "1";     // 1 = FIFA World Cup
const SEASON    = process.env.WC_SEASON || "2026";

const FINAL = new Set(["FT", "AET", "PEN"]);           // selesai
// (LIVE & NS tidak kita simpan skornya — itu urusan frontend)

// name (sesuai API, EN) -> [label Indonesia, bendera]. Termasuk beberapa alias.
const TEAMS = {
  "Mexico":["Meksiko","🇲🇽"], "South Africa":["Afrika Selatan","🇿🇦"],
  "South Korea":["Korea Selatan","🇰🇷"], "Korea Republic":["Korea Selatan","🇰🇷"],
  "Czech Republic":["Ceko","🇨🇿"], "Czechia":["Ceko","🇨🇿"],
  "Canada":["Kanada","🇨🇦"], "Bosnia and Herzegovina":["Bosnia & Herzegovina","🇧🇦"],
  "USA":["Amerika Serikat","🇺🇸"], "United States":["Amerika Serikat","🇺🇸"],
  "Paraguay":["Paraguay","🇵🇾"], "Qatar":["Qatar","🇶🇦"],
  "Switzerland":["Swiss","🇨🇭"], "Brazil":["Brasil","🇧🇷"], "Morocco":["Maroko","🇲🇦"],
  "Haiti":["Haiti","🇭🇹"], "Scotland":["Skotlandia","🏴󠁧󠁢󠁳󠁣󠁴󠁿"], "Australia":["Australia","🇦🇺"],
  "Turkey":["Turki","🇹🇷"], "Türkiye":["Turki","🇹🇷"], "Germany":["Jerman","🇩🇪"],
  "Curacao":["Curacao","🇨🇼"], "Curaçao":["Curacao","🇨🇼"], "Netherlands":["Belanda","🇳🇱"],
  "Japan":["Jepang","🇯🇵"], "Ivory Coast":["Pantai Gading","🇨🇮"], "Côte d'Ivoire":["Pantai Gading","🇨🇮"],
  "Ecuador":["Ekuador","🇪🇨"], "Sweden":["Swedia","🇸🇪"], "Tunisia":["Tunisia","🇹🇳"],
  "Spain":["Spanyol","🇪🇸"], "Cape Verde":["Tanjung Verde","🇨🇻"], "Cabo Verde":["Tanjung Verde","🇨🇻"],
  "Belgium":["Belgia","🇧🇪"], "Egypt":["Mesir","🇪🇬"], "Saudi Arabia":["Arab Saudi","🇸🇦"],
  "Uruguay":["Uruguay","🇺🇾"], "Iran":["Iran","🇮🇷"], "New Zealand":["Selandia Baru","🇳🇿"],
  "France":["Prancis","🇫🇷"], "Senegal":["Senegal","🇸🇳"], "Iraq":["Irak","🇮🇶"],
  "Norway":["Norwegia","🇳🇴"], "Argentina":["Argentina","🇦🇷"], "Algeria":["Aljazair","🇩🇿"],
  "Austria":["Austria","🇦🇹"], "Jordan":["Yordania","🇯🇴"], "Portugal":["Portugal","🇵🇹"],
  "DR Congo":["Kongo","🇨🇩"], "Congo DR":["Kongo","🇨🇩"], "England":["Inggris","🏴󠁧󠁢󠁥󠁮󠁧󠁿"],
  "Croatia":["Kroasia","🇭🇷"], "Ghana":["Ghana","🇬🇭"], "Panama":["Panama","🇵🇦"],
  "Uzbekistan":["Uzbekistan","🇺🇿"], "Colombia":["Kolombia","🇨🇴"]
};
const team = name => TEAMS[name] || [name, "🏳️"];

// ----------------------------------------------------------------------------
// ADAPTER (API-Football v3) — ganti 3 fungsi ini kalau pindah provider
// ----------------------------------------------------------------------------
async function api(endpoint) {
  const url = `https://${API_HOST}/${endpoint}`;
  const res = await fetch(url, { headers: { "x-apisports-key": API_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${endpoint}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length)
    console.warn("  ! API errors:", JSON.stringify(json.errors));
  return json.response || [];
}

const minuteOf = t => `${t.elapsed ?? ""}${t.extra ? "+" + t.extra : ""}`;

// fixture -> objek match dasar (tanpa events/stats)
function mapFixture(fx) {
  const homeName = fx.teams.home.name, awayName = fx.teams.away.name;
  const [hl, hf] = team(homeName), [al, af] = team(awayName);
  const pen = fx.score?.penalty;
  return {
    id: fx.fixture.id,
    apiId: fx.fixture.id,
    kickoff: fx.fixture.date,                 // ISO (UTC offset dari API)
    group: null,                              // bisa diisi dari fx.league.round kalau perlu
    venue: fx.fixture.venue?.name
      ? `${fx.fixture.venue.name}${fx.fixture.venue.city ? ", " + fx.fixture.venue.city : ""}`
      : null,
    status: fx.fixture.status.short,          // NS / 1H / HT / FT / AET / PEN / PST / ...
    home: { name: hl, flag: hf, goals: fx.goals.home },
    away: { name: al, flag: af, goals: fx.goals.away },
    penalty: (pen && pen.home != null) ? { home: pen.home, away: pen.away } : null,
    events: [],
    stats: null,
    _homeId: fx.teams.home.id
  };
}

// events: /fixtures/events?fixture=ID
function mapEvents(raw, homeId) {
  const out = [];
  for (const e of raw) {
    const isHome = e.team.id === homeId;
    if (e.type === "Goal") {
      if (e.detail === "Missed Penalty") continue;
      const ownGoal = e.detail === "Own Goal";
      // own goal dihitung untuk tim lawan
      out.push({
        team: ownGoal ? (isHome ? "away" : "home") : (isHome ? "home" : "away"),
        type: "goal",
        player: e.player?.name || "?",
        minute: minuteOf(e.time),
        ...(ownGoal ? { tag: "b.d." } : (e.detail === "Penalty" ? { tag: "pen" } : {}))
      });
    } else if (e.type === "Card" && e.detail === "Red Card") {
      out.push({ team: isHome ? "home" : "away", type: "redcard",
        player: e.player?.name || "?", minute: minuteOf(e.time) });
    }
  }
  return out;
}

// statistics: /fixtures/statistics?fixture=ID
function mapStats(raw, homeId) {
  if (!raw || raw.length < 2) return null;
  const home = raw.find(r => r.team.id === homeId) || raw[0];
  const away = raw.find(r => r.team.id !== homeId) || raw[1];
  const pick = (side, type) => {
    const s = side.statistics.find(x => x.type === type);
    if (!s || s.value == null) return 0;
    return typeof s.value === "string" ? parseInt(s.value, 10) || 0 : s.value;
  };
  return {
    possession: [pick(home, "Ball Possession"), pick(away, "Ball Possession")],
    shots:      [pick(home, "Total Shots"),      pick(away, "Total Shots")],
    sot:        [pick(home, "Shots on Goal"),    pick(away, "Shots on Goal")],
    fouls:      [pick(home, "Fouls"),            pick(away, "Fouls")],
    offsides:   [pick(home, "Offsides"),         pick(away, "Offsides")]
  };
}
// ----------------------------------------------------------------------------

async function loadExisting() {
  try { return JSON.parse(await readFile(OUT, "utf8")); }
  catch { return { competition: "FIFA World Cup 2026", season: Number(SEASON), matches: [] }; }
}

const isFrozen = m => FINAL.has(m.status) && Array.isArray(m.events) && m.events.length > 0;

async function main() {
  const existing = await loadExisting();
  const byId = new Map(existing.matches.map(m => [m.id, m]));

  if (!API_KEY) {
    console.log("API_FOOTBALL_KEY kosong → pakai results.json yang ada (seed). Tidak ada perubahan.");
    return;
  }

  console.log(`Fetch fixtures: league=${LEAGUE_ID} season=${SEASON} ...`);
  let fixtures = [];
  try {
    fixtures = await api(`fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
  } catch (err) {
    console.error("Gagal ambil fixtures:", err.message, "→ keep seed.");
    return;
  }
  console.log(`  dapat ${fixtures.length} fixtures.`);

  let added = 0, enriched = 0;
  for (const fx of fixtures) {
    const base = mapFixture(fx);
    const prev = byId.get(base.id);

    // sudah final + sudah beku → biarkan (hemat kuota)
    if (prev && isFrozen(prev)) continue;

    // hanya simpan/enrich kalau SELESAI; kalau belum, simpan status saja (skor tidak ditampilkan FE)
    if (FINAL.has(base.status)) {
      const homeId = base._homeId;
      try {
        const [ev, st] = await Promise.all([
          api(`fixtures/events?fixture=${base.id}`),
          api(`fixtures/statistics?fixture=${base.id}`)
        ]);
        base.events = mapEvents(ev, homeId);
        base.stats  = mapStats(st, homeId);
        enriched++;
      } catch (err) {
        console.warn(`  enrich gagal utk ${base.id}: ${err.message} (skor tetap disimpan)`);
      }
    }
    delete base._homeId;
    byId.set(base.id, { ...(prev || {}), ...base });
    added++;
  }

  const matches = [...byId.values()]
    .map(m => { delete m._homeId; return m; })
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  const out = {
    competition: "FIFA World Cup 2026",
    season: Number(SEASON),
    updatedAt: new Date().toISOString(),
    source: `api-football league ${LEAGUE_ID} season ${SEASON}`,
    matches
  };
  await writeFile(OUT, JSON.stringify(out, null, 2));
  console.log(`Selesai. update=${added}, enrich(events+stats)=${enriched}, total=${matches.length}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
