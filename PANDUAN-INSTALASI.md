# Panduan Instalasi UjianKu Pro — CBT Online

Panduan ini membawa Anda dari nol sampai aplikasi ujian online sekolah siap dipakai: **backend** di Google Apps Script, **frontend** di GitHub Pages, lalu konfigurasi awal, WhatsApp, dokumen bertanda tangan, migrasi data lama, dan pemecahan masalah. Ikuti tahapnya berurutan.

---

## 0. Gambaran singkat

```
 Siswa / Guru / Admin (HP, laptop)
            │  https
            ▼
 GitHub Pages ── index.html (portal siswa), admin.html (guru & admin), verifikasi.html
            │  fetch() JSON
            ▼
 Google Apps Script (Web App /exec) ── REST API, penilaian, keamanan
            │
            ├── Google Sheets  : database (dibuat otomatis)
            ├── Google Drive   : gambar soal, backup, template & dokumen terbit
            └── Script Properties : SEMUA rahasia (token, secret sesi, ID database)
```

**Berkas yang Anda terima**

| Berkas | Dipakai di | Cara |
|---|---|---|
| `ujianku-pro-frontend.zip` | GitHub Pages | Ekstrak → folder hasil ekstraksi itulah yang di-`git init` |
| `Kode.gs`, `Setup.gs`, `Ujian.gs`, `Rekap.gs`, `Notifikasi.gs`, `CRM.gs`, `Migrasi.gs`, `DocEngine.gs`, `DE_QrLib.gs` | Apps Script | Salin-tempel satu per satu ke editor |
| `appsscript.json` | Apps Script | Ganti isi manifest |
| `PANDUAN-INSTALASI.md` | — | Dokumen ini (salinannya juga ada di dalam ZIP) |

> **Prinsip keamanan:** tidak ada rahasia di frontend maupun di Google Sheets. `js/config.js` hanya berisi alamat API publik (`GAS_URL`). Token WhatsApp, secret sesi, ID spreadsheet & folder disimpan di **Script Properties**; kata sandi & PIN disimpan sebagai hash + salt; kunci jawaban tidak pernah dikirim ke browser siswa.

**Yang perlu disiapkan**

- Akun Google sekolah (disarankan akun khusus, mis. `cbt@sekolah.sch.id` atau Gmail khusus). Akun inilah "pemilik" database dan kuota.
- Akun GitHub (gratis) — username menjadi bagian alamat situs: `https://USERNAME.github.io/NAMA-REPO/`.
- Git terpasang di komputer (`git --version`). Windows: unduh dari https://git-scm.com/download/win.

---

## Tahap A — Backend Google Apps Script

### A1. Buat proyek

1. Masuk ke https://script.google.com dengan akun Google sekolah → **Proyek baru**.
2. Klik judul "Proyek tanpa judul" → beri nama **UjianKu Pro API**.

### A2. Pasang manifest `appsscript.json`

1. Klik ikon **⚙ Setelan Proyek** (kiri) → centang **Tampilkan file manifes "appsscript.json" di editor**.
2. Kembali ke **Editor** (ikon `< >`), buka `appsscript.json`, hapus seluruh isinya, tempel isi berkas `appsscript.json` yang Anda terima, lalu **Simpan** (Ctrl+S).
3. Masih di Setelan Proyek, pastikan **Zona waktu = (GMT+07:00) Jakarta**.

### A3. Tempel 9 berkas kode

1. Berkas bawaan `Kode.gs` (atau `Code.gs`): ganti namanya menjadi **Kode** (klik ⋮ → Ganti nama), hapus isinya, tempel isi `Kode.gs`.
2. Untuk berkas lainnya klik **＋ → Skrip**, ketik namanya **tanpa** `.gs`, lalu tempel isinya:
   `Setup`, `Ujian`, `Rekap`, `Notifikasi`, `CRM`, `Migrasi`, `DocEngine`, `DE_QrLib`.
3. **Simpan semua** (Ctrl+S). Pastikan ada 9 berkas `.gs` + `appsscript.json`. Urutan berkas tidak berpengaruh.

### A4. Jalankan setup otomatis (sekali)

