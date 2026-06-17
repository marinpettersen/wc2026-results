# DEV-LOG

Catatan keputusan & progres. Tambah entri terbaru di atas.

## 2026-06-17 — Feat: venue + referee dari detail endpoint

- `scripts/fetch-results.mjs` — `hlMapFixture`: baca `match.venue?.name` +
  `match.venue?.city` → field `venue` (sebelumnya selalu null untuk HL list).
  Baca `match.referee?.name` → field `referee` (baru). Untuk list endpoint,
  kedua field undefined → null secara alami. Untuk detail endpoint (`/matches/{id}`
  yang sudah di-fetch sejak fix NS post-kickoff), field terisi otomatis tanpa
  call API tambahan. `apfMapFixture` emit `referee: null` untuk konsistensi.
- `schema/results.schema.json`: tambah field opsional `referee: string|null`.
- `index.html`: `detailHTML` tampilkan `🟨 {referee}` di bawah venue, hanya
  kalau `m.referee` truthy.

## 2026-06-17 — Fix: verify NS post-kickoff via detail endpoint

- `scripts/fetch-results.mjs`: endpoint list Highlightly lambat update status live.
  Setelah `hlMapFixture` map fixture dari list, jika `status === "NS"` dan
  `kickoff < now`, fetch `GET /matches/{id}` untuk dapat state terbaru.
  Respons detail adalah array langsung (bukan `{data:[]}`); re-map via `hlMapFixture`
  yang sudah handle status/clock/score. Fallback ke data list jika fetch gagal.
- HL adapter: tambah method `fetchDetail(id)` — normalize respons array/object,
  return objek match pertama atau null.
- Estimasi call tambahan: maks ~4–6 laga/hari (NS yang kickoff-nya baru lewat),
  jauh di bawah limit 100/hari.
- APF adapter tidak punya `fetchDetail` → logika di-skip untuk provider itu.

## 2026-06-17 — M6: Live score display

- `schema/results.schema.json`: tambah field opsional `clock` (integer|null) ke
  definisi match — backward-compatible, tidak breaking.
- `scripts/fetch-results.mjs`:
  - Tambah `const LIVE = new Set(["1H","HT","2H","ET","BT","P"])`.
  - `hlMapFixture` kini baca `match.state?.clock ?? null` dan emit field `clock`.
  - `apfMapFixture` emit `clock: null` (APF tidak dipakai untuk live saat ini).
  - Loop utama: laga LIVE update skor (`home.goals`/`away.goals`) + `clock` dari
    `hlMapFixture` tanpa call `/events` atau `/statistics` (hemat kuota, events
    belum final). Pertahankan `events`/`stats` dari data sebelumnya jika ada.
    Laga NS tetap goals null, clock null. Laga FINAL+frozen tetap skip.
- `index.html`:
  - Badge LIVE kini kontekstual: `🔴 67'` (1H/2H dengan clock), `⏸ HT`, `⚽ ET`,
    `⏸ BT`, `🎯 PEN`, fallback animated dot untuk status live lain.
  - Skor laga live tampil dalam `var(--cyan)` agar beda visual dari laga FT (lime).
  - `goals == null` → tampilkan `– – –` (belum ada skor masuk).
  - Footer diperbarui: sebut live score + interval 5 menit.
- `.github/workflows/fetch-results.yml`: ganti cron `*/30` → `*/5` untuk update
  live score. 288 run/hari × ~10 detik ≈ 48 menit/hari → dalam free tier 2000 mnt/bulan.
- `npm test`: 14/14 hijau — standings.mjs tidak berubah.

## 2026-06-17 — M5: Deploy ke GitHub Pages

- `.github/workflows/deploy-pages.yml`: trigger `push` ke `main` + `workflow_run`
  dari "Fetch World Cup results" (completed). Urutan step: checkout main →
  setup-node 20 → npm ci → npm test → rm node_modules → configure-pages →
  upload-pages-artifact → deploy-pages. Concurrency group `pages` dengan
  cancel-in-progress supaya deploy lama dibatalkan kalau ada yang lebih baru.
