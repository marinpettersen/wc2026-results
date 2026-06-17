// scripts/fetch-results.mjs
// PoC fetcher hasil Piala Dunia 2026 — RESULTS ONLY.
// Hanya menyimpan/meng-update laga yang sudah SELESAI (FT/AET/PEN).
// Laga yang sudah final + punya events dianggap "beku" (frozen) → tidak di-fetch ulang
// supaya hemat kuota free tier.
//
// Adapter tersedia:
//   apifootball  — API-Football v3 (x-apisports-key, v3.football.api-sports.io)
//                  CATATAN: free tier menolak season 2026.
//   highlightly  — Highlightly (x-rapidapi-key, soccer.highlightly.net)
//                  League 1635 = FIFA World Cup 2026, free tier 100 req/hari.
//
// Pilih via env: PROVIDER=highlightly|apifootball (default: apifootball)
// Tanpa API key, script keluar tanpa mengubah results.json (frontend tetap pakai seed).

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT      = path.resolve("results.json");
const PROVIDER = (process.env.PROVIDER || "apifootball").toLowerCase();
const SEASON   = process.env.WC_SEASON || "2026";

const FINAL = new Set(["FT", "AET", "PEN"]);
const LIVE  = new Set(["1H", "HT", "2H", "ET", "BT", "P"]);

