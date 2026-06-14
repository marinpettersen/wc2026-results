# DEV-LOG

Catatan keputusan & progres. Tambah entri terbaru di atas.

## 2026-06-13 — PoC awal
- Pipeline results-only: GitHub Action -> results.json -> frontend statis.
- Fetcher zero-dep (API-Football v3) dgn adapter + freeze logic untuk hemat kuota.
- Seed results.json: 72 laga fase grup, 4 sudah final (data nyata).
- Invarian: skor hanya tampil saat FT/AET/PEN; LIVE tanpa skor; WIB via Intl.
- TODO berikutnya: lihat PROMPTS-WC2026.md (M0 setup VS Code → M1 validasi → M2 klasemen/top skor → M3 tes → M4 Vite/React → M5 deploy).
