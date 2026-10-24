/* ============================================================================
   UjianKu Pro — Dashboard Guru & Admin: login, shell, router, helper bersama,
   Dashboard, Monitoring real-time, Profil.
   Modul lain mendaftar halaman lewat ADM.reg(nama, fn).
   ============================================================================ */
(function () {
  'use strict';
  const A = window.App, $ = A.$, $$ = A.$$, esc = A.esc, ic = A.icon, F = A.fmt;
  A.Sesi.scope = 'staf';
  const root = document.getElementById('root');
  const ADM = window.ADM = { pages: {}, timers: [], me: null, cur: '' };
  ADM.reg = function (n, fn) { ADM.pages[n] = fn; };

  A.onAuthFail = function () { A.Sesi.clear(); A.swrClear(); tampilLogin('Sesi Anda berakhir. Silakan masuk kembali.'); };
  A.onMustChange = function () { gantiSandi(true); };
  A.bannerKonfig();
  A.bootPublik(function () { const f = $('#ft'); if (f) f.innerHTML = A.footerHtml(); });

  // ============================================================================
  // HELPER BERSAMA
  // ============================================================================
  ADM.isAdmin = function () { return ADM.me && ADM.me.role === 'ADMIN'; };
  ADM.isGuru = function () { return ADM.me && ADM.me.role === 'GURU'; };
  ADM.judul = function (t, sub, kanan, crumb) {
    return '<div class="page-h"><div>' + (crumb ? '<div class="crumb">' + crumb + '</div>' : '') + '<h2>' + t + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (kanan ? '<div class="row wrap">' + kanan + '</div>' : '') + '</div>';
  };
  ADM.kpi = function (lbl, val, sub, tone, ikon, extra) {
    return '<div class="card kpi"><div class="blob ' + (tone || 't-blue') + '"></div><div class="row between top" style="position:relative"><div class="lbl">' + lbl + '</div>' + (ikon ? '<span class="chip-ic sm ' + (tone || 't-blue') + '">' + ic(ikon, 'sm') + '</span>' : '') + '</div>' +
      '<div class="val" style="position:relative">' + val + '</div>' + (sub ? '<div class="sub" style="position:relative">' + sub + '</div>' : '') + (extra || '') + '</div>';
  };
  ADM.loading = function (v) { v.innerHTML = '<div class="grid g4"><div class="skel" style="height:118px"></div><div class="skel" style="height:118px"></div><div class="skel" style="height:118px"></div><div class="skel" style="height:118px"></div></div><div class="skel" style="height:320px;margin-top:16px"></div>'; };
  ADM.every = function (fn, ms) { ADM.timers.push(setInterval(fn, ms)); };
  ADM.badgeStatus = function (s) {
    return { Berlangsung: '<span class="badge live">LIVE Berjalan</span>', Terjadwal: '<span class="badge blue dot">Terjadwal</span>', Draf: '<span class="badge amber dot">Draf</span>', Selesai: '<span class="badge dot">Selesai</span>', Arsip: '<span class="badge">Arsip</span>' }[s] || '<span class="badge">' + esc(s) + '</span>';
  };
  /** Form dari spesifikasi kolom. f = {k,label,type,opsi,full,hint,ph,req,attr,min,max,step,rows} */
  ADM.form = function (fields, v) {
    v = v || {};
    return '<div class="form-grid">' + fields.map(function (f) {
      const val = v[f.k] === undefined || v[f.k] === null ? (f.def === undefined ? '' : f.def) : v[f.k], id = 'f_' + f.k;
      let inp;
      if (f.type === 'select') inp = '<select class="sel" id="' + id + '">' + (f.opsi || []).map(function (o) { const ov = typeof o === 'object' ? o.v : o, ol = typeof o === 'object' ? o.l : o; return '<option value="' + esc(ov) + '"' + (String(ov) === String(val) ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('') + '</select>';
      else if (f.type === 'textarea') inp = '<textarea class="ta" id="' + id + '" rows="' + (f.rows || 3) + '" placeholder="' + esc(f.ph || '') + '">' + esc(val) + '</textarea>';
      else if (f.type === 'switch') inp = '<label class="row" style="gap:10px"><span class="switch"><input type="checkbox" id="' + id + '" ' + (val === true || val === 'YA' ? 'checked' : '') + '><span></span></span><span class="small muted">' + esc(f.ket || '') + '</span></label>';
      else if (f.type === 'chips') { const sel = Array.isArray(val) ? val : String(val || '').split(/\s*,\s*/).filter(Boolean); inp = '<div class="chips" id="' + id + '">' + (f.opsi || []).map(function (o) { return '<button type="button" class="chip ' + (sel.indexOf(o) > -1 ? 'on' : '') + '" data-v="' + esc(o) + '">' + esc(o) + '</button>'; }).join('') + (f.opsi && f.opsi.length ? '' : '<span class="small muted">Belum ada pilihan.</span>') + '</div>'; }
      else inp = '<input class="inp" id="' + id + '" type="' + (f.type || 'text') + '" value="' + esc(f.type === 'datetime-local' ? F.inputDT(val) : val) + '" placeholder="' + esc(f.ph || '') + '" ' + (f.min !== undefined ? 'min="' + f.min + '" ' : '') + (f.max !== undefined ? 'max="' + f.max + '" ' : '') + (f.step ? 'step="' + f.step + '" ' : '') + (f.attr || '') + '>';
      return '<div class="field' + (f.full ? ' full' : '') + '"><label for="' + id + '">' + esc(f.label) + (f.req ? ' <span style="color:var(--rose)">*</span>' : '') + '</label>' + inp + (f.hint ? '<div class="hint">' + f.hint + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  };
  ADM.ikatChips = function (el) { $$('.chips .chip[data-v]', el).forEach(function (b) { b.onclick = function () { b.classList.toggle('on'); }; }); };
  ADM.ambil = function (el, fields) {
    const o = {};
    fields.forEach(function (f) {
      const x = $('#f_' + f.k, el); if (!x) return;
      if (f.type === 'switch') o[f.k] = x.checked ? 'YA' : 'TIDAK';
      else if (f.type === 'chips') o[f.k] = $$('.chip.on', x).map(function (b) { return b.dataset.v; }).join(', ');
      else if (f.type === 'datetime-local') o[f.k] = x.value ? new Date(x.value).toISOString() : '';
      else if (f.type === 'number') o[f.k] = x.value === '' ? '' : Number(x.value);
      else o[f.k] = x.value.trim();
    });
    return o;
  };
  /** Modal form siap pakai: onSave(data) → Promise<respons> (modal tutup bila sukses). */
  ADM.modalForm = function (o) {
    return A.modal({ title: o.title, sub: o.sub, icon: o.icon || 'edit', size: o.size || 'lg', body: (o.atas || '') + ADM.form(o.fields, o.nilai) + (o.bawah || ''),
      onOpen: function (m) { ADM.ikatChips(m.el); if (o.onOpen) o.onOpen(m); },
      actions: [{ label: 'Batal' }, { label: o.ok || 'Simpan', cls: 'primary', icon: 'save', onClick: async function (b, bg) {
        const data = ADM.ambil(bg, o.fields);
        const kurang = o.fields.filter(function (f) { return f.req && !String(data[f.k] || '').trim(); });
        if (kurang.length) { A.toast('Lengkapi: ' + kurang.map(function (f) { return f.label; }).join(', '), 'warn'); return false; }
        const r = await o.onSave(data, bg);
        if (!r) return false;
        if (!A.hasil(r)) return false;
        if (o.after) o.after(r);
        return true;
      } }] });
  };
  ADM.tabs = function (id, list, aktif, onPilih) {
    return '<div class="chips" id="' + id + '">' + list.map(function (t) { return '<button class="chip ' + (t[0] === aktif ? 'on' : '') + '" data-t="' + t[0] + '">' + (t[2] ? ic(t[2], 'sm') : '') + esc(t[1]) + (t[3] !== undefined ? ' <span class="pill-n">' + t[3] + '</span>' : '') + '</button>'; }).join('') + '</div>';
  };
  ADM.ikatTabs = function (id, onPilih) { $$('#' + id + ' [data-t]').forEach(function (b) { b.onclick = function () { $$('#' + id + ' [data-t]').forEach(function (x) { x.classList.toggle('on', x === b); }); onPilih(b.dataset.t); }; }); };
  /** Tabel klien dengan cari + paginasi. */
  ADM.tabelKlien = function (o) {
    const st = { hal: 1, q: '' };
    const render = function () {
      let rows = o.rows();
      if (st.q && o.cari) rows = rows.filter(function (r) { return o.cari(r).toLowerCase().indexOf(st.q) > -1; });
      const per = o.per || 25, tampil = rows.slice((st.hal - 1) * per, st.hal * per);
      $('#' + o.id + ' tbody').innerHTML = tampil.length ? tampil.map(o.baris).join('') : A.tabelKosong(o.kolom, o.kosong || 'Belum ada data.');
      A.pager($('#' + o.id + '_pg'), rows.length, st.hal, per, function (h) { st.hal = h; render(); });
      if (o.after) o.after(tampil);
    };
    return { render: render, cari: function (q) { st.q = String(q || '').toLowerCase(); st.hal = 1; render(); }, reset: function () { st.hal = 1; render(); } };
  };
  ADM.unduh = async function (btn, id, format) {
    A.busy(btn, true);
    const r = await A.api('de.dok.unduh', { id: id, format: format || 'pdf' }, { timeout: 90000 });
    A.busy(btn, false);
    if (!r.success) return A.toast(r.message, 'err');
    A.unduhB64(r.data.base64, r.data.nama, r.data.mime);
  };

  // ============================================================================
  // LOGIN
  // ============================================================================
  function tampilLogin(pesan) {
    stopTimers(); ADM.me = null;
    root.innerHTML = '<div class="login-bg"><div class="login-top"><div class="brand"><div class="logo" data-brand="logo">' + A.logoSvg + '</div><div><div class="nm"><span data-brand="nama">UjianKu</span><span class="pro">PRO</span></div><div class="sub">Dashboard Guru &amp; Admin</div></div></div><a class="pill-dark" href="index.html">' + ic('cap') + 'Portal Siswa (Token PIN)</a></div>' +
      '<div class="login-card"><div class="topline"></div><div class="in"><div class="center"><span class="badge blue" style="height:32px;padding:0 14px;font-size:13px">' + ic('shield', 'sm') + 'Akses Guru, Pengawas &amp; Admin</span></div><h2 style="margin-top:16px">Masuk Dashboard</h2><p class="lead">Kelola bank soal, paket ujian, token, monitoring, dan rekap nilai.</p>' +
      (pesan ? '<div class="alert amber" style="margin-bottom:14px">' + ic('info') + '<div>' + esc(pesan) + '</div></div>' : '') +
      '<form id="fL" autocomplete="on"><div class="field"><label for="lu">Nama pengguna</label><input class="inp" id="lu" autocomplete="username" autocapitalize="none" spellcheck="false" style="height:48px"></div>' +
      '<div class="field" style="margin-top:12px"><label for="lp">Kata sandi</label><div style="position:relative"><input class="inp" id="lp" type="password" autocomplete="current-password" style="height:48px;padding-right:44px"><button type="button" class="iconbtn" id="lpEye" style="position:absolute;right:6px;top:8px" aria-label="Tampilkan sandi">' + ic('eye') + '</button></div></div>' +
      '<button class="btn grad block" id="bL" type="submit" style="margin-top:18px;font-size:16px;height:52px">Masuk ' + ic('right') + '</button></form>' +
      '<p class="tiny muted center" style="margin:16px 0 0">Lupa kata sandi? Hubungi admin sekolah untuk reset. Akun terkunci 15 menit setelah 5 kali salah.</p></div>' +
      '<div class="login-foot"><span>' + ic('lock', 'sm') + ' Sandi disimpan sebagai hash + salt</span><span class="mono">v' + A.versi + '</span></div></div><div style="height:40px"></div></div>';
    A.brand(A.setting); A.warmUp('admin');
    $('#lpEye').onclick = function () { const p = $('#lp'); p.type = p.type === 'password' ? 'text' : 'password'; };
    $('#lu').focus();
    $('#fL').onsubmit = async function (e) {
      e.preventDefault();
      const b = $('#bL'); A.busy(b, true, 'Memeriksa…');
      const r = await A.api('auth.login', { username: $('#lu').value.trim(), password: $('#lp').value }, { noToken: true, retry: 1 });
      A.busy(b, false);
      if (!r.success) { A.toast(r.message, 'err'); $('#lp').select(); return; }
      A.Sesi.set(r.data.token, r.data.me, r.data.exp);
      if (!location.hash || location.hash === '#') location.hash = '#/dashboard';
      tampilShell();
      if (r.data.me.wajibGanti) gantiSandi(true);
    };
  }
  let _gsBuka = false;
  function gantiSandi(wajib) {
    if (_gsBuka) return;
    _gsBuka = true;
    A.modal({ title: wajib ? 'Ganti kata sandi awal' : 'Ganti kata sandi', sub: wajib ? 'Demi keamanan, sandi awal wajib diganti sebelum Anda dapat mengubah data.' : 'Sesi di perangkat lain akan dikeluarkan.', icon: 'key', size: 'sm', noEsc: wajib, noBgClose: wajib, onClose: function () { _gsBuka = false; },
      body: '<div class="stack-sm"><div class="field"><label>Kata sandi saat ini</label><input class="inp" type="password" id="gs1" autocomplete="current-password"></div><div class="field"><label>Kata sandi baru</label><input class="inp" type="password" id="gs2" autocomplete="new-password"><div class="hint">Minimal 8 karakter, berisi huruf dan angka.</div></div><div class="field"><label>Ulangi kata sandi baru</label><input class="inp" type="password" id="gs3" autocomplete="new-password"></div></div>',
      actions: (wajib ? [] : [{ label: 'Batal' }]).concat([{ label: 'Simpan Sandi Baru', cls: 'primary', icon: 'save', onClick: async function (b, bg) {
        const a = $('#gs1', bg).value, n = $('#gs2', bg).value;
        if (n !== $('#gs3', bg).value) { A.toast('Ulangi sandi baru tidak cocok.', 'warn'); return false; }
        const r = await A.api('auth.gantiSandi', { lama: a, baru: n });
        if (!A.hasil(r)) return false;
        A.Sesi.set(r.data.token, r.data.me); ADM.me = r.data.me; return true;
      } }]) });
  }
  ADM.gantiSandi = gantiSandi;

  // ============================================================================
  // SHELL & ROUTER
  // ============================================================================
  const MENU = [
    ['Utama'], ['dashboard', 'home', 'Dashboard'], ['bank-soal', 'book', 'Bank Soal'], ['paket', 'layers', 'Paket Ujian'], ['token', 'ticket', 'Token PIN'], ['monitoring', 'monitor', 'Monitoring', 0, 'live'], ['rekap', 'chart', 'Rekap & Analisis'],
    ['Data & Layanan'], ['siswa', 'users', 'Siswa & Kelas'], ['dokumen', 'file', 'Dokumen & TTD'], ['notifikasi', 'wa', 'WhatsApp & Notifikasi'], ['crm', 'contacts', 'CRM Kontak'], ['info', 'mega', 'Pengumuman & Materi'],
    ['Administrasi', 'ADMIN'], ['pengguna', 'user', 'Pengguna', 'ADMIN'], ['pengaturan', 'cog', 'Pengaturan', 'ADMIN'], ['backup', 'db', 'Backup & Migrasi', 'ADMIN'], ['audit', 'history', 'Audit Log', 'ADMIN']];
  function tampilShell() {
    const d = A.Sesi.data(); if (!d) return tampilLogin();
    ADM.me = d.me;
    root.innerHTML = '<div class="app" id="app"><aside class="sidebar" id="sb"><div class="brand"><div class="logo" data-brand="logo">' + A.logoSvg + '</div><div><div class="nm"><span data-brand="nama">UjianKu</span><span class="pro">PRO</span></div><div class="sub">CBT Google Apps Script</div></div></div>' +
      '<nav class="nav" id="nav"></nav><div class="motiv"><div style="color:var(--brand)">' + ic('cap', 'xl') + '</div><b>' + esc((A.setting || {}).MOTIVASI_JUDUL || 'Siap. Berlatih. Berprestasi.') + '</b><span>' + esc((A.setting || {}).MOTIVASI_TEKS || 'Ujian jujur kunci kesuksesan siswa sejati.') + '</span></div></aside>' +
      '<div class="main"><header class="topbar"><button class="iconbtn hb" id="hb" aria-label="Menu">' + ic('menu') + '</button><div class="grow"><h1 id="tTitle">Dashboard</h1><div class="tl" data-brand="lembaga"></div></div>' +
      '<span class="badge green dot hide-m" id="syncB" title="Status server">Server siap</span><button class="iconbtn bell" id="bBell" title="Menunggu tanda tangan Anda">' + ic('pen') + '<span class="cnt hidden" id="nBell"></span></button>' +
      '<div class="me" id="meBtn"><div class="avatar">' + esc(A.inisial(ADM.me.nama)) + '</div><div class="who"><b>' + esc(ADM.me.nama) + '</b><span>' + (ADM.me.role === 'ADMIN' ? 'Administrator' : 'Guru · ' + esc((ADM.me.mapel || []).join(', '))) + '</span></div>' + ic('cdown', 'sm') + '</div></header>' +
      '<main class="content" id="view"></main><footer class="footer" id="ft"></footer></div></div>';
    $('#ft').innerHTML = A.footerHtml();
    A.brand(A.setting);
    $('#hb').onclick = function () { $('#app').classList.toggle('nav-open'); scrim(); };
    $('#meBtn').onclick = menuSaya;
    $('#bBell').onclick = function () { location.hash = '#/dokumen'; };
    renderNav(); renderRoute();
    // Prefetch menu inti dalam 1 batch (tampil instan saat dibuka)
    setTimeout(function () { ['paket.list', 'kelas.list'].forEach(function (a) { A.apiQ(a, {}).then(function (r) { if (r && r.success) A.LS.set('uk_c_staf_pre_' + a, { t: Date.now(), d: r.data }); }); }); cekTtd(); }, 400);
    A.api('auth.me', {}, { quiet: true }).then(function (r) { if (r.success) { ADM.me = r.data.me; A.Sesi.patch(r.data.me); if (r.data.me.wajibGanti) gantiSandi(true); } });
  }
  function cekTtd() { A.api('de.dok.list', { status: 'MENUNGGU_TTD' }, { quiet: true }).then(function (r) { const n = r.success ? r.data.menungguSaya.length : 0, b = $('#nBell'); if (b) { b.textContent = n; b.classList.toggle('hidden', !n); } }); }
  ADM.cekTtd = cekTtd;
  function scrim() {
    let sc = $('.scrim');
    if ($('#app').classList.contains('nav-open')) { if (!sc) { sc = document.createElement('div'); sc.className = 'scrim'; sc.onclick = function () { $('#app').classList.remove('nav-open'); sc.remove(); }; document.body.appendChild(sc); } }
    else if (sc) sc.remove();
  }
  function renderNav() {
    const role = ADM.me.role;
    $('#nav').innerHTML = MENU.filter(function (m) { return m.length === 1 ? true : m[1] === 'ADMIN' && m.length === 2 ? role === 'ADMIN' : !m[3] || m[3] === 0 || m[3] === role; }).map(function (m) {
      if (m.length <= 2) return '<div class="sec">' + esc(m[0]) + '</div>';
      return '<a href="#/' + m[0] + '" data-n="' + m[0] + '" class="' + (ADM.cur === m[0] ? 'on' : '') + '">' + ic(m[1]) + '<span>' + esc(m[2]) + '</span>' + (m[4] === 'live' ? '<span class="badge live">LIVE</span>' : '') + '</a>';
    }).join('') + '<a href="#/profil" data-n="profil" class="' + (ADM.cur === 'profil' ? 'on' : '') + '">' + ic('user') + '<span>Profil Saya</span></a><a href="#" class="out" id="bOut">' + ic('out') + '<span>Keluar</span></a>';
    $('#bOut').onclick = function (e) { e.preventDefault(); keluar(); };
  }
  function menuSaya(e) {
    e.stopPropagation();
    let p = $('#mePop'); if (p) { p.remove(); return; }
    p = document.createElement('div'); p.className = 'menu-pop'; p.id = 'mePop';
    p.innerHTML = '<div style="padding:8px 11px 10px"><b class="small">' + esc(ADM.me.nama) + '</b><div class="tiny muted">@' + esc(ADM.me.username) + ' · ' + esc(ADM.me.role) + '</div></div><div class="sep" style="margin:4px 0"></div>' +
      '<a href="#/profil">' + ic('user') + 'Profil Saya</a><button id="mGs">' + ic('key') + 'Ganti kata sandi</button><button id="mTema">' + ic('moon') + 'Tema terang/gelap</button><button id="mAll">' + ic('shield') + 'Keluar dari semua perangkat</button><button id="mOut">' + ic('out') + 'Keluar</button>';
    $('#meBtn').appendChild(p);
    $('#mGs').onclick = function () { gantiSandi(false); };
    $('#mTema').onclick = function () { A.tema.set(document.documentElement.getAttribute('data-theme') === 'dark' ? 'terang' : 'gelap'); };
    $('#mAll').onclick = async function () { if (await A.confirm('Keluarkan akun ini dari semua perangkat (termasuk perangkat ini)?', { danger: true, ok: 'Keluarkan semua' })) { await A.api('auth.logoutAll'); A.Sesi.clear(); tampilLogin('Semua sesi dikeluarkan.'); } };
    $('#mOut').onclick = keluar;
    setTimeout(function () { document.addEventListener('click', function tutup() { p.remove(); document.removeEventListener('click', tutup); }); }, 0);
  }
  async function keluar() { if (!await A.confirm('Keluar dari dashboard?', { ok: 'Keluar', icon: 'out' })) return; A.Sesi.clear(); A.swrClear(); location.hash = ''; tampilLogin(); }
  function stopTimers() { ADM.timers.forEach(clearInterval); ADM.timers = []; }
  ADM.rute = function () { const h = (location.hash || '#/dashboard').replace(/^#\/?/, '').split('/'); return { nama: h[0] || 'dashboard', id: decodeURIComponent(h.slice(1).join('/') || '') }; };
  function renderRoute() {
    stopTimers();
    const r = ADM.rute(), v = $('#view'); if (!v) return;
    ADM.cur = r.nama;
    $$('#nav a[data-n]').forEach(function (a) { a.classList.toggle('on', a.dataset.n === r.nama); });
    $('#app').classList.remove('nav-open'); const sc = $('.scrim'); if (sc) sc.remove();
    const m = MENU.filter(function (x) { return x[0] === r.nama; })[0];
    $('#tTitle').textContent = m ? m[2] : r.nama === 'profil' ? 'Profil Saya' : 'Dashboard';
    document.title = ($('#tTitle').textContent) + ' — UjianKu Pro';
    const fn = ADM.pages[r.nama] || ADM.pages.dashboard;
    if (m && m[3] === 'ADMIN' && !ADM.isAdmin()) { v.innerHTML = '<div class="card pad empty">Halaman ini khusus admin.</div>'; return; }
    window.scrollTo(0, 0);
    try { fn(v, r.id); } catch (e) { console.error(e); v.innerHTML = '<div class="card pad empty">Terjadi kesalahan tampilan: ' + esc(e.message) + '</div>'; }
  }
  ADM.render = renderRoute;
  window.addEventListener('hashchange', function () { if (!A.Sesi.token()) return tampilLogin(); if (!$('#view')) return tampilShell(); renderRoute(); });

  // ============================================================================
  // DASHBOARD
  // ============================================================================
  ADM.reg('dashboard', function (v) {
    ADM.loading(v);
    const render = function (d) {
      const k = d.kpi, nama = String(ADM.me.nama || '').split(',')[0];
      v.innerHTML = (d.contoh && ADM.isAdmin() ? '<div class="alert amber" style="margin-bottom:16px">' + ic('info') + '<div class="grow">Aplikasi masih memuat <b>data contoh</b> (siswa, soal, paket). Hapus setelah Anda selesai mencoba.</div><a class="btn sm ghost" href="#/pengaturan">Kelola data contoh</a></div>' : '') +
        '<section class="hero"><div class="row between wrap" style="gap:20px"><div style="max-width:640px"><h2>Selamat datang, ' + esc(nama) + '! 👋</h2><p>' + (ADM.isAdmin() ? 'Pantau seluruh pelaksanaan ujian, kelola pengguna, dan atur standar KKM sekolah dari satu tempat.' : 'Susun bank soal, terbitkan paket ujian, bagikan token, dan pantau siswa secara real-time.') + '</p>' +
        '<div class="row wrap" style="margin-top:20px">' + (ADM.isGuru() ? '<a class="btn white" href="#/paket/baru">' + ic('plus') + 'Buat Paket Ujian</a>' : '<a class="btn white" href="#/rekap">' + ic('chart') + 'Lihat Rekap Nilai</a>') + '<a class="btn" style="background:rgba(255,255,255,.14);color:#fff;border-radius:99px;height:44px" href="#/monitoring">' + ic('monitor') + 'Monitoring Live</a></div></div>' +
        '<div class="row wrap" style="gap:12px"><div class="float" style="position:relative"><span class="chip-ic sm t-green">' + ic('laptop') + '</span><div><div class="k">Sedang Mengerjakan</div><div class="v" style="color:var(--green)">' + k.sesiBerjalan + ' siswa</div></div></div>' +
        '<div class="float" style="position:relative"><span class="chip-ic sm t-blue">' + ic('spark') + '</span><div><div class="k">Rata-rata 30 Hari</div><div class="v" style="color:var(--brand)">' + (k.rata30 === null ? '—' : F.angka(k.rata30)) + '</div></div></div></div></div></section>' +
        '<div class="grid g5" style="margin-top:16px">' + ADM.kpi('Bank Soal', k.soal + ' <small>butir</small>', ADM.isAdmin() ? 'Seluruh guru' : 'Milik Anda', 't-blue', 'book') + ADM.kpi('Paket Aktif', k.paketAktif + ' <small>/ ' + k.paket + '</small>', 'Sedang berlangsung', 't-green', 'layers') +
        ADM.kpi('Sesi Berjalan', k.sesiBerjalan, 'Siswa mengerjakan saat ini', 't-purple', 'monitor') + ADM.kpi('Token Aktif', k.tokenAktif, 'Belum dipakai', 't-amber', 'ticket') +
        ADM.kpi('Ketuntasan 30 Hari', k.lulus30 === null ? '—' : k.lulus30 + '%', k.sesi30 + ' ujian dikumpulkan', 't-rose', 'target') + '</div>' +
        '<div class="grid layout-2-1" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr);margin-top:16px;align-items:start"><div class="stack"><div class="card"><div class="card-h"><div><h3>Ujian Berlangsung &amp; Terjadwal</h3><p>Pantau progres pengerjaan per paket</p></div><a class="btn sm ghost" href="#/paket">Semua paket</a></div><div class="card-b stack-sm">' +
        (d.aktif.length ? d.aktif.map(function (p) {
          const pct = p.peserta ? Math.round(p.selesai / p.peserta * 100) : 0;
          return '<div class="list-item"><div class="date-box t-blue" style="border-color:var(--brand-100)"><small>' + F.bln(p.buka) + '</small><b>' + F.hari(p.buka) + '</b></div><div class="grow"><div class="row wrap" style="gap:8px"><b style="color:var(--ink)">' + esc(p.nama) + '</b>' + ADM.badgeStatus(p.status) + '</div>' +
            '<div class="tiny muted">' + esc(p.mapel) + ' · ' + esc(p.kelas) + ' · ' + F.jam(p.buka) + '–' + F.jam(p.tutup) + ' · <span class="mono">' + esc(p.kode) + '</span></div><div class="row" style="margin-top:7px;gap:10px"><div class="bar grow green"><i style="width:' + pct + '%"></i></div><span class="tiny b">' + p.selesai + '/' + p.peserta + ' selesai' + (p.berjalan ? ' · ' + p.berjalan + ' berjalan' : '') + '</span></div></div>' +
            '<a class="btn sm soft" href="#/monitoring/' + p.id + '">' + ic('monitor', 'sm') + 'Pantau</a></div>';
        }).join('') : '<div class="empty">Tidak ada ujian yang berlangsung atau terjadwal.' + (ADM.isGuru() ? '<div style="margin-top:10px"><a class="btn primary sm" href="#/paket/baru">' + ic('plus', 'sm') + 'Buat paket</a></div>' : '') + '</div>') + '</div></div>' +
        '<div class="card"><div class="card-h"><div><h3>Rata-rata Nilai per Paket</h3><p>8 paket terakhir yang memiliki hasil</p></div></div><div class="card-b">' +
        (d.grafik.length ? A.chart.batang(d.grafik.map(function (g) { return { label: g.kode, v: g.rata, warna: g.lulus >= 75 ? '#1E4FD8' : g.lulus >= 50 ? '#f59e0b' : '#e11d48', ket: g.lulus + '% tuntas' }; }), { h: 170 }) : '<div class="empty">Belum ada hasil ujian.</div>') + '</div></div></div>' +
        '<div class="stack"><div class="card"><div class="card-h"><div><h3>Pengumpulan Terbaru</h3><p>Lembar jawaban yang baru masuk</p></div></div><div class="card-b stack-sm">' +
        (d.terbaru.length ? d.terbaru.map(function (t) { return '<div class="list-item"><div class="avatar sm">' + esc(A.inisial(t.nama)) + '</div><div class="grow"><b class="small" style="color:var(--ink)">' + esc(t.nama) + '</b><div class="tiny muted ellipsis">' + esc(t.paket) + ' · ' + F.relatif(t.waktu) + '</div></div><b style="color:' + (t.lulus ? 'var(--green)' : 'var(--rose)') + '">' + F.angka(t.skor) + '</b></div>'; }).join('') : '<div class="empty small">Belum ada pengumpulan.</div>') + '</div></div>' +
        '<div class="card pad"><h3 style="font-size:14px">Aksi Cepat</h3><div class="grid g2" style="margin-top:12px;gap:10px">' +
        (ADM.isGuru() ? '<a class="btn soft" href="#/bank-soal/baru">' + ic('plus', 'sm') + 'Soal baru</a>' : '<a class="btn soft" href="#/pengguna">' + ic('user', 'sm') + 'Pengguna</a>') + '<a class="btn soft" href="#/token">' + ic('ticket', 'sm') + 'Cetak token</a><a class="btn soft" href="#/siswa">' + ic('users', 'sm') + 'Data siswa</a><a class="btn soft" href="#/dokumen">' + ic('file', 'sm') + 'Dokumen</a></div></div></div></div>';
    };
    A.swr('dash', function () { return A.apiQ('dash.ringkas', {}); }, { maxAge: 20000, render: render, onError: function (r) { v.innerHTML = '<div class="card pad empty">' + esc(r.message) + '</div>'; } });
  });

  // ============================================================================
  // MONITORING REAL-TIME
  // ============================================================================
  ADM.reg('monitoring', function (v, id) {
    const st = { paketId: id || A.LS.get('uk_mon_paket', ''), filter: 'semua', q: '', data: null, busy: false };
    v.innerHTML = '<div id="monH"></div><div id="monB"><div class="skel" style="height:420px"></div></div>';
    const muat = async function (paksa) {
      if (st.busy) return; st.busy = true;
      const ikon = $('#refIc'); if (ikon) ikon.style.animation = 'spin .8s linear infinite';
      const r = await A.api('monitor.live', { paketId: st.paketId }, { quiet: !paksa });
      st.busy = false; if (ikon) ikon.style.animation = '';
      if (!r.success) { if (paksa) A.toast(r.message, 'err'); return; }
      st.data = r.data; if (r.data.paket) { st.paketId = r.data.paket.id; A.LS.set('uk_mon_paket', st.paketId); }
      render();
    };
    const render = function () {
      const d = st.data; if (!d) return;
      if (!d.paket) { $('#monH').innerHTML = ADM.judul('Monitoring Ujian Real-time'); $('#monB').innerHTML = '<div class="card pad empty">Belum ada paket ujian yang diterbitkan.</div>'; return; }
      const p = d.paket, s = d.stats, tot = Math.max(1, s.total);
      $('#monH').innerHTML = '<div class="card" style="background:#0f172a;border-color:#0f172a;color:#cbd5e1;padding:22px 24px;border-radius:22px;margin-bottom:18px;position:relative;overflow:hidden"><svg style="position:absolute;inset:0;width:100%;height:100%;opacity:.08" viewBox="0 0 1000 200" preserveAspectRatio="none"><path d="M0,50 C150,150 350,-50 500,50 C650,150 850,20 1000,70 L1000,200 L0,200 Z" fill="#fff"/></svg>' +
        '<div class="row between wrap" style="gap:18px;position:relative"><div><div class="row wrap" style="gap:8px"><span class="badge live" style="background:rgba(16,185,129,.18);color:#34d399">Live Monitoring Aktif (sinkron 15 dtk)</span><span class="badge mono" style="background:#1e293b;color:#cbd5e1">' + ic('db', 'sm') + 'Kode: ' + esc(p.kode) + '</span></div>' +
        '<h2 style="color:#fff;font-size:26px;margin-top:10px">Monitoring Ujian Real-time</h2><p class="small" style="color:#94a3b8;margin:4px 0 0">' + esc(p.nama) + ' · ' + esc(p.mapel) + ' · ' + esc(p.kelas) + ' · ' + F.tglJam(p.buka) + ' – ' + F.jam(p.tutup) + '</p></div>' +
        '<div class="row wrap" style="gap:10px"><select class="sel" id="mPaket" style="background:#1e293b;color:#e2e8f0;border-color:#334155;min-width:260px">' + d.daftarPaket.map(function (x) { return '<option value="' + x.id + '"' + (x.id === p.id ? ' selected' : '') + '>' + esc(x.nama) + ' (' + esc(x.kode) + ') · ' + x.status + '</option>'; }).join('') + '</select>' +
        '<button class="btn" style="background:#1e293b;color:#e2e8f0" id="mRef"><span id="refIc" style="display:inline-flex">' + ic('refresh', 'sm') + '</span>Refresh</button><button class="btn primary" id="mBc">' + ic('mega', 'sm') + 'Umumkan Pesan</button><button class="btn danger" id="mLock">' + ic('lock', 'sm') + 'Kunci Semua Sesi</button></div></div></div>';
      const kartu = function (lbl, val, sub, tone, ikon, pct, bar, warn) { return '<div class="card kpi" style="' + (warn ? 'background:var(--rose-50);border-color:var(--rose-100)' : '') + '"><div class="blob ' + tone + '"></div><div class="row between top" style="position:relative"><div class="lbl" style="' + (warn ? 'color:var(--rose)' : '') + '">' + lbl + '</div><span class="chip-ic sm ' + tone + '">' + ic(ikon, 'sm') + '</span></div><div class="val" style="position:relative">' + val + ' <small>' + sub + '</small></div><div class="bar ' + bar + '" style="margin-top:10px"><i style="width:' + pct + '%"></i></div></div>'; };
      const rows = d.rows.filter(function (r) {
        const f = st.filter;
        if (f === 'kerja' && ['Mengerjakan', 'Perlu Perhatian', 'Koneksi Terputus'].indexOf(r.status) < 0) return false;
        if (f === 'selesai' && r.status !== 'Selesai') return false;
        if (f === 'belum' && ['Belum Login', 'Sudah Login'].indexOf(r.status) < 0) return false;
        if (f === 'perhatian' && !(r.pel > 0 || r.status === 'Koneksi Terputus')) return false;
        return !st.q || (r.nama + ' ' + r.nis + ' ' + r.pin + ' ' + r.kelas).toLowerCase().indexOf(st.q) > -1;
      });
      const warnaStatus = { 'Mengerjakan': 'blue', 'Perlu Perhatian': 'amber', 'Koneksi Terputus': 'amber', 'Selesai': 'green', 'Sudah Login': 'purple', 'Belum Login': '' };
      $('#monB').innerHTML = '<div class="grid g5">' + kartu('Total Terdaftar', s.total, 'Siswa', 't-blue', 'users', 100, '') + kartu('Mengerjakan', s.mengerjakan, Math.round(s.mengerjakan / tot * 100) + '% aktif', 't-blue', 'laptop', s.mengerjakan / tot * 100, '') +
        kartu('Selesai Dikirim', s.selesai, Math.round(s.selesai / tot * 100) + '%', 't-green', 'checkc', s.selesai / tot * 100, 'green') + kartu('Belum Mulai', s.belum, Math.round(s.belum / tot * 100) + '%', 't-amber', 'hourglass', s.belum / tot * 100, 'amber') +
        kartu('Pelanggaran Terdeteksi', s.pelanggaran, s.pelanggaran ? 'Perlu tindakan' : 'Aman', 't-rose', 'warn', s.pelanggaran ? 100 : 0, 'rose', s.pelanggaran > 0) + '</div>' +
        '<div class="grid layout-8-4" style="grid-template-columns:minmax(0,2.3fr) minmax(0,1fr);margin-top:18px;align-items:start"><div class="stack"><div class="card pad"><div class="chips scroll" id="mTab">' +
        [['semua', 'Semua Siswa', s.total], ['kerja', 'Sedang Mengerjakan', s.mengerjakan], ['selesai', 'Selesai', s.selesai], ['belum', 'Belum Mulai', s.belum], ['perhatian', 'Perlu Perhatian', s.pelanggaran + s.terputus]].map(function (t) { return '<button class="chip ' + (t[0] === 'perhatian' ? 'rose ' : '') + (st.filter === t[0] ? 'on' : '') + '" data-f="' + t[0] + '">' + t[1] + ' <span class="pill-n">' + t[2] + '</span></button>'; }).join('') + '</div>' +
        '<div class="row wrap" style="margin-top:12px"><div class="search grow" style="min-width:220px"><svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input class="inp sm" id="mCari" placeholder="Cari nama, NIS, atau PIN…" value="' + esc(st.q) + '"></div><span class="tag">' + ic('pin', 'sm') + esc(p.kelas) + '</span><span class="tag">Batas pelanggaran: ' + p.maksPel + '</span></div></div>' +
        '<div class="card"><div class="tbl-wrap"><table class="tbl" style="min-width:920px"><thead><tr><th>Siswa</th><th>PIN Token</th><th>Durasi &amp; Sisa</th><th style="width:170px">Progres Soal</th><th>Status</th><th>Log Anti-Cheat</th><th class="right">Aksi Pengawas</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (r) {
          const pct = r.jumlah ? Math.round(r.dijawab / r.jumlah * 100) : 0, jalan = ['Mengerjakan', 'Perlu Perhatian', 'Koneksi Terputus'].indexOf(r.status) > -1;
          return '<tr class="' + (r.pel > 0 && r.status !== 'Selesai' ? 'warn' : r.status === 'Selesai' ? 'ok' : '') + '"><td><div class="row" style="gap:10px"><div class="avatar sm sq" style="background:' + (r.pel > 0 ? '#e11d48' : r.status === 'Selesai' ? '#10b981' : 'var(--brand)') + '">' + esc(A.inisial(r.nama)) + '</div><div><b class="nowrap" style="color:var(--ink)">' + esc(r.nama) + '</b>' + (r.pel > 0 ? ' <span style="color:var(--rose)">●</span>' : '') + '<div class="tiny muted mono nowrap">NIS ' + esc(r.nis) + ' · ' + esc(r.kelas) + '</div></div></div></td>' +
            '<td><span class="tag mono" style="font-size:11.5px">' + esc(r.pin) + '</span></td>' +
            '<td>' + (jalan ? '<b class="mono" style="color:' + (r.sisaMs < 300000 ? 'var(--rose)' : 'var(--ink)') + '">' + ic('timer', 'sm') + ' ' + F.durasi(r.sisaMs) + '</b><div class="tiny muted">Jalan ' + F.menit((d.waktuServer - r.mulai) / 1000) + '</div>' : r.status === 'Selesai' ? '<b class="mono" style="color:var(--green)">' + ic('check', 'sm') + ' ' + F.jam(r.selesai) + '</b><div class="tiny muted">Durasi ' + F.menit((r.selesai - r.mulai) / 1000) + '</div>' : '<span class="tiny muted">' + (r.status === 'Sudah Login' ? 'Login ' + F.relatif(r.lastSeen) : '00:00:00 (idle)') + '</span>') + '</td>' +
            '<td><div class="row between tiny" style="margin-bottom:4px"><b>' + r.dijawab + ' / ' + (r.jumlah || '-') + ' Soal</b><b style="color:var(--brand)">' + pct + '%</b></div><div class="bar ' + (r.status === 'Selesai' ? 'green' : r.koneksi === 'Lambat' ? 'amber' : '') + '"><i style="width:' + pct + '%"></i></div></td>' +
            '<td><span class="badge ' + (warnaStatus[r.status] || '') + ' dot">' + esc(r.status) + '</span>' + (r.status === 'Selesai' && r.skor !== null ? '<div class="tiny b" style="margin-top:3px">Nilai ' + F.angka(r.skor) + '</div>' : '') + '</td>' +
            '<td>' + (r.pel > 0 ? '<span class="badge rose">' + ic('warn', 'sm') + 'Pelanggaran ' + r.pel + '×</span><div class="tiny muted">' + r.log.map(function (l) { return F.jam(l.t); }).join(' · ') + '</div>' : jalan ? '<span class="small" style="color:var(--green)">' + ic('shieldc', 'sm') + ' Aman</span><div class="tiny muted">' + esc(r.koneksi) + ' · ' + F.relatif(r.lastSeen) + '</div>' : '<span class="tiny muted">' + (r.status === 'Selesai' ? esc(r.cara || '') : 'Belum aktif') + '</span>') + '</td>' +
            '<td class="act">' + (jalan ? '<button class="iconbtn amber" data-a="peringatan" data-s="' + r.sesiId + '" data-n="' + esc(r.nama) + '" title="Kirim peringatan">' + ic('chat') + '</button><button class="iconbtn blue" data-a="tambahWaktu" data-s="' + r.sesiId + '" data-n="' + esc(r.nama) + '" title="+10 menit">' + ic('moretime') + '</button><button class="iconbtn rose" data-a="paksaKirim" data-s="' + r.sesiId + '" data-n="' + esc(r.nama) + '" title="Paksa kirim">' + ic('lock') + '</button>' : '') +
            (r.status !== 'Selesai' && r.status !== 'Belum Login' ? '<button class="iconbtn" data-reset="' + r.tokenId + '" data-n="' + esc(r.nama) + '" title="Reset login / perangkat">' + ic('refresh') + '</button>' : '') +
            (r.status === 'Selesai' ? '<button class="btn sm ghost" data-det="' + r.sesiId + '">Detail Jawaban</button>' : '') + '</td></tr>';
        }).join('') : A.tabelKosong(7, 'Tidak ada siswa pada filter ini.', 'users')) + '</tbody></table></div><div class="pager"><div>Menampilkan <b>' + rows.length + '</b> dari <b>' + s.total + '</b> peserta · diperbarui ' + F.jam(d.waktuServer) + ':' + String(new Date(d.waktuServer).getSeconds()).padStart(2, '0') + '</div></div></div>' +
        '<div class="navy-banner row between wrap" style="gap:12px"><div class="row"><span class="chip-ic" style="background:rgba(255,255,255,.1);color:#67e8f9">' + ic('db') + '</span><div><div class="tiny b" style="letter-spacing:.08em;color:#a5f3fc">KONEKSI BACKEND TERJAMIN</div><div class="small" style="color:#cbd5e1">Jawaban siswa tersimpan di cache server tiap ≤30 dtk dan ditulis ke Google Sheets berkala (LockService).</div></div></div><span class="mono small" style="color:#34d399">● Sinkron ' + F.relatif(d.waktuServer) + '</span></div></div>' +
        '<div class="stack"><div class="card pad"><div class="row between"><div class="row">' + ic('stream') + '<b style="color:var(--ink)">Feed Aktivitas Real-time</b></div><span class="badge blue mono">Live Log</span></div><div class="stack-sm" style="margin-top:12px">' +
        (d.feed.length ? d.feed.slice(0, 10).map(function (f) {
          const jenis = { jawab: ['t-blue', 'edit', 'Menjawab soal no. ' + f.i + ' · ' + f.n + ' terjawab'], tab: ['s-rose', 'warn', 'Berpindah tab/aplikasi'], fs: ['s-rose', 'warn', 'Keluar dari layar penuh'], blur: ['s-rose', 'warn', 'Jendela kehilangan fokus'], copy: ['s-rose', 'warn', 'Mencoba menyalin teks'], devtools: ['s-rose', 'warn', 'Membuka alat pengembang'], selesai: ['s-green', 'checkc', 'Menyelesaikan ujian (' + (f.cara || '') + ')'], mulai: ['t-purple', 'play', 'Memulai ujian'], online: ['t-green', 'wifi', 'Kembali online'], offline: ['t-amber', 'wifioff', 'Koneksi terputus'] }[f.e] || ['t-slate', 'info', f.e];
          return '<div class="list-item" style="align-items:flex-start;' + (jenis[0] === 's-rose' ? 'background:var(--rose-50);border-color:var(--rose-100)' : '') + '"><span class="chip-ic sm ' + jenis[0] + '" style="width:28px;height:28px">' + ic(jenis[1], 'sm') + '</span><div class="grow"><div class="row between"><b class="small ellipsis" style="color:var(--ink)">' + esc(f.nama) + '</b><span class="tiny mono muted">' + F.jam(f.t) + ':' + String(new Date(f.t).getSeconds()).padStart(2, '0') + '</span></div><div class="tiny muted">' + esc(jenis[2]) + '</div></div></div>';
        }).join('') : '<div class="empty small">Belum ada aktivitas.</div>') + '</div></div>' +
        '<div class="card pad"><div class="row between"><b style="color:var(--ink)">Analisis Kecepatan Pengerjaan</b>' + ic('speed') + '</div><div class="row between small" style="margin-top:14px"><span class="muted">Rata-rata waktu / soal</span><b class="mono">' + F.menit(s.rataDetikPerSoal) + '</b></div><div class="bar" style="margin-top:6px"><i style="width:' + Math.min(100, s.rataDetikPerSoal / Math.max(1, p.durasi * 60 / Math.max(1, (d.rows[0] || {}).jumlah || 20)) * 100) + '%"></i></div>' +
        '<div class="row" style="gap:16px;margin-top:16px;background:var(--soft);padding:12px;border-radius:12px">' + A.chart.donat([{ v: s.mengerjakan, warna: '#1E4FD8' }, { v: s.selesai, warna: '#10b981' }, { v: s.belum, warna: '#f59e0b' }], { size: 84, tengah: '<b class="small">' + Math.round((s.mengerjakan + s.selesai) / tot * 100) + '%</b>' }) +
        '<div class="legend grow"><div class="li"><span><span class="sw" style="background:#1E4FD8"></span>Mengerjakan</span><b>' + s.mengerjakan + '</b></div><div class="li"><span><span class="sw" style="background:#10b981"></span>Selesai</span><b>' + s.selesai + '</b></div><div class="li"><span><span class="sw" style="background:#f59e0b"></span>Belum</span><b>' + s.belum + '</b></div></div></div></div>' +
        '<div class="card pad" style="background:linear-gradient(135deg,var(--brand-50),var(--purple-50))"><div class="row"><div class="avatar sq" style="width:46px;height:46px">' + esc(A.inisial(d.pengawas.nama)) + '</div><div><span class="badge blue" style="height:18px;font-size:9.5px">PENGAWAS AKTIF</span><div class="small b" style="color:var(--ink);margin-top:3px">' + esc(d.pengawas.nama) + '</div>' + (d.pengawas.nip ? '<div class="tiny muted">NIP. ' + esc(d.pengawas.nip) + '</div>' : '') + '</div></div>' +
        (d.siaran ? '<div class="alert blue" style="margin-top:12px">' + ic('mega', 'sm') + '<div class="small">Siaran terakhir (' + F.jam(d.siaran.t) + '): ' + esc(d.siaran.pesan) + '</div></div>' : '') + '</div></div></div>';
      $('#mPaket').onchange = function () { st.paketId = this.value; st.data = null; $('#monB').innerHTML = '<div class="skel" style="height:420px"></div>'; muat(true); };
      $('#mRef').onclick = function () { muat(true); };
      $('#mBc').onclick = siaran;
      $('#mLock').onclick = kunciSemua;
      $$('#mTab [data-f]').forEach(function (b) { b.onclick = function () { st.filter = b.dataset.f; render(); }; });
      $('#mCari').oninput = A.debounce(function (e) { st.q = e.target.value.toLowerCase(); render(); const i = $('#mCari'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250);
      $$('[data-a]', v).forEach(function (b) { b.onclick = function () { aksiSesi(b.dataset.a, b.dataset.s, b.dataset.n); }; });
      $$('[data-reset]', v).forEach(function (b) { b.onclick = async function () { if (!await A.confirm('Reset login <b>' + esc(b.dataset.n) + '</b>? Sesi di perangkat lama dikeluarkan; siswa bisa melanjutkan ujian dari perangkat baru dengan token yang sama.', { ok: 'Reset login', icon: 'refresh' })) return; const r = await A.api('token.aksi', { aksi: 'resetPerangkat', ids: [b.dataset.reset] }); A.hasil(r); muat(); }; });
      $$('[data-det]', v).forEach(function (b) { b.onclick = function () { ADM.detailSesi(b.dataset.det); }; });
    };
    const aksiSesi = async function (aksi, sesiId, nama) {
      let data = { paketId: st.paketId, aksi: aksi, sesiIds: [sesiId] };
      if (aksi === 'peringatan') { const p = await A.prompt('Peringatan untuk ' + nama, { label: 'Pesan yang tampil di layar siswa', nilai: 'Fokus pada lembar ujian Anda. Aktivitas mencurigakan tercatat.', area: true, ok: 'Kirim peringatan', icon: 'chat' }); if (p === null) return; data.pesan = p; }
      else if (aksi === 'tambahWaktu') { const m = await A.prompt('Tambah waktu untuk ' + nama, { label: 'Menit tambahan', nilai: '10', type: 'number', attr: 'min="1" max="120"', ok: 'Tambahkan', icon: 'moretime' }); if (m === null) return; data.menit = Number(m); }
      else if (!await A.confirm('Paksa kirim lembar jawaban <b>' + esc(nama) + '</b>? Sesi ditutup dan dinilai dengan jawaban terakhir.', { danger: true, ok: 'Paksa kirim' })) return;
      const r = await A.api('monitor.aksi', data); A.hasil(r); muat();
    };
    const siaran = function () {
      A.modal({ title: 'Umumkan Pesan ke Siswa', sub: 'Pesan muncul di layar siswa tanpa memuat ulang halaman (≤30 detik).', icon: 'mega',
        body: '<div class="field"><label>Isi pesan siaran</label><textarea class="ta" id="bcT" rows="3" placeholder="Contoh: Waktu tersisa 15 menit, periksa kembali jawaban nomor 1–20…"></textarea></div><div class="alert amber" style="margin-top:12px">' + ic('info') + '<div>Dikirim ke semua peserta paket ini yang sedang mengerjakan.</div></div>',
        actions: [{ label: 'Batal' }, { label: 'Kirim Siaran Sekarang', cls: 'primary', icon: 'send', onClick: async function (b, bg) { const t = $('#bcT', bg).value.trim(); if (!t) { A.toast('Tulis pesan terlebih dahulu.', 'warn'); return false; } const r = await A.api('monitor.aksi', { paketId: st.paketId, aksi: 'siaran', pesan: t }); if (!A.hasil(r)) return false; muat(); } }] });
    };
    const kunciSemua = async function () {
      if (!await A.confirm('<b>PERINGATAN:</b> kunci & kirim semua sesi yang sedang berjalan pada paket ini? Seluruh peserta dihentikan dan dinilai dengan jawaban terakhir.', { danger: true, ok: 'Kunci semua sesi', ketik: 'KUNCI' })) return;
      const r = await A.api('monitor.aksi', { paketId: st.paketId, aksi: 'kunciSemua' }, { timeout: 120000 }); A.hasil(r); muat(true);
    };
    muat(true);
    ADM.every(function () { if (A.Activity.due('mon', 15000, 60000)) muat(); }, 2000);
  });

  /** Drawer detail jawaban satu siswa (dipakai monitoring & rekap). */
  ADM.detailSesi = async function (sesiId) {
    const dr = A.drawer({ title: 'Detail Jawaban Siswa', size: 'lg', body: '<div class="skel" style="height:300px"></div>' });
    const r = await A.api('rekap.sesi', { sesiId: sesiId });
    if (!r.success) { dr.body.innerHTML = '<div class="empty">' + esc(r.message) + '</div>'; return; }
    const d = r.data;
    dr.el.querySelector('h3').textContent = (d.siswa.nama || 'Siswa') + (d.paket ? ' — ' + d.paket.nama : '');
    if (d.status !== 'Selesai') { dr.body.innerHTML = '<div class="alert blue">' + ic('info') + '<div>Sesi berstatus <b>' + esc(d.status) + '</b> — rincian jawaban tersedia setelah lembar jawaban dikirim. Pelanggaran tercatat: ' + (d.pelanggaran || 0) + '.</div></div>'; return; }
    dr.body.innerHTML = '<div class="grid g4 keep2">' + [['Nilai', F.angka(d.skor), d.lulus ? 'green' : 'rose'], ['Benar', d.benar, 'green'], ['Salah', d.salah, 'rose'], ['Kosong', d.kosong, '']].map(function (x) { return '<div class="card soft" style="padding:12px"><div class="tiny muted">' + x[0] + '</div><div class="xb" style="font-size:22px;color:var(--ink)">' + x[1] + '</div></div>'; }).join('') + '</div>' +
      '<div class="small muted" style="margin:12px 0">NIS ' + esc(d.siswa.nis) + ' · ' + esc(d.siswa.kelas) + ' · mulai ' + F.tglJam(d.mulai) + ' · selesai ' + F.tglJam(d.selesai) + ' · ' + esc(d.cara || '') + (d.tambahan ? ' · +' + d.tambahan + ' menit' : '') + (d.pelanggaran ? ' · <b style="color:var(--rose)">' + d.pelanggaran + ' pelanggaran</b>' : '') + '</div>' +
      (d.log.length ? '<div class="alert rose">' + ic('warn') + '<div>Log pelanggaran: ' + d.log.map(function (l) { return F.jam(l.t) + ' (' + esc(l.e) + ')'; }).join(', ') + '</div></div>' : '') +
      '<div class="stack-sm" style="margin-top:12px">' + d.butir.map(function (b) { return '<div class="card" style="padding:14px"><div class="row between"><b>#' + b.no + ' · ' + esc(b.topik || '') + '</b>' + (b.status === 'Benar' ? '<span class="badge green">Benar</span>' : b.status === 'Salah' ? '<span class="badge rose">Salah</span>' : '<span class="badge">Kosong</span>') + '</div><div class="small" style="margin:8px 0;color:var(--ink)">' + A.soalHtml(String(b.teks).slice(0, 400)) + '</div><div class="row wrap tiny"><span class="tag">Dipilih: ' + esc(b.pilihan || '—') + '</span><span class="tag" style="color:var(--green)">Kunci: ' + esc(b.kunci) + '</span>' + (b.ragu ? '<span class="tag">Ragu</span>' : '') + '</div></div>'; }).join('') + '</div>';
    A.renderMath(dr.body);
  };

  // ============================================================================
  // PROFIL
  // ============================================================================
  ADM.reg('profil', function (v) {
    const m = ADM.me;
    v.innerHTML = ADM.judul('Profil Saya', 'Akun dashboard Anda.') + '<div class="grid g2"><div class="card pad-lg"><div class="row" style="gap:16px"><div class="avatar lg">' + esc(A.inisial(m.nama)) + '</div><div><h3>' + esc(m.nama) + '</h3><div class="small muted">@' + esc(m.username) + ' · ' + esc(m.role) + '</div></div></div><div class="sep"></div>' +
      [['Mata pelajaran', (m.mapel || []).join(', ') || '-'], ['Kelas diampu', (m.kelas || []).join(', ') || (m.role === 'ADMIN' ? 'Semua kelas' : '-')], ['Email', m.email || '-'], ['NIP', m.nip || '-']].map(function (r) { return '<div class="row between small" style="padding:8px 0;border-bottom:1px solid var(--line-2)"><span class="muted">' + r[0] + '</span><b style="color:var(--ink)">' + esc(r[1]) + '</b></div>'; }).join('') +
      '<div class="row wrap" style="margin-top:16px"><button class="btn primary" id="pGs">' + ic('key') + 'Ganti kata sandi</button><button class="btn ghost" id="pAll">' + ic('shield') + 'Keluar semua perangkat</button></div></div>' +
      '<div class="stack"><div class="card pad-lg"><h3 style="font-size:15px">PIN Penandatanganan</h3><p class="small muted">Dibutuhkan bila akun Anda ditautkan sebagai pejabat penanda tangan dokumen (mis. kepala sekolah). PIN 6 angka disimpan sebagai hash.</p><a class="btn soft" href="#/dokumen/pin">' + ic('pen') + 'Atur PIN Saya</a></div>' +
      '<div class="card pad-lg"><h3 style="font-size:15px">Tampilan</h3><div class="seg" id="pTema" style="margin-top:10px">' + [['terang', 'Terang'], ['gelap', 'Gelap'], ['sistem', 'Ikuti sistem']].map(function (t) { return '<button data-t="' + t[0] + '" class="' + (A.LS.get('uk_tema', 'terang') === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><p class="tiny muted" style="margin-bottom:0">Ketik <span class="kbd">Perf.table()</span> di Console untuk melihat waktu respons server.</p></div></div></div>';
    $('#pGs').onclick = function () { gantiSandi(false); };
    $('#pAll').onclick = async function () { if (await A.confirm('Keluarkan akun ini dari semua perangkat?', { danger: true })) { await A.api('auth.logoutAll'); A.Sesi.clear(); tampilLogin('Semua sesi dikeluarkan.'); } };
    $$('#pTema button').forEach(function (b) { b.onclick = function () { A.tema.set(b.dataset.t); ADM.render(); }; });
  });

  // ============================================================================
  // MULAI
  // ============================================================================
  // Mulai SETELAH semua modul (defer) mendaftarkan halamannya.
  let dimulai = false;
  function mulai() { if (dimulai) return; dimulai = true; if (!A.Sesi.token()) tampilLogin(); else tampilShell(); }
  if (document.readyState === 'complete') setTimeout(mulai, 0);
  else { document.addEventListener('DOMContentLoaded', function () { setTimeout(mulai, 0); }); window.addEventListener('load', mulai); }
})();