// name (EN dari API) → [label Indonesia, emoji, kode ISO 2-huruf]. Berlaku untuk semua adapter.
const TEAMS = {
  "Mexico":["Meksiko","🇲🇽","mx"], "South Africa":["Afrika Selatan","🇿🇦","za"],
  "South Korea":["Korea Selatan","🇰🇷","kr"], "Korea Republic":["Korea Selatan","🇰🇷","kr"],
  "Czech Republic":["Ceko","🇨🇿","cz"], "Czechia":["Ceko","🇨🇿","cz"],
  "Canada":["Kanada","🇨🇦","ca"],
  "Bosnia and Herzegovina":["Bosnia & Herzegovina","🇧🇦","ba"],
  "Bosnia & Herzegovina":["Bosnia & Herzegovina","🇧🇦","ba"],   // alias Highlightly
  "USA":["Amerika Serikat","🇺🇸","us"], "United States":["Amerika Serikat","🇺🇸","us"],
  "Paraguay":["Paraguay","🇵🇾","py"], "Qatar":["Qatar","🇶🇦","qa"],
  "Switzerland":["Swiss","🇨🇭","ch"], "Brazil":["Brasil","🇧🇷","br"], "Morocco":["Maroko","🇲🇦","ma"],
  "Haiti":["Haiti","🇭🇹","ht"], "Scotland":["Skotlandia","🏴󠁧󠁢󠁳󠁣󠁴󠁿","gb-sct"], "Australia":["Australia","🇦🇺","au"],
  "Turkey":["Turki","🇹🇷","tr"], "Türkiye":["Turki","🇹🇷","tr"], "Germany":["Jerman","🇩🇪","de"],
  "Curacao":["Curacao","🇨🇼","cw"], "Curaçao":["Curacao","🇨🇼","cw"], "Netherlands":["Belanda","🇳🇱","nl"],
  "Japan":["Jepang","🇯🇵","jp"],
  "Ivory Coast":["Pantai Gading","🇨🇮","ci"], "Côte d'Ivoire":["Pantai Gading","🇨🇮","ci"],
  "Ecuador":["Ekuador","🇪🇨","ec"], "Sweden":["Swedia","🇸🇪","se"], "Tunisia":["Tunisia","🇹🇳","tn"],
  "Spain":["Spanyol","🇪🇸","es"],
  "Cape Verde":["Tanjung Verde","🇨🇻","cv"], "Cabo Verde":["Tanjung Verde","🇨🇻","cv"],
  "Belgium":["Belgia","🇧🇪","be"], "Egypt":["Mesir","🇪🇬","eg"], "Saudi Arabia":["Arab Saudi","🇸🇦","sa"],
  "Uruguay":["Uruguay","🇺🇾","uy"], "Iran":["Iran","🇮🇷","ir"], "New Zealand":["Selandia Baru","🇳🇿","nz"],
  "France":["Prancis","🇫🇷","fr"], "Senegal":["Senegal","🇸🇳","sn"], "Iraq":["Irak","🇮🇶","iq"],
  "Norway":["Norwegia","🇳🇴","no"], "Argentina":["Argentina","🇦🇷","ar"], "Algeria":["Aljazair","🇩🇿","dz"],
  "Austria":["Austria","🇦🇹","at"], "Jordan":["Yordania","🇯🇴","jo"], "Portugal":["Portugal","🇵🇹","pt"],
  "DR Congo":["Kongo","🇨🇩","cd"], "Congo DR":["Kongo","🇨🇩","cd"],
  "England":["Inggris","🏴󠁧󠁢󠁥󠁮󠁧󠁿","gb-eng"],
  "Croatia":["Kroasia","🇭🇷","hr"], "Ghana":["Ghana","🇬🇭","gh"], "Panama":["Panama","🇵🇦","pa"],
  "Uzbekistan":["Uzbekistan","🇺🇿","uz"], "Colombia":["Kolombia","🇨🇴","co"],
  // tim potensial WC2026 lain
  "Jamaica":["Jamaika","🇯🇲","jm"], "Venezuela":["Venezuela","🇻🇪","ve"],
  "Honduras":["Honduras","🇭🇳","hn"], "Costa Rica":["Kosta Rika","🇨🇷","cr"],
  "Chile":["Cile","🇨🇱","cl"], "Peru":["Peru","🇵🇪","pe"],
  "Nigeria":["Nigeria","🇳🇬","ng"], "Cameroon":["Kamerun","🇨🇲","cm"],
  "Mali":["Mali","🇲🇱","ml"], "South Korea":["Korea Selatan","🇰🇷","kr"],
  "Serbia":["Serbia","🇷🇸","rs"], "Ukraine":["Ukraina","🇺🇦","ua"],
  "Poland":["Polandia","🇵🇱","pl"], "Romania":["Rumania","🇷🇴","ro"],
  "Hungary":["Hungaria","🇭🇺","hu"], "Denmark":["Denmark","🇩🇰","dk"],
  "Wales":["Wales","🏴󠁧󠁢󠁷󠁬󠁳󠁿","gb-wls"], "Greece":["Yunani","🇬🇷","gr"],
  "Slovenia":["Slovenia","🇸🇮","si"], "Slovakia":["Slovakia","🇸🇰","sk"],
  "Iceland":["Islandia","🇮🇸","is"], "Finland":["Finlandia","🇫🇮","fi"],
  "Italy":["Italia","🇮🇹","it"], "Belgium":["Belgia","🇧🇪","be"],
  "China PR":["Tiongkok","🇨🇳","cn"], "China":["Tiongkok","🇨🇳","cn"],
  "Indonesia":["Indonesia","🇮🇩","id"],
  "United Arab Emirates":["UEA","🇦🇪","ae"], "UAE":["UEA","🇦🇪","ae"],
  "Bahrain":["Bahrain","🇧🇭","bh"], "Kuwait":["Kuwait","🇰🇼","kw"],
  "Israel":["Israel","🇮🇱","il"],
  "Tanzania":["Tanzania","🇹🇿","tz"], "Zambia":["Zambia","🇿🇲","zm"],
  "Angola":["Angola","🇦🇴","ao"], "Uganda":["Uganda","🇺🇬","ug"],
};
const team = name => TEAMS[name] || [name, "🏳️", null];

// ============================================================
// ADAPTER A — API-Football v3
// https://www.api-sports.io/documentation/football/v3
// Header: x-apisports-key | League 1 = FIFA World Cup
// CATATAN: free tier menolak season 2026.
// ============================================================

const APF_KEY    = process.env.API_FOOTBALL_KEY  || "";
const APF_HOST   = process.env.API_FOOTBALL_HOST || "v3.football.api-sports.io";
const APF_LEAGUE = process.env.WC_LEAGUE_ID      || "1";

