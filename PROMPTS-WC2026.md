# PROMPTS-WC2026.md

Prompt berurutan untuk membangun fitur berikutnya pakai Claude Code / Cursor di VS Code.
Jalankan **satu per satu**, commit tiap selesai. Tiap prompt menganggap `CLAUDE.md` sudah dibaca asisten
(di Cursor: pin `CLAUDE.md` ke context; di Claude Code: otomatis terbaca).

Aturan umum yang berlaku ke semua prompt:
> Patuhi `CLAUDE.md`. Jangan tampilkan skor laga non-final. Jaga fetcher zero-dependency & mode seed (jalan tanpa API key). Update skema di dua sisi (fetcher + frontend) bila menambah field. Sertakan cara test.

---

## M0 — Setup VS Code & hygiene
**Prompt 1**
> Siapkan project agar rapi di VS Code. Tambahkan `.gitignore` (node, OS, editor), `.editorconfig`, `.vscode/extensions.json` (rekomendasi Prettier, ESLint, GitHub Actions, YAML, Live Server), dan `.vscode/settings.json` (format on save, EOL `\n`). Tambahkan Prettier + config minimal lewat devDependencies, dan script `format` di package.json. Jangan ubah perilaku runtime apa pun.

## M1 — Type safety & validasi data
**Prompt 2**
> Buat JSON Schema untuk `results.json` di `schema/results.schema.json` sesuai skema di README. Tambahkan `scripts/validate.mjs` (zero-dep, Node 20) yang memvalidasi `results.json` terhadap schema dan exit non-zero kalau invalid. Tambahkan script `validate` di package.json.

**Prompt 3**
> Di workflow `fetch-results.yml`, jalankan `node scripts/validate.mjs` **sebelum** step commit. Kalau validasi gagal, batalkan commit (jangan push data rusak). Pastikan langkah ini juga jalan di `workflow_dispatch`.

## M2 — Fitur turunan (tanpa API call tambahan)
**Prompt 4 — Klasemen**
> Buat `src/standings.mjs` berisi fungsi murni `computeStandings(matches)` yang menghitung klasemen per grup HANYA dari laga berstatus FT/AET/PEN: main, menang, seri, kalah, GF, GA, selisih gol, poin. Urutkan per grup (poin → selisih gol → GF). Abaikan laga tanpa `group`. Jangan ubah `results.json`.

**Prompt 5 — Tampilkan klasemen di frontend**
> Di `index.html`, tambahkan tab "Klasemen" pada segmented control. Render tabel klasemen per grup memakai `computeStandings`. Pertahankan tema visual yang sudah ada (warna, tipografi). Responsif sampai mobile.

**Prompt 6 — Top skor**
> Buat fungsi murni `topScorers(matches)` yang menghimpun pencetak gol dari `events` laga final (abaikan gol bunuh diri / tag `b.d.`), hitung jumlah gol per pemain, urut menurun. Tampilkan daftar Top Skor di frontend (mis. panel ringkas di header atau tab baru).

## M3 — Tes
**Prompt 7**
> Tambahkan Vitest. Tulis unit test untuk: (a) `mapEvents` — pastikan gol bunuh diri dikreditkan ke tim lawan & diberi tag `b.d.`, penalti diberi tag `pen`, kartu merah terbaca; (b) `computeStandings` — kasus menang/seri/kalah & tie-break selisih gol; (c) `topScorers` — gol bunuh diri tidak dihitung. Tambahkan script `test` dan jalankan di CI (job terpisah pada push/PR).

## M4 — Upgrade frontend (opsional, sesuai stack)
**Prompt 8**
> Migrasikan frontend dari `index.html` ke Vite + React + TypeScript + Tailwind, tetap membaca `results.json` (taruh di `public/`). Pertahankan persis tampilan & logika status sekarang. Pecah jadi komponen: `MatchCard`, `MatchDetail`, `StandingsTable`, `DayGroup`, `Filters`. Definisikan tipe `Match`/`ResultsFile` di `src/types.ts` selaras schema. Sediakan build statis untuk deploy.

**Prompt 9**
> Tambahkan PWA (offline) ke app Vite: service worker cache app shell + `results.json` (stale-while-revalidate), manifest, dan ikon. Pastikan tetap menampilkan data terakhir saat offline.

## M5 — Deploy
**Prompt 10 — GitHub Pages**
> Tambahkan workflow `deploy-pages.yml` yang men-deploy frontend ke GitHub Pages tiap kali `results.json` atau frontend berubah di `main`. Untuk versi statis pakai root; untuk versi Vite jalankan build dulu lalu publish folder `dist`.

**Prompt 11 — Vercel (alternatif)**
> Siapkan deploy ke Vercel: `vercel.json` untuk static (atau Vite), tanpa server function. Jelaskan cara hubungkan repo ke Vercel dan env yang diperlukan (tidak ada—data sudah statis).

## M6 — Nice-to-have
**Prompt 12 — Notifikasi**
> Tambahkan step opsional di fetcher: bila ada laga yang baru jadi final pada run ini, kirim ringkasan skor ke Discord/Telegram via webhook (URL dari secret). Lewati kalau secret tidak diset. Jangan blокir commit kalau webhook gagal.

**Prompt 13 — Bracket fase gugur**
> Saat fase grup selesai, tampilkan bracket 32 besar → final dari `results.json` (status & skor bila sudah ada). Untuk pertandingan yang lawannya belum ditentukan, tampilkan placeholder.

---

### Catatan eksekusi
- Setelah tiap milestone: jalankan `npm run validate` (M1+) dan `npm test` (M3+), lalu commit.
- Catat keputusan & masalah di `DEV-LOG.md`.
- Kalau sebuah prompt menyentuh skema `results.json`, minta asisten meng-update schema, fetcher, frontend, dan README sekaligus.