1. Di toolbar editor pilih fungsi **`setupAppEnvironment`** → klik **▶ Jalankan**.
2. Muncul **Otorisasi diperlukan** → pilih akun → **Lanjutan → Buka UjianKu Pro API (tidak aman)** → **Izinkan**. (Peringatan ini wajar untuk skrip buatan sendiri. Izin yang diminta: Sheets, Drive, Docs, Slides, kirim email, akses URL eksternal untuk WhatsApp, dan trigger.)
3. Tunggu sampai **Log eksekusi** menampilkan `✅ SETUP SELESAI`. Setup membuat:
   - Spreadsheet database + semua tab tabel, folder Drive `📁 UjianKu Pro` (Gambar_Soal, Backup, Template_Dokumen, Dokumen_Terbit, Spesimen_TTD, Arsip_Rekap);
   - secret sesi acak & semua ID di Script Properties;
   - trigger `pekerjaMenit` (tiap menit) dan `pekerjaHarian` (02.00);
   - 4 template dokumen contoh (Surat Keterangan Hasil Ujian, Berita Acara, Rekap Nilai Excel, Sertifikat);
   - **data contoh** (kelas, siswa, guru, soal, paket, hasil) agar aplikasi bisa langsung dicoba.
4. **Catat dari log** (hanya tampil sekali):
   - `AKUN ADMIN AWAL` → nama pengguna `admin` + kata sandi;
   - `Akun guru contoh` dan `Token PIN siswa` contoh.

> Setup aman dijalankan ulang (tidak menggandakan data). Lupa sandi admin? Jalankan fungsi **`resetSandiAdmin`** dan lihat log.

### A5. Deploy sebagai Web App

1. Klik **Terapkan → Deployment baru** → ikon ⚙ di "Pilih jenis" → **Aplikasi web**.
2. Isi: **Jalankan sebagai: Saya** · **Yang memiliki akses: Siapa saja** → **Terapkan**.
3. Salin **URL aplikasi web** (berakhiran `/exec`). Inilah `GAS_URL`.
4. Uji: buka `URL/exec?ping=1` di browser → harus tampil JSON berisi `"UjianKu Pro API aktif."`.

> **Memperbarui kode nanti:** setelah mengubah `.gs`, buka **Terapkan → Kelola deployment → ✏ Edit → Versi: Versi baru → Terapkan**. URL tetap sama — frontend tidak perlu diubah. Jangan membuat "Deployment baru" lagi (URL-nya akan berbeda).

---

## Tahap B — Frontend ke GitHub Pages

### B1. Ekstrak ZIP dan tentukan folder kerja

Ekstrak `ujianku-pro-frontend.zip`, misalnya ke `Documents\ujianku-pro-frontend`. **Folder hasil ekstraksi inilah folder proyek** — tempat semua perintah git dijalankan. Jangan masuk lebih dalam, jangan naik satu level.

Buka terminal (PowerShell / Git Bash / Terminal Mac) di folder itu lalu periksa:

```bash
cd Documents/ujianku-pro-frontend
ls          # Windows PowerShell: dir
```

Yang **harus** terlihat: `index.html`, `admin.html`, `verifikasi.html`, `README.md`, `PANDUAN-INSTALASI.md`, folder `css`, `js`, `assets`. Tidak boleh ada berkas `.gs` di sini. Kalau yang terlihat justru satu folder lain, masuk dulu ke folder yang berisi `index.html`.

### B2. Isi `GAS_URL`

Buka `js/config.js` dengan Notepad/VS Code, ganti baris:

```js
GAS_URL: 'https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT/exec'
```

dengan URL `/exec` dari Tahap A5, lalu simpan. Hanya itu yang perlu diubah.

### B3. Buat repository & push pertama

1. Di https://github.com klik **＋ → New repository** → nama mis. `cbt` → **Public** → **jangan** centang README/.gitignore/license → **Create repository**.
2. Di terminal (folder dari B1), jalankan **satu per satu**:

```bash
git config --global user.name "Nama Anda"            # sekali seumur komputer
git config --global user.email "email-github@anda.com"
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/cbt.git
git push -u origin main
```

