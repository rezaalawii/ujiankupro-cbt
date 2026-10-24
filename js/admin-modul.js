/* ============================================================================
   UjianKu Pro — Siswa & Kelas, Pengguna, Pengaturan (identitas, KKM, parameter,
   keamanan, sistem), Pengumuman & Materi, WhatsApp & Notifikasi (konfigurasi,
   blast per batch, antrean), CRM Kontak, Backup & Migrasi, Audit Log.
   ============================================================================ */
(function () {
  'use strict';
  const A = window.App, ADM = window.ADM, $ = A.$, $$ = A.$$, esc = A.esc, ic = A.icon, F = A.fmt;
  const ALIAS_SISWA = { nama: 'Nama', namasiswa: 'Nama', namalengkap: 'Nama', nis: 'NIS', noinduk: 'NIS', nipd: 'NIS', nisn: 'NISN', kelas: 'Kelas', rombel: 'Kelas', namakelas: 'Kelas',
    jk: 'JenisKelamin', jeniskelamin: 'JenisKelamin', lp: 'JenisKelamin', gender: 'JenisKelamin', nowa: 'NoWA', nohp: 'NoWA', hp: 'NoWA', whatsapp: 'NoWA', wa: 'NoWA', telepon: 'NoWA',
    email: 'Email', namawali: 'NamaWali', namaorangtua: 'NamaWali', orangtua: 'NamaWali', wali: 'NamaWali', nowawali: 'NoWAWali', hpwali: 'NoWAWali', nohpwali: 'NoWAWali', nohporangtua: 'NoWAWali', waortu: 'NoWAWali',
    status: 'StatusAktif', statusaktif: 'StatusAktif', aktif: 'StatusAktif' };
  const tabsHtml = function (id, list, aktif) { return '<div class="chips scroll" id="' + id + '" style="margin-bottom:16px">' + list.map(function (t) { return '<button class="chip ' + (t[0] === aktif ? 'on' : '') + '" data-t="' + t[0] + '">' + (t[2] ? ic(t[2], 'sm') : '') + esc(t[1]) + '</button>'; }).join('') + '</div>'; };
  const ikatTabs = function (id, cb) { $$('#' + id + ' [data-t]').forEach(function (b) { b.onclick = function () { $$('#' + id + ' [data-t]').forEach(function (x) { x.classList.toggle('on', x === b); }); cb(b.dataset.t); }; }); };
  const waBadge = function (s) { return s === 'Terdaftar' ? '<span class="badge green" title="Terdaftar WhatsApp">' + ic('wa', 'sm') + 'WA</span>' : s === 'Tidak Terdaftar' ? '<span class="badge rose" title="Tidak terdaftar WhatsApp">Bukan WA</span>' : ''; };
  const muatKelas = function () { return A.swr('kelas', function () { return A.apiQ('kelas.list', {}); }, { maxAge: 60000 }); };
  ADM.muatKelas = muatKelas;
  const unduhTeks = function (teks, nama, mime) { const u = URL.createObjectURL(new Blob([teks], { type: mime || 'application/json' })); const a = document.createElement('a'); a.href = u; a.download = nama; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); };
  const sandiModal = function (judul, username, sandi) {
    A.modal({ title: judul, icon: 'key', iconTone: 't-green', noBgClose: true, body: '<p class="small" style="margin-top:0">Catat sekarang — sandi ini <b>hanya tampil sekali</b> dan tidak disimpan dalam bentuk asli.</p><div class="dark-card"><div class="tile"><small>Username</small><b>' + esc(username) + '</b></div><div class="tile" style="margin-top:8px"><small>Kata sandi sementara</small><b style="font-size:18px;letter-spacing:.06em">' + esc(sandi) + '</b></div></div><p class="tiny muted">Pengguna wajib mengganti sandi saat login pertama.</p>',
      actions: [{ label: 'Salin', icon: 'copy', onClick: function () { A.copy('Username: ' + username + '\nSandi: ' + sandi); return false; } }, { label: 'Sudah dicatat', cls: 'primary' }] });
  };

  // ============================================================================
  // SISWA & KELAS
  // ============================================================================
  const SW = { tab: 'siswa', kelas: '', status: 'YA', q: '', pilih: {} };
  ADM.reg('siswa', function (v) {
    v.innerHTML = ADM.judul('Siswa & Kelas', ADM.isAdmin() ? 'Kelola data siswa, wali, dan rombongan belajar seluruh sekolah.' : 'Data siswa di kelas yang Anda ampu.', '', 'Data &amp; Layanan › <b>Siswa &amp; Kelas</b>') + tabsHtml('swTab', [['siswa', 'Data Siswa', 'users'], ['kelas', 'Kelas / Rombel', 'grid']], SW.tab) + '<div id="swIsi"></div>';
    ikatTabs('swTab', function (t) { SW.tab = t; tampil(); });
    const tampil = function () { if (SW.tab === 'kelas') tabKelas($('#swIsi')); else tabSiswa($('#swIsi')); };
    tampil();
  });
  function tabSiswa(el) {
    el.innerHTML = '<div class="grid g4" id="ssKpi"></div><div class="card" style="margin-top:16px"><div class="card-b row wrap"><div class="search grow" style="min-width:220px">' + ic('search') + '<input class="inp" id="ssQ" placeholder="Cari nama, NIS, NISN, wali…" value="' + esc(SW.q) + '"></div>' +
      '<select class="sel" id="ssKelas" style="width:auto"><option value="">Semua kelas</option></select><select class="sel" id="ssStatus" style="width:auto"><option value="">Semua status</option><option value="YA">Aktif</option><option value="TIDAK">Nonaktif</option></select>' +
      '<button class="btn ghost" id="ssImp">' + ic('upload', 'sm') + 'Impor Excel</button><button class="btn ghost" id="ssExp">' + ic('download', 'sm') + 'Ekspor</button><button class="btn primary" id="ssBaru">' + ic('plus', 'sm') + 'Tambah Siswa</button></div>' +
      '<div class="row between wrap hidden" id="ssBulk" style="padding:10px 18px;background:var(--brand-50);border-top:1px solid var(--line)"><b class="small" id="ssN"></b><div class="row wrap"><button class="btn sm ghost" id="ssWA">' + ic('wa', 'sm') + 'Cek nomor WA</button><button class="btn sm danger" id="ssDel">' + ic('trash', 'sm') + 'Hapus</button></div></div>' +
      '<div class="tbl-wrap"><table class="tbl" id="ssT"><thead><tr><th style="width:34px"><input type="checkbox" id="ssAll"></th><th>Siswa</th><th>Kelas</th><th>JK</th><th>WhatsApp</th><th>Email</th><th>Wali</th><th>Status</th><th class="right">Aksi</th></tr></thead><tbody><tr><td colspan="9"><div class="skel" style="height:200px"></div></td></tr></tbody></table></div><div class="pager" id="ssT_pg"></div></div>';
    let D = null, kelasL = [];
    const t = ADM.tabelKlien({ id: 'ssT', kolom: 9, per: 30, kosong: 'Belum ada siswa.',
      rows: function () { return D ? D.rows.filter(function (r) { return (!SW.kelas || r.Kelas === SW.kelas) && (!SW.status || r.StatusAktif === SW.status); }) : []; },
      cari: function (r) { return r.Nama + ' ' + r.NIS + ' ' + r.NISN + ' ' + r.NamaWali + ' ' + r.Email; },
      baris: function (r) {
        return '<tr class="' + (SW.pilih[r.ID] ? 'sel' : '') + '"><td><input type="checkbox" data-ck="' + r.ID + '"' + (SW.pilih[r.ID] ? ' checked' : '') + '></td><td><div class="row" style="gap:10px"><div class="avatar sm" style="background:' + (r.JenisKelamin === 'P' ? '#db2777' : 'var(--brand)') + '">' + esc(A.inisial(r.Nama)) + '</div><div><b style="color:var(--ink)">' + esc(r.Nama) + '</b><div class="tiny muted mono">NIS ' + esc(r.NIS) + (r.NISN ? ' · NISN ' + esc(r.NISN) : '') + '</div></div></div></td>' +
          '<td class="small">' + esc(r.Kelas) + '</td><td class="small">' + esc(r.JenisKelamin || '-') + '</td><td class="small mono">' + (r.NoWA ? esc(r.NoWA) + ' ' + waBadge(r.StatusWA) : '<span class="muted">—</span>') + '</td><td class="small">' + (r.Email ? esc(r.Email) : '<span class="muted">—</span>') + '</td>' +
          '<td class="small">' + (r.NamaWali ? esc(r.NamaWali) + (r.NoWAWali ? '<div class="tiny muted mono">' + esc(r.NoWAWali) + '</div>' : '') : '<span class="muted">—</span>') + '</td><td><span class="badge dot ' + (r.StatusAktif === 'YA' ? 'green' : '') + '">' + (r.StatusAktif === 'YA' ? 'Aktif' : 'Nonaktif') + '</span></td>' +
          '<td class="act"><button class="iconbtn blue" data-ed="' + r.ID + '" title="Ubah">' + ic('edit') + '</button><button class="iconbtn rose" data-del="' + r.ID + '" title="Hapus">' + ic('trash') + '</button></td></tr>';
      },
      after: function () {
        $$('#ssT [data-ck]').forEach(function (c) { c.onchange = function () { if (c.checked) SW.pilih[c.dataset.ck] = 1; else delete SW.pilih[c.dataset.ck]; c.closest('tr').classList.toggle('sel', c.checked); bulk(); }; });
        $$('#ssT [data-ed]').forEach(function (b) { b.onclick = function () { form(D.rows.filter(function (r) { return r.ID === b.dataset.ed; })[0]); }; });
        $$('#ssT [data-del]').forEach(function (b) { b.onclick = function () { hapus([b.dataset.del]); }; });
        bulk();
      } });
    const bulk = function () { const n = Object.keys(SW.pilih).length; $('#ssBulk').classList.toggle('hidden', !n); $('#ssN').textContent = n + ' siswa dipilih'; };
    const muat = function (paksa) {
      return Promise.all([A.swr('siswa', function () { return A.apiQ('siswa.list', {}); }, { maxAge: paksa ? 0 : 30000, force: !!paksa }), muatKelas()]).then(function (x) {
        if (!$('#ssT')) return;
        D = x[0] || { rows: [] }; kelasL = x[1] ? x[1].rows.map(function (k) { return k.NamaKelas; }) : [];
        const aktif = D.rows.filter(function (r) { return r.StatusAktif === 'YA'; });
        $('#ssKpi').innerHTML = ADM.kpi('Siswa Aktif', aktif.length, D.rows.length - aktif.length + ' nonaktif', 't-blue', 'users') + ADM.kpi('Kelas', kelasL.length, ADM.isAdmin() ? 'Rombel terdaftar' : 'Kelas diampu', 't-purple', 'grid') +
          ADM.kpi('Nomor WA Terisi', aktif.filter(function (r) { return r.NoWA; }).length, aktif.filter(function (r) { return r.StatusWA === 'Terdaftar'; }).length + ' terverifikasi WA', 't-green', 'wa') + ADM.kpi('Data Wali', aktif.filter(function (r) { return r.NoWAWali; }).length, 'Nomor WA wali terisi', 't-amber', 'contacts');
        $('#ssKelas').innerHTML = '<option value="">Semua kelas</option>' + kelasL.map(function (k) { return '<option' + (k === SW.kelas ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('');
        $('#ssStatus').value = SW.status;
        t.cari(SW.q);
      });
    };
    const form = function (s) {
      s = s || { StatusAktif: 'YA', Kelas: SW.kelas || kelasL[0] || '' };
      if (!kelasL.length) return A.toast(ADM.isAdmin() ? 'Buat kelas terlebih dahulu (tab Kelas / Rombel).' : 'Anda belum ditugaskan ke kelas mana pun.', 'warn');
      const f = [{ k: 'Nama', label: 'Nama lengkap', req: true, full: true }, { k: 'NIS', label: 'NIS', req: true }, { k: 'NISN', label: 'NISN' }, { k: 'Kelas', label: 'Kelas', type: 'select', opsi: kelasL, req: true },
        { k: 'JenisKelamin', label: 'Jenis kelamin', type: 'select', opsi: [{ v: '', l: '—' }, { v: 'L', l: 'Laki-laki' }, { v: 'P', l: 'Perempuan' }] }, { k: 'NoWA', label: 'No. WhatsApp siswa', ph: '08…' }, { k: 'Email', label: 'Email', type: 'email' },
        { k: 'NamaWali', label: 'Nama orang tua/wali' }, { k: 'NoWAWali', label: 'No. WhatsApp wali', ph: '08…' }, { k: 'StatusAktif', label: 'Status', type: 'switch', ket: 'Siswa aktif (dapat diberi token)', full: true }];
      ADM.modalForm({ title: s.ID ? 'Ubah Data Siswa' : 'Tambah Siswa', icon: 'user', fields: f, nilai: s, onSave: function (d) { d.ID = s.ID; return A.api('siswa.simpan', { siswa: d }); }, after: function () { A.swrClear('siswa'); A.swrClear('kelas'); muat(true); } });
    };
    const hapus = function (ids) {
      A.modal({ title: 'Hapus siswa', icon: 'trash', iconTone: 't-rose', size: 'sm', body: '<p class="small" style="margin-top:0">Hapus <b>' + ids.length + '</b> siswa? Bila siswa sudah memiliki riwayat ujian, sebaiknya <b>nonaktifkan</b> saja agar rekap tetap utuh.</p><label class="check"><input type="checkbox" id="hpPaksa"> Hapus paksa walau ada riwayat ujian</label>',
        actions: [{ label: 'Batal' }, { label: 'Hapus', cls: 'danger', icon: 'trash', onClick: async function (b, bg) { const r = await A.api('siswa.hapus', { ids: ids, paksa: $('#hpPaksa', bg).checked }); if (!A.hasil(r)) return false; SW.pilih = {}; A.swrClear('siswa'); muat(true); } }] });
    };
    $('#ssQ').oninput = A.debounce(function (e) { SW.q = e.target.value; t.cari(SW.q); }, 200);
    $('#ssKelas').onchange = function () { SW.kelas = this.value; t.reset(); };
    $('#ssStatus').onchange = function () { SW.status = this.value; t.reset(); };
    $('#ssAll').onchange = function () { const on = this.checked; $$('#ssT [data-ck]').forEach(function (c) { c.checked = on; if (on) SW.pilih[c.dataset.ck] = 1; else delete SW.pilih[c.dataset.ck]; c.closest('tr').classList.toggle('sel', on); }); bulk(); };
    $('#ssBaru').onclick = function () { form(null); };
    $('#ssDel').onclick = function () { hapus(Object.keys(SW.pilih)); };
    $('#ssWA').onclick = async function () {
      const nomor = D.rows.filter(function (r) { return SW.pilih[r.ID] && r.NoWA; }).map(function (r) { return r.NoWA; });
      if (!nomor.length) return A.toast('Siswa terpilih belum memiliki nomor WA.', 'warn');
      const r = await A.aksi(this, 'wa.validate', { nomor: nomor.slice(0, 50) }); if (r.success) { A.swrClear('siswa'); muat(true); }
    };
    $('#ssExp').onclick = function () { if (D) A.exportXlsx({ Siswa: D.rows.map(function (r) { return { Nama: r.Nama, NIS: r.NIS, NISN: r.NISN, Kelas: r.Kelas, JenisKelamin: r.JenisKelamin, NoWA: r.NoWA, StatusWA: r.StatusWA, Email: r.Email, NamaWali: r.NamaWali, NoWAWali: r.NoWAWali, StatusAktif: r.StatusAktif }; }) }, 'Data Siswa ' + F.tgl(new Date())); };
    $('#ssImp').onclick = function () {
      ADM.imporExcel({ judul: 'Impor Data Siswa', aksi: 'siswa.impor', kolom: ['Nama', 'NIS', 'NISN', 'Kelas', 'JenisKelamin', 'NoWA', 'Email', 'NamaWali', 'NoWAWali', 'StatusAktif'], alias: ALIAS_SISWA, namaTemplate: 'Template Data Siswa',
        contoh: [{ Nama: 'Ahmad Fauzi', NIS: '2425.10.001', NISN: '0081234567', Kelas: kelasL[0] || 'X MIPA 1', JenisKelamin: 'L', NoWA: '081234567890', Email: 'ahmad@contoh.sch.id', NamaWali: 'Bapak Fauzi', NoWAWali: '081298765432', StatusAktif: 'YA' }],
        ekstra: '<div class="alert blue">' + ic('info') + '<div class="small">NIS menjadi kunci: siswa dengan NIS yang sudah ada akan <b>diperbarui</b> (kolom kosong tidak menimpa). Nama kelas harus sudah terdaftar.</div></div>',
        after: function () { A.swrClear('siswa'); A.swrClear('kelas'); muat(true); } });
    };
    muat();
  }
  function tabKelas(el) {
    const admin = ADM.isAdmin();
    el.innerHTML = '<div class="card"><div class="card-h"><div><h3>Kelas / Rombongan Belajar</h3><p>' + (admin ? 'Nama kelas dipakai sebagai sasaran paket ujian dan penugasan guru.' : 'Kelas yang Anda ampu (diatur admin).') + '</p></div>' + (admin ? '<button class="btn primary" id="klBaru">' + ic('plus', 'sm') + 'Tambah Kelas</button>' : '') + '</div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kelas</th><th>Tingkat</th><th>Wali Kelas</th><th>Ruang</th><th class="num">Siswa Aktif</th><th>Status</th><th class="right">Aksi</th></tr></thead><tbody id="klBody"><tr><td colspan="7"><div class="skel" style="height:160px"></div></td></tr></tbody></table></div></div>';
    let D = null, guru = [];
    const render = function () {
      $('#klBody').innerHTML = D.rows.length ? D.rows.map(function (k) {
        return '<tr><td><b style="color:var(--ink)">' + esc(k.NamaKelas) + '</b></td><td><span class="tag">' + esc(k.Tingkat || '-') + '</span></td><td class="small">' + esc(k.NamaWali || '—') + '</td><td class="small">' + esc(k.Ruang || '—') + '</td><td class="num"><b>' + k.JumlahSiswa + '</b></td>' +
          '<td><span class="badge dot ' + (k.Aktif === 'YA' ? 'green' : '') + '">' + (k.Aktif === 'YA' ? 'Aktif' : 'Nonaktif') + '</span></td><td class="act">' + (admin ? '<button class="iconbtn blue" data-ed="' + k.ID + '">' + ic('edit') + '</button><button class="iconbtn rose" data-del="' + k.ID + '">' + ic('trash') + '</button>' : '') + '</td></tr>';
      }).join('') : A.tabelKosong(7, 'Belum ada kelas.', 'grid');
      $$('#klBody [data-ed]').forEach(function (b) { b.onclick = function () { form(D.rows.filter(function (k) { return k.ID === b.dataset.ed; })[0]); }; });
      $$('#klBody [data-del]').forEach(function (b) { b.onclick = async function () { if (!await A.confirm('Hapus kelas ini? Kelas yang masih memiliki siswa tidak dapat dihapus.', { danger: true, ok: 'Hapus' })) return; const r = await A.api('kelas.hapus', { id: b.dataset.del }); if (A.hasil(r)) { A.swrClear('kelas'); muat(true); } }; });
    };
    const form = function (k) {
      k = k || { Aktif: 'YA' };
      ADM.modalForm({ title: k.ID ? 'Ubah Kelas' : 'Tambah Kelas', icon: 'grid', size: '', nilai: k,
        fields: [{ k: 'NamaKelas', label: 'Nama kelas', req: true, ph: 'mis. XII MIPA 1', full: true }, { k: 'Tingkat', label: 'Tingkat', type: 'select', opsi: [''].concat(D.tingkat) }, { k: 'Ruang', label: 'Ruang ujian', ph: 'mis. Lab CBT 1' },
          { k: 'WaliKelas', label: 'Wali kelas', type: 'select', opsi: [{ v: '', l: '—' }].concat(guru.map(function (g) { return { v: g.ID, l: g.Nama }; })), full: true }, { k: 'Aktif', label: 'Status', type: 'switch', ket: 'Kelas aktif', full: true }],
        onSave: function (d) { d.ID = k.ID; return A.api('kelas.simpan', { kelas: d }); }, after: function () { A.swrClear('kelas'); A.swrClear('siswa'); muat(true); } });
    };
    const muat = function (paksa) {
      const tugas = [A.swr('kelas', function () { return A.apiQ('kelas.list', {}); }, { maxAge: paksa ? 0 : 30000, force: !!paksa })];
      if (admin) tugas.push(A.swr('user', function () { return A.apiQ('user.list', {}); }, { maxAge: 60000 }));
      Promise.all(tugas).then(function (x) { if (!$('#klBody')) return; D = x[0] || { rows: [], tingkat: [] }; guru = x[1] ? x[1].rows.filter(function (u) { return u.StatusAktif === 'YA'; }) : []; render(); });
    };
    if ($('#klBaru')) $('#klBaru').onclick = function () { if (D) form(null); };
    muat();
  }

  // ============================================================================
  // PENGGUNA (admin)
  // ============================================================================
  ADM.reg('pengguna', function (v) {
    v.innerHTML = ADM.judul('Pengguna Dashboard', 'Akun guru & admin. Kata sandi disimpan sebagai hash + salt; sandi awal hanya tampil sekali.', '<button class="btn primary" id="usBaru">' + ic('plus', 'sm') + 'Tambah Pengguna</button>', 'Administrasi › <b>Pengguna</b>') +
      '<div class="grid g4" id="usKpi"></div><div class="card" style="margin-top:16px"><div class="card-b row wrap"><div class="search grow">' + ic('search') + '<input class="inp" id="usQ" placeholder="Cari nama, username, mapel…"></div><select class="sel" id="usPeran" style="width:auto"><option value="">Semua peran</option><option value="GURU">Guru</option><option value="ADMIN">Admin</option></select></div>' +
      '<div class="tbl-wrap"><table class="tbl" id="usT"><thead><tr><th>Pengguna</th><th>Peran</th><th>Mapel</th><th>Kelas Diampu</th><th>Kontak</th><th>Login Terakhir</th><th>Status</th><th class="right">Aksi</th></tr></thead><tbody><tr><td colspan="8"><div class="skel" style="height:160px"></div></td></tr></tbody></table></div><div class="pager" id="usT_pg"></div></div>';
    let D = null, kelasL = [], mapelL = [], peran = '';
    const t = ADM.tabelKlien({ id: 'usT', kolom: 8, per: 25, rows: function () { return D ? D.rows.filter(function (u) { return !peran || u.Peran === peran; }) : []; }, cari: function (u) { return u.Nama + ' ' + u.Username + ' ' + u.Mapel + ' ' + u.Kelas; },
      baris: function (u) {
        return '<tr><td><div class="row" style="gap:10px"><div class="avatar sm" style="background:' + (u.Peran === 'ADMIN' ? '#7c3aed' : 'var(--brand)') + '">' + esc(A.inisial(u.Nama)) + '</div><div><b style="color:var(--ink)">' + esc(u.Nama) + '</b>' + (u.ID === ADM.me.id ? ' <span class="badge blue">Anda</span>' : '') + '<div class="tiny muted mono">@' + esc(u.Username) + (u.NIP ? ' · NIP ' + esc(u.NIP) : '') + '</div></div></div></td>' +
          '<td><span class="badge ' + (u.Peran === 'ADMIN' ? 'purple' : 'blue') + '">' + esc(u.Peran) + '</span></td><td class="small">' + esc(u.Mapel || '—') + '</td><td class="small" style="max-width:200px">' + esc(u.Kelas || '—') + '</td>' +
          '<td class="tiny">' + (u.Email ? esc(u.Email) + '<br>' : '') + (u.NoWA ? '<span class="mono">' + esc(u.NoWA) + '</span>' : '') + (!u.Email && !u.NoWA ? '<span class="muted">—</span>' : '') + '</td>' +
          '<td class="tiny muted">' + (u.LoginTerakhir ? F.relatif(u.LoginTerakhir) : 'Belum pernah') + (u.WajibGanti === 'YA' ? '<div><span class="badge amber" style="height:18px">wajib ganti sandi</span></div>' : '') + '</td>' +
          '<td><span class="badge dot ' + (u.StatusAktif === 'YA' ? 'green' : '') + '">' + (u.StatusAktif === 'YA' ? 'Aktif' : 'Nonaktif') + '</span></td>' +
          '<td class="act"><button class="iconbtn blue" data-ed="' + u.ID + '" title="Ubah">' + ic('edit') + '</button><button class="iconbtn amber" data-rs="' + u.ID + '" title="Reset kata sandi">' + ic('key') + '</button></td></tr>';
      },
      after: function () {
        $$('#usT [data-ed]').forEach(function (b) { b.onclick = function () { form(D.rows.filter(function (u) { return u.ID === b.dataset.ed; })[0]); }; });
        $$('#usT [data-rs]').forEach(function (b) { b.onclick = function () { reset(D.rows.filter(function (u) { return u.ID === b.dataset.rs; })[0]); }; });
      } });
    const muat = function (paksa) {
      Promise.all([A.swr('user', function () { return A.apiQ('user.list', {}); }, { maxAge: paksa ? 0 : 30000, force: !!paksa }), muatKelas(), A.swr('cfg', function () { return A.apiQ('cfg.get', {}); }, { maxAge: 60000 })]).then(function (x) {
        if (!$('#usT')) return;
        D = x[0] || { rows: [] }; kelasL = x[1] ? x[1].rows.map(function (k) { return k.NamaKelas; }) : []; mapelL = x[2] ? x[2].mapel : [];
        const g = D.rows.filter(function (u) { return u.Peran === 'GURU'; });
        $('#usKpi').innerHTML = ADM.kpi('Total Akun', D.rows.length, D.rows.filter(function (u) { return u.StatusAktif === 'YA'; }).length + ' aktif', 't-blue', 'users') + ADM.kpi('Guru', g.length, 'Penyusun soal & paket', 't-green', 'cap') +
          ADM.kpi('Admin', D.rows.length - g.length, 'Akses penuh', 't-purple', 'shield') + ADM.kpi('Belum Ganti Sandi', D.rows.filter(function (u) { return u.WajibGanti === 'YA'; }).length, 'Masih sandi awal/reset', 't-amber', 'key');
        t.render();
      });
    };
    const form = function (u) {
      u = u || { Peran: 'GURU', StatusAktif: 'YA' };
      let uname = '';
      ADM.modalForm({ title: u.ID ? 'Ubah Pengguna' : 'Tambah Pengguna', sub: u.ID ? '' : 'Sandi awal dibuat otomatis dan wajib diganti saat login pertama.', icon: 'user', nilai: u,
        fields: [{ k: 'Nama', label: 'Nama lengkap (dengan gelar)', req: true, full: true }, { k: 'Username', label: 'Username', req: true, ph: 'huruf kecil, mis. budi.santoso', hint: '3–30 karakter: huruf kecil, angka, titik, minus.' }, { k: 'Peran', label: 'Peran', type: 'select', opsi: [{ v: 'GURU', l: 'Guru' }, { v: 'ADMIN', l: 'Admin' }] },
          { k: 'Mapel', label: 'Mata pelajaran diampu', type: 'chips', opsi: mapelL, full: true }, { k: 'Kelas', label: 'Kelas diampu', type: 'chips', opsi: kelasL, full: true, hint: 'Guru hanya melihat siswa, token, dan kontak dari kelas ini.' },
          { k: 'Email', label: 'Email', type: 'email' }, { k: 'NoWA', label: 'No. WhatsApp', ph: '08…' }, { k: 'NIP', label: 'NIP / NUPTK' }, { k: 'StatusAktif', label: 'Status', type: 'switch', ket: 'Akun aktif' }],
        onSave: function (d) { d.ID = u.ID; uname = String(d.Username || '').toLowerCase(); return A.api('user.simpan', { user: d }); },
        after: function (r) { A.swrClear('user'); muat(true); if (r.data && r.data.sandiAwal) setTimeout(function () { sandiModal('Akun dibuat', uname, r.data.sandiAwal); }, 60); } });
    };
    const reset = function (u) {
      A.modal({ title: 'Reset kata sandi', sub: u.Nama + ' (@' + u.Username + ')', icon: 'key', iconTone: 't-amber', size: 'sm', body: '<p class="small" style="margin-top:0">Sandi baru dibuat acak, semua sesi akun ini dikeluarkan, dan pengguna wajib menggantinya saat login.</p><label class="check"><input type="checkbox" id="rsWA"' + (u.NoWA || u.Email ? ' checked' : '') + '> Kirim sandi sementara via WA/Email</label>',
        actions: [{ label: 'Batal' }, { label: 'Reset sandi', cls: 'danger', icon: 'key', onClick: async function (b, bg) { const r = await A.api('user.reset', { id: u.ID, kirimWA: $('#rsWA', bg).checked }); if (!A.hasil(r)) return false; setTimeout(function () { sandiModal('Sandi baru', u.Username, r.data.sandiBaru); }, 60); A.swrClear('user'); muat(true); } }] });
    };
    $('#usBaru').onclick = function () { form(null); };
    $('#usQ').oninput = A.debounce(function (e) { t.cari(e.target.value); }, 200);
    $('#usPeran').onchange = function () { peran = this.value; t.reset(); };
    muat();
  });

  // ============================================================================
  // PENGATURAN (admin)
  // ============================================================================
  const PG = { tab: 'identitas' };
  ADM.reg('pengaturan', function (v) {
    v.innerHTML = ADM.judul('Pengaturan Sistem', 'Identitas sekolah, standar KKM, parameter ujian, keamanan, dan status sistem.', '', 'Administrasi › <b>Pengaturan</b>') +
      tabsHtml('pgTab', [['identitas', 'Identitas & Tampilan', 'home'], ['kkm', 'Standar KKM', 'target'], ['ujian', 'Parameter Ujian', 'sliders'], ['keamanan', 'Keamanan & Integrasi', 'shield'], ['sistem', 'Sistem & Data Contoh', 'db']], PG.tab) + '<div id="pgIsi"><div class="skel" style="height:360px"></div></div>';
    let C = null;
    const muat = function (paksa) { return A.swr('cfg', function () { return A.apiQ('cfg.get', {}); }, { maxAge: paksa ? 0 : 30000, force: !!paksa }).then(function (d) { C = d; if (d && $('#pgIsi')) tampil(); }); };
    const tampil = function () { const el = $('#pgIsi'); if (!C) return; ({ identitas: tabIdentitas, kkm: tabKkm, ujian: tabUjian, keamanan: tabKeamanan, sistem: tabSistem })[PG.tab](el, C, function () { A.swrClear('cfg'); A.swrClear('pub_boot'); muat(true); }); };
    ikatTabs('pgTab', function (t) { PG.tab = t; tampil(); });
    muat();
  });
  const simpanCfg = async function (btn, obj, after) { A.busy(btn, true); const r = await A.api('cfg.simpan', { setting: obj }); A.busy(btn, false); if (A.hasil(r) && after) after(); return r; };
  function kartuForm(judul, sub, fields, nilai, idBtn, ekstra) {
    return '<div class="card pad-lg"><div class="row between wrap"><div><h3 style="font-size:15px">' + judul + '</h3>' + (sub ? '<p class="small muted" style="margin:4px 0 0">' + sub + '</p>' : '') + '</div><button class="btn primary" id="' + idBtn + '">' + ic('save', 'sm') + 'Simpan</button></div><div style="margin-top:16px">' + ADM.form(fields, nilai) + '</div>' + (ekstra || '') + '</div>';
  }
  function tabIdentitas(el, C, ulang) {
    const s = C.setting, portal = location.href.replace(/[#?].*$/, '').replace(/admin\.html$/, 'index.html'), verif = portal.replace(/index\.html$/, 'verifikasi.html');
    const f = [{ k: 'NAMA_LEMBAGA', label: 'Nama sekolah/lembaga', req: true, full: true }, { k: 'NAMA_APLIKASI', label: 'Nama aplikasi' }, { k: 'TAGLINE', label: 'Tagline' }, { k: 'TAHUN_AJARAN', label: 'Tahun ajaran', ph: '2026/2027' },
      { k: 'WARNA_UTAMA', label: 'Warna utama', type: 'color' }, { k: 'ALAMAT', label: 'Alamat', full: true }, { k: 'TELEPON', label: 'Telepon' }, { k: 'WEBSITE', label: 'Situs web' },
      { k: 'LOGO_URL', label: 'URL logo (https, persegi)', full: true, hint: 'Kosongkan untuk logo bawaan. Disarankan PNG transparan 256×256 dari hosting publik.' },
      { k: 'MOTIVASI_JUDUL', label: 'Judul kartu motivasi' }, { k: 'MOTIVASI_TEKS', label: 'Teks kartu motivasi' },
      { k: 'PORTAL_URL', label: 'URL portal siswa', full: true, hint: 'Dipakai di kartu token, QR, dan pesan WA. <a href="#" id="pakaiPortal">Pakai URL ini: ' + esc(portal) + '</a>' },
      { k: 'VERIFIKASI_URL', label: 'URL halaman verifikasi dokumen', full: true, hint: 'Tujuan QR dokumen. <a href="#" id="pakaiVerif">Pakai URL ini: ' + esc(verif) + '</a>' }];
    el.innerHTML = kartuForm('Identitas Sekolah & Tampilan', 'Tampil di portal siswa, dashboard, kartu token, dan dokumen.', f, s, 'idSimpan', '<div class="row" style="margin-top:16px;gap:12px"><span class="small muted">Pratinjau:</span><div class="brand" style="padding:0"><div class="logo" style="background:' + esc(s.WARNA_UTAMA || '#1E4FD8') + '">' + (/^https:\/\//.test(s.LOGO_URL || '') ? '<img src="' + esc(s.LOGO_URL) + '" alt="">' : A.logoSvg) + '</div><div><div class="nm">' + esc(s.NAMA_APLIKASI || 'UjianKu') + '<span class="pro">PRO</span></div><div class="sub">' + esc(s.NAMA_LEMBAGA || '') + '</div></div></div></div>');
    $('#pakaiPortal').onclick = function (e) { e.preventDefault(); $('#f_PORTAL_URL').value = portal; };
    $('#pakaiVerif').onclick = function (e) { e.preventDefault(); $('#f_VERIFIKASI_URL').value = verif; };
    $('#idSimpan').onclick = function () { const d = ADM.ambil(el, f); if (d.PORTAL_URL && !/^https:\/\//.test(d.PORTAL_URL)) return A.toast('URL portal harus https://', 'warn'); simpanCfg(this, d, function () { A.brand(Object.assign({}, A.setting, d)); ulang(); }); };
  }
  function tabKkm(el, C, ulang) {
    const tingkat = C.tingkat;
    let rows = C.kkm.map(function (r) { return Object.assign({}, r, { Nilai: Object.assign({}, r.Nilai) }); }), kotor = false;
    el.innerHTML = '<div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px;align-items:start" id="kkGrid"><div class="card"><div class="card-h"><div><h3>Standar KKM per Mata Pelajaran</h3><p>Nilai per tingkat. Kosong = memakai KKM bawaan. KKM khusus paket (bila diisi) mengalahkan tabel ini.</p></div><button class="btn sm soft" id="kkTambah">' + ic('plus', 'sm') + 'Tambah mapel</button></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mata Pelajaran</th><th>Kelompok</th>' + tingkat.map(function (t) { return '<th class="num">KKM ' + esc(t) + '</th>'; }).join('') + '<th>Kebijakan Remedial</th><th>Aktif</th><th></th></tr></thead><tbody id="kkBody"></tbody></table></div></div>' +
      '<div class="stack"><div class="card pad-lg"><h3 style="font-size:15px">KKM Bawaan</h3><p class="small muted">Dipakai bila mapel/tingkat tidak diatur.</p><div class="row"><input class="inp" type="number" id="kkDef" min="0" max="100" value="' + esc(C.setting.KKM_DEFAULT || 75) + '" style="max-width:120px;font-size:20px;font-weight:800"><span class="muted">/ 100</span></div></div>' +
      '<div class="card pad-lg"><h3 style="font-size:15px">Daftar Tingkat &amp; Mapel</h3><div class="field" style="margin-top:12px"><label>Tingkat (pisahkan koma)</label><input class="inp" id="kkTk" value="' + esc(C.setting.DAFTAR_TINGKAT || '') + '"></div><div class="field" style="margin-top:10px"><label>Mata pelajaran (pisahkan koma)</label><textarea class="ta" id="kkMp" rows="3">' + esc(C.setting.DAFTAR_MAPEL || '') + '</textarea></div><p class="tiny muted">Mengubah daftar tingkat menambah kolom KKM setelah disimpan.</p></div>' +
      '<div class="alert blue">' + ic('info') + '<div class="small">Ketuntasan dihitung saat lembar jawaban dinilai dan tersimpan bersama hasil — perubahan KKM berlaku untuk ujian berikutnya.</div></div></div></div>' +
      '<div class="unsaved hidden" id="kkBar" style="margin-top:16px"><span class="dot"></span><span class="grow small">Perubahan standar KKM belum disimpan</span><button class="btn sm" style="background:transparent;color:#fff;border:1px solid #334155" id="kkBatal">Batalkan</button><button class="btn sm primary" id="kkSimpan">' + ic('save', 'sm') + 'Simpan Standar KKM</button></div>';
    if (innerWidth < 1100) $('#kkGrid').style.gridTemplateColumns = '1fr';
    const tandai = function () { if (!kotor) { kotor = true; $('#kkBar').classList.remove('hidden'); } };
    const render = function () {
      $('#kkBody').innerHTML = rows.length ? rows.map(function (r, i) {
        return '<tr><td><input class="inp sm" data-i="' + i + '" data-f="Mapel" value="' + esc(r.Mapel) + '" list="kkMapelL" style="min-width:150px"></td><td><input class="inp sm" data-i="' + i + '" data-f="Kelompok" value="' + esc(r.Kelompok || '') + '" placeholder="mis. Wajib" style="min-width:100px"></td>' +
          tingkat.map(function (t) { return '<td class="num"><input class="inp sm" type="number" min="0" max="100" data-i="' + i + '" data-t="' + esc(t) + '" value="' + esc(r.Nilai[t] === undefined ? '' : r.Nilai[t]) + '" style="width:76px;text-align:center"></td>'; }).join('') +
          '<td><select class="sel sm" data-i="' + i + '" data-f="Remedial">' + ['Maksimal Nilai KKM', 'Nilai Remedial Murni', 'Rata-rata Awal & Remedial'].map(function (o) { return '<option' + (r.Remedial === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></td>' +
          '<td><label class="switch"><input type="checkbox" data-i="' + i + '" data-f="Aktif"' + (r.Aktif !== 'TIDAK' ? ' checked' : '') + '><span></span></label></td><td><button class="iconbtn rose" data-hapus="' + i + '">' + ic('trash') + '</button></td></tr>';
      }).join('') + '<datalist id="kkMapelL">' + C.mapel.map(function (m) { return '<option value="' + esc(m) + '">'; }).join('') + '</datalist>' : A.tabelKosong(tingkat.length + 5, 'Belum ada standar KKM per mapel — klik "Tambah mapel".', 'target');
      $$('#kkBody [data-i]').forEach(function (x) { x.addEventListener(x.type === 'checkbox' || x.tagName === 'SELECT' ? 'change' : 'input', function () {
        const r = rows[Number(x.dataset.i)];
        if (x.dataset.t) r.Nilai[x.dataset.t] = x.value; else if (x.dataset.f === 'Aktif') r.Aktif = x.checked ? 'YA' : 'TIDAK'; else r[x.dataset.f] = x.value;
        tandai();
      }); });
      $$('#kkBody [data-hapus]').forEach(function (b) { b.onclick = function () { rows.splice(Number(b.dataset.hapus), 1); render(); tandai(); }; });
    };
    render();
    $('#kkTambah').onclick = function () { const ada = rows.map(function (r) { return r.Mapel; }); const m = C.mapel.filter(function (x) { return ada.indexOf(x) < 0; })[0] || ''; const n = {}; tingkat.forEach(function (t) { n[t] = C.setting.KKM_DEFAULT || 75; }); rows.push({ Mapel: m, Kelompok: '', Nilai: n, Remedial: 'Maksimal Nilai KKM', Aktif: 'YA' }); render(); tandai(); };
    ['kkDef', 'kkTk', 'kkMp'].forEach(function (i) { $('#' + i).addEventListener('input', tandai); });
    $('#kkBatal').onclick = function () { ulang(); };
    $('#kkSimpan').onclick = async function () {
      const b = this; A.busy(b, true);
      const r1 = await A.api('cfg.simpan', { setting: { KKM_DEFAULT: $('#kkDef').value, DAFTAR_TINGKAT: $('#kkTk').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean).join(','), DAFTAR_MAPEL: $('#kkMp').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean).join(',') } });
      const r2 = r1.success ? await A.api('kkm.simpan', { rows: rows.filter(function (r) { return String(r.Mapel).trim(); }) }) : r1;
      A.busy(b, false);
      if (A.hasil(r2, 'Standar KKM disimpan.')) { kotor = false; A.swrClear('soal'); A.swrClear('paket'); A.swrClear('rekap_'); ulang(); }
    };
  }
  function tabUjian(el, C, ulang) {
    const YT = [{ v: 'YA', l: 'Ya' }, { v: 'TIDAK', l: 'Tidak' }];
    const f = [{ k: 'TAMPIL_NILAI', label: 'Tampilkan nilai ke siswa', type: 'select', opsi: [{ v: 'YA', l: 'Langsung setelah mengirim' }, { v: 'SETELAH_TUTUP', l: 'Setelah jadwal ditutup' }, { v: 'TIDAK', l: 'Disembunyikan' }] },
      { k: 'IZIN_PEMBAHASAN', label: 'Kunci & pembahasan untuk siswa', type: 'select', opsi: [{ v: 'YA', l: 'Dibuka setelah jadwal ditutup' }, { v: 'TIDAK', l: 'Tidak dibuka' }] },
      { k: 'ANTI_CHEAT', label: 'Anti-cheat (default paket baru)', type: 'select', opsi: YT }, { k: 'SINGLE_DEVICE', label: 'Satu token satu perangkat (default)', type: 'select', opsi: YT },
      { k: 'MAKS_PELANGGARAN', label: 'Batas pelanggaran → kirim paksa', type: 'number', min: 1, max: 50 }, { k: 'AUTOSAVE_DETIK', label: 'Simpan otomatis jawaban (detik)', type: 'number', min: 10, max: 120, hint: 'Disarankan 20–30 detik. Jawaban juga disimpan lokal di perangkat siswa.' },
      { k: 'DESIMAL_NILAI', label: 'Desimal nilai akhir', type: 'select', opsi: ['0', '1', '2'] }, { k: 'REKOM_REMEDIAL', label: 'Rekomendasi remedial di hasil siswa', type: 'select', opsi: YT },
      { k: 'FITUR_MATERI', label: 'Menu Materi Belajar di portal siswa', type: 'select', opsi: YT }, { k: 'FITUR_ANALITIK', label: 'Menu Analitik di portal siswa', type: 'select', opsi: YT }];
    el.innerHTML = kartuForm('Parameter Ujian', 'Bawaan sekolah. Setiap paket dapat memilih "Ikut pengaturan sekolah" atau aturannya sendiri.', f, C.setting, 'ujSimpan');
    $('#ujSimpan').onclick = function () { simpanCfg(this, ADM.ambil(el, f), ulang); };
  }
  function tabKeamanan(el, C, ulang) {
    const f = [{ k: 'LOGIN_MAKS_GAGAL', label: 'Batas salah sandi guru/admin', type: 'number', min: 3, max: 20 }, { k: 'LOGIN_KUNCI_MENIT', label: 'Lama kunci login (menit)', type: 'number', min: 1, max: 600 },
      { k: 'PIN_MAKS_GAGAL', label: 'Batas salah Token PIN per perangkat', type: 'number', min: 3, max: 20 }, { k: 'PIN_KUNCI_MENIT', label: 'Lama kunci Token PIN (menit)', type: 'number', min: 1, max: 600 }];
    el.innerHTML = '<div class="grid g2" style="align-items:start">' + kartuForm('Proteksi Login', 'Mencegah tebak-tebakan sandi dan Token PIN.', f, C.setting, 'kmSimpan') +
      '<div class="stack"><div class="dark-card"><h3 style="font-size:15px">' + ic('lock', 'sm') + ' Rahasia di Script Properties</h3><p class="small" style="color:#94a3b8">Token API, secret sesi, ID database, dan kunci integrasi disimpan di Script Properties Apps Script — tidak pernah di kode, Google Sheets, atau browser. Dashboard hanya menampilkan versi tersamar.</p><div class="stack-sm" id="rhList"><div class="skel" style="height:120px;background:#1e293b"></div></div></div>' +
      '<div class="card pad"><b class="small" style="color:var(--ink)">Rotasi secret sesi</b><p class="tiny muted" style="margin:6px 0 0">Bila dicurigai bocor: buka editor Apps Script → jalankan <span class="kbd">rotasiSecretSesi</span>. Semua pengguna akan diminta login ulang.</p></div></div></div>';
    $('#kmSimpan').onclick = function () { simpanCfg(this, ADM.ambil(el, f), ulang); };
    A.api('sys.status', {}).then(function (r) {
      if (!$('#rhList')) return;
      if (!r.success) { $('#rhList').innerHTML = '<div class="small">' + esc(r.message) + '</div>'; return; }
      const rh = r.data.rahasia, info = { VP_URL: ['URL Verifikasi Pusat', 'https://script.google.com/macros/s/…/exec'], VP_KODE_APP: ['Kode aplikasi (Verifikasi Pusat)', 'mis. UJK'], VP_KUNCI: ['Kunci HMAC Verifikasi Pusat', 'rahasia bersama'], FONNTE_TOKEN: ['Token Fonnte (WhatsApp)', 'atur di menu WhatsApp & Notifikasi'] };
      $('#rhList').innerHTML = Object.keys(info).map(function (k) {
        return '<div class="tile row between" style="gap:10px"><div><small>' + info[k][0] + '</small><b>' + (rh[k].ada ? esc(rh[k].samar) : '<span style="color:#fbbf24">belum diisi</span>') + '</b></div>' + (k === 'FONNTE_TOKEN' ? '<a class="btn sm" style="background:#1e293b;color:#e2e8f0" href="#/notifikasi">Atur</a>' : '<button class="btn sm" style="background:#1e293b;color:#e2e8f0" data-rh="' + k + '">' + (rh[k].ada ? 'Ganti' : 'Isi') + '</button>') + '</div>';
      }).join('') + '<p class="tiny" style="color:#94a3b8;margin:4px 0 0">Verifikasi Pusat bersifat opsional — tanpa itu, verifikasi dokumen tetap berjalan lewat halaman verifikasi.html aplikasi ini.</p>';
      $$('[data-rh]').forEach(function (b) { b.onclick = async function () {
        const k = b.dataset.rh, val = await A.prompt(info[k][0], { label: 'Nilai baru (kosong = batal, ketik __HAPUS__ untuk menghapus)', ph: info[k][1], ok: 'Simpan ke Script Properties', icon: 'lock' });
        if (val === null || !val.trim()) return;
        const x = await A.api('rahasia.simpan', { kunci: k, nilai: val.trim() }); if (A.hasil(x)) tabKeamanan(el, C, ulang);
      }; });
    });
  }
  function tabSistem(el, C, ulang) {
    el.innerHTML = '<div class="grid g2" style="align-items:start"><div class="card pad-lg" id="syInfo"><div class="skel" style="height:260px"></div></div><div class="stack"><div class="card pad-lg" id="syContoh"><div class="skel" style="height:120px"></div></div>' +
      '<div class="card pad-lg"><h3 style="font-size:15px">Performa</h3><p class="small muted">Waktu respons tiap aksi tercatat di browser. Buka Console lalu ketik <span class="kbd">Perf.summary()</span>.</p><button class="btn sm ghost" id="syPerf">' + ic('speed', 'sm') + 'Tampilkan ringkasan di Console</button></div></div></div>';
    $('#syPerf').onclick = function () { A.Perf.summary(); A.toast('Ringkasan dicetak di Console (F12).'); };
    Promise.all([A.api('sys.status', {}), A.api('dash.ringkas', {})]).then(function (x) {
      const r = x[0], d = x[1];
      if (!$('#syInfo')) return;
      if (r.success) {
        const s = r.data;
        $('#syInfo').innerHTML = '<h3 style="font-size:15px">Status Sistem</h3><div class="stack-sm" style="margin-top:12px">' + [['Versi API', s.versi], ['Waktu server', F.tglJam(s.waktuServer)], ['Trigger terpasang', s.trigger.join(', ') || 'Belum ada — jalankan setupAppEnvironment'], ['Keep-warm', s.keepWarm === 'off' ? 'Mati' : 'Aktif'],
          ['Pemanasan terakhir', s.warmLast ? F.relatif(s.warmLast.at) + ' (' + s.warmLast.scope + ', ' + s.warmLast.ms + ' ms)' : '—'], ['Sisa kuota email hari ini', s.kuotaEmail], ['Ukuran Script Properties', F.bytes(s.ukuranProps) + ' / 500 KB'], ['Antrean notifikasi', s.antrian ? 'Ada pesan menunggu' : 'Kosong']]
          .map(function (x) { return '<div class="row between small" style="padding:8px 0;border-bottom:1px solid var(--line-2);gap:12px"><span class="muted">' + x[0] + '</span><b style="color:var(--ink);text-align:right">' + esc(x[1]) + '</b></div>'; }).join('') + '</div>' +
          '<div class="row wrap" style="margin-top:14px">' + (s.spreadsheetUrl ? '<a class="btn sm soft" target="_blank" rel="noopener" href="' + esc(s.spreadsheetUrl) + '">' + ic('sheet', 'sm') + 'Buka Database (Sheets)</a>' : '') + (s.folderUrl ? '<a class="btn sm ghost" target="_blank" rel="noopener" href="' + esc(s.folderUrl) + '">' + ic('cloud', 'sm') + 'Folder Drive</a>' : '') + '</div>';
      } else $('#syInfo').innerHTML = '<div class="empty">' + esc(r.message) + '</div>';
      const contoh = d.success && d.data.contoh;
      $('#syContoh').innerHTML = '<h3 style="font-size:15px">Data Contoh</h3>' + (contoh ? '<p class="small muted">Setup awal membuat siswa, kelas, soal, paket, dan hasil ujian contoh agar aplikasi bisa langsung dicoba. Hapus sebelum dipakai sungguhan — data buatan Anda tidak ikut terhapus.</p><button class="btn danger" id="syHapus">' + ic('trash', 'sm') + 'Hapus Data Contoh</button>' : '<p class="small muted">' + ic('checkc', 'sm') + ' Tidak ada data contoh tersisa.</p>');
      if ($('#syHapus')) $('#syHapus').onclick = async function () {
        const k = await A.confirm('Hapus seluruh data contoh (siswa, kelas, soal, paket, token, sesi, pengumuman, materi, guru contoh)? Tindakan ini tidak dapat dibatalkan — backup otomatis tetap tersedia.', { danger: true, ok: 'Hapus data contoh', ketik: 'HAPUS' });
        if (!k) return;
        const x2 = await A.aksi(this, 'contoh.hapus', { konfirmasi: 'HAPUS' }); if (x2.success) { A.swrClear(); tabSistem(el, C, ulang); }
      };
    });
  }

  // ============================================================================
  // PENGUMUMAN & MATERI
  // ============================================================================
  const IN = { tab: 'pengumuman' };
  ADM.reg('info', function (v) {
    v.innerHTML = ADM.judul('Pengumuman & Materi', 'Pengumuman tampil di beranda portal siswa sesuai kelas & periode. Materi berupa tautan belajar (Drive, YouTube, situs).', '<button class="btn primary" id="inBaru">' + ic('plus', 'sm') + 'Tambah</button>', 'Data &amp; Layanan › <b>Pengumuman &amp; Materi</b>') +
      tabsHtml('inTab', [['pengumuman', 'Pengumuman', 'mega'], ['materi', 'Materi Belajar', 'book']], IN.tab) + '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead id="inHead"></thead><tbody id="inBody"><tr><td><div class="skel" style="height:160px"></div></td></tr></tbody></table></div></div>';
    let rows = [], kelasL = [], mapelL = [];
    const muat = function (paksa) {
      Promise.all([A.api('info.list', { jenis: IN.tab }, { quiet: true }), muatKelas(), A.swr('cfg', function () { return A.apiQ('cfg.get', {}); }, { maxAge: 120000 })]).then(function (x) {
        if (!$('#inBody')) return;
        rows = x[0].success ? x[0].data.rows : []; kelasL = x[1] ? x[1].rows.map(function (k) { return k.NamaKelas; }) : []; mapelL = x[2] ? x[2].mapel : (ADM.me.mapel || []);
        render();
      });
    };
    const bisa = function (r) { return ADM.isAdmin() || r.Oleh === ADM.me.id; };
    const render = function () {
      const p = IN.tab === 'pengumuman', now = Date.now();
      $('#inHead').innerHTML = p ? '<tr><th>Judul &amp; Isi</th><th>Sasaran</th><th>Periode</th><th>Status</th><th class="right">Aksi</th></tr>' : '<tr><th>Materi</th><th>Mapel</th><th>Kelas</th><th>Status</th><th class="right">Aksi</th></tr>';
      $('#inBody').innerHTML = rows.length ? rows.map(function (r) {
        const aktif = r.Aktif === 'YA' && (!p || ((!r.Mulai || new Date(r.Mulai) <= now) && (!r.Selesai || new Date(r.Selesai) >= now)));
        return '<tr><td style="max-width:420px"><b style="color:var(--ink)">' + esc(r.Judul) + '</b><div class="small muted">' + esc(ADM.teksPolos(p ? r.Isi : r.Deskripsi, 140)) + '</div>' + (!p && r.URL ? '<a class="tiny" href="' + esc(r.URL) + '" target="_blank" rel="noopener">' + ic('ext', 'sm') + ' ' + esc(r.URL.slice(0, 60)) + '</a>' : '') + '</td>' +
          (p ? '<td class="small">' + esc(r.Sasaran || 'Semua') + '</td><td class="tiny muted">' + (r.Mulai ? F.tglJam(r.Mulai) : 'Sekarang') + '<br>s.d. ' + (r.Selesai ? F.tglJam(r.Selesai) : 'tanpa batas') + '</td>' : '<td class="small">' + esc(r.Mapel || '—') + '</td><td class="small">' + esc(r.Kelas || 'Semua') + '</td>') +
          '<td><span class="badge dot ' + (aktif ? 'green' : '') + '">' + (aktif ? 'Tayang' : r.Aktif === 'YA' ? 'Di luar periode' : 'Nonaktif') + '</span></td><td class="act">' + (bisa(r) ? '<button class="iconbtn blue" data-ed="' + r.ID + '">' + ic('edit') + '</button><button class="iconbtn rose" data-del="' + r.ID + '">' + ic('trash') + '</button>' : '') + '</td></tr>';
      }).join('') : A.tabelKosong(5, p ? 'Belum ada pengumuman.' : 'Belum ada materi.', p ? 'mega' : 'book');
      $$('#inBody [data-ed]').forEach(function (b) { b.onclick = function () { form(rows.filter(function (r) { return r.ID === b.dataset.ed; })[0]); }; });
      $$('#inBody [data-del]').forEach(function (b) { b.onclick = async function () { if (!await A.confirm('Hapus item ini?', { danger: true, ok: 'Hapus' })) return; const r = await A.api('info.hapus', { jenis: IN.tab, id: b.dataset.del }); if (A.hasil(r)) muat(true); }; });
    };
    const form = function (x) {
      const p = IN.tab === 'pengumuman';
      x = x || { Aktif: 'YA', Sasaran: 'Semua', Kelas: 'Semua' };
      const f = p ? [{ k: 'Judul', label: 'Judul', req: true, full: true }, { k: 'Isi', label: 'Isi pengumuman', type: 'textarea', rows: 4, full: true }, { k: 'Sasaran', label: 'Sasaran kelas', type: 'chips', opsi: ['Semua'].concat(kelasL), full: true },
        { k: 'Mulai', label: 'Tayang mulai', type: 'datetime-local' }, { k: 'Selesai', label: 'Tayang sampai', type: 'datetime-local' }, { k: 'Aktif', label: 'Status', type: 'switch', ket: 'Aktif', full: true }]
        : [{ k: 'Judul', label: 'Judul materi', req: true, full: true }, { k: 'Mapel', label: 'Mata pelajaran', type: 'select', opsi: [''].concat(mapelL) }, { k: 'URL', label: 'Tautan (https)', ph: 'https://…', req: true }, { k: 'Kelas', label: 'Kelas', type: 'chips', opsi: ['Semua'].concat(kelasL), full: true },
          { k: 'Deskripsi', label: 'Deskripsi singkat', type: 'textarea', rows: 3, full: true }, { k: 'Aktif', label: 'Status', type: 'switch', ket: 'Tampilkan ke siswa', full: true }];
      ADM.modalForm({ title: (x.ID ? 'Ubah ' : 'Tambah ') + (p ? 'Pengumuman' : 'Materi'), icon: p ? 'mega' : 'book', fields: f, nilai: x, onSave: function (d) { d.ID = x.ID; return A.api('info.simpan', { jenis: IN.tab, item: d }); }, after: function () { muat(true); } });
    };
    ikatTabs('inTab', function (t) { IN.tab = t; $('#inBody').innerHTML = '<tr><td><div class="skel" style="height:160px"></div></td></tr>'; muat(true); });
    $('#inBaru').onclick = function () { form(null); };
    muat();
  });

  // ============================================================================
  // WHATSAPP & NOTIFIKASI
  // ============================================================================
  const NT = { tab: '' };
  ADM.reg('notifikasi', function (v) {
    const admin = ADM.isAdmin();
    if (!NT.tab || (!admin && NT.tab === 'konfig')) NT.tab = admin ? 'konfig' : 'blast';
    v.innerHTML = ADM.judul('WhatsApp & Notifikasi', 'Notifikasi otomatis (token, jadwal, nilai, remedial, akun, dokumen) dan blast per batch lewat Fonnte & email — semua lewat antrean agar dashboard tetap instan.', '', 'Data &amp; Layanan › <b>WhatsApp &amp; Notifikasi</b>') +
      tabsHtml('ntTab', (admin ? [['konfig', 'Konfigurasi', 'cog']] : []).concat([['blast', 'Blast WhatsApp', 'send'], ['antrean', 'Antrean & Log', 'list']]), NT.tab) + '<div id="ntIsi"></div>';
    ikatTabs('ntTab', function (t) { NT.tab = t; tampil(); });
    const tampil = function () { ADM.timers.forEach(clearInterval); ADM.timers = []; ({ konfig: tabKonfig, blast: tabBlast, antrean: tabAntrean })[NT.tab]($('#ntIsi')); };
    tampil();
  });
  function tabKonfig(el) {
    el.innerHTML = '<div class="skel" style="height:420px"></div>';
    A.api('notif.config', {}).then(function (r) {
      if (!r.success) { el.innerHTML = '<div class="card pad empty">' + esc(r.message) + '</div>'; return; }
      const c = r.data, M = JSON.parse(JSON.stringify(c.matriks));
      el.innerHTML = '<div class="grid g2" style="align-items:start"><div class="stack"><div class="card pad-lg"><div class="row between"><h3 style="font-size:15px">' + ic('wa', 'sm') + ' WhatsApp (Fonnte)</h3><label class="switch"><input type="checkbox" id="ncWA"' + (c.waAktif ? ' checked' : '') + '><span></span></label></div>' +
        '<div class="field" style="margin-top:14px"><label>Token Fonnte</label><div class="row"><input class="inp grow mono" id="ncTok" placeholder="' + (c.tokenAda ? esc(c.token) + ' (tersimpan — isi untuk mengganti)' : 'Tempel token dari dashboard Fonnte') + '" autocomplete="off"><button class="btn sm ghost" id="ncDev">' + ic('phone', 'sm') + 'Cek perangkat</button></div><div class="hint">Disimpan di Script Properties (FONNTE_TOKEN), tidak pernah dikirim balik ke browser.' + (c.tokenAda ? ' <a href="#" id="ncHapus">Hapus token</a>' : '') + '</div></div><div id="ncDevInfo"></div>' +
        '<div class="form-grid" style="margin-top:12px"><div class="field"><label>Ukuran batch blast</label>' + ADM.seg('ncBatch', ['10', '20', '50'], String(c.batchDefault)) + '</div><div class="field"><label>Jeda antarpesan (detik)</label><input class="inp" id="ncJeda" value="' + esc(c.jeda) + '" placeholder="5 atau 3-8"></div></div>' +
        '<label class="check" style="margin-top:12px"><input type="checkbox" id="ncDet"' + (c.deteksiOtomatis ? ' checked' : '') + '> Cek otomatis nomor kontak baru terdaftar WhatsApp</label>' +
        '<div class="row" style="margin-top:12px"><input class="inp" id="ncTesNo" placeholder="08… nomor uji" style="max-width:200px"><button class="btn sm soft" id="ncTesWA">' + ic('send', 'sm') + 'Kirim tes WA</button></div></div>' +
        '<div class="card pad-lg"><div class="row between"><h3 style="font-size:15px">' + ic('mail', 'sm') + ' Email (Gmail akun pemilik)</h3><label class="switch"><input type="checkbox" id="ncEM"' + (c.emailAktif ? ' checked' : '') + '><span></span></label></div><div class="field" style="margin-top:12px"><label>Nama pengirim</label><input class="inp" id="ncNama" value="' + esc(c.namaPengirim) + '"></div>' +
        '<p class="tiny muted">Sisa kuota email hari ini: <b>' + c.kuotaEmail + '</b> (batas Google: ±100/hari akun biasa, 1.500 Workspace).</p><div class="row"><input class="inp" id="ncTesEm" type="email" placeholder="email uji" style="max-width:240px"><button class="btn sm soft" id="ncTesEmail">' + ic('send', 'sm') + 'Kirim tes email</button></div></div>' +
        '<div class="card pad"><div class="field"><label>URL portal siswa (untuk tautan di pesan)</label><input class="inp" id="ncUrl" value="' + esc(c.appUrl) + '" placeholder="https://…/index.html"></div><p class="tiny ' + (c.trigger ? 'muted' : '') + '" style="margin:8px 0 0;' + (c.trigger ? '' : 'color:var(--rose)') + '">' + (c.trigger ? ic('checkc', 'sm') + ' Pekerja antrean (trigger tiap menit) aktif.' : ic('warn', 'sm') + ' Trigger pekerjaMenit belum terpasang — simpan konfigurasi ini untuk memasang.') + '</p></div></div>' +
        '<div class="card"><div class="card-h"><div><h3>Matriks Event × Kanal</h3><p>Saklar per kejadian. Klik ikon pena untuk mengubah isi pesan.</p></div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kejadian</th><th class="center">WA</th><th class="center">Email</th><th></th></tr></thead><tbody id="ncMx"></tbody></table></div></div></div>' +
        '<div class="unsaved" style="margin-top:16px"><span class="dot" style="background:#60a5fa"></span><span class="grow small">Simpan untuk menerapkan saklar, token, dan template.</span><button class="btn sm primary" id="ncSimpan">' + ic('save', 'sm') + 'Simpan Konfigurasi</button></div>';
      const mx = function () {
        $('#ncMx').innerHTML = Object.keys(M).map(function (k) { const m = M[k]; return '<tr><td><b class="small" style="color:var(--ink)">' + esc(m.label) + '</b><div class="tiny muted mono">' + k + (m.pesan !== m.pesanDefault ? ' · <span style="color:var(--brand)">template diubah</span>' : '') + '</div></td><td class="center"><input type="checkbox" data-k="' + k + '" data-c="wa"' + (m.wa ? ' checked' : '') + '></td><td class="center"><input type="checkbox" data-k="' + k + '" data-c="email"' + (m.email ? ' checked' : '') + '></td><td class="act"><button class="iconbtn" data-tpl="' + k + '">' + ic('pen') + '</button></td></tr>'; }).join('');
        $$('#ncMx [data-c]').forEach(function (x) { x.onchange = function () { M[x.dataset.k][x.dataset.c] = x.checked; }; });
        $$('#ncMx [data-tpl]').forEach(function (b) { b.onclick = function () {
          const m = M[b.dataset.tpl];
          A.modal({ title: 'Template: ' + m.label, icon: 'pen', size: 'lg', body: '<div class="field"><label>Subjek email</label><input class="inp" id="tSub" value="' + esc(m.subjek) + '"></div><div class="field" style="margin-top:10px"><label>Isi pesan (WA *tebal*, baris baru didukung)</label><textarea class="ta mono" id="tPes" rows="8">' + esc(m.pesan) + '</textarea></div><div class="chips" style="margin-top:10px">' + c.variabel.map(function (x) { return '<button type="button" class="chip" data-var="' + x + '">{' + x + '}</button>'; }).join('') + '</div>',
            onOpen: function (mm) { $$('[data-var]', mm.el).forEach(function (x) { x.onclick = function () { const t = $('#tPes', mm.el), a = t.selectionStart; t.value = t.value.slice(0, a) + '{' + x.dataset.var + '}' + t.value.slice(t.selectionEnd); t.focus(); }; }); },
            actions: [{ label: 'Kembalikan bawaan', onClick: function (bb, bg) { $('#tSub', bg).value = m.subjekDefault; $('#tPes', bg).value = m.pesanDefault; return false; } }, { label: 'Pakai', cls: 'primary', onClick: function (bb, bg) { m.subjek = $('#tSub', bg).value; m.pesan = $('#tPes', bg).value; mx(); } }] });
        }; });
      };
      mx(); ADM.ikatSeg('ncBatch');
      $('#ncDev').onclick = async function () { const b = this; A.busy(b, true); const x = await A.api('wa.device', {}); A.busy(b, false); $('#ncDevInfo').innerHTML = x.success ? '<div class="alert ' + (x.data.status === 'connect' ? 'green' : 'amber') + '">' + ic('phone') + '<div class="small">Perangkat <b>' + esc(x.data.nomor) + '</b> · ' + esc(x.data.status) + ' · paket ' + esc(x.data.paket) + ' · kuota ' + esc(x.data.kuota) + (x.data.kedaluwarsa ? ' · aktif s.d. ' + esc(x.data.kedaluwarsa) : '') + '</div></div>' : '<div class="alert rose">' + ic('warn') + '<div class="small">' + esc(x.message) + '</div></div>'; };
      if ($('#ncHapus')) $('#ncHapus').onclick = async function (e) { e.preventDefault(); if (!await A.confirm('Hapus token Fonnte dari Script Properties? WhatsApp otomatis nonaktif.', { danger: true })) return; const x = await A.api('notif.configSave', { token: '__HAPUS__', waAktif: false }); if (A.hasil(x)) tabKonfig(el); };
      $('#ncTesWA').onclick = function () { A.aksi(this, 'wa.test', { nomor: $('#ncTesNo').value }); };
      $('#ncTesEmail').onclick = function () { A.aksi(this, 'email.test', { email: $('#ncTesEm').value }); };
      $('#ncSimpan').onclick = async function () {
        const b = this; A.busy(b, true);
        const x = await A.api('notif.configSave', { token: $('#ncTok').value.trim(), waAktif: $('#ncWA').checked, emailAktif: $('#ncEM').checked, batchDefault: Number(ADM.nilaiSeg('ncBatch')), jeda: $('#ncJeda').value.trim(), deteksiOtomatis: $('#ncDet').checked, namaPengirim: $('#ncNama').value.trim(), appUrl: $('#ncUrl').value.trim(), matriks: M });
        A.busy(b, false); if (A.hasil(x)) tabKonfig(el);
      };
    });
  }
  function tabBlast(el) {
    const st = { sumber: 'crm', rows: [], ringkas: null };
    el.innerHTML = '<div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px;align-items:start" id="blGrid"><div class="stack"><div class="card pad-lg"><h3 style="font-size:15px"><span class="badge blue">1</span> Pilih Penerima</h3><div style="margin-top:12px">' + ADM.seg('blSum', [['crm', 'Kontak CRM'], ['paket', 'Peserta Paket'], ['manual', 'Tempel Nomor']], st.sumber) + '</div><div id="blFil" style="margin-top:14px"></div>' +
      '<div class="row" style="margin-top:12px"><button class="btn soft" id="blMuat">' + ic('users', 'sm') + 'Muat penerima</button><span class="small muted" id="blInfo"></span></div><div id="blRing" style="margin-top:12px"></div></div>' +
      '<div class="card pad-lg"><h3 style="font-size:15px"><span class="badge blue">2</span> Tulis Pesan</h3><div class="field" style="margin-top:12px"><label>Judul blast (internal)</label><input class="inp" id="blJudul" placeholder="mis. Pengingat PTS Fisika"></div><div class="field" style="margin-top:10px"><label>Isi pesan</label><textarea class="ta" id="blPesan" rows="6" placeholder="Assalamu\'alaikum {nama}, …"></textarea></div>' +
      '<div class="chips" style="margin-top:8px">' + ['nama', 'siswa', 'kelas', 'nis', 'paket', 'nilai', 'pin', 'link', 'institusi'].map(function (x) { return '<button type="button" class="chip" data-var="' + x + '">{' + x + '}</button>'; }).join('') + '</div>' +
      '<div class="form-grid" style="margin-top:12px"><div class="field"><label>Ukuran batch</label>' + ADM.seg('blBatch', ['10', '20', '50'], '20') + '</div><div class="field"><label>Jeda (detik)</label><input class="inp" id="blJeda" value="5" placeholder="5 atau 3-8"></div></div>' +
      '<button class="btn primary block" id="blKirim" style="margin-top:14px;height:46px">' + ic('send') + 'Buat Blast & Masukkan Antrean</button><p class="tiny muted center" style="margin:8px 0 0">Nomor ganda, tidak valid, dan opt-out otomatis dilewati.</p></div></div>' +
      '<div class="card"><div class="card-h"><div><h3>Riwayat Blast</h3><p>Diproses otomatis tiap menit per batch</p></div><button class="iconbtn" id="blRef">' + ic('refresh') + '</button></div><div class="card-b stack-sm" id="blList"><div class="skel" style="height:200px"></div></div></div></div>';
    if (innerWidth < 1100) $('#blGrid').style.gridTemplateColumns = '1fr';
    let paketL = [];
    const filter = function () {
      const s = ADM.nilaiSeg('blSum');
      if (s === 'manual') $('#blFil').innerHTML = '<div class="field"><label>Satu baris satu penerima: <span class="mono">nomor|nama</span></label><textarea class="ta mono" id="bfMan" rows="5" placeholder="081234567890|Budi Santoso\n081298765432|Ibu Sari"></textarea></div>';
      else if (s === 'paket') $('#blFil').innerHTML = '<div class="form-grid"><div class="field full"><label>Paket ujian</label><select class="sel" id="bfPaket">' + paketL.map(function (p) { return '<option value="' + p.ID + '">' + esc(p.Nama) + ' (' + esc(p.Kode) + ')</option>'; }).join('') + '</select></div><div class="field"><label>Status peserta</label><select class="sel" id="bfStat"><option value="semua">Semua</option><option value="belum">Belum mengerjakan</option><option value="berjalan">Sedang mengerjakan</option><option value="tuntas">Tuntas</option><option value="remedial">Remedial</option></select></div><div class="field"><label>Kirim ke</label><select class="sel" id="bfWali"><option value="">Siswa</option><option value="1">Wali</option></select></div></div>';
      else $('#blFil').innerHTML = '<div class="form-grid"><div class="field"><label>Segmen</label><select class="sel" id="bfSeg"><option value="">Semua</option><option>Siswa</option><option>Wali</option><option>Guru</option><option>Admin</option><option>Kontak Luar</option></select></div><div class="field"><label>Tag</label><input class="inp" id="bfTag" placeholder="opsional"></div><div class="field full"><label>Kelas</label><input class="inp" id="bfKelas" placeholder="opsional, mis. XII MIPA 1"></div></div>' + (ADM.blastIds ? '<div class="alert blue" style="margin-top:10px">' + ic('info') + '<div class="small">' + ADM.blastIds.length + ' kontak dipilih dari CRM. <a href="#" id="bfLepas">Lepas pilihan</a></div></div>' : '');
      if ($('#bfLepas')) $('#bfLepas').onclick = function (e) { e.preventDefault(); ADM.blastIds = null; filter(); };
    };
    ADM.muatPaket().then(function (d) { paketL = d ? d.rows.filter(function (r) { return r.Status === 'Terbit'; }) : []; if (ADM.nilaiSeg('blSum') === 'paket') filter(); });
    filter(); ADM.ikatSeg('blSum', function () { st.rows = []; $('#blRing').innerHTML = ''; $('#blInfo').textContent = ''; filter(); }); ADM.ikatSeg('blBatch');
    $$('[data-var]', el).forEach(function (x) { x.onclick = function () { const t = $('#blPesan'), a = t.selectionStart; t.value = t.value.slice(0, a) + '{' + x.dataset.var + '}' + t.value.slice(t.selectionEnd); t.focus(); }; });
    const ringkas = function () {
      const r = st.ringkas, ok = st.rows.filter(function (x) { return x.valid && !x.ganda && !x.optOut && !x.buang; });
      $('#blInfo').textContent = ok.length + ' penerima siap';
      $('#blRing').innerHTML = '<div class="row wrap" style="gap:6px"><span class="badge green">' + r.valid + ' valid</span><span class="badge">' + r.ganda + ' ganda</span><span class="badge rose">' + r.tidakValid + ' tidak valid</span><span class="badge blue">' + r.terdaftarWA + ' terdaftar WA</span><span class="badge amber">' + r.tidakTerdaftarWA + ' bukan WA</span><span class="badge">' + r.optOut + ' opt-out</span></div>' +
        '<div class="row wrap" style="margin-top:10px"><button class="btn sm ghost" id="blCek">' + ic('wa', 'sm') + 'Cek nomor terdaftar WA (maks 50)</button><label class="check"><input type="checkbox" id="blBuang"> Lewati nomor bukan WA</label></div>' +
        '<div class="tbl-wrap" style="max-height:220px;overflow:auto;margin-top:10px;border:1px solid var(--line);border-radius:12px"><table class="tbl"><tbody>' + st.rows.slice(0, 200).map(function (x) { return '<tr><td class="small">' + esc(x.nama) + '</td><td class="small mono">' + esc(x.hp || '—') + '</td><td>' + (!x.valid ? '<span class="badge rose">tidak valid</span>' : x.ganda ? '<span class="badge">ganda</span>' : x.optOut ? '<span class="badge">opt-out</span>' : waBadge(x.statusWA) || '<span class="badge green">ok</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
      $('#blBuang').onchange = function () { const on = this.checked; st.rows.forEach(function (x) { x.buang = on && x.statusWA === 'Tidak Terdaftar'; }); $('#blInfo').textContent = st.rows.filter(function (x) { return x.valid && !x.ganda && !x.optOut && !x.buang; }).length + ' penerima siap'; };
      $('#blCek').onclick = async function () {
        const nomor = st.rows.filter(function (x) { return x.valid && !x.statusWA; }).map(function (x) { return x.hp; }).slice(0, 50);
        if (!nomor.length) return A.toast('Semua nomor sudah dicek.', 'ok');
        const b = this; A.busy(b, true); const x = await A.api('wa.validate', { nomor: nomor }); A.busy(b, false);
        if (!A.hasil(x)) return;
        st.rows.forEach(function (y) { const s = x.data.peta[y.hp]; if (s) y.statusWA = s; });
        st.ringkas.terdaftarWA = st.rows.filter(function (y) { return y.statusWA === 'Terdaftar'; }).length; st.ringkas.tidakTerdaftarWA = st.rows.filter(function (y) { return y.statusWA === 'Tidak Terdaftar'; }).length; ringkas();
      };
    };
    $('#blMuat').onclick = async function () {
      const s = ADM.nilaiSeg('blSum'), d = { sumber: s };
      if (s === 'manual') d.manual = $('#bfMan').value;
      else if (s === 'paket') { d.paketId = $('#bfPaket') ? $('#bfPaket').value : ''; d.statusPeserta = $('#bfStat').value; d.keWali = !!$('#bfWali').value; }
      else { d.segmen = $('#bfSeg').value; d.tag = $('#bfTag').value.trim(); d.kelas = $('#bfKelas').value.trim(); if (ADM.blastIds) d.ids = ADM.blastIds; }
      const b = this; A.busy(b, true); const r = await A.api('wa.audience', d); A.busy(b, false);
      if (!r.success) return A.toast(r.message, 'err');
      st.rows = r.data.rows; st.ringkas = r.data.ringkas; ringkas();
    };
    $('#blKirim').onclick = async function () {
      const ok = st.rows.filter(function (x) { return x.valid && !x.ganda && !x.optOut && !x.buang; });
      if (!ok.length) return A.toast('Muat penerima terlebih dahulu.', 'warn');
      const pesan = $('#blPesan').value; if (!pesan.trim()) return A.toast('Tulis isi pesan.', 'warn');
      const batch = Number(ADM.nilaiSeg('blBatch'));
      if (!await A.confirm('Kirim ke <b>' + ok.length + '</b> penerima dalam ' + Math.ceil(ok.length / batch) + ' batch (' + batch + ' pesan/batch)?<div class="card soft" style="padding:12px;margin-top:10px;white-space:pre-wrap;font-size:12.5px">' + esc(pesan.replace(/\{nama\}/g, ok[0].nama)) + '</div>', { ok: 'Buat blast', icon: 'send', tone: 't-green' })) return;
      const r = await A.aksi(this, 'wa.blastCreate', { judul: $('#blJudul').value.trim(), pesan: pesan, ukuranBatch: batch, jeda: $('#blJeda').value.trim(), sasaran: ADM.nilaiSeg('blSum'), penerima: ok.map(function (x) { return { id: x.id, nama: x.nama, hp: x.hp, vars: x.vars }; }) });
      if (r.success) { ADM.blastIds = null; daftar(); }
    };
    const daftar = function () {
      A.api('wa.blastList', {}, { quiet: true }).then(function (r) {
        if (!$('#blList')) return;
        const rows = r.success ? r.data.rows : [];
        $('#blList').innerHTML = rows.length ? rows.slice(0, 20).map(function (b) {
          return '<div class="list-item" style="align-items:flex-start"><span class="chip-ic sm ' + (b.Status === 'Berjalan' ? 't-green' : b.Status === 'Dihentikan' ? 't-rose' : 't-slate') + '">' + ic('send', 'sm') + '</span><div class="grow"><div class="row between"><b class="small" style="color:var(--ink)">' + esc(b.Judul) + '</b><span class="badge ' + (b.Status === 'Berjalan' ? 'live' : b.Status === 'Selesai' ? 'green' : '') + '">' + esc(b.Status) + '</span></div>' +
            '<div class="tiny muted">' + F.tglJam(b.Tanggal) + ' · ' + esc(b.Oleh) + ' · batch ' + b.UkuranBatch + ' · jeda ' + esc(b.JedaDetik) + 's</div><div class="row" style="gap:8px;margin-top:6px"><div class="bar grow green"><i style="width:' + b.Persen + '%"></i></div><span class="tiny b">' + b.Terkirim + '/' + b.Total + (b.Gagal ? ' · <span style="color:var(--rose)">' + b.Gagal + ' gagal</span>' : '') + '</span></div>' +
            (b.Status === 'Berjalan' ? '<div class="row" style="margin-top:8px"><button class="btn sm soft" data-proses="' + b.ID + '">' + ic('play', 'sm') + 'Proses batch sekarang</button><button class="btn sm ghost" data-stop="' + b.ID + '">' + ic('stop', 'sm') + 'Hentikan</button></div>' : '') + '</div></div>';
        }).join('') : '<div class="empty small">Belum ada blast.</div>';
        $$('[data-proses]', $('#blList')).forEach(function (b) { b.onclick = async function () { const x = await A.aksi(b, 'wa.blastProcess', { blastId: b.dataset.proses }); if (x.success) daftar(); }; });
        $$('[data-stop]', $('#blList')).forEach(function (b) { b.onclick = async function () { if (!await A.confirm('Hentikan blast ini? Pesan yang belum terkirim dibatalkan.', { danger: true })) return; const x = await A.api('wa.blastStop', { blastId: b.dataset.stop }); if (A.hasil(x)) daftar(); }; });
      });
    };
    $('#blRef').onclick = daftar;
    daftar();
    ADM.every(function () { if ($('#blList') && $('#blList .badge.live') && A.Activity.due('blast', 20000, 60000)) daftar(); }, 5000);
  }
  function tabAntrean(el) {
    const f = { status: '', kanal: '' };
    el.innerHTML = '<div class="grid g5" id="aqKpi"></div><div class="card" style="margin-top:16px"><div class="card-b row wrap between"><div class="row wrap"><select class="sel" id="aqSt" style="width:auto"><option value="">Semua status</option><option>Antri</option><option>Proses</option><option>Terkirim</option><option>Gagal</option><option>Batal</option></select><select class="sel" id="aqKn" style="width:auto"><option value="">Semua kanal</option><option value="WA">WhatsApp</option><option value="EMAIL">Email</option></select></div>' +
      '<div class="row wrap"><button class="btn ghost" id="aqProses">' + ic('play', 'sm') + 'Proses sekarang</button>' + (ADM.isAdmin() ? '<button class="btn ghost" id="aqUlang">' + ic('refresh', 'sm') + 'Ulangi yang gagal</button>' : '') + '</div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Kanal</th><th>Penerima</th><th>Event</th><th>Pesan</th><th>Status</th><th>Respon</th></tr></thead><tbody id="aqBody"><tr><td colspan="7"><div class="skel" style="height:200px"></div></td></tr></tbody></table></div></div>';
    const muat = function () {
      A.api('notif.queue', f, { quiet: true }).then(function (r) {
        if (!$('#aqBody')) return;
        if (!r.success) { $('#aqBody').innerHTML = A.tabelKosong(7, r.message); return; }
        const g = r.data.ringkas;
        $('#aqKpi').innerHTML = [['Antri', 't-amber', 'hourglass'], ['Proses', 't-blue', 'refresh'], ['Terkirim', 't-green', 'checkc'], ['Gagal', 't-rose', 'warn'], ['Batal', 't-slate', 'x']].map(function (x) { return ADM.kpi(x[0], g[x[0]] || 0, x[0] === 'Terkirim' ? 'Kuota email tersisa ' + r.data.kuotaEmail : '', x[1], x[2]); }).join('');
        $('#aqBody').innerHTML = r.data.rows.length ? r.data.rows.map(function (x) {
          return '<tr><td class="tiny nowrap">' + F.tglJam(x.DibuatPada) + (x.DikirimPada ? '<div class="muted">kirim ' + F.jam(x.DikirimPada) + '</div>' : '') + '</td><td>' + (x.Kanal === 'WA' ? '<span class="badge green">' + ic('wa', 'sm') + 'WA</span>' : '<span class="badge blue">' + ic('mail', 'sm') + 'Email</span>') + '</td>' +
            '<td class="small"><b style="color:var(--ink)">' + esc(x.Nama || '-') + '</b><div class="tiny muted mono">' + esc(x.Tujuan) + '</div></td><td class="tiny mono">' + esc(x.Event) + '</td><td class="tiny" style="max-width:300px">' + esc(x.Pesan) + '</td>' +
            '<td><span class="badge dot ' + ({ Terkirim: 'green', Gagal: 'rose', Antri: 'amber', Proses: 'blue' }[x.Status] || '') + '">' + esc(x.Status) + '</span>' + (x.Percobaan > 1 ? '<div class="tiny muted">' + x.Percobaan + '× coba</div>' : '') + '</td><td class="tiny muted">' + esc(x.Respon || '') + '</td></tr>';
        }).join('') : A.tabelKosong(7, 'Antrean kosong.', 'list');
      });
    };
    $('#aqSt').onchange = function () { f.status = this.value; muat(); };
    $('#aqKn').onchange = function () { f.kanal = this.value; muat(); };
    $('#aqProses').onclick = async function () { const r = await A.aksi(this, 'notif.processNow', {}); if (r.success) muat(); };
    if ($('#aqUlang')) $('#aqUlang').onclick = async function () { const r = await A.aksi(this, 'notif.retry', {}); if (r.success) muat(); };
    muat();
    ADM.every(function () { if ($('#aqBody') && A.Activity.due('antrean', 20000, 90000)) muat(); }, 5000);
  }

  // ============================================================================
  // CRM KONTAK
  // ============================================================================
  const CR = { q: '', segmen: '', statusWA: '', tag: '', kelas: '', duplikat: false, tanpaKontak: false, optOut: '', hal: 1, pilih: {} };
  ADM.reg('crm', function (v) {
    v.innerHTML = ADM.judul('CRM Kontak', 'Satu pintu Nama · Email · WhatsApp dari siswa, wali, dan staf — disinkronkan otomatis. Tag, catatan, opt-out, dan riwayat pesan tersimpan di sini.',
      '<button class="btn ghost" id="crImp">' + ic('upload', 'sm') + 'Impor</button>' + (ADM.isAdmin() ? '<button class="btn ghost" id="crExp">' + ic('download', 'sm') + 'Ekspor</button>' : '') + '<button class="btn primary" id="crSync">' + ic('refresh', 'sm') + 'Sinkron Sekarang</button>', 'Data &amp; Layanan › <b>CRM Kontak</b>') +
      '<div class="grid g4" id="crKpi"><div class="skel" style="height:110px"></div><div class="skel" style="height:110px"></div><div class="skel" style="height:110px"></div><div class="skel" style="height:110px"></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-b stack-sm"><div class="row wrap"><div class="search grow" style="min-width:220px">' + ic('search') + '<input class="inp" id="crQ" placeholder="Cari nama, email, nomor…" value="' + esc(CR.q) + '"></div><select class="sel" id="crSeg" style="width:auto"><option value="">Semua segmen</option></select>' +
      '<select class="sel" id="crWA" style="width:auto"><option value="">Status WA</option><option>Terdaftar</option><option>Tidak Terdaftar</option><option value="belum">Belum dicek</option></select><select class="sel" id="crTag" style="width:auto"><option value="">Semua tag</option></select></div>' +
      '<div class="chips"><button class="chip ' + (CR.duplikat ? 'on' : '') + '" id="crDup">' + ic('copy', 'sm') + 'Duplikat</button><button class="chip ' + (CR.tanpaKontak ? 'on' : '') + '" id="crTK">' + ic('warn', 'sm') + 'Tanpa kontak valid</button><button class="chip ' + (CR.optOut === 'YA' ? 'on' : '') + '" id="crOO">' + ic('lock', 'sm') + 'Opt-out</button></div></div>' +
      '<div class="row between wrap hidden" id="crBulk" style="padding:10px 18px;background:var(--brand-50);border-top:1px solid var(--line)"><b class="small" id="crN"></b><div class="row wrap"><button class="btn sm soft" data-b="blast">' + ic('send', 'sm') + 'Blast WA</button><button class="btn sm ghost" data-b="tag">' + ic('tag', 'sm') + 'Tambah tag</button><button class="btn sm ghost" data-b="untag">Hapus tag</button><button class="btn sm ghost" data-b="deteksiWA">' + ic('wa', 'sm') + 'Cek WA</button><button class="btn sm ghost" data-b="optout">Opt-out</button><button class="btn sm ghost" data-b="optin">Opt-in</button><button class="btn sm ghost" data-b="merge">' + ic('layers', 'sm') + 'Gabungkan</button><button class="btn sm danger" data-b="hapusManual">' + ic('trash', 'sm') + 'Hapus manual</button></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:34px"><input type="checkbox" id="crAll"></th><th>Kontak</th><th>Segmen</th><th>WhatsApp</th><th>Email</th><th>Tag</th><th class="num">Pesan</th><th class="right"></th></tr></thead><tbody id="crBody"><tr><td colspan="8"><div class="skel" style="height:220px"></div></td></tr></tbody></table></div><div class="pager" id="crPg"></div></div>';
    let D = null;
    const stats = function () {
      A.api('crm.stats', {}, { quiet: true }).then(function (r) {
        if (!r.success || !$('#crKpi')) return;
        const s = r.data;
        if (!s.syncTerakhir && !CR.autoSync) { CR.autoSync = true; A.api('crm.sync', {}, { quiet: true }).then(function (x) { if (x.success && $('#crKpi')) { stats(); muat(); } }); }
        $('#crKpi').innerHTML = ADM.kpi('Total Kontak', s.total, s.baru7 + ' baru minggu ini · sinkron ' + (s.syncTerakhir ? F.relatif(s.syncTerakhir) : 'belum'), 't-blue', 'contacts') +
          ADM.kpi('WhatsApp Valid', s.waValid, s.terdaftarWA + ' terverifikasi · ' + s.belumCekWA + ' belum dicek', 't-green', 'wa') + ADM.kpi('Email Valid', s.emailValid, s.dihubungi30 + ' dihubungi 30 hari', 't-purple', 'mail') +
          ADM.kpi('Perlu Dirapikan', s.duplikat + s.tanpaKontak, s.duplikat + ' duplikat · ' + s.tanpaKontak + ' tanpa kontak · ' + s.optOut + ' opt-out', 't-amber', 'warn');
      });
    };
    const muat = function () {
      const d = { cari: CR.q, segmen: CR.segmen, statusWA: CR.statusWA, tag: CR.tag, duplikat: CR.duplikat, tanpaKontak: CR.tanpaKontak, optOut: CR.optOut, halaman: CR.hal, per: 50 };
      A.api('crm.list', d, { quiet: true }).then(function (r) {
        if (!$('#crBody')) return;
        if (!r.success) { $('#crBody').innerHTML = A.tabelKosong(8, r.message); return; }
        D = r.data;
        $('#crSeg').innerHTML = '<option value="">Semua segmen</option>' + Object.keys(D.facet.segmen).map(function (s) { return '<option value="' + esc(s) + '"' + (s === CR.segmen ? ' selected' : '') + '>' + esc(s) + ' (' + D.facet.segmen[s] + ')</option>'; }).join('');
        $('#crTag').innerHTML = '<option value="">Semua tag</option>' + D.tags.map(function (t) { return '<option' + (t === CR.tag ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('');
        $('#crBody').innerHTML = D.rows.length ? D.rows.map(function (k) {
          return '<tr class="' + (CR.pilih[k.ID] ? 'sel' : '') + '"><td><input type="checkbox" data-ck="' + k.ID + '"' + (CR.pilih[k.ID] ? ' checked' : '') + '></td><td><div class="row" style="gap:10px"><div class="avatar sm">' + esc(A.inisial(k.Nama)) + '</div><div><b style="color:var(--ink);cursor:pointer" data-det="' + k.ID + '">' + esc(k.Nama) + '</b>' + (k.Duplikat ? ' <span class="badge amber" style="height:18px">duplikat</span>' : '') + (k.OptOut === 'YA' ? ' <span class="badge" style="height:18px">opt-out</span>' : '') + '<div class="tiny muted">' + esc(k.Kelas || k.Sumber) + '</div></div></div></td>' +
            '<td><span class="badge ' + ({ Siswa: 'blue', Wali: 'purple', Guru: 'green', Admin: 'green' }[k.Segmen] || '') + '">' + esc(k.Segmen) + '</span></td><td class="small mono">' + (k.NoWA ? esc(k.NoWA) + ' ' + waBadge(k.StatusWA) : '<span class="muted">—</span>') + '</td>' +
            '<td class="small">' + (k.Email ? esc(k.Email) + (k.EmailValid === 'TIDAK' ? ' <span class="badge rose" style="height:18px">tidak valid</span>' : '') : '<span class="muted">—</span>') + '</td><td><div class="row wrap" style="gap:4px">' + String(k.Tag || '').split(/\s*,\s*/).filter(Boolean).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div></td>' +
            '<td class="num small">' + (k.JumlahPesan || 0) + (k.TerakhirDihubungi ? '<div class="tiny muted">' + F.relatif(k.TerakhirDihubungi) + '</div>' : '') + '</td><td class="act"><button class="iconbtn" data-det="' + k.ID + '">' + ic('eye') + '</button></td></tr>';
        }).join('') : A.tabelKosong(8, 'Tidak ada kontak. Klik "Sinkron Sekarang" untuk menarik kontak dari data siswa, wali, dan staf.', 'contacts');
        A.pager($('#crPg'), D.total, CR.hal, D.per, function (h) { CR.hal = h; muat(); });
        $$('#crBody [data-ck]').forEach(function (c) { c.onchange = function () { if (c.checked) CR.pilih[c.dataset.ck] = 1; else delete CR.pilih[c.dataset.ck]; c.closest('tr').classList.toggle('sel', c.checked); bulk(); }; });
        $$('#crBody [data-det]').forEach(function (b) { b.onclick = function () { detail(b.dataset.det); }; });
        $('#crAll').checked = D.rows.length > 0 && D.rows.every(function (k) { return CR.pilih[k.ID]; });
        bulk();
      });
    };
    const bulk = function () { const n = Object.keys(CR.pilih).length; $('#crBulk').classList.toggle('hidden', !n); $('#crN').textContent = n + ' kontak dipilih'; };
    const detail = function (id) {
      const dr = A.drawer({ title: 'Detail Kontak', size: 'lg', body: '<div class="skel" style="height:300px"></div>' });
      A.api('crm.detail', { kontakId: id }).then(function (r) {
        if (!r.success) { dr.body.innerHTML = '<div class="empty">' + esc(r.message) + '</div>'; return; }
        const k = r.data.kontak;
        dr.el.querySelector('h3').textContent = k.Nama;
        const f = [{ k: 'Nama', label: 'Nama', full: true }, { k: 'NoWA', label: 'WhatsApp' }, { k: 'Email', label: 'Email', type: 'email' }, { k: 'Tag', label: 'Tag (pisahkan koma)', full: true }, { k: 'Catatan', label: 'Catatan', type: 'textarea', rows: 2, full: true }, { k: 'OptOut', label: 'Opt-out', type: 'switch', ket: 'Jangan kirim blast/jadwal ke kontak ini', full: true }];
        dr.body.innerHTML = '<div class="row wrap" style="gap:6px;margin-bottom:12px"><span class="badge blue">' + esc(k.Segmen) + '</span><span class="tag">Sumber: ' + esc(k.Sumber) + '</span>' + (k.Kelas ? '<span class="tag">' + esc(k.Kelas) + '</span>' : '') + waBadge(k.StatusWA) + '</div>' +
          '<div class="card pad">' + ADM.form(f, k) + '<p class="tiny muted">Perubahan nama/nomor/email ditulis balik ke data ' + esc(k.Sumber) + ' (satu sumber kebenaran).</p><button class="btn primary" id="cdSimpan">' + ic('save', 'sm') + 'Simpan kontak</button></div>' +
          '<div class="card pad" style="margin-top:14px"><b class="small" style="color:var(--ink)">Catat interaksi</b><div class="row" style="margin-top:8px"><select class="sel" id="cdKanal" style="width:auto"><option>Telepon</option><option>WA</option><option>Tatap muka</option><option>Email</option><option>Catatan</option></select><input class="inp grow" id="cdRing" placeholder="Ringkasan…"><button class="btn soft" id="cdCatat">' + ic('plus', 'sm') + 'Catat</button></div></div>' +
          '<h3 style="font-size:14px;margin:18px 0 10px">Linimasa</h3><div class="stack-sm">' + (r.data.timeline.length ? r.data.timeline.map(function (t) { return '<div class="list-item" style="align-items:flex-start"><span class="chip-ic sm ' + (t.kanal === 'WA' ? 't-green' : t.kanal === 'EMAIL' ? 't-blue' : 't-purple') + '">' + ic(t.kanal === 'WA' ? 'wa' : t.kanal === 'EMAIL' ? 'mail' : 'chat', 'sm') + '</span><div class="grow"><div class="row between"><b class="small" style="color:var(--ink)">' + esc(t.kanal) + ' · ' + esc(t.arah || '') + '</b><span class="tiny muted">' + F.tglJam(t.t) + '</span></div><div class="tiny muted">' + esc(t.ringkasan) + (t.status ? ' · ' + esc(t.status) : '') + (t.oleh ? ' · ' + esc(t.oleh) : '') + '</div></div></div>'; }).join('') : '<div class="empty small">Belum ada interaksi.</div>') + '</div>';
        $('#cdSimpan', dr.el).onclick = async function () { const d = ADM.ambil(dr.el, f); d.ID = k.ID; const x = await A.aksi(this, 'crm.save', { kontak: d }); if (x.success) { dr.close(); muat(); } };
        $('#cdCatat', dr.el).onclick = async function () { const x = await A.aksi(this, 'crm.interaksi', { kontakId: k.ID, kanal: $('#cdKanal', dr.el).value, ringkasan: $('#cdRing', dr.el).value }); if (x.success) { dr.close(); detail(id); } };
      });
    };
    $$('#crBulk [data-b]').forEach(function (b) { b.onclick = async function () {
      const ids = Object.keys(CR.pilih), a = b.dataset.b;
      if (a === 'blast') { ADM.blastIds = ids; NT.tab = 'blast'; location.hash = '#/notifikasi'; return; }
      if (a === 'merge') {
        const pil = D.rows.filter(function (k) { return CR.pilih[k.ID]; }); if (pil.length < 2) return A.toast('Pilih minimal 2 kontak di halaman ini.', 'warn');
        A.modal({ title: 'Gabungkan kontak', icon: 'layers', body: '<p class="small" style="margin-top:0">Pilih kontak <b>utama</b>. Tag, catatan, dan riwayat digabung ke kontak utama; kontak lain ditandai tergabung.</p><div class="stack-sm">' + pil.map(function (k, i) { return '<label class="opt-tile" style="cursor:pointer"><div><b>' + esc(k.Nama) + '</b><p>' + esc(k.Segmen) + ' · ' + esc(k.NoWA || '-') + ' · ' + esc(k.Email || '-') + '</p></div><input type="radio" name="utama" value="' + k.ID + '"' + (i === 0 ? ' checked' : '') + '></label>'; }).join('') + '</div>',
          actions: [{ label: 'Batal' }, { label: 'Gabungkan', cls: 'primary', onClick: async function (bb, bg) { const u = $('input[name=utama]:checked', bg).value; const r = await A.api('crm.merge', { utama: u, gabung: pil.map(function (k) { return k.ID; }).filter(function (x) { return x !== u; }) }); if (!A.hasil(r)) return false; CR.pilih = {}; muat(); stats(); } }] });
        return;
      }
      let nilai = '';
      if (a === 'tag' || a === 'untag') { nilai = await A.prompt(a === 'tag' ? 'Tambah tag' : 'Hapus tag', { label: 'Nama tag', ph: 'mis. alumni, osis', wajib: true, icon: 'tag' }); if (nilai === null) return; }
      else if (a === 'hapusManual' && !await A.confirm('Hapus kontak manual yang dipilih? Kontak dari data siswa/staf tidak terhapus.', { danger: true })) return;
      const r = await A.aksi(b, 'crm.bulk', { ids: ids, aksi: a, nilai: nilai }); if (r.success) { CR.pilih = {}; muat(); stats(); }
    }; });
    $('#crQ').oninput = A.debounce(function (e) { CR.q = e.target.value; CR.hal = 1; muat(); }, 350);
    $('#crSeg').onchange = function () { CR.segmen = this.value; CR.hal = 1; muat(); };
    $('#crWA').value = CR.statusWA; $('#crWA').onchange = function () { CR.statusWA = this.value; CR.hal = 1; muat(); };
    $('#crTag').onchange = function () { CR.tag = this.value; CR.hal = 1; muat(); };
    $('#crDup').onclick = function () { CR.duplikat = !CR.duplikat; this.classList.toggle('on', CR.duplikat); CR.hal = 1; muat(); };
    $('#crTK').onclick = function () { CR.tanpaKontak = !CR.tanpaKontak; this.classList.toggle('on', CR.tanpaKontak); CR.hal = 1; muat(); };
    $('#crOO').onclick = function () { CR.optOut = CR.optOut ? '' : 'YA'; this.classList.toggle('on', !!CR.optOut); CR.hal = 1; muat(); };
    $('#crAll').onchange = function () { const on = this.checked; $$('#crBody [data-ck]').forEach(function (c) { c.checked = on; if (on) CR.pilih[c.dataset.ck] = 1; else delete CR.pilih[c.dataset.ck]; c.closest('tr').classList.toggle('sel', on); }); bulk(); };
    $('#crSync').onclick = async function () { const r = await A.aksi(this, 'crm.sync', {}); if (r.success) { muat(); stats(); } };
    if ($('#crExp')) $('#crExp').onclick = async function () { A.busy(this, true); const r = await A.api('crm.export', {}); A.busy(this, false); if (!r.success) return A.toast(r.message, 'err'); A.exportXlsx({ Kontak: r.data.rows }, 'CRM Kontak ' + F.tgl(new Date())); };
    $('#crImp').onclick = function () {
      let data = null;
      A.modal({ title: 'Impor Kontak Luar', sub: 'Kolom: nama, wa, email, segmen, tag', icon: 'upload', body: '<div class="opt-tile"><div><b>Template</b><p>nama · wa · email · segmen · tag</p></div><button class="btn sm soft" data-tpl>' + ic('download', 'sm') + 'Unduh</button></div><div class="opt-tile" style="margin-top:10px"><div><b>Berkas</b><p id="ciF">Belum dipilih.</p></div><button class="btn sm primary" data-pilih>' + ic('upload', 'sm') + 'Pilih</button></div><p class="tiny muted">Kontak dengan nomor/email sama diperbarui (aman diulang).</p>',
        onOpen: function (m) {
          $('[data-tpl]', m.el).onclick = function () { A.exportXlsx({ Kontak: [{ nama: 'Bapak Komite', wa: '081234567890', email: 'komite@contoh.id', segmen: 'Komite', tag: 'komite' }] }, 'Template Kontak'); };
          $('[data-pilih]', m.el).onclick = async function () { const f = await A.pilihBerkas('.xlsx,.xls,.csv'); if (!f) return; data = ADM.petakanBaris(await A.readXlsx(f), { nama: 'nama', name: 'nama', wa: 'wa', whatsapp: 'wa', nowa: 'wa', hp: 'wa', email: 'email', segmen: 'segmen', tag: 'tag' }); $('#ciF', m.el).textContent = f.name + ' · ' + data.length + ' baris'; };
        },
        actions: [{ label: 'Batal' }, { label: 'Impor', cls: 'primary', icon: 'save', onClick: async function () { if (!data || !data.length) { A.toast('Pilih berkas.', 'warn'); return false; } const r = await A.api('crm.import', { rows: data }); if (!A.hasil(r)) return false; muat(); stats(); } }] });
    };
    stats(); muat();
  });

  // ============================================================================
  // BACKUP & MIGRASI (admin)
  // ============================================================================
  const BK = { tab: 'backup' };
  ADM.reg('backup', function (v) {
    v.innerHTML = ADM.judul('Backup & Migrasi', 'Salinan otomatis harian, pemulihan aman (dengan salinan pengaman), dan migrasi dari aplikasi/spreadsheet lama yang aman diulang (delta sync).', '', 'Administrasi › <b>Backup &amp; Migrasi</b>') +
      tabsHtml('bkTab', [['backup', 'Backup & Pemulihan', 'db'], ['migrasi', 'Migrasi Data Lama', 'upload'], ['ekspor', 'Ekspor JSON', 'download']], BK.tab) + '<div id="bkIsi"></div>';
    ikatTabs('bkTab', function (t) { BK.tab = t; tampil(); });
    const tampil = function () { ({ backup: tabBackup, migrasi: tabMigrasi, ekspor: tabEkspor })[BK.tab]($('#bkIsi')); };
    tampil();
  });
  function tabBackup(el) {
    el.innerHTML = '<div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px;align-items:start" id="bkGrid"><div class="card"><div class="card-h"><div><h3>Salinan Backup</h3><p>Disimpan di folder Backup Google Drive</p></div><button class="btn primary" id="bkBuat">' + ic('plus', 'sm') + 'Backup Sekarang</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Tanggal</th><th class="num">Ukuran</th><th class="right">Aksi</th></tr></thead><tbody id="bkBody"><tr><td colspan="4"><div class="skel" style="height:180px"></div></td></tr></tbody></table></div></div>' +
      '<div class="stack"><div class="card pad-lg" id="bkSet"></div><div class="alert amber">' + ic('shield') + '<div class="small">Setiap pemulihan & migrasi <b>selalu</b> membuat salinan pengaman lebih dulu, sehingga dapat dibatalkan dengan memulihkan salinan tersebut.</div></div></div></div>';
    if (innerWidth < 1100) $('#bkGrid').style.gridTemplateColumns = '1fr';
    const muat = function () {
      A.api('backup.list', {}).then(function (r) {
        if (!$('#bkBody')) return;
        if (!r.success) { $('#bkBody').innerHTML = A.tabelKosong(4, r.message); return; }
        const d = r.data;
        $('#bkBody').innerHTML = d.rows.length ? d.rows.map(function (b) { return '<tr><td><b class="small" style="color:var(--ink)">' + esc(b.nama) + '</b></td><td class="small">' + F.tglJam(b.tanggal) + '<div class="tiny muted">' + F.relatif(b.tanggal) + '</div></td><td class="num small">' + (b.ukuran ? F.bytes(b.ukuran) : '—') + '</td><td class="act"><a class="iconbtn" href="' + esc(b.url) + '" target="_blank" rel="noopener" title="Buka">' + ic('ext') + '</a><button class="btn sm ghost" data-pul="' + b.id + '" data-n="' + esc(b.nama) + '">' + ic('history', 'sm') + 'Pulihkan</button></td></tr>'; }).join('') : A.tabelKosong(4, 'Belum ada backup.', 'db');
        $('#bkSet').innerHTML = '<h3 style="font-size:15px">Setelan Backup Otomatis</h3><div class="opt-tile" style="margin-top:12px"><div><b>Backup harian</b><p>Pukul 02.00 WIB lewat trigger pekerjaHarian</p></div><label class="switch"><input type="checkbox" id="bkOto"' + (d.otomatis ? ' checked' : '') + '><span></span></label></div><div class="field" style="margin-top:12px"><label>Jumlah salinan disimpan</label><input class="inp" type="number" id="bkN" min="3" max="60" value="' + d.simpan + '"></div><button class="btn soft" id="bkSimpanSet" style="margin-top:12px">' + ic('save', 'sm') + 'Simpan setelan</button>';
        $('#bkSimpanSet').onclick = function () { A.aksi(this, 'backup.setelan', { otomatis: $('#bkOto').checked, simpan: Number($('#bkN').value) }); };
        $$('[data-pul]', el).forEach(function (b) { b.onclick = function () {
          A.modal({ title: 'Pulihkan dari backup', sub: b.dataset.n, icon: 'history', iconTone: 't-amber', body: '<div class="stack-sm"><label class="opt-tile" style="cursor:pointer"><div><b>Gabung aman (disarankan)</b><p>Baris yang hilang dikembalikan; data yang ada tidak ditimpa.</p></div><input type="radio" name="md" value="gabung" checked></label><label class="opt-tile" style="cursor:pointer"><div><b>Ganti penuh</b><p>Seluruh isi tabel diganti persis seperti backup (data setelah backup hilang).</p></div><input type="radio" name="md" value="ganti"></label>' +
            '<div class="field"><label>Ketik <b>PULIHKAN</b> untuk konfirmasi</label><input class="inp" id="pkK" autocomplete="off"></div></div>',
            actions: [{ label: 'Batal' }, { label: 'Pulihkan', cls: 'danger', icon: 'history', onClick: async function (bb, bg) { const r2 = await A.api('backup.pulihkan', { id: b.dataset.pul, mode: $('input[name=md]:checked', bg).value, konfirmasi: $('#pkK', bg).value.trim() }, { timeout: 300000 }); if (!A.hasil(r2)) return false; A.swrClear(); muat(); } }] });
        }; });
      });
    };
    $('#bkBuat').onclick = async function () { const r = await A.aksi(this, 'backup.buat', {}); if (r.success) muat(); };
    muat();
  }
  function tabMigrasi(el) {
    const TABEL = [['Kelas', 'Kelas / rombel'], ['Pengguna', 'Guru (admin tidak dimigrasi)'], ['Siswa', 'Siswa & wali'], ['BankSoal', 'Bank soal'], ['Pengumuman', 'Pengumuman'], ['Materi', 'Materi'], ['PaketUjian', 'Paket ujian*'], ['TokenSiswa', 'Token*'], ['SesiUjian', 'Hasil/sesi ujian*']];
    el.innerHTML = '<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:16px;align-items:start" id="mgGrid"><div class="card pad-lg"><h3 style="font-size:15px">Sumber Data</h3><p class="small muted">Spreadsheet aplikasi lama atau berkas backup. Sumber hanya <b>dibaca</b>. Kolom dikenali dari nama judul (mis. "Nama Siswa", "No HP", "Kunci Jawaban").</p>' +
      '<div class="field" style="margin-top:12px"><label>URL / ID Google Spreadsheet sumber</label><input class="inp" id="mgSrc" placeholder="https://docs.google.com/spreadsheets/d/…"></div><div class="tiny muted" style="margin-top:6px">Spreadsheet harus bisa dibuka oleh akun Google pemilik aplikasi ini.</div>' +
      '<div class="field" style="margin-top:14px"><label>Tabel yang dimigrasi</label><div class="stack-sm" id="mgTab">' + TABEL.map(function (t) { return '<label class="check"><input type="checkbox" value="' + t[0] + '"' + (/\*/.test(t[1]) ? '' : ' checked') + '> ' + esc(t[1]) + '</label>'; }).join('') + '</div><div class="hint">* hanya dari sumber berformat UjianKu Pro (mis. backup).</div></div>' +
      '<div class="field" style="margin-top:12px"><label>Pemilik soal bila kolom "Pembuat" kosong</label><select class="sel" id="mgPemilik"><option value="">— pilih guru —</option></select></div>' +
      '<label class="check" style="margin-top:12px"><input type="checkbox" id="mgTimpa"> Timpa nilai yang sudah ada di aplikasi baru (default: hanya mengisi yang kosong)</label>' +
      '<div class="row" style="margin-top:16px"><button class="btn ghost" id="mgDry">' + ic('search', 'sm') + 'Pindai (dry-run)</button><button class="btn primary" id="mgRun">' + ic('upload', 'sm') + 'Jalankan migrasi</button></div></div>' +
      '<div class="card pad-lg" id="mgHasil"><h3 style="font-size:15px">Laporan</h3><div class="empty small">Jalankan pindai untuk melihat rencana migrasi tanpa menulis data.</div><div class="alert blue" style="margin-top:10px">' + ic('info') + '<div class="small"><b>Alur aman:</b> pindai → periksa laporan → jalankan. Ulangi kapan saja untuk menarik data baru (delta sync) — baris yang sudah ada tidak digandakan.</div></div></div></div>';
    if (innerWidth < 1100) $('#mgGrid').style.gridTemplateColumns = '1fr';
    A.swr('user', function () { return A.apiQ('user.list', {}); }, { maxAge: 60000 }).then(function (d) { if (d && $('#mgPemilik')) $('#mgPemilik').innerHTML = '<option value="">— pilih guru —</option>' + d.rows.filter(function (u) { return u.Peran === 'GURU'; }).map(function (u) { return '<option value="' + u.ID + '">' + esc(u.Nama) + ' (@' + esc(u.Username) + ')</option>'; }).join(''); });
    const jalan = async function (btn, dry) {
      const src = $('#mgSrc').value.trim(); if (!src) return A.toast('Tempel URL spreadsheet sumber.', 'warn');
      const sheets = $$('#mgTab input:checked').map(function (x) { return x.value; }); if (!sheets.length) return A.toast('Pilih tabel.', 'warn');
      if (!dry && !await A.confirm('Jalankan migrasi sungguhan? Salinan pengaman dibuat otomatis sebelum menulis.', { ok: 'Jalankan', ketik: 'MIGRASI' })) return;
      A.busy(btn, true, dry ? 'Memindai…' : 'Memigrasi…');
      const r = await A.api('mig.jalankan', { sumber: src, sheets: sheets, dryRun: dry, timpa: $('#mgTimpa').checked, pemilikSoal: $('#mgPemilik').value }, { timeout: 330000, retry: 0 });
      A.busy(btn, false);
      if (!r.success) return A.toast(r.message, 'err');
      const d = r.data;
      $('#mgHasil').innerHTML = '<div class="row between"><h3 style="font-size:15px">Laporan ' + (d.dryRun ? 'Pindai (belum ditulis)' : 'Migrasi') + '</h3><span class="badge ' + (d.dryRun ? 'blue' : 'green') + '">' + esc(d.sumber.nama) + '</span></div>' +
        '<div class="tbl-wrap" style="margin-top:12px;border:1px solid var(--line);border-radius:12px"><table class="tbl"><thead><tr><th>Tabel</th><th class="num">Sumber</th><th class="num">Ditambah</th><th class="num">Diperbarui</th><th class="num">Dilewati</th></tr></thead><tbody>' +
        Object.keys(d.laporan).map(function (t) { const x = d.laporan[t]; return '<tr><td><b class="small">' + esc(t) + '</b>' + (x.info ? '<div class="tiny muted">' + esc(x.info) + '</div>' : '') + '</td><td class="num">' + x.sumber + '</td><td class="num" style="color:var(--green)"><b>' + x.ditambah + '</b></td><td class="num" style="color:var(--brand)">' + x.diperbarui + '</td><td class="num muted">' + x.dilewati + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        (d.peringatan.length ? '<div class="alert amber" style="margin-top:12px">' + ic('warn') + '<div class="small"><b>Peringatan (' + d.peringatan.length + ')</b><ul style="margin:6px 0 0;padding-left:18px;max-height:160px;overflow:auto">' + d.peringatan.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div></div>' : '') +
        (d.akunBaru.length ? '<div class="alert rose" style="margin-top:12px">' + ic('key') + '<div class="small"><b>' + d.akunBaru.length + ' akun guru baru</b> dengan sandi awal — unduh sekarang, hanya tampil sekali.<div style="margin-top:8px"><button class="btn sm danger" id="mgAkun">' + ic('download', 'sm') + 'Unduh daftar sandi awal</button></div></div></div>' : '') +
        (d.dryRun ? '<p class="small muted" style="margin-top:12px">Tidak ada data yang ditulis. Klik <b>Jalankan migrasi</b> bila laporan sudah sesuai.</p>' : '<p class="small" style="margin-top:12px;color:var(--green)">' + ic('checkc', 'sm') + ' ' + esc(r.message) + '</p>');
      if ($('#mgAkun')) $('#mgAkun').onclick = function () { A.exportXlsx({ AkunBaru: d.akunBaru.map(function (a) { return { Nama: a.nama, Username: a.username, SandiAwal: a.sandi }; }) }, 'Sandi awal guru migrasi'); };
      if (!d.dryRun) A.swrClear();
    };
    $('#mgDry').onclick = function () { jalan(this, true); };
    $('#mgRun').onclick = function () { jalan(this, false); };
  }
  function tabEkspor(el) {
    el.innerHTML = '<div class="card pad-lg" style="max-width:720px"><h3 style="font-size:15px">Ekspor Seluruh Data (JSON)</h3><p class="small muted">Untuk arsip atau dipindahkan ke sistem lain. Kolom sensitif (hash sandi, salt, hash PIN) <b>tidak</b> ikut diekspor. Aksi ini tercatat di audit log.</p><button class="btn primary" id="ekJson">' + ic('download', 'sm') + 'Unduh JSON</button></div>';
    $('#ekJson').onclick = async function () {
      A.busy(this, true); const r = await A.api('backup.json', {}, { timeout: 180000 }); A.busy(this, false);
      if (!r.success) return A.toast(r.message, 'err');
      unduhTeks(JSON.stringify(r.data, null, 1), 'ujianku-ekspor-' + new Date().toISOString().slice(0, 10) + '.json');
    };
  }

  // ============================================================================
  // AUDIT LOG (admin)
  // ============================================================================
  ADM.reg('audit', function (v) {
    v.innerHTML = ADM.judul('Audit Log', 'Jejak aksi penting: login, perubahan data, token, monitoring, ekspor, dan akses rahasia (500 terbaru, dapat dicari).', '<button class="btn ghost" id="auExp">' + ic('download', 'sm') + 'Ekspor</button>', 'Administrasi › <b>Audit Log</b>') +
      '<div class="card"><div class="card-b row wrap"><div class="search grow">' + ic('search') + '<input class="inp" id="auQ" placeholder="Cari pengguna, aksi, entitas… (Enter)"></div><select class="sel" id="auAksi" style="width:auto"><option value="">Semua aksi</option></select></div>' +
      '<div class="tbl-wrap"><table class="tbl" id="auT"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Entitas</th><th>Detail</th></tr></thead><tbody><tr><td colspan="5"><div class="skel" style="height:220px"></div></td></tr></tbody></table></div><div class="pager" id="auT_pg"></div></div>';
    let rows = [], aksi = '';
    const t = ADM.tabelKlien({ id: 'auT', kolom: 5, per: 40, rows: function () { return rows.filter(function (r) { return !aksi || r.Aksi === aksi; }); },
      baris: function (r) { return '<tr class="' + (/GAGAL|HAPUS|PULIH|RAHASIA|EXPORT|JSON/i.test(r.Aksi) ? 'warn' : '') + '"><td class="tiny nowrap">' + F.tglJam(r.Waktu) + '</td><td class="small"><b style="color:var(--ink)">' + esc(r.Nama) + '</b><div class="tiny muted">' + esc(r.Peran) + '</div></td><td><span class="tag mono">' + esc(r.Aksi) + '</span></td><td class="tiny mono">' + esc(r.Entitas) + '</td><td class="tiny" style="max-width:380px;word-break:break-word">' + esc(r.Detail) + '</td></tr>'; } });
    const muat = function (q) {
      A.api('audit.list', { cari: q || '' }).then(function (r) {
        if (!$('#auT')) return;
        rows = r.success ? r.data.rows : [];
        const a = rows.map(function (x) { return x.Aksi; }).filter(function (x, i, arr) { return arr.indexOf(x) === i; }).sort();
        $('#auAksi').innerHTML = '<option value="">Semua aksi</option>' + a.map(function (x) { return '<option' + (x === aksi ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
        t.reset();
      });
    };
    $('#auQ').onkeydown = function (e) { if (e.key === 'Enter') muat(this.value.trim()); };
    $('#auAksi').onchange = function () { aksi = this.value; t.reset(); };
    $('#auExp').onclick = function () { A.exportXlsx({ Audit: rows }, 'Audit Log ' + F.tgl(new Date())); };
    muat('');
  });
})();
