# PoC — Hasil Piala Dunia 2026 (results-only, WIB)

Pipeline statis & hemat: **GitHub Action terjadwal → `results.json` → frontend statis**.
Skor **hanya** ditampilkan saat laga sudah selesai (`FT/AET/PEN`). Laga yang sedang berlangsung ditandai **LIVE** tanpa skor, laga yang belum mulai tampil sebagai jadwal (jam WIB).

```
.
├─ .github/workflows/fetch-results.yml   # cron tiap 30 menit + commit results.json
├─ scripts/fetch-results.mjs             # fetcher (Node 20, zero-dependency)
├─ results.json                          # data (seed: 72 laga, 4 sudah selesai)
├─ index.html                            # frontend: baca results.json
└─ package.json
```

## Jalan cepat (tanpa API key)

`results.json` sudah berisi seed (jadwal lengkap + 4 hasil nyata), jadi frontend langsung jalan:

```bash
npm run dev          # = npx serve .
# atau:
python3 -m http.server
```

Buka alamat yang muncul. **Jangan** buka `index.html` lewat `file://` — browser memblokir `fetch()` ke file lokal.

## Mengaktifkan update otomatis

1. Push repo ini ke GitHub.
2. Ambil API key gratis di **api-football.com** (atau via RapidAPI).
3. Repo → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `API_FOOTBALL_KEY`
   - Value: API key kamu
4. Tab **Actions** → jalankan workflow *Fetch World Cup results* manual untuk tes (atau tunggu cron).
5. (Opsional) **Settings → Pages** → Deploy from branch `main` `/root` agar frontend live di internet.

Hanya itu — tinggal colok key dan jalan.

## Cara kerja fetcher

- Sekali run = **1** call `fixtures` untuk seluruh turnamen.
- Untuk laga yang **baru** berstatus selesai, ditarik tambahan `events` (gol + kartu merah) & `statistics` (possession, tembakan, dll).
- Laga yang sudah final **dan** punya events dianggap *frozen* → tidak di-fetch ulang (hemat kuota free tier ~100 call/hari).
- Tanpa `API_FOOTBALL_KEY`, script keluar tanpa mengubah `results.json` (frontend tetap pakai seed).

### Ganti provider
Default-nya API-Football v3. Mau pindah ke Sportmonks/TheStatsAPI/dll? Edit blok **ADAPTER** di `scripts/fetch-results.mjs` (3 fungsi: `api`, `mapFixture`, `mapEvents`/`mapStats`). Schema `results.json` tetap.

## Skema `results.json`

```jsonc
{
  "competition": "FIFA World Cup 2026",
  "updatedAt": "2026-06-13T07:30:00.000Z",
  "matches": [
    {
      "id": 1,
      "kickoff": "2026-06-12T02:00:00+07:00", // disimpan dgn offset; FE format ke WIB
      "group": "A",
      "venue": "Estadio Azteca, Mexico City",
      "status": "FT",                          // NS | 1H/HT/2H/... | FT/AET/PEN | PST/...
      "home": { "name": "Meksiko", "flag": "🇲🇽", "goals": 2 },
      "away": { "name": "Afrika Selatan", "flag": "🇿🇦", "goals": 0 },
      "penalty": null,                         // {home,away} jika lewat adu penalti
      "events": [
        { "team": "home", "type": "goal",    "player": "Quiñones", "minute": "9" },
        { "team": "away", "type": "redcard", "player": "Sithole",  "minute": "50" }
        // tag opsional: "b.d." (gol bunuh diri) / "pen" (penalti)
      ],
      "stats": { "possession": [64,36], "shots": [14,6], "sot": [7,3], "fouls": [8,13], "offsides": [2,2] }
    }
  ]
}
```

## Tes status LIVE
Edit salah satu `status` di `results.json` jadi `"1H"` lalu refresh — laga itu akan muncul sebagai **LIVE** tanpa skor.

## Catatan
- **Free tier API-Football** kadang membatasi musim/kompetisi terbaru. Kalau respons kosong, script aman: `results.json` seed tetap dipakai. Untuk season 2026 yang berjalan, mungkin perlu plan berbayar atau provider lain.
- Waktu kickoff sebaiknya disimpan UTC/offset; konversi ke WIB dilakukan di frontend (`Intl` dengan `timeZone: "Asia/Jakarta"`), jadi aman untuk pengunjung di zona mana pun.
- Status referensi mengikut API-Football: `NS, 1H, HT, 2H, ET, BT, P, FT, AET, PEN, PST, CANC, ABD, SUSP, INT`.