3. Saat `git push` meminta **Password**, tempelkan **Personal Access Token** (bukan sandi GitHub): buka https://github.com/settings/tokens → *Generate new token (classic)* → centang **repo** → *Generate* → salin `ghp_…`. Saat menempel, layar tampak kosong — itu normal, tekan Enter.

### B4. Aktifkan Pages

Repository → **Settings → Pages** → *Source: Deploy from a branch* → Branch **main**, folder **/ (root)** → **Save**. Tunggu 1–2 menit; alamat situs muncul di bagian atas halaman itu:

- Portal siswa: `https://USERNAME.github.io/cbt/`
- Dashboard guru & admin: `https://USERNAME.github.io/cbt/admin.html`
- Verifikasi dokumen: `https://USERNAME.github.io/cbt/verifikasi.html`

### B5. Cek

Buka portal siswa: di pojok kanan atas tampil **Server online · … ms** dengan titik hijau. Bila muncul pita kuning "Konfigurasi belum lengkap", `GAS_URL` belum benar (ulangi B2 lalu lakukan pembaruan seperti di bawah).

**Memperbarui frontend** (setelah mengubah berkas apa pun di folder ini):

```bash
git add .
git commit -m "Perbarui konfigurasi"
git push
```

---

## Tahap C — Konfigurasi pertama (oleh admin)

1. Buka `admin.html` → masuk `admin` + sandi dari log → **wajib ganti sandi** (min. 8 karakter, huruf + angka).
2. **Pengaturan → Identitas & Tampilan**: nama sekolah, alamat, logo (URL https), warna. Klik **"Pakai URL ini"** pada *URL portal siswa* dan *URL halaman verifikasi* → **Simpan**. (URL portal dipakai di kartu token, QR, dan pesan WhatsApp.)
3. **Pengaturan → Standar KKM**: KKM bawaan, daftar tingkat & mapel, KKM per mapel per tingkat.
4. **Pengaturan → Parameter Ujian**: kapan nilai tampil ke siswa, pembahasan, anti-cheat, satu perangkat, batas pelanggaran, interval simpan otomatis.
5. **Siswa & Kelas → Kelas / Rombel**: buat kelas. Lalu **Data Siswa → Impor Excel** (unduh template, isi, *Pindai dulu*, lalu *Impor sekarang*). NIS menjadi kunci — impor ulang memperbarui, tidak menggandakan.
6. **Pengguna**: buat akun guru, pilih **mapel** dan **kelas diampu**. Sandi awal tampil **sekali** — serahkan ke guru (atau aktifkan WA/Email agar terkirim otomatis).
7. Setelah mencoba data contoh: **Pengaturan → Sistem & Data Contoh → Hapus Data Contoh** (ketik `HAPUS`). Data buatan Anda tidak ikut terhapus.

### Pembagian peran

| Fitur | Admin | Guru |
|---|---|---|
| Pengguna, pengaturan, KKM, backup & migrasi, audit | ✅ | — |
| Bank soal | lihat semua | buat/ubah milik sendiri |
| Paket ujian & penjadwalan | lihat semua | buat/ubah milik sendiri |
| Token PIN, monitoring, rekap & analisis | semua paket | paket sendiri |
| Siswa & kontak CRM | semua kelas | kelas yang diampu |
| Dokumen & tanda tangan | semua + bypass beralasan | dokumen sendiri / sebagai pejabat |
| Siswa | masuk dengan **Token PIN** (6 karakter, 1 token = 1 paket) | |

---

## Tahap D — Alur ujian sehari-hari

**Guru**

1. **Bank Soal** → *Soal Baru* (PG / PG Kompleks, level Bloom C1–C6, gambar diunggah & dikompres otomatis, rumus `$…$` LaTeX, pembahasan) atau *Impor Excel*.
2. **Paket Ujian** → *Buat Paket*: identitas & kelas sasaran → pilih soal (bisa acak N soal) → jadwal buka/tutup & durasi → aturan (acak soal/opsi, anti-cheat, satu perangkat, KKM khusus, kapan nilai & pembahasan tampil) → **Terbitkan** (token dibuat otomatis).
3. **Token PIN** → *Cetak Kartu* (A4, 2 kolom, ada QR yang langsung mengisi PIN) atau *Kirim WA*. Bila siswa ganti perangkat/terkunci: *Reset login/perangkat* (ujian dilanjutkan, jawaban aman). PIN bocor: *Ganti PIN*.
4. **Monitoring** saat ujian: status tiap siswa, progres, sisa waktu, log anti-cheat, feed aktivitas; aksi *peringatan*, *+waktu*, *paksa kirim*, *umumkan pesan* ke semua layar, *kunci semua sesi*.
5. **Rekap & Analisis**: daftar nilai, distribusi terhadap KKM, rekomendasi remedial per topik; **Analisis Butir** (P, D 27%, efektivitas pengecoh, KR-20, keputusan Diterima/Revisi/Dibuang + inspektur per butir); *Ekspor Excel*, *Cetak*, *Umumkan* nilai/remedial ke siswa & wali; *Terapkan label kesukaran* ke bank soal.