- Tidak ada perubahan ke `fetch-results.yml`: `workflow_run` di sisi deploy
  sudah cukup — ia men-trigger deploy setiap kali fetch workflow selesai,
  termasuk run yang push dengan `[skip ci]` (push trigger tidak berlaku,
  workflow_run tidak terpengaruh flag skip ci).
- `.nojekyll` di root: cegah GitHub Pages memproses folder lewat Jekyll
  (penting untuk `src/*.mjs` yang perlu disajikan dengan MIME type yang benar).
- README: tambah section "Live" dengan URL `https://marinpettersen.github.io/JadwalPildunApp/`,
  instruksi aktifkan Pages (Settings → Pages → Source: GitHub Actions),
  update file tree.

## 2026-06-16 — Flag CDN: ganti emoji dengan <img> dari flagcdn.com

- `scripts/fetch-results.mjs`: TEAMS map dapat field ke-3 (ISO code 2-huruf),
  contoh `"Mexico":["Meksiko","🇲🇽","mx"]`. Ditambah ~20 tim WC2026 potensial
  (Jamaica, Venezuela, Honduras, Italia, dll.) supaya mapping tidak kosong saat
  grup terisi. `team()` fallback kini `[name,"🏳️",null]`.
- `index.html`: tambah `FLAG_CODE` map (nama ID → ISO) dan helper `flagImg(name)`
  yang mengembalikan `<img>` dari `https://flagcdn.com/24x18/{kode}.png` atau
  `<span>` teks nama sebagai fallback. Semua 4 titik render bendera (kartu laga
  home/away, tabel klasemen, top skor) diganti dari emoji ke `flagImg()`.
  CSS media query diperbarui: `img.flag{width:20px}` di mobile.
- `npm test` tetap 14/14 hijau — `standings.mjs` tidak berubah.

## 2026-06-15 — M3: Vitest unit tests untuk standings & top scorers

- Install Vitest ^4.1.8 sebagai devDependency; script `npm test` → `vitest run`.
- `src/standings.test.mjs`: 14 unit test untuk `computeStandings` dan `topScorers`,
  semuanya menggunakan fixture minimal buatan sendiri (tidak impor `results.json`).
- Kasus yang dicover: menang/seri/kalah, GF/GA/GD, tie-break (poin→GD→GF),
  laga non-FT diabaikan, laga `group:null` diabaikan, akumulasi multi-laga,
  gol bunuh diri (`b.d.`) tidak dihitung, urut menurun, info tim dari sisi yang benar.
- Satu perbaikan ekspektasi test: Delta (GD +3) memang di atas Alpha (GD +1)
  saat poin sama — tie-break benar, bukan bug di fungsi.
- **14/14 hijau**.

## 2026-06-15 — Baseline regenerasi dari Highlightly, deduplikasi seed

- Seed `results.json` diregerasi ulang menggunakan ID fixture dari Highlightly (bukan
  API-Football). Total: **72 laga** terkonfirmasi (sebelumnya 144 — duplikat dihapus).
- Penyebab duplikat: fixture lama pakai ID APF yang berbeda dengan ID Highlightly;
  merge naif menghasilkan dua entri per laga. Fix: baseline di-generate ulang bersih.
- Field `round` di-map ke `group` agar frontend bisa menampilkan label grup (A–L).
- **Verifikasi end-to-end lolos**: 8 laga berstatus `FT` tampil skor + events + stats
  dari API Highlightly (bukan seed); timezone WIB benar via `Intl.DateTimeFormat`.
- Semua tes visual lokal lolos. Commit: *"fix: regenerate baseline dari Highlightly,
  hapus duplikasi seed (144→72), map round→group"*.

## 2026-06-14 — Prompt 3c: Adapter Highlightly — versi LENGKAP (bukan Opsi A terbatas)

