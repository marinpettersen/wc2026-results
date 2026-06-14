// scripts/check-coverage.mjs
// Cek apakah API-Football free tier mencakup events & statistics untuk
// FIFA World Cup 2026 (league id=1). Jalankan sekali sebelum andalkan API key.
//
// Tanpa API_FOOTBALL_KEY : cetak instruksi cara set env, exit 0.
// Coverage lengkap       : ringkasan ✓/✗, exit 0.
// Coverage kurang        : pesan + saran fallback, exit 1.
// Error jaringan/JSON    : pesan jelas, exit 1.
//
// Semua process.exit() hanya dipanggil SETELAH main() tuntas (lewat .then/.catch),
// sehingga event-loop Node sempat bersih — menghindari UV_HANDLE_CLOSING.

const API_KEY   = process.env.API_FOOTBALL_KEY  || "";
const API_HOST  = process.env.API_FOOTBALL_HOST || "v3.football.api-sports.io";
const LEAGUE_ID = "1";
const SEASON    = "2026";

async function main() {
  if (!API_KEY) {
    console.log(`API_FOOTBALL_KEY belum di-set.

Cara men-set-nya:
  • Lokal : tambahkan ke file .env:
              API_FOOTBALL_KEY=<key kamu>
            Lalu jalankan dengan key aktif, contoh:
              npx dotenv -- npm run check:coverage
  • CI/CD : Settings → Secrets and variables → Actions → New repository secret
              Name : API_FOOTBALL_KEY  |  Value : <key kamu>

Daftar API key gratis: https://dashboard.api-football.com/register`);
    return 0;
  }

  const url = `https://${API_HOST}/leagues?id=${LEAGUE_ID}&season=${SEASON}`;
  let json;
  try {
    const res = await fetch(url, { headers: { "x-apisports-key": API_KEY } });
    if (!res.ok) {
      console.error(`HTTP ${res.status} dari ${url}`);
      return 1;
    }
    json = await res.json();
  } catch (e) {
    console.error(`Gagal menghubungi API: ${e.message}`);
    return 1;
  }

  if (json.errors && Object.keys(json.errors).length) {
    console.error(`API mengembalikan error: ${JSON.stringify(json.errors)}`);
    return 1;
  }

  const entry = (json.response || [])[0];
  if (!entry) {
    console.error(`Tidak ada data untuk league ${LEAGUE_ID} season ${SEASON}.`);
    console.error("Kemungkinan: season ini memerlukan plan berbayar, atau belum tersedia di tier ini.");
    return 1;
  }

  const seasonData = (entry.seasons || []).find((s) => String(s.year) === SEASON);
  if (!seasonData) {
    console.error(`Season ${SEASON} tidak ditemukan dalam respons API.`);
    return 1;
  }

  const cov = seasonData.coverage;
  const checks = [
    {
      key: "fixtures.events",
      value: cov?.fixtures?.events,
      label: "Gol & kartu merah (fixtures/events)",
    },
    {
      key: "fixtures.statistics_fixtures",
      value: cov?.fixtures?.statistics_fixtures,
      label: "Statistik per laga (fixtures/statistics)",
    },
    {
      key: "standings",
      value: cov?.standings,
      label: "Klasemen (standings)",
    },
  ];

  const tick  = (v) => (v ? "✓" : "✗");
  const avail = (v) => (v ? "tersedia" : "TIDAK tersedia di tier ini");

  console.log(`\nCoverage API-Football — league ${LEAGUE_ID} (FIFA World Cup), season ${SEASON}:\n`);
  for (const c of checks) {
    console.log(`  ${tick(c.value)} ${c.label.padEnd(46)} → ${avail(c.value)}`);
  }

  const critical = checks.filter((c) => !c.value && c.key !== "standings");

  if (critical.length > 0) {
    console.error(`
PERHATIAN: ${critical.length} fitur kritis tidak tersedia di free tier untuk season ${SEASON}.
  Fitur yang kurang: ${critical.map((c) => c.key).join(", ")}

  Opsi:
  1. Upgrade ke plan berbayar di api-football.com
  2. Ganti provider → kerjakan Prompt 3c (adapter Highlightly)
     Set PROVIDER=highlightly di env untuk mengaktifkannya.`);
    return 1;
  }

  if (!cov?.standings) {
    console.log(`
Catatan: standings tidak tersedia via API (klasemen dihitung dari results.json
yang ada di fetch-results.mjs, jadi ini tidak memblokir pipeline).`);
  }

  console.log("\nSemua fitur kritis tersedia. Pipeline siap dijalankan.\n");
  return 0;
}

main().then((code) => {
  process.exitCode = code;
});
