# DEV-LOG

Catatan keputusan & progres. Tambah entri terbaru di atas.

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