async function apfApi(endpoint) {
  const url = `https://${APF_HOST}/${endpoint}`;
  const res = await fetch(url, { headers: { "x-apisports-key": APF_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${endpoint}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length)
    console.warn("  ! APF errors:", JSON.stringify(json.errors));
  return json.response || [];
}

const apfMinute = t => `${t.elapsed ?? ""}${t.extra ? "+" + t.extra : ""}`;

function apfMapFixture(fx) {
  const [hl, hf] = team(fx.teams.home.name);
  const [al, af] = team(fx.teams.away.name);
  const pen = fx.score?.penalty;
  return {
    id: fx.fixture.id,
    kickoff: fx.fixture.date,
    group: null,
    venue: fx.fixture.venue?.name
      ? `${fx.fixture.venue.name}${fx.fixture.venue.city ? ", " + fx.fixture.venue.city : ""}`
      : null,
    status: fx.fixture.status.short,
    clock: null,
    referee: null,
    home: { name: hl, flag: hf, goals: fx.goals.home },
    away: { name: al, flag: af, goals: fx.goals.away },
    penalty: (pen && pen.home != null) ? { home: pen.home, away: pen.away } : null,
    events: [],
    stats: null,
    _homeId: fx.teams.home.id,
  };
}

function apfMapEvents(raw, homeId) {
  const out = [];
  for (const e of raw) {
    const isHome = e.team.id === homeId;
    if (e.type === "Goal") {
      if (e.detail === "Missed Penalty") continue;
      const ownGoal = e.detail === "Own Goal";
      out.push({
        team: ownGoal ? (isHome ? "away" : "home") : (isHome ? "home" : "away"),
        type: "goal",
        player: e.player?.name || "?",
        minute: apfMinute(e.time),
        ...(ownGoal ? { tag: "b.d." } : (e.detail === "Penalty" ? { tag: "pen" } : {})),
      });
    } else if (e.type === "Card" && e.detail === "Red Card") {
      out.push({ team: isHome ? "home" : "away", type: "redcard",
        player: e.player?.name || "?", minute: apfMinute(e.time) });
    }
  }
  return out;
}

function apfMapStats(raw, homeId) {
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
    offsides:   [pick(home, "Offsides"),         pick(away, "Offsides")],
  };
}

const APF = {
  key: APF_KEY,
  keyEnv: "API_FOOTBALL_KEY",
  async fetchFixtures() {
    console.log(`[apifootball] fixtures: league=${APF_LEAGUE} season=${SEASON} …`);
    return apfApi(`fixtures?league=${APF_LEAGUE}&season=${SEASON}`);
  },
  mapFixture: apfMapFixture,
  async fetchEnrich(id, homeId) {
    const [ev, st] = await Promise.all([
      apfApi(`fixtures/events?fixture=${id}`),
      apfApi(`fixtures/statistics?fixture=${id}`),
    ]);
    return { events: apfMapEvents(ev, homeId), stats: apfMapStats(st, homeId) };
  },
};

// ============================================================
// ADAPTER B — Highlightly
// https://soccer.highlightly.net
// Headers: x-rapidapi-key + x-rapidapi-host
// League 1635 = FIFA World Cup 2026 | free tier 100 req/hari
// ============================================================

const HL_KEY    = process.env.HIGHLIGHTLY_KEY  || "";
const HL_HOST   = process.env.HIGHLIGHTLY_HOST || "football-highlights-api.p.rapidapi.com";
const HL_BASE   = "https://soccer.highlightly.net";
const HL_LEAGUE = "1635";

async function hlApi(endpoint) {
  const url = `${HL_BASE}/${endpoint}`;
  const res = await fetch(url, {
    headers: { "x-rapidapi-key": HL_KEY, "x-rapidapi-host": HL_HOST },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${endpoint}`);
  return res.json();
}

// "2 - 1" → [2, 1] | null/kosong → [null, null]
function hlParseScore(s) {
  if (!s) return [null, null];
  const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : [null, null];
}

// Mapping deskripsi Highlightly → kode status skema
const HL_STATUS = {
  "Finished":    "FT",
  "Not started": "NS",
  "First Half":  "1H",
  "Half Time":   "HT",
  "Second Half": "2H",
  "Extra Time":  "ET",
  "Break Time":  "BT",
  "Penalties":   "P",
  "Postponed":   "PST",
  "Cancelled":   "CANC",
  "Abandoned":   "ABD",
  "Suspended":   "SUSP",
  // fallback apa pun yang tidak dikenal → "1H" (live, tidak masuk FINAL)
};

function hlMapFixture(match) {
  const [hl, hf] = team(match.homeTeam.name);
  const [al, af] = team(match.awayTeam.name);
  const desc   = match.state?.description ?? "";
  const status = HL_STATUS[desc] ?? "1H";
  const clock  = match.state?.clock ?? null;
  const [homeGoals, awayGoals] = hlParseScore(match.state?.score?.current);
  const [homePen, awayPen]     = hlParseScore(match.state?.score?.penalties);

  // HL round: "Group A" → "A" | "Group Stage - 1" (tanpa huruf A-L) → null
  const roundStr  = match.round ?? null;
  const grpMatch  = roundStr?.match(/\bGroup\s+([A-L])\b/i);
  const group     = grpMatch ? grpMatch[1].toUpperCase() : null;

  const venueRaw = match.venue;
  const venue    = venueRaw?.name
    ? `${venueRaw.name}${venueRaw.city ? ", " + venueRaw.city : ""}`
    : null;
  const referee  = match.referee?.name ?? null;

  return {
    id:      match.id,
    kickoff: match.date,
    group,
    venue,
    referee,
    status,
    clock,
    home: { name: hl, flag: hf, goals: homeGoals },
    away: { name: al, flag: af, goals: awayGoals },
    penalty: homePen !== null ? { home: homePen, away: awayPen } : null,
    events:  [],
    stats:   null,
    _homeId: match.homeTeam.id,
    _awayId: match.awayTeam.id,
  };
}

// Semua type event Highlightly yang diketahui (dari dokumentasi resmi):
// Goal | Own Goal | Penalty | Missed Penalty | Yellow Card | Red Card |
// Substitution | VAR Goal Confirmed | VAR Goal Cancelled |
// VAR Goal Cancelled - Offside | VAR Penalty | VAR Penalty Cancelled
const HL_GOAL_TYPES = new Set(["Goal", "Own Goal", "Penalty", "Missed Penalty",
  "VAR Goal Confirmed", "VAR Goal Cancelled", "VAR Goal Cancelled - Offside", "VAR Penalty"]);

function hlMapEvents(raw, homeId) {
  // Terima {data:[]} atau array langsung
  const events = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
  const out = [];
  for (const e of events) {
    const isHome = e.team?.id === homeId;
    const type   = e.type ?? "";

    if (type === "Goal") {
      out.push({
        team:   isHome ? "home" : "away",
        type:   "goal",
        player: e.player || "?",
        minute: String(e.time ?? ""),
      });
    } else if (type === "Own Goal") {
      // Gol bunuh diri: dikreditkan ke tim lawan, diberi tag "b.d."
      out.push({
        team:   isHome ? "away" : "home",
        type:   "goal",
        player: e.player || "?",
        minute: String(e.time ?? ""),
        tag:    "b.d.",
      });
    } else if (type === "Penalty") {
      // Gol dari titik penalti
      out.push({
        team:   isHome ? "home" : "away",
        type:   "goal",
        player: e.player || "?",
        minute: String(e.time ?? ""),
        tag:    "pen",
      });
    } else if (type === "Red Card") {
      out.push({
        team:   isHome ? "home" : "away",
        type:   "redcard",
        player: e.player || "?",
        minute: String(e.time ?? ""),
      });
    } else if (!HL_GOAL_TYPES.has(type) && type !== "Yellow Card" && type !== "Substitution"
               && !type.startsWith("VAR")) {
      // Type tidak dikenal dan bukan yang sudah diketahui diabaikan — log agar terlihat
      console.warn(`  ! HL event type tak dikenal: "${type}" (laga ${e.team?.name ?? "?"}, menit ${e.time})`);
    }
    // Abaikan yang diketahui: Missed Penalty, Yellow Card, Substitution, VAR ..., dsb.
  }
  return out;
}

function hlMapStats(raw, homeId, awayId) {
  // Terima array langsung atau {data:[]}
  const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
  if (arr.length < 2) return null;

  // Verifikasi via team.id — jangan asumsi urutan home/away
  const homeSide = arr.find(s => s.team?.id === homeId) ?? arr[0];
  const awaySide = arr.find(s => s.team?.id === awayId) ?? arr[1];

  const pick = (side, displayName) => {
    const s = (side.statistics || []).find(x => x.displayName === displayName);
    if (!s || s.value == null) return 0;
    return typeof s.value === "string" ? parseFloat(s.value) || 0 : Number(s.value);
  };

  // API mengembalikan possession sebagai desimal (0.62) → kalikan 100
  const poss  = side => Math.round(pick(side, "Possession") * 100);
  // Total shots = on target + off target
  const shots = side => pick(side, "Shots on target") + pick(side, "Shots off target");

  return {
    possession: [poss(homeSide),               poss(awaySide)],
    shots:      [shots(homeSide),              shots(awaySide)],
    sot:        [pick(homeSide, "Shots on target"),  pick(awaySide, "Shots on target")],
    fouls:      [pick(homeSide, "Fouls"),            pick(awaySide, "Fouls")],
    offsides:   [pick(homeSide, "Offsides"),         pick(awaySide, "Offsides")],
  };
}

async function hlFetchStandings() {
  console.log(`[highlightly] standings: leagueId=${HL_LEAGUE} season=${SEASON} …`);
  const json = await hlApi(`standings?leagueId=${HL_LEAGUE}&season=${SEASON}`);
  const groups = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
  const validGroup = /^Group [A-L]$/;
  const filtered = groups
    .filter(g => validGroup.test(g.name))
    .map(g => ({
      name: g.name,
      standings: (g.standings || []).map(s => {
        const [label, flag] = team(s.team?.name ?? "");
        return {
          name: label,
          flag,
          position: s.position,
          games: s.total?.games ?? 0,
          wins: s.total?.wins ?? 0,
          draws: s.total?.draws ?? 0,
          losses: s.total?.loses ?? 0,
          gf: s.total?.scoredGoals ?? 0,
          ga: s.total?.receivedGoals ?? 0,
          points: s.points ?? 0,
        };
      }),
    }));
  console.log(`  standings: ${filtered.length} grup difilter.`);
  return filtered.length ? filtered : null;
}

const HL = {
  key: HL_KEY,
  keyEnv: "HIGHLIGHTLY_KEY",
  fetchStandings: hlFetchStandings,
  async fetchFixtures() {
    console.log(`[highlightly] fixtures: leagueId=${HL_LEAGUE} season=${SEASON} …`);
    // WC 2026 punya 104 laga (72 grup + 32 fase gugur) — gunakan pagination
    // agar tidak ada laga yang terpotong bila melebihi page size API.
    const PAGE = 100;
    const all  = [];
    let offset = 0;
    let total  = Infinity;

    while (all.length < total) {
      const json = await hlApi(
        `matches?leagueId=${HL_LEAGUE}&season=${SEASON}&limit=${PAGE}&offset=${offset}`
      );
      const page = Array.isArray(json?.data) ? json.data : [];
      all.push(...page);
      total  = json?.pagination?.totalCount ?? all.length;
      offset += page.length;
      if (page.length < PAGE) break; // halaman terakhir (atau API tidak mengembalikan data)
    }

    if (all.length !== total) {
      console.warn(`  ! HL: expected ${total} fixtures, got ${all.length}`);
    }
    return all;
  },
  mapFixture: hlMapFixture,
  async fetchDetail(id) {
    // Endpoint detail: GET /matches/{id} → array langsung (bukan {data:[]})
    const raw = await hlApi(`matches/${id}`);
    const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
    return arr[0] ?? null;
  },
  async fetchEnrich(id, homeId, awayId) {
    const [evRaw, stRaw, detailRaw] = await Promise.all([
      hlApi(`events/${id}`),
      hlApi(`statistics/${id}`),
      hlApi(`matches/${id}`),
    ]);
    const detailArr = Array.isArray(detailRaw) ? detailRaw : (Array.isArray(detailRaw?.data) ? detailRaw.data : []);
    const detail    = detailArr[0] ?? null;
    const venueRaw  = detail?.venue;
    return {
      events:  hlMapEvents(evRaw, homeId),
      stats:   hlMapStats(stRaw, homeId, awayId),
      venue:   venueRaw?.name ? `${venueRaw.name}${venueRaw.city ? ", " + venueRaw.city : ""}` : null,
      referee: detail?.referee?.name ?? null,
    };
  },
};

// ============================================================
// Pilih adapter berdasarkan env PROVIDER
// ============================================================
const A = PROVIDER === "highlightly" ? HL : APF;

// ============================================================

async function loadExisting() {
  try { return JSON.parse(await readFile(OUT, "utf8")); }
  catch { return { competition: "FIFA World Cup 2026", season: Number(SEASON), matches: [] }; }
}

const isFrozen = m => FINAL.has(m.status) && Array.isArray(m.events) && m.events.length > 0;

async function main() {
  const existing = await loadExisting();
  const byId = new Map(existing.matches.map(m => [m.id, m]));

  if (!A.key) {
    console.log(`${A.keyEnv} kosong → pakai results.json yang ada (seed). Tidak ada perubahan.`);
    return;
  }

  let fixtures = [];
  let standingsData = null;
  try {
    const [fx, st] = await Promise.all([
      A.fetchFixtures(),
      A.fetchStandings ? A.fetchStandings() : Promise.resolve(null),
    ]);
    fixtures = fx;
    standingsData = st;
  } catch (err) {
    console.error("Gagal ambil fixtures/standings:", err.message, "→ keep seed.");
    return;
  }
  console.log(`  dapat ${fixtures.length} fixtures.`);

  let updated = 0, enriched = 0;
  for (const fx of fixtures) {
    let base;
    try {
      base = A.mapFixture(fx);
    } catch (err) {
      console.warn(`  skip fixture (map error): ${err.message}`);
      continue;
    }

    // NS + kickoff sudah lewat → endpoint list lambat update; verify via detail
    if (base.status === "NS" && new Date(base.kickoff) < new Date() && A.fetchDetail) {
      try {
        const detail = await A.fetchDetail(base.id);
        if (detail) base = A.mapFixture(detail);
      } catch (err) {
        console.warn(`  detail gagal utk ${base.id}: ${err.message} (pakai data list)`);
      }
    }

    const prev = byId.get(base.id);
    // sudah final + sudah beku (punya events) → biarkan, hemat kuota
    if (prev && isFrozen(prev)) continue;

    if (FINAL.has(base.status)) {
      try {
        const { events, stats, venue, referee } = await A.fetchEnrich(base.id, base._homeId, base._awayId);
        base.events   = events;
        base.stats    = stats;
        if (venue)   base.venue   = venue;
        if (referee) base.referee = referee;
        enriched++;
      } catch (err) {
        console.warn(`  enrich gagal utk ${base.id}: ${err.message} (skor tetap disimpan)`);
      }
    } else if (LIVE.has(base.status)) {
      // Laga live: skor + clock sudah diisi hlMapFixture; tidak call /events atau /statistics
      // Pertahankan events/stats dari data sebelumnya jika ada (biasanya kosong)
      if (prev) {
        base.events = prev.events ?? [];
        base.stats  = prev.stats  ?? null;
      }
    }

    delete base._homeId;
    delete base._awayId;
    byId.set(base.id, { ...(prev || {}), ...base });
    updated++;
  }

  const matches = [...byId.values()]
    .map(m => { delete m._homeId; delete m._awayId; return m; })
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  const out = {
    competition: "FIFA World Cup 2026",
    season: Number(SEASON),
    updatedAt: new Date().toISOString(),
    source: PROVIDER === "highlightly"
      ? `highlightly league ${HL_LEAGUE} season ${SEASON}`
      : `api-football league ${APF_LEAGUE} season ${SEASON}`,
    standings: standingsData || null,
    matches,
  };
  await writeFile(OUT, JSON.stringify(out, null, 2));
  console.log(`Selesai. updated=${updated}, enriched=${enriched}, total=${matches.length}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
