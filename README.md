# UjianKu Pro — CBT Online (frontend)

Aplikasi ujian berbasis komputer (CBT) untuk sekolah: portal siswa dengan **Token PIN**, dashboard **guru & admin**, bank soal, paket & penjadwalan, monitoring real-time, rekap nilai & analisis butir soal, WhatsApp/Email + CRM, migrasi data, backup, serta dokumen bertanda tangan dengan QR verifikasi.

Folder ini adalah **frontend statis** (HTML/CSS/JS murni) untuk GitHub Pages. Backend-nya Google Apps Script (berkas `.gs` diberikan terpisah — **tidak** diletakkan di repository ini).

## Isi

| Berkas | Fungsi |
|---|---|
| `index.html` | Portal siswa (masuk dengan Token PIN, ruang ujian, hasil, pembahasan) |
| `admin.html` | Dashboard guru & admin |
| `verifikasi.html` | Halaman publik cek keaslian dokumen (tujuan QR) |
| `js/config.js` | **Satu-satunya yang wajib diubah**: isi `GAS_URL` dengan URL `/exec` Apps Script |
| `js/core.js` | API, cache, batch, grafik, komponen UI bersama |
| `js/siswa.js` | Portal siswa |
| `js/admin*.js` | Modul dashboard (ujian, rekap, data & layanan, dokumen) |
| `css/app.css` | Desain (terang & gelap, responsif) |

## Pasang cepat

1. Deploy backend Apps Script, salin URL Web App (`https://script.google.com/macros/s/…/exec`).
2. Buka `js/config.js`, ganti `GANTI_DENGAN_ID_DEPLOYMENT` dengan URL tadi.
3. Dari **folder ini** (yang berisi `index.html`): `git init` → `git add .` → `git commit -m "Upload pertama"` → `git branch -M main` → `git remote add origin …` → `git push -u origin main`.
4. GitHub → Settings → Pages → Deploy from a branch → `main` / `(root)`.

Langkah lengkap ada di **PANDUAN-INSTALASI.md**.

## Keamanan

Tidak ada rahasia di frontend. Token Fonnte, secret sesi, ID spreadsheet/folder, dan kunci integrasi tersimpan di **Script Properties** Apps Script. Kata sandi disimpan sebagai hash + salt; kunci jawaban tidak pernah dikirim ke browser siswa.