**Siswa**: buka portal → masukkan Token PIN → baca tata tertib → *Mulai* → jawab (tersimpan otomatis ke server & perangkat) → *Kumpulkan* → lihat hasil; kunci & pembahasan terbuka setelah jadwal ditutup (bila diizinkan).

---

## Tahap E — WhatsApp (Fonnte) & Email

1. Daftar di https://fonnte.com → tambahkan **Device** → pindai QR dengan WhatsApp nomor sekolah → salin **Token** device.
2. Dashboard → **WhatsApp & Notifikasi → Konfigurasi**: tempel token (tersimpan di Script Properties, tampil tersamar) → nyalakan saklar WhatsApp → *Cek perangkat* → *Kirim tes WA*.
3. Email memakai Gmail akun pemilik: nyalakan saklar Email → *Kirim tes email*.
4. **Matriks event**: pilih kanal per kejadian (token, jadwal, nilai, remedial, akun, dokumen) dan ubah isi template (variabel `{nama}`, `{pin}`, `{paket}`, `{nilai}`, dst.) → **Simpan Konfigurasi**.
5. **Blast WhatsApp**: pilih penerima (kontak CRM / peserta paket / tempel nomor) → *Cek nomor terdaftar WA* → tulis pesan → batch 10/20/50 + jeda → masuk antrean dan dikirim bertahap oleh trigger tiap menit. Nomor ganda, tidak valid, dan opt-out otomatis dilewati.
6. **Antrean & Log**: status tiap pesan, *Proses sekarang*, *Ulangi yang gagal*.

> Kirim seperlunya dan dengan jeda — WhatsApp dapat memblokir nomor yang mengirim massal ke kontak yang tidak menyimpan nomor Anda. Gunakan nomor khusus sekolah.

**CRM Kontak** menyatukan Nama · Email · WhatsApp siswa, wali, dan staf (sinkron otomatis tiap 30 menit; tombol *Sinkron Sekarang*). Tag, catatan, opt-out, gabung duplikat, riwayat pesan, dan catat interaksi tersedia di detail kontak.

---

## Tahap F — Dokumen & tanda tangan (Doc Engine)

1. **Pejabat & Spesimen** (admin): isi nama, jabatan, NIP, **tautkan ke akun dashboard** pejabat (mis. akun kepala sekolah), unggah spesimen tanda tangan (PNG transparan, disimpan privat).
2. Pejabat masuk dashboard → **Dokumen → PIN Saya** → buat PIN 6 angka.
3. **Buat Dokumen**: pilih template → (otomatis) pilih paket/peserta → periksa isian → *Pratinjau PDF* → *Simpan & Ajukan*. Pejabat menyetujui dengan PIN → dokumen **terbit**: nomor otomatis, QR verifikasi, PDF dikunci dengan sidik jari SHA-256.
4. **Generate Massal**: satu dokumen per peserta (mis. SKHU/sertifikat). Disahkan sekali (PIN pejabat atau alasan admin), diproses di latar ±20 dokumen/menit.
5. **Template sendiri** (admin): buat Google Docs/Sheets/Slides berisi penanda seperti `{{NAMA}}`, `{{NILAI}}`, `{{#PESERTA}}…{{PESERTA.NAMA}}`, `{{?CATATAN}}…{{/CATATAN}}`, `{{NOMOR}}`, `{{TANGGAL}}`, `{{NAMA_PEJABAT_1}}`, `{{TTD_1}}`, `{{QR}}`, `{{KODE_VERIFIKASI}}` → **Template → Tambah Template** → tempel URL → sistem memindai dan membuat form otomatis. Atur label, tipe kolom, pejabat bawaan, jenis tanda (QR/spesimen), dan format keluaran (PDF/DOCX/XLSX/PNG).
6. Siapa pun dapat memeriksa keaslian di `verifikasi.html` (pindai QR atau ketik kode) dan mencocokkan berkas PDF-nya.
7. *(Opsional)* **Verifikasi Pusat** antar-aplikasi: isi `VP_URL`, `VP_KODE_APP`, `VP_KUNCI` di **Pengaturan → Keamanan & Integrasi**.

