# UjianKu Pro — CBT Online

Frontend statis untuk GitHub Pages dan backend inti Google Apps Script di `apps-script/Kode.gs`.

**Catatan status:** frontend memuat menu dari paket aplikasi yang lebih lengkap. Backend yang tersedia di folder ini mendukung alur CBT inti, tetapi belum menyediakan WhatsApp/email, migrasi, Doc Engine, unggah gambar langsung, analisis butir lengkap, atau beberapa layanan dashboard lanjutan. Lihat [Panduan Instalasi](PANDUAN-INSTALASI.md) sebelum mengaktifkan fitur.

## Isi

| Berkas | Fungsi |
|---|---|
| `index.html` | Portal siswa (masuk dengan Token PIN, ruang ujian, hasil, pembahasan) |
| `admin.html` | Dashboard guru & admin |
| `verifikasi.html` | Halaman publik cek keaslian dokumen (tujuan QR) |
| `js/config.js` | Isi `GAS_URL` dengan URL Web App `/exec` Apps Script |
| `apps-script/Kode.gs` | Backend Apps Script inti |
| `apps-script/appsscript.json` | Manifest izin Apps Script |
| `js/core.js` | API, cache, batch, grafik, komponen UI bersama |
| `js/siswa.js` | Portal siswa |
| `js/admin*.js` | Modul dashboard (ujian, rekap, data & layanan, dokumen) |
| `css/app.css` | Desain (terang & gelap, responsif) |

## Instalasi

Ikuti langkah di [PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md). Proyek Apps Script harus menjalankan `setupAppEnvironment`, lalu diterapkan sebagai Web App. Setelah itu masukkan URL `/exec` ke `js/config.js` dan publikasikan frontend di GitHub Pages.

## Keamanan

Jangan simpan kata sandi, token, atau data ujian rahasia di frontend. Kredensial admin awal tercatat sekali pada log setup Apps Script; segera ganti setelah login. Kunci jawaban dinilai di backend dan tidak dikirim saat siswa mengerjakan.
