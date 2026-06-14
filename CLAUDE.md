# CLAUDE.md — Konteks Project

Konteks untuk asisten AI (Claude Code / Cursor) saat bekerja di repo ini. Baca dulu sebelum mengubah kode.

## Apa ini
Aplikasi **hasil Piala Dunia 2026** dengan pendekatan *results-only*: data diambil dari API hanya untuk laga yang **sudah selesai**, ditulis ke `results.json`, lalu dibaca frontend statis. Semua waktu ditampilkan dalam **WIB (Asia/Jakarta)**.

## Arsitektur (jangan diubah tanpa alasan kuat)
```
GitHub Action (cron) ── node scripts/fetch-results.mjs ──> results.json ──> index.html (fetch & render)
        │                         │
   secret API key          server-side (aman dari CORS, key tak pernah ke client)
```
- Tidak ada backend runtime. Semua fetch ke API eksternal terjadi di GitHub Action.
- Frontend hanya membaca file statis `results.json`. Cocok untuk GitHub Pages / Vercel static.

## Invarian / aturan keras
1. **Skor hanya tampil saat status `FT` / `AET` / `PEN`.** Status live (`1H/HT/2H/ET/BT/P/...`) ditampilkan sebagai badge **LIVE tanpa skor**. Status `NS` tampil sebagai jadwal. Jangan pernah bocorkan skor laga yang belum final.
2. **API key tidak boleh masuk ke kode frontend.** Hanya lewat `process.env.API_FOOTBALL_KEY` di Action (GitHub Secrets).
3. **Hemat kuota.** 1 call `fixtures` per run; `events`+`statistics` hanya untuk laga yang *baru* final. Laga final yang sudah punya `events` = *frozen*, tidak di-fetch ulang.
4. **Waktu disimpan dengan offset/UTC, dikonversi ke WIB di layer tampilan** pakai `Intl.DateTimeFormat` dengan `timeZone: "Asia/Jakarta"`. Jangan hardcode konversi jam manual.
5. **Fetcher zero-dependency** (Node 20 native `fetch`). Kalau butuh dependency, tanyakan dulu.
6. Tanpa API key, fetcher **keluar tanpa mengubah** `results.json` (frontend tetap pakai seed). Jaga perilaku ini.

## Peta file
- `scripts/fetch-results.mjs` — fetcher. Blok **ADAPTER** (fungsi `api`, `mapFixture`, `mapEvents`, `mapStats`) = satu-satunya tempat yang provider-specific (default: API-Football v3).
- `results.json` — sumber data. Lihat skema di README.
- `index.html` — frontend vanilla (CSS+JS inline). Set status: `FINAL`/`LIVE` di awal `<script>`.
- `.github/workflows/fetch-results.yml` — jadwal + commit.

## Perintah
```bash
npm run dev        # serve statis (npx serve .)
npm run fetch      # jalankan fetcher (perlu API_FOOTBALL_KEY)
```

## Konvensi
- JavaScript ESM, 2 spasi, semicolon. Nama variabel/UI **Bahasa Indonesia** (sesuai audiens), komentar boleh ID.
- Bendera = emoji unicode (self-contained). Mapping nama tim (EN dari API → label ID + bendera) ada di `TEAMS` dalam fetcher.
- Skema `results.json` adalah kontrak antara fetcher dan frontend. Kalau menambah field, update **dua-duanya** + README.

## Saat menambah fitur
- Fitur turunan (klasemen, top skor) harus dihitung dari `results.json` yang sudah ada — **jangan** menambah API call kalau bisa diturunkan dari data laga selesai.
- Pertahankan agar tetap bisa jalan tanpa API key (mode seed).

## Jangan
- Menaruh API key di client / `index.html`.
- Menampilkan skor laga non-final.
- Menambah backend server kecuali diminta eksplisit.
- Mengganti pendekatan jadi realtime polling di client.