---

## Tahap G — Migrasi dari aplikasi lama & cutover

1. **Backup & Migrasi → Migrasi Data Lama**: tempel URL spreadsheet aplikasi lama (harus bisa dibuka akun pemilik). Kolom dikenali dari judulnya (mis. "Nama Siswa", "No HP", "Kunci Jawaban").
2. Centang tabel (Kelas, Guru, Siswa, Bank Soal, Pengumuman, Materi; riwayat hanya dari sumber berformat UjianKu Pro) → pilih *Pemilik soal* bila kolom pembuat kosong.
3. **Pindai (dry-run)** → periksa laporan (ditambah/diperbarui/dilewati + peringatan). Tidak ada data yang ditulis.
4. **Jalankan migrasi** (ketik `MIGRASI`). Backup pengaman dibuat otomatis lebih dulu. Akun guru hasil migrasi mendapat sandi awal → **unduh daftarnya saat itu juga**.
5. **Delta sync:** ulangi kapan saja — baris yang sudah ada tidak digandakan, keputusan di aplikasi baru tidak ditimpa (kecuali Anda mencentang *Timpa*).
6. **Hari peralihan (cutover):** umumkan jeda singkat → hentikan input di aplikasi lama → jalankan migrasi terakhir → bagikan alamat baru → simpan aplikasi lama sebagai arsip baca-saja.

**Backup**: otomatis tiap hari 02.00 (rotasi 14 salinan, dapat diubah). *Backup Sekarang* kapan saja. *Pulihkan*: mode **Gabung aman** (mengembalikan yang hilang) atau **Ganti penuh** — selalu membuat salinan pengaman lebih dulu. *Ekspor JSON* untuk arsip (tanpa hash sandi/PIN).

---

## Keamanan — apa disimpan di mana

| Data | Lokasi | Catatan |
|---|---|---|
| `SESSION_SECRET` (penandatangan token HMAC) | Script Properties | Dibangkitkan setup; rotasi: jalankan `rotasiSecretSesi` (semua orang masuk ulang) |
| `SPREADSHEET_ID`, `DRIVE_ROOT_FOLDER_ID`, `FOLDER_*` | Script Properties | Tidak pernah dikirim ke browser |
| `FONNTE_TOKEN`, `VP_URL`, `VP_KODE_APP`, `VP_KUNCI` | Script Properties | Diisi lewat dashboard admin; tampil tersamar |
| Kata sandi guru/admin, PIN pejabat | Sheets (hash + salt) | Tidak dapat dibaca siapa pun |
| Kunci jawaban | Sheets (BankSoal) | Penilaian di server; tidak dikirim ke siswa |
| `js/config.js` | GitHub (publik) | Hanya `GAS_URL` — bukan rahasia |

Tambahan: login dikunci 15 menit setelah 5 kali salah; token PIN dibatasi per perangkat; semua aksi penting tercatat di **Audit Log**; formula berbahaya di input dinetralkan; jangan bagikan spreadsheet database ke orang lain — cukup akun pemilik.

---

## Kinerja & kuota Google (penting untuk ujian serentak)

Batas resmi Apps Script per akun pemilik (Gmail biasa / Google Workspace): **eksekusi bersamaan 30**, email **100 / 1.500 penerima per hari**, UrlFetch (WhatsApp) **20.000 / 100.000 per hari**, total waktu trigger **90 menit / 6 jam per hari**, 6 menit per eksekusi, Script Properties 9 KB per nilai & 500 KB total.