### Koreksi dari asumsi awal
Setelah mendapat key dan memeriksa respons API nyata: Highlightly BASIC (free tier)
ternyata mencakup **semua** fitur yang diperlukan — bukan hanya skor & gol seperti
diasumsikan di M1.5. Coverage aktual:
- ✓ Skor, status, kickoff, venue
- ✓ Events: gol, own goal, penalti, kartu merah (+ semua VAR variant)
- ✓ Statistik per laga: possession, shots, xG, fouls, offsides
- ✓ Klasemen (standings)
Tidak ada yang perlu dibayar. Implementasi adapter jadi versi penuh.

### Detail teknis Highlightly
- **Base URL**: `https://soccer.highlightly.net`
- **Auth**: dua header wajib — `x-rapidapi-key: <HIGHLIGHTLY_KEY>` dan
  `x-rapidapi-host: <HIGHLIGHTLY_HOST>` (default: `football-highlights-api.p.rapidapi.com`)
- **League ID WC 2026**: `1635`
- **Free tier**: 100 req/hari, tidak butuh kartu kredit
- **Env**: `PROVIDER=highlightly`, `HIGHLIGHTLY_KEY=<key>`, `HIGHLIGHTLY_HOST=<opsional>`

### Implementasi fetch-results.mjs
- Provider switch: `PROVIDER=highlightly|apifootball` (default `apifootball`); adapter
  APF dipertahankan sebagai fallback bila ada key berbayar di masa depan.
- TEAMS map: tambah alias `"Bosnia & Herzegovina"` (Highlightly pakai `&`, bukan `and`).
- **Pagination**: WC 2026 punya 104 laga (72 grup + 32 fase gugur); loop via
  `pagination.totalCount` + `offset` agar tidak ada laga terpotong saat limit=100.
- **hlMapEvents** — mapping lengkap dari dokumentasi resmi Highlightly:
  - `"Goal"` → gol biasa
  - `"Own Goal"` → gol bunuh diri: tim dibalik + tag `"b.d."`
  - `"Penalty"` → gol penalti: + tag `"pen"`
  - `"Missed Penalty"`, `"Yellow Card"`, `"Substitution"`, `"VAR ..."` → diabaikan
  - `"Red Card"` → redcard
  - Type tak dikenal → `console.warn` (tidak crash, tidak dihitung sebagai gol)
- **hlMapStats** — verifikasi home/away via `team.id` (bukan asumsi urutan);
  possession dikali 100 (API kasih desimal); shots = on target + off target.
- Freeze-logic, zero-dep, mode seed dipertahankan identik dengan sebelumnya.

## 2026-06-14 — M1.5: Verifikasi coverage provider → pivot ke Highlightly

### Temuan: API-Football free tier menolak season 2026
- Menjalankan `npm run check:coverage` dengan key API-Football menghasilkan:
  "Free plans do not have access to this season, try from 2022 to 2024."
- API-Football gratis tidak bisa dipakai untuk WC 2026. Pipeline tidak bisa
  mengandalkan provider ini tanpa upgrade berbayar.

### Keputusan: pivot ke Highlightly (Opsi A — free tier cukup untuk kebutuhan utama)
- **Base URL**: `https://soccer.highlightly.net` (atau via RapidAPI)
- **League ID WC 2026**: `1635`
- **Free tier**: 100 req/hari, tidak butuh kartu kredit
- **Yang tersedia di free tier**:
  - ✓ Skor & status laga (`/matches?leagueId=1635&date=...`)
  - ✓ Gol + top scorer (field `events[].type = "Goal"` inline di `/matches`)
  - ✓ Klasemen (`/standings?leagueId=1635&season=2026`)
- **Yang TIDAK diambil (berbayar / tidak diprioritaskan)**:
  - ✗ Statistik per laga (possession, shots) — butuh PRO atau endpoint terpisah
  - ✗ Kartu merah/kuning — di free tier belum terkonfirmasi eksplisit
