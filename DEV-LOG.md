# DEV-LOG

Catatan keputusan & progres. Tambah entri terbaru di atas.

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
