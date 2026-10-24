# Panduan instalasi CBT — backend inti

## Status berkas

Folder ini berisi satu backend Apps Script: apps-script/Kode.gs dan manifest apps-script/appsscript.json. Backend ini adalah versi inti hasil perbaikan. Frontend yang ada masih menampilkan menu dari versi yang lebih lengkap, tetapi beberapa menunya belum punya layanan backend.

Fitur backend inti: login admin/guru dan PIN siswa, kelas dan data siswa, akun staf, bank soal tanpa unggah gambar, paket ujian, token PIN, penyimpanan jawaban, penilaian, pengumuman portal, monitoring dasar, rekap dasar, materi/pengumuman, CRM dasar, dan backup.

Belum tersedia pada backend ini: WhatsApp/Fonnte dan email, antrean notifikasi, migrasi dari sistem lama, Doc Engine/tanda tangan/verifikasi dokumen, unggah gambar langsung, analisis butir lengkap, dan beberapa fitur lanjutan di dashboard. Jangan mengandalkan menu-menu tersebut untuk operasional.

## A. Pasang backend Apps Script

1. Buka proyek Apps Script yang sudah Anda buat dan pilih file Kode.gs.
2. Di folder proyek lokal, buka apps-script/Kode.gs. Salin seluruh isi file, lalu ganti seluruh isi Kode.gs di editor Apps Script dan simpan.
3. Jika editor menampilkan appsscript.json, samakan isinya dengan apps-script/appsscript.json. Manifest ini meminta izin Sheets, Drive, dan trigger untuk fitur backup.
4. Dari daftar fungsi di toolbar, pilih setupAppEnvironment lalu klik Jalankan. Jika muncul permintaan izin, tinjau dan izinkan untuk akun Google pemilik proyek.
5. Log eksekusi harus menampilkan SETUP SELESAI dan URL database. Setup menambahkan tab/kolom yang kurang pada database yang sudah ada. Akun admin hanya dibuat bila tabel Users belum memiliki akun.
6. Jika sandi admin yang tampil saat setup sudah pernah dicatat, gunakan sandi tersebut. Ganti sandi segera setelah login. Bila lupa, jalankan resetSandiAdmin dan lihat Log eksekusi.

## B. Deploy sebagai Web App

1. Klik Terapkan → Deployment baru → pilih Aplikasi web.
2. Pilih Jalankan sebagai: Saya. Untuk situs yang dapat dibuka siswa, akses Web App harus mencakup Siapa saja. Tinjau pilihan akses sebelum menerapkan.
3. Klik Terapkan dan salin URL Web App yang berakhiran /exec. Jangan gunakan URL editor atau ID proyek.
4. Cek URL tersebut dengan menambahkan ?ping=1. Responsnya harus berupa JSON yang menyatakan API UjianKu Pro aktif.
5. Jika mengubah Kode.gs lagi, buka Terapkan → Kelola deployment → Edit → Versi baru → Terapkan. Gunakan URL deployment yang tampil di sana.

## C. Hubungkan frontend

1. js/config.js sudah diatur ke URL Web App yang dibuat untuk CBT ini. URL itu memang publik agar browser siswa dan guru dapat menjangkau backend.
2. Jika nanti Anda membuat deployment Web App baru, ganti nilai GAS_URL dengan URL /exec yang baru.
3. Folder ini adalah root GitHub Pages karena index.html berada di dalamnya. Setelah memperbarui repository, tunggu GitHub Pages selesai lalu muat ulang situs dengan Ctrl+F5.

## D. Pemeriksaan awal

Setelah backend dan frontend terhubung:

1. Masuk ke admin.html dengan akun admin. Ganti sandi awal.
2. Buat kelas dan satu akun guru.
3. Tambah satu siswa, satu soal pilihan ganda, dan satu paket ujian untuk kelas tersebut.
4. Buat token PIN, lalu masuk melalui halaman siswa, jawab, dan kumpulkan ujian.
5. Periksa nilai di Rekap. Pastikan nilai siswa yang disembunyikan tidak terlihat sebelum diumumkan.
6. Lakukan percobaan kecil dengan data uji sebelum memasukkan data ujian sebenarnya.

## Data awal yang sudah dibuat

Pada proyek Apps Script yang ditunjukkan, setup berhasil dijalankan. Log eksekusi mencatat spreadsheet database dan akun admin awal. Gunakan kredensial dari log itu; jangan masukkan sandi ke file repository atau membagikannya kepada siswa. Ganti sandi setelah login pertama.

URL spreadsheet database hanya ada di Log eksekusi Apps Script. Jangan menempelkannya ke repository publik.

## Pemecahan masalah

- SyntaxError di Apps Script: ganti seluruh Kode.gs dengan isi apps-script/Kode.gs yang sudah diperbaiki, simpan, lalu jalankan setupAppEnvironment.
- Login admin gagal: pastikan Anda membuka deployment dari proyek yang sama dengan proyek tempat setup membuat database. Jika sandi tidak tersimpan, jalankan resetSandiAdmin dan ambil sandi dari Log eksekusi.
- API tidak terhubung: periksa bahwa js/config.js berisi URL Web App /exec yang benar dan deployment sudah diperbarui ke versi baru.
- Fitur yang belum tersedia: backend akan menolak aksi yang tidak dikenal. WhatsApp, dokumen, migrasi, dan fitur lain yang disebut pada bagian Status berkas memang belum diimplementasikan.