- **Konsekuensi pada skema**: field `stats` tetap `null` untuk semua laga;
  `events` hanya berisi gol (bukan kartu). Schema dan validator tidak perlu diubah
  karena keduanya sudah mengizinkan `null` lewat `anyOf`.
- **Yang masih perlu dikonfirmasi setelah daftar**:
  1. Nama header auth untuk akses langsung (bukan RapidAPI)
  2. Apakah `leagueId=1635` + events gol benar-benar tersedia di plan BASIC

### scripts/check-coverage.mjs
- Bug UV_HANDLE_CLOSING diperbaiki: semua `process.exit()` di tengah async
  diganti dengan `return <code>` dari dalam `main()`, dan exit code di-set via
  `process.exitCode` setelah `main().then(...)` selesai. Event-loop Node
  sempat bersih sebelum proses keluar.

## 2026-06-14 — M1: Type safety & validasi data

### schema/results.schema.json
- JSON Schema draft-07 mendefinisikan seluruh kontrak `results.json`: root, match,
  team, event, stats.
- Field nullable (`group`, `venue`, `goals`, `penalty`, `events`, `stats`) pakai
  `anyOf` + `null` — tidak pakai `type: ["string","null"]` agar kompatibel luas.
- `additionalProperties: false` hanya di level `event` (struktur paling ketat);
  root dan match dibiarkan terbuka agar field dinamis fetcher (`source`, dll.) tidak
  ditolak validator di CI.
- Enum status resmi API-Football: NS/1H/HT/2H/ET/BT/P/FT/AET/PEN/PST/CANC/ABD/SUSP/INT.

### scripts/validate.mjs (zero-dep, Node 20)
- Implementasi subset JSON Schema: type, required, enum, minimum, anyOf, $ref,
  minItems/maxItems, additionalProperties — cukup untuk kontrak ini tanpa ajv.
- Error handling eksplisit: file hilang → "file tidak ditemukan"; JSON korup →
  "JSON korup — <detail>"; bukan stack trace mentah.
- Exit 1 + daftar error jika tidak valid; exit 0 + jumlah laga jika valid.

### fetch-results.yml
- Step "Validasi results.json" disisipkan sebagai step **terpisah** setelah fetch,
  sebelum commit. Jika exit 1, GitHub Actions menghentikan job — commit tidak jalan,
  data rusak tidak pernah di-push.

## 2026-06-14 — M0: Setup VS Code & hygiene
- Tambah Prettier `^3.5.3` sebagai devDependency + script `npm run format`.
- `.prettierrc`: semi, double quotes, tabWidth 2, trailingComma es5, printWidth 100.
- `.prettierignore`: kecualikan `results.json` — file ini adalah kontrak data antara
  fetcher dan frontend; reformatting otomatis bisa mengubah indentasi/urutan field
  yang membuat diff menjadi noise dan menyulitkan review perubahan data nyata.
- `.gitignore`: tambah `!.env.example` (exception agar file contoh tidak ter-ignore),
  `.idea/`, `*.swp`, `*.swo` untuk coverage editor lebih lengkap.
- `.editorconfig`, `.vscode/extensions.json`, `.vscode/settings.json` sudah ada di
  commit awal — tidak diubah.
- `prettier --write` belum dijalankan ke file yang sudah ada (tidak ada reformatting
  tersembunyi di commit ini).

## 2026-06-13 — PoC awal
- Pipeline results-only: GitHub Action -> results.json -> frontend statis.
- Fetcher zero-dep (API-Football v3) dgn adapter + freeze logic untuk hemat kuota.
- Seed results.json: 72 laga fase grup, 4 sudah final (data nyata).
- Invarian: skor hanya tampil saat FT/AET/PEN; LIVE tanpa skor; WIB via Intl.
- TODO berikutnya: lihat PROMPTS-WC2026.md (M0 setup VS Code → M1 validasi → M2 klasemen/top skor → M3 tes → M4 Vite/React → M5 deploy).