Cara aplikasi tetap cepat: simpan otomatis jawaban hanya ke cache server (tanpa menulis Sheets), Sheets ditulis berkala; baca data lewat cache berversi; beberapa permintaan digabung (batch); server dipanaskan otomatis; notifikasi lewat antrean.

Saran operasional:

- Uji coba dulu dengan 1–2 kelas sebelum ujian besar, lalu pantau **Pengaturan → Sistem** dan fungsi `cekPerforma` di editor.
- Untuk ujian serentak ratusan siswa, biarkan **simpan otomatis ≥ 30 detik** dan beri jeda masuk antarkelas 3–5 menit.
- Akun Google Workspace memberi kuota trigger dan email jauh lebih besar dibanding Gmail biasa.
- Bila kuota trigger mepet, jalankan `matikanKeepWarm` (pemanasan otomatis dimatikan; aplikasi tetap berjalan, sedikit lebih lambat di permintaan pertama).

---

## Pemecahan masalah

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Pita kuning "Konfigurasi belum lengkap" | `GAS_URL` belum diisi/salah | Perbaiki `js/config.js`, lalu `git add . && git commit -m "fix config" && git push` |
| "Tidak dapat terhubung ke server" | URL salah, deployment belum "Siapa saja", atau internet | Buka `GAS_URL?ping=1` di browser; periksa setelan deployment (A5) |
| Situs 404 di GitHub | `git init` di folder yang salah | Di GitHub harus terlihat `index.html` di root, bukan folder `frontend/`; ulangi B1–B3 dari folder yang benar |
| Tampilan lama setelah update | Cache browser | Tekan Ctrl+F5; untuk rilis besar naikkan `?v=1.0.0` di `index.html`/`admin.html` |
| Perubahan `.gs` tidak berpengaruh | Deployment masih versi lama | Kelola deployment → Edit → **Versi baru** |
| Siswa "dibuka di perangkat lain" | Token terikat perangkat pertama | Token PIN / Monitoring → *Reset login/perangkat* |
| Siswa terkunci karena salah PIN | Batas percobaan | Tunggu (default 15 menit) atau ubah di Pengaturan → Keamanan |
| Lupa sandi admin | — | Editor Apps Script → jalankan `resetSandiAdmin` → lihat log |
| Gambar soal tidak tampil | Berkas Drive tidak publik / URL salah | Unggah ulang lewat tombol gambar di editor soal |
| WhatsApp tidak terkirim | Saklar/matriks mati, device Fonnte terputus, nomor salah | Konfigurasi → *Cek perangkat*; Antrean & Log → lihat kolom Respon → *Ulangi yang gagal* |
| Email berhenti terkirim | Kuota harian habis | Lanjut besok, atau pakai akun Workspace |
| Dokumen gagal terbit | Template dihapus/diubah izinnya, slot pejabat kosong | Lihat catatan merah di daftar dokumen; *Pindai ulang* template; lengkapi pejabat |
| Notifikasi/antrean tidak berjalan | Trigger belum terpasang | Jalankan `pasangTrigger` di editor, atau simpan Konfigurasi notifikasi |

---

## Batasan yang perlu diketahui

- **Anti-cheat berbasis browser** hanya mencatat pindah tab/aplikasi dan keluar layar penuh; tidak dapat mencegah ponsel kedua, kamera, atau bantuan orang lain. Untuk ujian berisiko tinggi tetap perlukan pengawas ruang (atau browser terkunci seperti Safe Exam Browser).
- Layar penuh tidak didukung penuh di iPhone/iPad (Safari) — pelanggaran pindah aplikasi tetap tercatat.
- Bila koneksi siswa terputus, jawaban tetap tersimpan di perangkat dan dikirim saat online kembali; namun waktu terus berjalan sesuai jam server.
- Kapasitas serentak dibatasi kuota Apps Script akun pemilik (lihat bagian Kinerja); lakukan uji beban sebelum ujian besar.
- WhatsApp lewat Fonnte bukan API resmi Meta — risiko pemblokiran nomor tetap ada bila dipakai berlebihan.
- Doc Engine dan backup memerlukan layanan Google Docs/Sheets/Slides/Drive akun pemilik; kuota Drive mengikuti akun tersebut.
