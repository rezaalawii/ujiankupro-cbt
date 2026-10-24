/* ============================================================================
   UjianKu Pro — Portal Siswa (index.html)
   Login Token PIN · Dashboard · Ruang ujian · Hasil · Pembahasan · Riwayat
   ============================================================================ */
(function () {
  'use strict';
  const A = window.App, $ = A.$, $$ = A.$$, esc = A.esc, ic = A.icon, F = A.fmt;
  A.Sesi.scope = 'siswa';
  const root = document.getElementById('root');
  const S = { home: null, shell: false, ex: null, timers: [] };

  A.onAuthFail = function () {
    if (S.ex) return; // saat ujian, jangan lempar keluar — jawaban tetap tersimpan lokal
    A.Sesi.clear(); A.swrClear(); A.toast('Sesi berakhir. Masukkan Token PIN kembali.', 'warn'); tampilLogin();
  };
  A.bannerKonfig();
  A.bootPublik(function () { if (S.shell) $('#ft') && ($('#ft').innerHTML = A.footerHtml()); });

  // ============================================================================
  // LOGIN TOKEN PIN
  // ============================================================================
  function tampilLogin(pesan) {
    S.shell = false; stopTimers();
    document.body.classList.remove('has-bnav');
    const pinHash = (location.hash.match(/pin=([A-Za-z0-9]{6})/) || [])[1] || '';
    root.innerHTML = '<div class="login-bg"><div class="login-top"><div class="brand"><div class="logo" data-brand="logo">' + A.logoSvg + '</div><div><div class="nm"><span data-brand="nama">UjianKu</span><span class="pro">PRO</span></div><div class="sub">CBT Google Apps Script Edition</div></div></div>' +
      '<div class="row wrap"><span class="pill-dark"><span class="gdot" id="srvDot"></span><span class="mono" id="srvTxt">Menghubungi server…</span></span><a class="pill-dark" href="admin.html">' + ic('shield') + 'Portal Guru &amp; Admin</a></div></div>' +
      '<div class="login-card"><div class="topline"></div><div class="in"><div class="center"><span class="badge blue" style="height:32px;padding:0 14px;font-size:13px;border:1px solid var(--brand-100)">' + ic('key', 'sm') + 'Autentikasi Siswa Mandiri</span></div>' +
      '<h2 style="margin-top:16px">Masuk dengan Token PIN</h2><p class="lead">Masukkan 6 karakter token ujian yang tercantum pada lembar PIN atau diberikan oleh pengawas ujian Anda.</p>' +
      '<div class="alert amber" style="margin-bottom:20px">' + ic('shield') + '<div><b>Perhatian Ujian:</b> Satu token hanya dapat digunakan untuk 1 kali sesi tes. Pastikan Anda berada di ruang ujian sebelum menekan tombol masuk.</div></div>' +
      '<form id="fPin" autocomplete="off"><div class="row between" style="margin-bottom:8px"><span class="lbl-f" style="letter-spacing:.06em">' + ic('key', 'sm') + ' TOKEN PIN PESERTA (6 KARAKTER)</span><span class="tiny muted">Contoh: X9F4K2</span></div>' +
      '<div style="position:relative"><input id="pin" class="pin-input" maxlength="6" inputmode="text" autocapitalize="characters" spellcheck="false" value="' + esc(pinHash) + '" aria-label="Token PIN"></div>' +
      '<div class="row between small" style="margin:10px 2px 18px"><span id="pinOk" class="muted">' + ic('info', 'sm') + ' Huruf besar/kecil tidak dibedakan</span><span class="muted" id="pinGagal"></span></div>' +
      '<button class="btn grad block" id="bMasuk" type="submit">Mulai Validasi &amp; Masuk Ujian ' + ic('right', 'lg') + '</button></form>' +
      (pesan ? '<div class="alert rose" style="margin-top:14px">' + ic('warn') + '<div>' + esc(pesan) + '</div></div>' : '') +
      '<div class="row" style="margin:22px 0 12px"><div class="sep grow" style="margin:0"></div><span class="tiny b muted" style="letter-spacing:.1em">PUSAT BANTUAN SISWA</span><div class="sep grow" style="margin:0"></div></div>' +
      '<div class="grid g2"><div class="help-tile" id="hTok"><b>' + ic('info', 'sm') + ' Token Tidak Valid?</b><span>Hubungi pengawas ruang ujian</span></div><div class="help-tile" id="hDev"><b>' + ic('laptop', 'sm') + ' Cek Perangkat</b><span>Uji peramban &amp; koneksi</span></div></div></div>' +
      '<div class="login-foot"><span>' + ic('lock', 'sm') + ' Sesi terenkripsi HMAC · kunci jawaban hanya di server</span><span class="mono">v' + A.versi + '</span></div></div>' +
      '<p class="center small" style="color:#94a3b8;margin:22px 0 30px">' + ic('info', 'sm') + ' PIN bersifat <b style="color:#fff">tidak peka huruf besar/kecil</b>. <span data-brand="lembaga"></span></p></div>';
    A.brand(A.setting);
    A.warmUp('pub');
    const inp = $('#pin'), ok = $('#pinOk');
    const cekFormat = function () {
      inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      inp.classList.remove('err');
      ok.innerHTML = inp.value.length === 6 ? '<span style="color:var(--green)">' + ic('checkc', 'sm') + ' Format 6 karakter terpenuhi</span>' : ic('info', 'sm') + ' ' + inp.value.length + '/6 karakter';
    };
    inp.addEventListener('input', cekFormat); cekFormat(); setTimeout(function () { inp.focus(); }, 50);
    $('#fPin').onsubmit = async function (e) {
      e.preventDefault();
      if (inp.value.length !== 6) { inp.classList.add('err'); A.toast('Token PIN harus 6 karakter.', 'warn'); return; }
      const b = $('#bMasuk'); A.busy(b, true, 'Memvalidasi token…');
      const r = await A.api('auth.pin', { pin: inp.value }, { noToken: true, retry: 1 });
      A.busy(b, false);
      if (!r.success) {
        inp.classList.add('err');
        if (r.gagal) $('#pinGagal').innerHTML = 'Percobaan gagal: <b>' + r.gagal + '/' + r.maks + '</b>';
        A.toast(r.message, 'err');
        return;
      }
      A.Sesi.set(r.data.token, { siswa: r.data.siswa, paket: r.data.paket, mode: r.data.mode }, r.data.exp);
      history.replaceState(null, '', location.pathname + '#/dashboard');
      tampilShell();
    };
    $('#hTok').onclick = function () { A.modal({ title: 'Token tidak valid?', icon: 'info', size: 'sm', body: '<ul style="margin:0;padding-left:18px;line-height:1.8"><li>Periksa kembali 6 karakter (tidak ada huruf O/I atau angka 0/1).</li><li>Token hanya berlaku untuk paket & jadwal tertentu.</li><li>Token yang sudah dipakai hanya bisa membuka hasil.</li><li>Ganti perangkat? Minta pengawas menekan <b>Reset Login</b>.</li></ul>', actions: [{ label: 'Mengerti', cls: 'primary' }] }); };
    $('#hDev').onclick = cekPerangkat;
    cekServer();
  }
  async function cekServer() {
    const t0 = performance.now(), r = await A.api('ping', {}, { noToken: true, retry: 0, timeout: 15000 });
    const dot = $('#srvDot'), tx = $('#srvTxt'); if (!dot) return;
    if (r.success) { tx.textContent = 'Server online · ' + Math.round(performance.now() - t0) + ' ms'; }
    else { dot.style.background = '#e11d48'; tx.textContent = A.konfigOk ? 'Server belum terjangkau' : 'Konfigurasi belum lengkap'; }
  }
  async function cekPerangkat() {
    const m = A.modal({ title: 'Cek Perangkat', icon: 'laptop', body: '<div id="cpIsi" class="stack-sm"><div class="skel" style="height:120px"></div></div>', actions: [{ label: 'Tutup', cls: 'primary' }] });
    const t0 = performance.now(), r = await A.api('ping', {}, { noToken: true, retry: 0, timeout: 15000 }), ms = Math.round(performance.now() - t0);
    const baris = [
      ['Koneksi internet', navigator.onLine !== false, navigator.onLine !== false ? 'Online' : 'Offline'],
      ['Server ujian', r.success, r.success ? 'Terhubung (' + ms + ' ms)' : 'Tidak terjangkau'],
      ['Mode layar penuh', !!document.documentElement.requestFullscreen, document.documentElement.requestFullscreen ? 'Didukung' : 'Tidak didukung (tetap bisa ujian)'],
      ['Penyimpanan lokal', (function () { try { localStorage.setItem('t', '1'); localStorage.removeItem('t'); return true; } catch (e) { return false; } })(), 'Cadangan jawaban saat offline'],
      ['Ukuran layar', window.innerWidth >= 340, window.innerWidth + ' × ' + window.innerHeight + ' px']];
    m.body.innerHTML = baris.map(function (b) { return '<div class="list-item"><span class="chip-ic sm ' + (b[1] ? 't-green' : 't-rose') + '">' + ic(b[1] ? 'check' : 'x') + '</span><div class="grow"><b class="small">' + b[0] + '</b><div class="tiny muted">' + esc(b[2]) + '</div></div></div>'; }).join('');
  }

  // ============================================================================
  // SHELL (sidebar, header, footer, bottom-nav)
  // ============================================================================
  const MENU = [
    ['dashboard', 'home', 'Dashboard'], ['ujian', 'edit', 'Mulai Ujian'], ['live', 'bolt', 'Ujian Langsung'], ['riwayat', 'clock', 'Riwayat Ujian'],
    ['nilai', 'checkc', 'Nilai & Hasil'], ['analitik', 'chart', 'Analitik', 'analitik'], ['materi', 'book', 'Materi Belajar', 'materi'], ['profil', 'user', 'Profil Siswa'], ['pengaturan', 'cog', 'Pengaturan']];
  function me() { const d = A.Sesi.data(); return d ? d.me : {}; }
  function tampilShell() {
    S.shell = true; document.body.classList.add('has-bnav');
    const sw = (me().siswa || {});
    root.innerHTML = '<div class="app" id="app"><aside class="sidebar" id="sb"><div class="brand"><div class="logo" data-brand="logo">' + A.logoSvg + '</div><div><div class="nm"><span data-brand="nama">UjianKu</span><span class="pro">PRO</span></div><div class="sub">CBT Google Apps Script</div></div></div>' +
      '<nav class="nav" id="nav"></nav><div class="motiv"><div style="color:var(--brand)">' + ic('cap', 'xl') + '</div><b id="motJ">Siap. Berlatih. Berprestasi.</b><span id="motT">Ujian jujur kunci kesuksesan siswa sejati.</span></div></aside>' +
      '<div class="main"><header class="topbar"><button class="iconbtn hb" id="hb" aria-label="Menu">' + ic('menu') + '</button><div class="grow"><h1 class="row" style="gap:8px">Portal Ujian Online <span class="small sb" style="color:var(--brand)" data-brand="nama">UjianKu Pro</span></h1><div class="tl" id="tagline">Ujian Cerdas, Masa Depan Hebat</div></div>' +
      '<div class="search"><svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input class="inp" id="cari" placeholder="Cari ujian, mata pelajaran, atau jadwal…"></div>' +
      '<button class="iconbtn bell" id="bBell" aria-label="Pengumuman">' + ic('bell') + '<span class="cnt hidden" id="nBell"></span></button>' +
      '<div class="me" id="meBtn"><div class="avatar">' + esc(A.inisial(sw.nama)) + '</div><div class="who"><b>Hai, ' + esc(String(sw.nama || '').split(' ')[0]) + '</b><span>Siswa ' + esc(sw.kelas || '') + '</span></div>' + ic('cdown', 'sm') + '</div></header>' +
      '<main class="content" id="view"></main><footer class="footer" id="ft"></footer></div></div>' +
      '<nav class="bnav" id="bnav"><a href="#/dashboard" data-r="dashboard">' + ic('home') + 'Beranda</a><a href="#/ujian" data-r="ujian">' + ic('edit') + 'Ujian</a><a href="#/nilai" data-r="nilai">' + ic('checkc') + 'Hasil</a><a href="#/profil" data-r="profil">' + ic('user') + 'Profil</a></nav>';
    $('#ft').innerHTML = A.footerHtml();
    A.brand(A.setting);
    const s = A.setting || {};
    if (s.TAGLINE) $('#tagline').textContent = s.TAGLINE;
    if (s.MOTIVASI_JUDUL) $('#motJ').textContent = s.MOTIVASI_JUDUL;
    if (s.MOTIVASI_TEKS) $('#motT').textContent = s.MOTIVASI_TEKS;
    $('#hb').onclick = function () { $('#app').classList.toggle('nav-open'); toggleScrim(); };
    $('#meBtn').onclick = menuSaya;
    $('#bBell').onclick = popPengumuman;
    $('#cari').addEventListener('input', A.debounce(function () { if (location.hash !== '#/riwayat') location.hash = '#/riwayat'; else renderRoute(); }, 300));
    renderNav();
    muatHome().then(function () { renderRoute(); });
    renderRoute();
  }
  function toggleScrim() {
    let sc = $('.scrim');
    if ($('#app').classList.contains('nav-open')) { if (!sc) { sc = document.createElement('div'); sc.className = 'scrim'; sc.onclick = function () { $('#app').classList.remove('nav-open'); sc.remove(); }; document.body.appendChild(sc); } }
    else if (sc) sc.remove();
  }
  function renderNav() {
    const h = S.home, fitur = h ? h.fitur : { materi: true, analitik: true }, cur = rute().nama;
    const live = h && h.mendatang.some(function (x) { return x.status === 'Berlangsung'; });
    $('#nav').innerHTML = MENU.filter(function (m) { return !m[3] || fitur[m[3]]; }).map(function (m) {
      return '<a href="#/' + m[0] + '" class="' + (cur === m[0] ? 'on' : '') + '">' + ic(m[1]) + '<span>' + m[2] + '</span>' + (m[0] === 'live' && live ? '<span class="badge live">LIVE</span>' : '') + '</a>';
    }).join('') + '<a href="#" class="out" id="bOut">' + ic('out') + '<span>Keluar</span></a>';
    $('#bOut').onclick = function (e) { e.preventDefault(); keluar(); };
    $$('#bnav a').forEach(function (a) { a.classList.toggle('on', a.dataset.r === cur); });
  }
  function menuSaya(e) {
    e.stopPropagation();
    let p = $('#mePop'); if (p) { p.remove(); return; }
    const sw = me().siswa || {};
    p = document.createElement('div'); p.className = 'menu-pop'; p.id = 'mePop';
    p.innerHTML = '<div style="padding:8px 11px 10px"><b class="small">' + esc(sw.nama) + '</b><div class="tiny muted">NIS ' + esc(sw.nis || '-') + ' · ' + esc(sw.kelas || '') + '</div></div><div class="sep" style="margin:4px 0"></div>' +
      '<a href="#/profil">' + ic('user') + 'Profil Siswa</a><a href="#/pengaturan">' + ic('cog') + 'Pengaturan</a><button id="mOut">' + ic('out') + 'Keluar</button>';
    $('#meBtn').appendChild(p);
    $('#mOut').onclick = keluar;
    setTimeout(function () { document.addEventListener('click', function tutup() { p.remove(); document.removeEventListener('click', tutup); }); }, 0);
  }
  function popPengumuman() {
    const list = (S.home && S.home.pengumuman) || [];
    A.modal({ title: 'Pengumuman Resmi', icon: 'mega', body: list.length ? list.map(function (a) { return '<div class="list-item" style="align-items:flex-start;margin-bottom:10px"><span class="chip-ic sm t-blue">' + ic('mega', 'sm') + '</span><div><b class="small">' + esc(a.judul) + '</b><div class="small muted" style="margin-top:3px;white-space:pre-line">' + esc(a.isi) + '</div><div class="tiny muted-2" style="margin-top:4px">' + F.tglJam(a.tanggal) + '</div></div></div>'; }).join('') : '<div class="empty">Belum ada pengumuman.</div>', actions: [{ label: 'Tutup', cls: 'primary' }] });
    A.LS.set('uk_bell_lihat', list.length ? list[0].id : '');
    $('#nBell').classList.add('hidden');
  }
  async function keluar() {
    if (!await A.confirm('Keluar dari portal ujian? Anda bisa masuk lagi dengan token yang sama untuk melihat hasil.', { ok: 'Keluar', icon: 'out' })) return;
    A.Sesi.clear(); A.swrClear(); location.hash = ''; tampilLogin();
  }
  function muatHome(force) {
    return A.swr('home', function () { return A.api('s.home'); }, { maxAge: force ? 0 : 20000, force: force,
      render: function (d) {
        S.home = d; renderNav();
        const lihat = A.LS.get('uk_bell_lihat', ''), n = d.pengumuman.length && d.pengumuman[0].id !== lihat ? d.pengumuman.length : 0;
        const nb = $('#nBell'); if (nb) { nb.textContent = n; nb.classList.toggle('hidden', !n); }
        if (S.shell && !S.ex && ['dashboard', 'ujian', 'live', 'riwayat', 'nilai', 'analitik', 'profil'].indexOf(rute().nama) > -1) renderRoute();
      },
      onError: function (r) { if (r && r.code !== 'AUTH') A.toast(r.message || 'Gagal memuat data.', 'err'); } });
  }

  // ============================================================================
  // ROUTER
  // ============================================================================
  function rute() { const h = (location.hash || '#/dashboard').replace(/^#\/?/, '').split('/'); return { nama: h[0] || 'dashboard', id: h[1] || '' }; }
  window.addEventListener('hashchange', function () { if (S.ex) return; if (!A.Sesi.token()) return tampilLogin(); if (!S.shell) return tampilShell(); renderRoute(); });
  function renderRoute() {
    stopTimers();
    const r = rute(), v = $('#view'); if (!v) return;
    renderNav();
    $('#app') && $('#app').classList.remove('nav-open'); const sc = $('.scrim'); if (sc) sc.remove();
    window.scrollTo(0, 0);
    const fn = { dashboard: pgDashboard, ujian: pgUjian, live: pgLive, riwayat: pgRiwayat, nilai: pgNilai, hasil: pgHasil, pembahasan: pgPembahasan, analitik: pgAnalitik, materi: pgMateri, profil: pgProfil, pengaturan: pgPengaturan }[r.nama] || pgDashboard;
    fn(v, r.id);
  }
  function stopTimers() { S.timers.forEach(clearInterval); S.timers = []; }
  function every(fn, ms) { fn(); S.timers.push(setInterval(fn, ms)); }
  function loading(v) { v.innerHTML = '<div class="grid g4"><div class="skel" style="height:120px"></div><div class="skel" style="height:120px"></div><div class="skel" style="height:120px"></div><div class="skel" style="height:120px"></div></div><div class="skel" style="height:280px;margin-top:16px"></div>'; }
  function judul(t, sub, kanan, crumb) { return '<div class="page-h"><div>' + (crumb ? '<div class="crumb">' + crumb + '</div>' : '') + '<h2>' + t + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (kanan ? '<div class="row wrap">' + kanan + '</div>' : '') + '</div>'; }

  // ============================================================================
  // DASHBOARD
  // ============================================================================
  function pgDashboard(v) {
    const d = S.home; if (!d) return loading(v);
    const sw = d.siswa, p = d.paket, st = d.statistik, s = d.sesi;
    const nilaiAkhir = d.riwayat.find(function (x) { return x.tampil; });
    const cta = s && s.status === 'Berjalan' ? ['Lanjutkan Ujian', 'play'] : p && p.status === 'Berlangsung' && p.tokenStatus === 'Aktif' && !s ? ['Mulai Ujian Baru', 'right'] : ['Lihat Jadwal Ujian', 'cal'];
    const delta = function (x) { return x === null || x === undefined ? '<span class="muted-2">— vs bln lalu</span>' : '<span class="' + (x >= 0 ? 'up' : 'down') + '">' + (x >= 0 ? '↑ ' : '↓ ') + Math.abs(x) + '%</span> <span class="muted-2">vs bln lalu</span>'; };
    const warna = ['#1E4FD8', '#10b981', '#f59e0b', '#7c3aed', '#06b6d4', '#e11d48'];
    v.innerHTML =
      '<section class="hero"><div class="row between" style="gap:24px;align-items:center"><div style="max-width:620px"><h2>Selamat Datang Kembali, ' + esc(sw.nama) + '! 👋</h2>' +
      '<p>Siap menguji pemahamanmu hari ini? Mulai ujianmu sekarang dan pantau perkembangan nilaimu secara real-time.</p>' +
      '<div style="margin-top:22px"><a class="btn white" href="#/ujian">' + ic(cta[1]) + cta[0] + '</a></div></div>' +
      '<div class="hero-vis"><div class="frame">' + ilustrasi() + '</div>' +
      '<div class="float" style="left:-6px;top:-2px"><span class="chip-ic sm t-blue">' + ic('clock') + '</span><div><div class="k">' + (s && s.status === 'Berjalan' ? 'Sisa Waktu' : p && p.status === 'Terjadwal' ? 'Dibuka Dalam' : 'Durasi Ujian') + '</div><div class="v mono" id="heroT" style="color:var(--brand)">' + (p ? p.durasi + ' menit' : '-') + '</div><div class="tiny muted">' + esc(p ? p.nama : '') + '</div></div></div>' +
      '<div class="float" style="right:-12px;bottom:-8px"><span class="chip-ic sm t-green">' + ic('checkc') + '</span><div><div class="k">Nilai Terakhir</div><div class="v" style="color:var(--green)">' + (nilaiAkhir ? F.angka(nilaiAkhir.skor) : '—') + '</div></div></div></div></div></section>' +
      '<section class="grid g4" style="margin-top:18px">' +
      kartuAksi('blue', 'edit', 'Mulai Ujian', 'Kerjakan Ujian Terjadwal', 'primary', 'Mulai Sekarang', '#/ujian') +
      kartuAksi('green', 'wifi', 'Ujian Langsung', 'Gabung Ujian Serentak', 'green', 'Gabung Sekarang', '#/live', true) +
      kartuAksi('purple', 'file', 'Hasil Ujian', 'Lihat Rekapitulasi & Kunci', 'purple', 'Lihat Hasil', '#/nilai') +
      kartuAksi('amber', 'pie', 'Analitik Siswa', 'Analisis Grafik Kemampuan', 'amber', 'Buka Analitik', d.fitur.analitik ? '#/analitik' : '#/riwayat') + '</section>' +
      '<div class="grid layout-2-1" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr);margin-top:18px;align-items:start"><div class="stack">' +
      '<section><div class="row between" style="margin-bottom:12px"><div><h3 style="font-size:16px">Ringkasan Performa</h3><div class="small muted">Statistik aktivitas pengerjaan ujian Anda</div></div><span class="btn ghost sm">Bulan Ini ' + ic('cdown', 'sm') + '</span></div>' +
      '<div class="grid g4 keep2">' +
      stat('t-blue', 'clip', st.dikerjakan, '', 'Ujian Dikerjakan', delta(st.delta.dikerjakan)) +
      stat('t-green', 'spark', st.rata === null ? '—' : F.angka(st.rata), '', 'Rata-rata Nilai', delta(st.delta.rata)) +
      stat('t-purple', 'shieldc', st.lulus, '/' + st.dinilai, 'Lulus KKM', delta(st.delta.lulus)) +
      stat('t-amber', 'star', F.angka(st.totalPoin, 0), '', 'Total Poin', '<span class="muted-2">akumulasi nilai</span>') + '</div></section>' +
      '<section class="grid g2"><div class="card pad"><div class="row between"><div><h3 style="font-size:14px">Tren Skor Ujian</h3><div class="tiny muted">Progres nilai ujian terakhir</div></div>' + (st.rata !== null ? '<span class="badge blue">Rata-rata ' + F.angka(st.rata) + '</span>' : '') + '</div><div style="margin-top:14px">' +
      A.chart.garis(st.tren.map(function (t) { return { label: F.tgl(t.t).replace(/ \d{4}$/, ''), v: t.skor, tip: t.paket + ': ' + t.skor }; }), { h: 150, min: 0, max: 100, kosong: 'Kerjakan ujian untuk melihat tren skor.' }) + '</div></div>' +
      '<div class="card pad"><h3 style="font-size:14px">Performa per Mata Pelajaran</h3><div class="tiny muted">Penguasaan materi kompetensi</div><div class="row" style="gap:18px;margin-top:14px">' +
      (st.perMapel.length ? A.chart.donat(st.perMapel.map(function (m, i) { return { label: m.mapel, v: m.rata, warna: warna[i % warna.length] }; }), { size: 128, tengah: '<div class="tiny muted">Rerata</div><div class="xb" style="font-size:19px;color:var(--ink)">' + F.angka(st.rata, 0) + '</div>' }) +
        '<div class="legend grow">' + st.perMapel.map(function (m, i) { return '<div class="li"><span><span class="sw" style="background:' + warna[i % warna.length] + '"></span>' + esc(m.mapel) + '</span><b>' + F.angka(m.rata) + '</b></div>'; }).join('') + '</div>' : '<div class="empty small grow">Belum ada nilai yang ditampilkan.</div>') + '</div></div></section></div>' +
      '<div class="stack">' + kartuProfil(sw) + kartuMendatang(d.mendatang) + kartuPengumuman(d.pengumuman) + '</div></div>';
    // hitung mundur di hero
    every(function () {
      const el = $('#heroT'); if (!el) return;
      if (s && s.status === 'Berjalan') el.textContent = F.durasi(s.sisaMs - (A.serverNow() - d.waktuServer));
      else if (p && p.status === 'Terjadwal') el.textContent = F.durasi(new Date(p.buka).getTime() - A.serverNow());
    }, 1000);
    putarPengumuman();
  }
  function ilustrasi() {
    return '<svg viewBox="0 0 320 190" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="il1" x1="0" x2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>' +
      '<rect width="320" height="190" fill="url(#il1)"/><rect x="58" y="34" width="204" height="118" rx="10" fill="#0f172a" opacity=".85"/><rect x="66" y="42" width="188" height="102" rx="6" fill="#f8fafc"/>' +
      '<rect x="74" y="52" width="90" height="8" rx="4" fill="#1E4FD8"/><rect x="74" y="66" width="160" height="6" rx="3" fill="#cbd5e1"/><rect x="74" y="78" width="140" height="6" rx="3" fill="#cbd5e1"/>' +
      [0, 1, 2, 3].map(function (i) { return '<rect x="74" y="' + (92 + i * 12) + '" width="' + (110 - i * 8) + '" height="8" rx="4" fill="' + (i === 1 ? '#1E4FD8' : '#e2e8f0') + '"/>'; }).join('') +
      '<circle cx="222" cy="104" r="18" fill="#10b981"/><path d="M214 104l6 6 10-12" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="40" y="152" width="240" height="8" rx="4" fill="#0f172a" opacity=".85"/><circle cx="286" cy="30" r="22" fill="#60a5fa" opacity=".35"/><circle cx="34" cy="150" r="14" fill="#22d3ee" opacity=".3"/></svg>';
  }
  function kartuAksi(warna, ikon, j, s, btn, label, href, live) {
    return '<div class="act-card ' + warna + '"><div class="row top"><span class="chip-ic s-' + (warna === 'blue' ? 'blue' : warna) + '">' + ic(ikon) + '</span><div class="grow"><h4 class="row" style="gap:6px">' + j + (live ? '<span class="badge live" style="height:18px;font-size:9.5px">LIVE</span>' : '') + '</h4><p>' + s + '</p></div></div>' +
      '<a class="btn ' + btn + ' block" href="' + href + '">' + label + ' ' + ic('cright', 'sm') + '</a></div>';
  }
  function stat(t, ikon, v, kecil, l, d) { return '<div class="card stat"><span class="chip-ic sm ' + t + '">' + ic(ikon) + '</span><div><div class="v">' + v + (kecil ? '<small>' + kecil + '</small>' : '') + '</div><div class="l">' + l + '</div></div><div class="d">' + d + '</div></div>'; }
  function kartuProfil(sw) {
    return '<section class="card pad"><div class="row between"><h3 style="font-size:14px">Profil Siswa</h3><a class="iconbtn" href="#/profil">' + ic('cright') + '</a></div><div class="row" style="margin:14px 0;gap:14px"><div class="avatar lg">' + esc(A.inisial(sw.nama)) + '</div><div><b style="color:var(--ink)">' + esc(sw.nama) + '</b>' +
      '<div class="small muted">NISN: ' + esc(sw.nisn || '-') + '</div><div class="small sb" style="color:var(--brand)">Kelas ' + esc(sw.kelas) + '</div></div></div><div class="row between small"><span class="muted">Kelengkapan Profil</span><b style="color:var(--brand)">' + sw.kelengkapan + '%</b></div><div class="bar" style="margin-top:6px"><i style="width:' + sw.kelengkapan + '%"></i></div></section>';
  }
  function kartuMendatang(list) {
    const warna = ['t-blue', 't-amber', 't-purple'];
    return '<section class="card pad"><div class="row between"><div><h3 style="font-size:14px">Ujian Mendatang</h3><div class="tiny muted">Jadwal evaluasi akademik</div></div><a class="small sb" href="#/live">Lihat Semua</a></div><div class="stack-sm" style="margin-top:12px">' +
      (list.length ? list.slice(0, 3).map(function (x, i) {
        return '<div class="list-item"><div class="date-box ' + warna[i % 3] + '" style="border-color:var(--line)"><small>' + F.bln(x.buka) + '</small><b>' + F.hari(x.buka) + '</b></div><div class="grow"><b class="small" style="color:var(--ink)">' + esc(x.nama) + '</b><div class="tiny muted">' + F.jam(x.buka) + ' – ' + F.jam(x.tutup) + ' WIB · ' + x.durasi + ' mnt</div></div>' +
          (x.status === 'Berlangsung' ? '<span class="badge live">LIVE</span>' : '<span class="badge ' + (i % 2 ? 'purple' : 'amber') + '">Mendatang</span>') + '</div>';
      }).join('') : '<div class="empty small">Tidak ada jadwal ujian mendatang.</div>') + '</div></section>';
  }
  function kartuPengumuman(list) {
    return '<section class="card pad"><div class="row between"><h3 style="font-size:14px">Pengumuman Resmi</h3><a class="small sb" href="#" id="lihatInfo">Lihat Semua</a></div><div id="infoBox" style="margin-top:12px">' +
      (list.length ? list.map(function (a, i) { return '<div class="list-item info-it ' + (i ? 'hidden' : '') + '" style="align-items:flex-start;background:var(--soft)"><span class="chip-ic sm t-blue">' + ic('mega', 'sm') + '</span><div><b class="small" style="color:var(--ink)">' + esc(a.judul) + '</b><div class="tiny muted" style="margin-top:2px;line-height:1.5">' + esc(String(a.isi).slice(0, 160)) + '</div></div></div>'; }).join('') +
        '<div class="dots" style="margin-top:12px">' + list.map(function (a, i) { return '<i data-i="' + i + '" class="' + (i ? '' : 'on') + '"></i>'; }).join('') + '</div>' : '<div class="empty small">Belum ada pengumuman.</div>') + '</div></section>';
  }
  function putarPengumuman() {
    const l = $('#lihatInfo'); if (l) l.onclick = function (e) { e.preventDefault(); popPengumuman(); };
    const it = $$('.info-it'), dots = $$('#infoBox .dots i'); if (it.length < 2) return;
    let i = 0;
    const tampil = function (n) { i = n; it.forEach(function (x, k) { x.classList.toggle('hidden', k !== n); }); dots.forEach(function (x, k) { x.classList.toggle('on', k === n); }); };
    dots.forEach(function (d) { d.onclick = function () { tampil(Number(d.dataset.i)); }; });
    S.timers.push(setInterval(function () { tampil((i + 1) % it.length); }, 6000));
  }

  // ============================================================================
  // MULAI UJIAN (konfirmasi sebelum masuk ruang ujian)
  // ============================================================================
  function pgUjian(v) {
    const d = S.home; if (!d) return loading(v);
    const p = d.paket, s = d.sesi;
    if (!p) { v.innerHTML = judul('Mulai Ujian') + '<div class="card pad empty">Paket untuk token ini tidak ditemukan.</div>'; return; }
    let aksi = '', info = '';
    if (s && s.status !== 'Berjalan') { aksi = '<a class="btn primary lg" href="#/hasil/' + s.id + '">' + ic('file') + 'Lihat Hasil Ujian</a>'; info = '<div class="alert green">' + ic('checkc') + '<div>Lembar jawaban sudah dikumpulkan. Token ini hanya dapat membuka hasil.</div></div>'; }
    else if (s && s.status === 'Berjalan') { aksi = '<button class="btn primary lg" id="bMulai">' + ic('play') + 'Lanjutkan Ujian</button>'; info = '<div class="alert blue">' + ic('info') + '<div>Ujian sedang berjalan · ' + (s.dijawab === null ? '' : s.dijawab + '/' + s.jumlah + ' terjawab · ') + 'sisa ±' + Math.max(0, Math.round(s.sisaMs / 60000)) + ' menit. Jawaban Anda aman tersimpan.</div></div>'; }
    else if (p.status === 'Terjadwal') { aksi = '<button class="btn ghost lg" disabled>' + ic('lock') + 'Belum dibuka</button>'; info = '<div class="alert amber">' + ic('clock') + '<div>Ujian dibuka <b>' + F.tglJam(p.buka) + '</b> · hitung mundur <b class="mono" id="cd"></b></div></div>'; }
    else if (p.status === 'Selesai' || A.serverNow() > p.batasMulai) { aksi = '<button class="btn ghost lg" disabled>' + ic('lock') + 'Jadwal sudah ditutup</button>'; info = '<div class="alert rose">' + ic('warn') + '<div>Waktu untuk memulai ujian ini sudah lewat. Hubungi guru/pengawas.</div></div>'; }
    else aksi = '<button class="btn primary lg" id="bMulai" disabled>' + ic('play') + 'Mulai Mengerjakan</button>';
    const aturan = ['Satu soal tampil per layar; gunakan panel nomor untuk berpindah soal.', 'Jawaban tersimpan otomatis — aman bila koneksi putus, lanjutkan dengan token yang sama.', 'Sisa waktu mengikuti jam server; saat waktu habis jawaban dikirim otomatis.', 'Tandai "Ragu-ragu" untuk soal yang ingin ditinjau kembali.'];
    if (p.antiCheat) aturan.push('Mode terproteksi aktif: berpindah tab/keluar layar penuh tercatat. Batas ' + p.maksPelanggaran + ' pelanggaran → ujian dikirim otomatis.');
    v.innerHTML = judul('Mulai Ujian', 'Periksa rincian ujian sebelum masuk ke ruang ujian.', '', 'Beranda › <b>Mulai Ujian</b>') +
      '<div class="grid layout-2-1" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr);align-items:start"><div class="card pad-lg"><div class="row wrap" style="gap:8px"><span class="badge blue mono">KODE: ' + esc(p.kode) + '</span><span class="badge">' + esc(p.mapel) + '</span>' + badgeStatus(p.status) + '</div>' +
      '<h2 style="font-size:24px;margin-top:12px">' + esc(p.nama) + '</h2>' + (p.catatan ? '<p class="muted" style="margin:6px 0 0">' + esc(p.catatan) + '</p>' : '') +
      '<div class="grid g4 keep2" style="margin-top:18px">' + mini('timer', p.durasi + ' menit', 'Durasi') + mini('list', p.jumlahSoal + ' soal', 'Jumlah soal') + mini('target', p.kkm, 'KKM') + mini('cal', F.tgl(p.buka), 'Tanggal') + '</div>' +
      '<h3 style="font-size:14px;margin-top:22px">Tata tertib</h3><ul style="margin:10px 0 0;padding-left:20px;line-height:1.9" class="small">' + aturan.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      '<div style="margin-top:18px">' + info + '</div>' + (!s && p.status === 'Berlangsung' ? '<label class="check" style="margin-top:14px"><input type="checkbox" id="siap"> Saya sudah membaca tata tertib dan siap mengerjakan dengan jujur.</label>' : '') +
      '<div class="row wrap" style="margin-top:18px">' + aksi + '</div></div>' +
      '<div class="stack">' + kartuProfil(d.siswa) + '<div class="card pad"><h3 style="font-size:14px">Jadwal</h3><div class="small" style="margin-top:10px;line-height:1.9"><div class="row between"><span class="muted">Dibuka</span><b>' + F.tglJam(p.buka) + '</b></div><div class="row between"><span class="muted">Ditutup</span><b>' + F.tglJam(p.tutup) + '</b></div>' + (p.toleransi ? '<div class="row between"><span class="muted">Batas mulai</span><b>' + F.tglJam(p.batasMulai) + '</b></div>' : '') + '</div></div></div></div>';
    const siap = $('#siap'), bm = $('#bMulai');
    if (siap) siap.onchange = function () { bm.disabled = !siap.checked; };
    if (bm) bm.onclick = function () { masukRuangUjian(bm); };
    if (p.status === 'Terjadwal') every(function () { const cd = $('#cd'); if (!cd) return; const ms = new Date(p.buka).getTime() - A.serverNow(); cd.textContent = F.durasi(ms); if (ms <= 0) { muatHome(true); } }, 1000);
  }
  function mini(ikon, v, l) { return '<div class="card soft" style="padding:12px"><div class="row" style="gap:8px">' + ic(ikon, 'sm') + '<b class="small" style="color:var(--ink)">' + esc(String(v)) + '</b></div><div class="tiny muted" style="margin-top:3px">' + l + '</div></div>'; }
  function badgeStatus(s) { return s === 'Berlangsung' ? '<span class="badge live">LIVE · Berlangsung</span>' : s === 'Terjadwal' ? '<span class="badge amber dot">Terjadwal</span>' : s === 'Selesai' ? '<span class="badge dot">Selesai</span>' : '<span class="badge">' + esc(s) + '</span>'; }

  function pgLive(v) {
    const d = S.home; if (!d) return loading(v);
    v.innerHTML = judul('Ujian Langsung', 'Jadwal ujian serentak untuk kelas ' + esc(d.siswa.kelas) + '. Setiap ujian memakai token PIN tersendiri dari pengawas.', '<button class="btn ghost" id="rf">' + ic('refresh') + 'Segarkan</button>') +
      '<div class="grid g3">' + (d.mendatang.length ? d.mendatang.map(function (x) {
        return '<div class="card pad"><div class="row between">' + badgeStatus(x.status) + (x.milikToken ? '<span class="badge blue">Token Anda</span>' : '') + '</div><h3 style="font-size:16px;margin-top:12px">' + esc(x.nama) + '</h3><div class="small muted">' + esc(x.mapel) + ' · ' + x.durasi + ' menit</div>' +
          '<div class="small" style="margin-top:12px">' + ic('cal', 'sm') + ' ' + F.tglJam(x.buka) + '</div>' +
          '<div style="margin-top:14px">' + (x.milikToken ? '<a class="btn primary block" href="#/ujian">' + (x.status === 'Berlangsung' ? 'Masuk Ujian' : 'Lihat Detail') + '</a>' : '<button class="btn ghost block" data-lain>' + ic('key', 'sm') + 'Butuh token ujian ini</button>') + '</div></div>';
      }).join('') : '<div class="card pad empty span3">Belum ada ujian terjadwal untuk kelas Anda.</div>') + '</div>';
    $('#rf').onclick = function () { muatHome(true); };
    $$('[data-lain]').forEach(function (b) { b.onclick = function () { A.confirm('Ujian ini memakai token PIN berbeda. Keluar sekarang untuk masuk dengan token ujian tersebut?', { ok: 'Keluar & ganti token', icon: 'key' }).then(function (y) { if (y) { A.Sesi.clear(); A.swrClear(); tampilLogin(); } }); }; });
  }

  // ============================================================================
  // RUANG UJIAN
  // ============================================================================
  async function masukRuangUjian(btn) {
    A.busy(btn, true, 'Menyiapkan lembar ujian…');
    try { if (document.documentElement.requestFullscreen && !document.fullscreenElement && S.home.paket.antiCheat) await document.documentElement.requestFullscreen(); } catch (e) { }
    const r = await A.api('s.mulai', {}, { timeout: 60000 });
    A.busy(btn, false);
    if (!r.success) { A.toast(r.message, 'err'); if (document.fullscreenElement) document.exitFullscreen().catch(function () { }); return; }
    if (r.data.selesai) { A.toast('Ujian ini sudah dikumpulkan.', 'ok'); muatHome(true); location.hash = '#/hasil/' + r.data.sesiId; return; }
    mulaiUjian(r.data);
  }
  function mulaiUjian(data) {
    stopTimers(); S.shell = false; document.body.classList.remove('has-bnav');
    const kunciLokal = 'uk_ex_' + data.sesi.id, lokal = A.LS.get(kunciLokal, null);
    const ex = S.ex = { data: data, sesi: data.sesi, paket: data.paket, soal: data.soal, j: Object.assign({}, data.state.j), r: new Set(data.state.r || []), i: data.state.i || 0,
      seq: data.state.seq || 0, pel: data.state.pel || 0, deadline: performance.now() + data.sesi.sisaMs, lastSaved: Date.now(), saving: false, pending: false, dirty: false, ev: [],
      kunciLokal: kunciLokal, bc: '', wn: '', selesai: false, online: navigator.onLine !== false, fs: !!document.fullscreenElement, fsz: A.LS.get('uk_fsz', 17), peringatan5: false, peringatan1: false };
    if (lokal && lokal.seq > ex.seq) { ex.j = lokal.j || ex.j; ex.r = new Set(lokal.r || []); ex.i = lokal.i || 0; ex.seq = lokal.seq; ex.dirty = true; }
    const sw = me().siswa || {};
    root.innerHTML = '<div class="exam" id="exam" style="--qfs:' + ex.fsz + 'px"><div class="exam-top"><div class="row" style="gap:12px"><div class="brand" style="padding:0"><div class="logo" data-brand="logo" style="width:40px;height:40px">' + A.logoSvg + '</div><div><div class="nm" style="font-size:16px"><span data-brand="nama">UjianKu</span><span class="pro">PRO</span><span class="badge green dot hide-m" style="height:18px;font-size:10px" id="syncB">Tersinkron</span></div><div class="sub hide-m">CBT Online · ' + esc(ex.paket.nama) + '</div></div></div></div>' +
      '<div class="grow"></div><span class="status-pill hide-m" id="stPill"><span class="d"></span><span id="stTxt">Online</span><span class="muted">·</span><span class="muted" id="svTxt">Tersimpan</span></span>' +
      '<span class="status-pill hide-m mono">Kode: ' + esc(ex.paket.kode) + '</span><div class="timer" id="tmr"><span class="chip-ic sm t-amber" style="width:30px;height:30px">' + ic('clock', 'sm') + '</span><div><div class="k">SISA WAKTU</div><div class="v" id="tmrV">--:--:--</div></div></div>' +
      '<div class="row hide-m" style="gap:8px"><div class="avatar sm">' + esc(A.inisial(sw.nama)) + '</div><div><b class="small" style="color:var(--ink)">' + esc(sw.nama) + '</b><div class="tiny muted">' + esc(sw.kelas) + ' · NIS ' + esc(sw.nis || '') + '</div></div></div></div>' +
      (ex.paket.antiCheat ? '<div class="protect">' + ic('shield', 'sm') + 'Mode Ujian Terproteksi Aktif: perpindahan tab & keluar layar penuh dicatat (batas ' + ex.paket.maksPelanggaran + ').</div>' : '') +
      '<div id="siaranBox"></div><div class="exam-body"><div class="stack"><div class="card q-card" id="qCard"></div><div class="card pad soft small"><div class="row top"><span class="chip-ic sm t-blue">' + ic('info', 'sm') + '</span><div><b>Petunjuk Teknis CBT</b><ol style="margin:6px 0 0;padding-left:18px;line-height:1.8"><li>Pilihan Anda tersimpan otomatis ke server tanpa perlu menekan tombol simpan.</li><li>Gunakan status <b style="color:#b45309">Ragu-ragu</b> untuk soal yang ingin ditinjau kembali sebelum waktu habis.</li><li>Bila koneksi putus, tetap kerjakan — jawaban disimpan di perangkat dan dikirim saat online.</li></ol></div></div></div></div>' +
      '<aside class="exam-side stack" id="side"><button class="btn ghost block sheet-drawer" id="bSheet">' + ic('grid') + 'Daftar Soal & Kumpulkan</button><div class="card pad nav-card"><div class="row between"><div class="row" style="gap:8px">' + ic('clip') + '<b class="small" style="color:var(--ink)">Lembar Navigasi Soal</b></div><b class="small" style="color:var(--brand)" id="prog"></b></div>' +
      '<div class="bar" style="margin:12px 0 14px"><i id="progBar"></i></div><div class="leg" id="leg"></div><div class="tiny b muted" style="margin:16px 0 10px;letter-spacing:.08em">PILIH NOMOR SOAL:</div><div class="nav-grid" id="ng"></div>' +
      '<div class="card soft" style="padding:12px 14px;margin-top:16px"><div class="row between small"><span class="muted">Durasi Ujian:</span><b>' + ex.paket.durasi + ' Menit</b></div><div class="row between small" style="margin-top:6px"><span class="muted">KKM Kelulusan:</span><b style="color:var(--green)">' + ex.paket.kkm + ' Poin</b></div><div class="row between small" style="margin-top:6px"><span class="muted">Sistem Penilaian:</span><b class="right">' + esc(ex.paket.sistemNilai) + '</b></div></div>' +
      '<button class="btn danger lg block" style="margin-top:16px" id="bKumpul">' + ic('checkc') + 'Kumpulkan Lembar Ujian</button></div><div class="card pad" id="ragBox"></div></aside></div>' +
      '<div class="exam-foot"><span>' + ic('shieldc', 'sm') + ' UjianKu Pro CBT v' + A.versi + ' · jawaban dinilai di server</span><span>Pintasan: <span class="kbd">1-5</span>/<span class="kbd">A-E</span> pilih · <span class="kbd">←</span><span class="kbd">→</span> pindah · <span class="kbd">R</span> ragu</span></div></div>';
    A.brand(A.setting);
    renderSoal(); renderNavSoal();
    $('#bKumpul').onclick = konfirmasiKumpul;
    $('#bSheet').onclick = function () { $('#side').classList.toggle('open'); };
    // Timer & autosave
    S.timers.push(setInterval(tikWaktu, 250));
    const hb = Math.max(10, data.autosaveDetik || 30) * 1000;
    S.timers.push(setInterval(function () { if (!ex.selesai && (ex.dirty || Date.now() - ex.lastSaved > hb - 500)) simpan(); }, 5000));
    S.timers.push(setInterval(function () { const t = $('#svTxt'); if (t) t.textContent = ex.saving ? 'Menyimpan…' : ex.dirty ? 'Belum tersimpan' : 'Tersimpan ' + F.relatif(ex.lastSaved); }, 2000));
    pasangPengawasan();
    if (ex.dirty) simpan();
  }
  function persistLokal() { const ex = S.ex; A.LS.set(ex.kunciLokal, { j: ex.j, r: Array.from(ex.r), i: ex.i, seq: ex.seq, t: Date.now() }); }
  function tikWaktu() {
    const ex = S.ex; if (!ex || ex.selesai) return;
    const sisa = ex.deadline - performance.now(), el = $('#tmrV'), box = $('#tmr');
    if (el) el.textContent = F.durasi(sisa);
    if (box) box.classList.toggle('crit', sisa < 5 * 60000);
    if (sisa < 5 * 60000 && !ex.peringatan5 && sisa > 60000) { ex.peringatan5 = true; A.toast('Sisa waktu 5 menit. Periksa kembali jawaban Anda.', 'warn', 6000); }
    if (sisa < 60000 && !ex.peringatan1 && sisa > 0) { ex.peringatan1 = true; A.toast('Sisa waktu 1 menit!', 'err', 6000); }
    if (sisa <= 0) kirim(true);
  }
  function renderSoal() {
    const ex = S.ex, q = ex.soal[ex.i], c = $('#qCard'); if (!q) return;
    const pilih = String(ex.j[ex.i] || '').split(',').filter(Boolean), pgk = q.tipe === 'PGK';
    c.innerHTML = '<div class="row between wrap" style="gap:10px"><div class="row wrap" style="gap:8px"><span class="badge navy" style="height:28px;padding:0 12px;font-size:12.5px;background:var(--brand)">Soal No. ' + q.no + ' dari ' + ex.soal.length + '</span>' +
      '<span class="badge" style="height:28px;padding:0 12px">' + esc(ex.paket.mapel) + (q.topik ? ' • ' + esc(q.topik) : '') + '</span><span class="badge green" style="height:28px">Bobot: ' + q.bobot + ' Poin</span>' + (pgk ? '<span class="badge purple" style="height:28px">Pilih semua yang benar</span>' : '') + '</div></div>' +
      '<div class="row" style="gap:10px;margin-top:12px"><div class="fs-btns" id="fsz"><button data-f="15" class="' + (ex.fsz === 15 ? 'on' : '') + '">A-</button><button data-f="17" class="' + (ex.fsz === 17 ? 'on' : '') + '">A</button><button data-f="20" class="' + (ex.fsz === 20 ? 'on' : '') + '">A+</button></div>' +
      '<label class="check" style="background:var(--amber-50);border:1px solid var(--amber-100);padding:4px 10px;border-radius:9px;font-size:12.5px;color:#b45309;font-weight:700"><input type="checkbox" id="cRagu" ' + (ex.r.has(ex.i) ? 'checked' : '') + '>' + ic('flag', 'sm') + ' Ragu-ragu</label></div>' +
      '<div class="sep" style="margin:16px 0 0"></div><div class="q-text" id="qText">' + A.soalHtml(q.teks) + (q.gambar ? '<div><img class="q-img" src="' + esc(q.gambar) + '" alt="Gambar soal ' + q.no + '" loading="lazy" referrerpolicy="no-referrer"></div>' : '') + '</div>' +
      '<div id="opsi">' + q.opsi.map(function (o) { const on = pilih.indexOf(o.k) > -1; return '<div class="opt ' + (pgk ? 'sq ' : '') + (on ? 'on' : '') + '" data-k="' + o.k + '" role="' + (pgk ? 'checkbox' : 'radio') + '" aria-checked="' + on + '" tabindex="0"><span class="L">' + o.k + '</span><span class="grow">' + A.soalHtml(o.t) + '</span><span class="rd"></span></div>'; }).join('') + '</div>' +
      '<div class="sep" style="margin:22px 0 18px"></div><div class="row wrap" style="gap:10px"><button class="btn ghost lg" id="bPrev" ' + (ex.i === 0 ? 'disabled' : '') + '>' + ic('cleft') + 'Soal Sebelumnya</button>' +
      '<button class="btn soft-amber lg" id="bRagu">' + ic('flag') + (ex.r.has(ex.i) ? 'Batal Ragu-ragu' : 'Tandai Ragu-ragu') + '</button><div class="grow"></div>' +
      (ex.i < ex.soal.length - 1 ? '<button class="btn primary lg" id="bNext">Soal Berikutnya ' + ic('cright') + '</button>' : '') + '<button class="btn danger lg" id="bDone">' + ic('check') + 'Selesai Ujian</button></div>';
    A.renderMath($('#qText')); A.renderMath($('#opsi'));
    $$('.opt', c).forEach(function (el) { el.onclick = function () { pilihOpsi(el.dataset.k); }; el.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pilihOpsi(el.dataset.k); } }; });
    $('#cRagu').onchange = toggleRagu; $('#bRagu').onclick = toggleRagu;
    $('#bPrev').onclick = function () { ke(ex.i - 1); }; if ($('#bNext')) $('#bNext').onclick = function () { ke(ex.i + 1); };
    $('#bDone').onclick = konfirmasiKumpul;
    $$('#fsz button').forEach(function (b) { b.onclick = function () { ex.fsz = Number(b.dataset.f); A.LS.set('uk_fsz', ex.fsz); $('#exam').style.setProperty('--qfs', ex.fsz + 'px'); renderSoal(); }; });
  }
  function renderNavSoal() {
    const ex = S.ex, n = ex.soal.length, dij = Object.keys(ex.j).length, rg = ex.r.size;
    $('#prog').textContent = dij + ' / ' + n + ' Soal (' + Math.round(dij / n * 100) + '%)';
    $('#progBar').style.width = (dij / n * 100) + '%';
    $('#leg').innerHTML = '<div><i style="background:var(--brand);border-color:var(--brand)"></i>Sudah Dijawab (' + dij + ')</div><div><i style="background:#fbbf24;border-color:#f59e0b"></i>Ragu-ragu (' + rg + ')</div><div><i></i>Belum Dijawab (' + (n - dij) + ')</div><div><i style="box-shadow:0 0 0 2px var(--brand)"></i>Sedang Aktif (No. ' + (ex.i + 1) + ')</div>';
    $('#ng').innerHTML = ex.soal.map(function (q, i) { return '<button data-i="' + i + '" class="' + (ex.r.has(i) ? 'rg ' : ex.j[i] ? 'ok ' : '') + (ex.r.has(i) && ex.j[i] ? 'rgok ' : '') + (i === ex.i ? 'cur' : '') + '" aria-label="Soal ' + (i + 1) + '">' + (i + 1) + '</button>'; }).join('');
    $$('#ng button').forEach(function (b) { b.onclick = function () { ke(Number(b.dataset.i)); $('#side').classList.remove('open'); }; });
    const ragu = Array.from(ex.r).sort(function (a, b) { return a - b; }).map(function (x) { return x + 1; });
    const kosong = ex.soal.map(function (q, i) { return i; }).filter(function (i) { return !ex.j[i]; }).map(function (x) { return x + 1; });
    $('#ragBox').innerHTML = '<div class="row top"><span class="chip-ic sm t-green">' + ic('info', 'sm') + '</span><div class="small"><b>Perhatian Sebelum Kumpul</b><div class="muted" style="margin-top:3px">' +
      (ragu.length || kosong.length ? (ragu.length ? 'Ragu-ragu: nomor ' + ragu.join(', ') + '. ' : '') + (kosong.length ? 'Belum dijawab: ' + (kosong.length > 12 ? kosong.length + ' soal' : 'nomor ' + kosong.join(', ')) + '.' : '') : 'Semua soal sudah terjawab. Tinjau kembali sebelum mengumpulkan.') + '</div></div></div>';
  }
  function ke(i) { const ex = S.ex; if (i < 0 || i >= ex.soal.length) return; ex.i = i; ex.dirty = true; persistLokal(); renderSoal(); renderNavSoal(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function pilihOpsi(k) {
    const ex = S.ex, q = ex.soal[ex.i];
    if (q.tipe === 'PGK') { const s = new Set(String(ex.j[ex.i] || '').split(',').filter(Boolean)); s.has(k) ? s.delete(k) : s.add(k); const v = Array.from(s).sort().join(','); if (v) ex.j[ex.i] = v; else delete ex.j[ex.i]; }
    else { if (ex.j[ex.i] === k) delete ex.j[ex.i]; else ex.j[ex.i] = k; }
    ex.seq++; ex.dirty = true; persistLokal();
    renderSoal(); renderNavSoal();
    simpanNanti();
  }
  function toggleRagu() { const ex = S.ex; ex.r.has(ex.i) ? ex.r.delete(ex.i) : ex.r.add(ex.i); ex.seq++; ex.dirty = true; persistLokal(); renderSoal(); renderNavSoal(); simpanNanti(); }
  const simpanNanti = A.debounce(function () { simpan(); }, 2500);
  async function simpan() {
    const ex = S.ex; if (!ex || ex.selesai) return;
    if (ex.saving) { ex.pending = true; return; }
    ex.saving = true;
    const seq = ex.seq, ev = ex.ev.splice(0);
    const r = await A.api('s.simpan', { j: ex.j, r: Array.from(ex.r), i: ex.i, seq: seq, ev: ev, bc: ex.bc, wn: ex.wn }, { retry: 1, timeout: 25000, quiet: true });
    ex.saving = false;
    if (!r.success) {
      ex.ev = ev.concat(ex.ev);
      setOnline(r.code === 'NET' ? false : ex.online);
      if (r.code === 'DEVICE') { A.toast(r.message, 'err', 8000); }
      if (r.code === 'AUTH') { A.toast('Sesi token dicabut pengawas. Masuk ulang dengan token yang sama untuk melanjutkan.', 'err', 8000); }
    } else {
      setOnline(true);
      const d = r.data;
      if (d.selesai) { return selesaiUjian(d.hasil || null, d.cara); }
      if (seq === ex.seq) ex.dirty = false;
      ex.lastSaved = Date.now();
      if (typeof d.sisaMs === 'number') { const baru = performance.now() + d.sisaMs; if (Math.abs(baru - ex.deadline) > 2000) { if (baru > ex.deadline + 30000) A.toast('Pengawas menambahkan waktu ujian.', 'ok', 5000); ex.deadline = baru; } }
      if (d.pel !== undefined) ex.pel = d.pel;
      if (d.siaran) { ex.bc = d.siaran.id; tampilSiaran(d.siaran); }
      if (d.peringatan) { ex.wn = d.peringatan.id; A.modal({ title: 'Pesan dari Pengawas', icon: 'warn', iconTone: 't-rose', body: '<p style="margin:0;font-size:15px">' + esc(d.peringatan.pesan) + '</p>', actions: [{ label: 'Saya mengerti', cls: 'primary' }] }); }
      A.LS.set(ex.kunciLokal, { j: ex.j, r: Array.from(ex.r), i: ex.i, seq: ex.seq, t: Date.now() });
    }
    if (ex.pending) { ex.pending = false; simpan(); }
  }
  function setOnline(on) {
    const ex = S.ex; ex.online = on;
    const p = $('#stPill'), t = $('#stTxt'), b = $('#syncB'); if (!p) return;
    p.classList.toggle('off', !on); t.textContent = on ? 'Online' : 'Offline';
    if (b) { b.className = 'badge dot hide-m ' + (on ? 'green' : 'rose'); b.textContent = on ? 'Tersinkron' : 'Offline — tersimpan di perangkat'; }
  }
  function tampilSiaran(bc) {
    const box = $('#siaranBox'); if (!box) return;
    box.innerHTML = '<div class="alert blue" style="margin:14px 22px 0;border-radius:14px">' + ic('mega') + '<div class="grow"><b>Pengumuman pengawas:</b> ' + esc(bc.pesan) + '</div><button class="iconbtn" onclick="this.parentNode.remove()">' + ic('x') + '</button></div>';
    A.toast('Pengumuman dari pengawas.', 'warn');
  }
  function pasangPengawasan() {
    const ex = S.ex;
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
    document.addEventListener('keydown', onKey);
    if (!ex.paket.antiCheat) return;
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('copy', blok); document.addEventListener('cut', blok); document.addEventListener('contextmenu', blok);
    window.addEventListener('beforeunload', onUnload);
  }
  function lepasPengawasan() {
    window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline);
    document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); document.removeEventListener('fullscreenchange', onFs);
    document.removeEventListener('copy', blok); document.removeEventListener('cut', blok); document.removeEventListener('contextmenu', blok);
    window.removeEventListener('beforeunload', onUnload);
  }
  function onOnline() { S.ex.ev.push({ e: 'online' }); setOnline(true); simpan(); }
  function onOffline() { setOnline(false); }
  function onUnload(e) { if (S.ex && !S.ex.selesai) { e.preventDefault(); e.returnValue = ''; } }
  function blok(e) { if (S.ex && !S.ex.selesai) { e.preventDefault(); A.toast('Menyalin & klik kanan dinonaktifkan selama ujian.', 'warn'); } }
  function langgar(jenis, teks) {
    const ex = S.ex; if (!ex || ex.selesai) return;
    ex.ev.push({ e: jenis, t: Date.now() }); ex.pel++;
    simpan();
    A.modal({ title: 'Pelanggaran tercatat (' + Math.min(ex.pel, ex.paket.maksPelanggaran) + '/' + ex.paket.maksPelanggaran + ')', icon: 'warn', iconTone: 't-rose', noBgClose: true,
      body: '<p style="margin:0;line-height:1.6">' + esc(teks) + ' Bila mencapai ' + ex.paket.maksPelanggaran + ' pelanggaran, lembar ujian dikirim otomatis oleh sistem.</p>',
      actions: [{ label: document.documentElement.requestFullscreen && !document.fullscreenElement ? 'Kembali ke layar penuh' : 'Kembali mengerjakan', cls: 'primary', onClick: function () { if (document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () { }); } }] });
  }
  function onVis() { if (document.visibilityState === 'hidden') { S.ex._hid = Date.now(); } else if (S.ex && S.ex._hid) { const lama = Date.now() - S.ex._hid; S.ex._hid = 0; if (lama > 1500) langgar('tab', 'Anda meninggalkan halaman ujian selama ' + Math.round(lama / 1000) + ' detik.'); } }
  function onFs() { const ex = S.ex; if (!ex) return; if (document.fullscreenElement) { ex.fs = true; return; } if (ex.fs && !ex.selesai) { ex.fs = false; langgar('fs', 'Anda keluar dari mode layar penuh.'); } }
  function onKey(e) {
    const ex = S.ex; if (!ex || ex.selesai || document.querySelector('.modal-bg')) return;
    if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName)) return;
    const q = ex.soal[ex.i], k = e.key.toUpperCase();
    const idx = /^[1-5]$/.test(k) ? Number(k) - 1 : 'ABCDE'.indexOf(k);
    if (idx > -1 && k.length === 1 && q.opsi[idx]) { e.preventDefault(); pilihOpsi(q.opsi[idx].k); }
    else if (e.key === 'ArrowRight') ke(ex.i + 1); else if (e.key === 'ArrowLeft') ke(ex.i - 1); else if (k === 'R') toggleRagu();
  }
  function konfirmasiKumpul() {
    const ex = S.ex, n = ex.soal.length, dij = Object.keys(ex.j).length;
    const ragu = Array.from(ex.r).sort(function (a, b) { return a - b; }).map(function (x) { return x + 1; });
    const kosong = ex.soal.map(function (q, i) { return i; }).filter(function (i) { return !ex.j[i]; }).map(function (x) { return x + 1; });
    const ringkas = function (a) { return a.length ? 'No. ' + (a.length > 6 ? a[0] + '–' + a[a.length - 1] : a.join(', ')) : '—'; };
    A.modal({ title: 'Konfirmasi Pengumpulan Ujian', sub: 'Apakah Anda yakin ingin mengakhiri sesi ujian dan mengumpulkan seluruh jawaban sekarang?', icon: 'clip', iconTone: 't-amber',
      body: '<div class="sum-grid"><div><small>Total Soal Ujian</small><div class="row between"><b>' + n + '</b><span class="tag">Butir</span></div></div><div class="g"><small>Sudah Dijawab</small><div class="row between"><b style="color:var(--green)">' + dij + '</b><span class="tag">' + Math.round(dij / n * 100) + '%</span></div></div>' +
        '<div class="a"><small>Masih Ragu-ragu</small><div class="row between"><b style="color:#b45309">' + ragu.length + '</b><span class="tag">' + ringkas(ragu) + '</span></div></div><div class="r"><small>Belum Dijawab</small><div class="row between"><b style="color:var(--rose)">' + kosong.length + '</b><span class="tag">' + ringkas(kosong) + '</span></div></div></div>' +
        '<div class="alert amber" style="margin-top:14px">' + ic('warn') + '<div><b>Peringatan Penting:</b> Setelah lembar ujian dikumpulkan, Token PIN otomatis menjadi <u>Terpakai</u>, sesi ditutup, dan seluruh jawaban tidak dapat diubah kembali.</div></div>' +
        '<label class="check" style="margin-top:14px;padding:12px;border:1px solid var(--line);border-radius:12px;width:100%;background:var(--soft)"><input type="checkbox" id="cfm"> Saya telah memeriksa kembali seluruh jawaban dan menyetujui pengumpulan akhir hasil ujian ini.</label>',
      actions: [{ label: 'Periksa Kembali', cls: 'ghost', icon: 'left' }, { label: 'Ya, Kumpulkan Sekarang', cls: 'danger', icon: 'check', onClick: function (b, bg) { if (!bg.querySelector('#cfm').checked) { A.toast('Centang persetujuan terlebih dahulu.', 'warn'); return false; } return kirim(false); } }] });
  }
  async function kirim(otomatis) {
    const ex = S.ex; if (!ex || ex.selesai || ex.mengirim) return;
    ex.mengirim = true;
    let ov = null;
    if (otomatis) { ov = A.modal({ title: 'Waktu habis', icon: 'clock', iconTone: 't-rose', noEsc: true, noBgClose: true, body: '<p style="margin:0">Mengirim lembar jawaban Anda ke server…</p>' }); ov.el.querySelector('[data-x]').remove(); }
    for (let coba = 0; coba < 20; coba++) {
      const r = await A.api('s.kirim', { j: ex.j, r: Array.from(ex.r), seq: ex.seq + 1, otomatis: !!otomatis }, { retry: 2, timeout: 40000, quiet: true });
      if (r.success) { if (ov) ov.close(); selesaiUjian(r.data.hasil, otomatis ? 'Waktu Habis' : 'Siswa'); return true; }
      if (r.code === 'AUTH') break;
      if (ov) ov.body.innerHTML = '<p style="margin:0">Koneksi bermasalah, mencoba lagi (' + (coba + 1) + ')… Jawaban terakhir aman tersimpan; server akan mengirimkan otomatis bila koneksi tidak pulih.</p>';
      else { A.toast(r.message || 'Gagal mengirim, mencoba lagi…', 'err'); ex.mengirim = false; return false; }
      await A.sleep(4000);
    }
    ex.mengirim = false;
    if (ov) ov.close();
    A.toast('Pengiriman belum berhasil. Jawaban tersimpan; hubungi pengawas.', 'err', 8000);
    return false;
  }
  function selesaiUjian(hasil, cara) {
    const ex = S.ex; if (!ex) return;
    ex.selesai = true; stopTimers(); lepasPengawasan();
    A.LS.del(ex.kunciLokal);
    if (document.fullscreenElement) document.exitFullscreen().catch(function () { });
    const sesiId = ex.sesi.id; S.ex = null;
    A.swrClear('home');
    const d = A.Sesi.data(); if (d) { d.me.mode = 'hasil'; A.Sesi.set(d.token, d.me, d.exp); }
    tampilShell();
    location.hash = '#/hasil/' + sesiId;
    if (cara === 'Pelanggaran') A.toast('Ujian dikirim otomatis karena batas pelanggaran tercapai.', 'err', 8000);
    else if (cara === 'Pengawas') A.toast('Ujian diakhiri oleh pengawas.', 'warn', 6000);
    else A.toast('Lembar jawaban berhasil dikumpulkan. Terima kasih!', 'ok');
    void hasil;
  }

  // ============================================================================
  // HASIL & PEMBAHASAN
  // ============================================================================
  async function pgHasil(v, id) {
    loading(v);
    const r = await A.api('s.hasil', { sesiId: id || '' });
    if (!r.success) { v.innerHTML = judul('Hasil Ujian') + '<div class="card pad empty">' + esc(r.message) + '<div style="margin-top:12px"><a class="btn ghost" href="#/dashboard">Kembali ke Dashboard</a></div></div>'; return; }
    const h = r.data;
    if (h.tersembunyi) { v.innerHTML = judul('Hasil Ujian', esc(h.paket)) + '<div class="card pad-lg center"><div class="chip-ic t-green" style="width:64px;height:64px;margin:0 auto 12px">' + ic('checkc', 'xl') + '</div><h3>Lembar jawaban sudah diterima</h3><p class="muted" style="max-width:460px;margin:8px auto 18px">' + esc(h.pesan) + '</p><a class="btn primary" href="#/dashboard">' + ic('home') + 'Kembali ke Dashboard</a></div>'; return; }
    const lulus = h.lulus, warna = lulus ? 'var(--green)' : 'var(--rose)';
    v.innerHTML = '<div class="page-h"><div><div class="crumb">Beranda › Riwayat Ujian › <b>Hasil: ' + esc(h.paket.nama) + '</b></div><div class="row wrap" style="gap:14px"><h2>Hasil Evaluasi &amp; Rekapitulasi Ujian</h2><span class="badge green dot">Tervalidasi server</span></div></div>' +
      '<div class="row wrap no-print"><button class="btn ghost" id="bCetak">' + ic('print') + 'Unduh Rekap PDF</button><a class="btn primary" href="#/dashboard">' + ic('left') + 'Kembali ke Dashboard</a></div></div>' +
      '<div class="card pad-lg" style="background:linear-gradient(135deg,var(--card),var(--brand-50))"><div class="row wrap between" style="gap:24px;align-items:stretch"><div class="grow" style="min-width:260px"><div class="row wrap" style="gap:8px"><span class="badge blue mono">KODE: ' + esc(h.paket.kode) + '</span><span class="badge">Selesai: ' + F.tglJam(h.selesai) + '</span></div>' +
      '<h2 style="font-size:24px;margin-top:14px">' + esc(h.paket.nama) + '</h2><div class="muted small">' + esc(h.paket.mapel) + ' · ' + (h.cara === 'Siswa' ? 'dikumpulkan siswa' : 'dikirim: ' + esc(h.cara)) + '</div>' +
      '<div class="card" style="padding:14px;margin-top:16px;display:flex;gap:12px;align-items:center"><div class="avatar sq">' + esc(A.inisial((me().siswa || {}).nama)) + '</div><div><b style="color:var(--ink)">' + esc((me().siswa || {}).nama) + '</b> <span class="badge blue" style="height:18px">Siswa Aktif</span><div class="small muted">NIS ' + esc((me().siswa || {}).nis || '-') + ' · Kelas ' + esc((me().siswa || {}).kelas || '') + '</div></div></div>' +
      '<div class="row wrap" style="margin-top:14px;gap:8px"><span class="badge amber" style="height:30px;padding:0 12px">' + ic('trophy', 'sm') + 'Peringkat ' + h.peringkat + ' dari ' + h.peserta + ' Siswa</span><span class="badge ' + (lulus ? 'green' : 'rose') + '" style="height:30px;padding:0 12px">' + ic('chart', 'sm') + (h.selisih >= 0 ? '+' : '') + F.angka(h.selisih) + ' poin terhadap KKM (' + h.kkm + ')</span></div></div>' +
      '<div class="card center" style="padding:22px 30px;min-width:240px"><div>' + A.chart.cincin(h.skor, { size: 150, warna: lulus ? '#1E4FD8' : '#e11d48', tengah: '<div class="xb" style="font-size:38px;color:var(--ink);line-height:1">' + F.angka(h.skor) + '</div><div class="tiny muted">Skor Total (100)</div>' }) + '</div>' +
      '<div style="margin-top:12px"><span class="badge ' + (lulus ? 'green' : 'rose') + '" style="height:30px;padding:0 16px;font-size:12.5px">' + ic(lulus ? 'checkc' : 'warn', 'sm') + (lulus ? 'LULUS KKM' : 'BELUM TUNTAS') + '</span></div><div class="tiny muted" style="margin-top:8px">Kriteria Ketuntasan Minimal: ' + h.kkm + ' · Predikat ' + h.predikat + '</div></div></div></div>' +
      '<div class="grid g4 keep2" style="margin-top:16px">' + statHasil('JAWABAN BENAR', h.benar, 'Soal (' + Math.round(h.benar / h.jumlah * 100) + '%)', 't-green', 'check', 'var(--green)') + statHasil('JAWABAN SALAH', h.salah, 'Soal (' + Math.round(h.salah / h.jumlah * 100) + '%)', 't-rose', 'x', 'var(--rose)') +
      statHasil('TIDAK DIJAWAB', h.kosong, 'Soal (' + Math.round(h.kosong / h.jumlah * 100) + '%)', 't-slate', 'minus', 'var(--muted)') + statHasil('WAKTU PENGERJAAN', h.menit, 'Menit', 't-blue', 'timer', 'var(--brand)', 'Dari batas ' + h.paket.durasi + ' menit') + '</div>' +
      '<div class="grid layout-2-1" style="grid-template-columns:minmax(0,3fr) minmax(0,2fr);margin-top:16px;align-items:start"><div class="card pad-lg"><div class="row between"><div class="row"><span class="chip-ic sm t-blue">' + ic('chart', 'sm') + '</span><div><h3 style="font-size:15px">Analisis Kompetensi &amp; Materi Pokok</h3><div class="small muted">Tingkat penguasaan konsep per topik ujian</div></div></div><span class="small muted">' + h.topik.length + ' topik</span></div><div class="stack-sm" style="margin-top:18px">' +
      h.topik.map(function (t) { const wb = t.persen >= 90 ? 'green' : t.persen >= 75 ? '' : t.persen >= 60 ? 'amber' : 'rose'; return '<div><div class="row between small"><span style="color:var(--ink)">' + esc(t.topik) + '</span><span class="row" style="gap:8px"><span class="badge ' + (wb || 'blue') + '" style="height:19px;font-size:10px">' + t.label + '</span><b>' + t.persen + '% (' + t.benar + '/' + t.jumlah + ' Soal)</b></span></div><div class="bar thick ' + wb + '" style="margin-top:6px"><i style="width:' + t.persen + '%"></i></div></div>'; }).join('') + '</div></div>' +
      '<div class="stack">' + (h.rekomendasi ? '<div class="card pad-lg"><div class="row"><span class="chip-ic sm t-purple">' + ic('spark', 'sm') + '</span><div><h3 style="font-size:15px">Rekomendasi &amp; Catatan</h3><div class="small muted">Evaluasi otomatis berbasis penguasaan topik</div></div></div><div class="card soft" style="padding:14px;margin-top:14px;line-height:1.7" class="small">' + esc(h.rekomendasi.teks) + '</div></div>' : '') +
      '<div class="navy-banner"><div class="tiny b" style="letter-spacing:.1em;color:#c7d6ff">KESIAPAN UJIAN MANDIRI</div><div class="row between wrap" style="margin-top:6px;gap:12px"><h3 style="font-size:16px;max-width:260px">Buka Pembahasan Lengkap &amp; Kunci Jawaban</h3>' +
      (h.pembahasan ? '<a class="btn white" style="background:#fff;color:var(--brand);border-radius:99px" href="#/pembahasan/' + h.sesiId + '">Mulai Review</a>' : '<span class="tag">Dibuka ' + F.tglJam(h.pembahasanBuka) + '</span>') + '</div></div></div></div>' +
      (h.butir ? '<div class="card" style="margin-top:16px"><div class="card-h"><div><h3>Pratinjau Kunci &amp; Pembahasan Soal</h3><p>Status jawaban per butir</p></div></div><div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>No.</th><th>Topik / Materi</th><th>Pilihan Siswa</th><th>Kunci Jawaban</th><th>Hasil</th><th></th></tr></thead><tbody>' +
        h.butir.map(function (b) { return '<tr><td class="b">#' + String(b.no).padStart(2, '0') + '</td><td><b style="color:var(--ink)">' + esc(b.topik || '-') + '</b><div class="tiny muted">Tingkat: ' + esc(b.kesukaran || '-') + '</div></td><td><span class="tag" style="' + (b.status === 'Salah' ? 'background:var(--rose-50);color:var(--rose)' : '') + '">' + esc(b.pilihan || '—') + '</span></td><td><span class="tag">' + esc(b.kunci) + '</span></td><td>' + (b.status === 'Benar' ? '<span class="badge green">' + ic('check', 'sm') + 'Benar</span>' : b.status === 'Salah' ? '<span class="badge rose">' + ic('x', 'sm') + 'Salah</span>' : '<span class="badge">Kosong</span>') + '</td><td class="act"><a class="small sb" href="#/pembahasan/' + h.sesiId + '?no=' + b.no + '">Lihat Pembahasan ›</a></td></tr>'; }).join('') + '</tbody></table></div></div>' : '');
    $('#bCetak').onclick = function () { cetakHasil(h); };
  }
  function statHasil(l, v, satuan, tone, ikon, warna, sub) { return '<div class="card kpi"><div class="row between top"><div><div class="lbl">' + l + '</div><div class="val">' + v + ' <small style="color:' + warna + '">' + satuan + '</small></div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div><span class="chip-ic ' + tone + '">' + ic(ikon) + '</span></div></div>'; }
  function cetakHasil(h) {
    const sw = me().siswa || {}, s = A.setting || {};
    A.cetak('Hasil ' + h.paket.nama, '<h1>' + esc(s.NAMA_LEMBAGA || '') + '</h1><div class="muted">Rekap Hasil Ujian CBT · dicetak ' + F.tglJam(new Date()) + '</div><h2 style="margin-top:16px">' + esc(h.paket.nama) + ' (' + esc(h.paket.kode) + ')</h2>' +
      '<table><tr><th>Nama</th><td>' + esc(sw.nama) + '</td><th>NIS / Kelas</th><td>' + esc(sw.nis) + ' / ' + esc(sw.kelas) + '</td></tr><tr><th>Nilai</th><td><b>' + h.skor + '</b> (' + h.predikat + ')</td><th>KKM / Status</th><td>' + h.kkm + ' / ' + (h.lulus ? 'TUNTAS' : 'BELUM TUNTAS') + '</td></tr>' +
      '<tr><th>Benar / Salah / Kosong</th><td>' + h.benar + ' / ' + h.salah + ' / ' + h.kosong + '</td><th>Waktu</th><td>' + h.menit + ' menit · peringkat ' + h.peringkat + '/' + h.peserta + '</td></tr></table>' +
      '<h2 style="margin-top:16px">Penguasaan per topik</h2><table><tr><th>Topik</th><th>Benar</th><th>Persen</th></tr>' + h.topik.map(function (t) { return '<tr><td>' + esc(t.topik) + '</td><td>' + t.benar + '/' + t.jumlah + '</td><td>' + t.persen + '%</td></tr>'; }).join('') + '</table>' +
      (h.rekomendasi ? '<p style="margin-top:14px">' + esc(h.rekomendasi.teks) + '</p>' : ''));
  }
  async function pgPembahasan(v, idRaw) {
    loading(v);
    const id = String(idRaw || '').split('?')[0], noAwal = Number((location.hash.match(/no=(\d+)/) || [])[1] || 1);
    const r = await A.api('s.pembahasan', { sesiId: id });
    if (!r.success) { v.innerHTML = judul('Kunci Jawaban & Pembahasan') + '<div class="card pad empty">' + esc(r.message) + '<div style="margin-top:12px"><a class="btn ghost" href="#/hasil/' + esc(id) + '">Kembali ke Hasil</a></div></div>'; return; }
    const d = r.data; let filter = 'semua', cari = '', idx = Math.max(0, Math.min(d.butir.length - 1, noAwal - 1));
    v.innerHTML = '<div class="page-h"><div><div class="crumb">Beranda › Riwayat Ujian › ' + esc(d.paket.nama) + ' › <b>Pembahasan</b></div><h2>Kunci Jawaban &amp; Pembahasan Lengkap</h2><p><span class="badge blue">Mode Telaah Mandiri</span> · Siswa: <b>' + esc((me().siswa || {}).nama) + '</b></p></div><div class="row"><a class="btn ghost" href="#/hasil/' + d.sesiId + '">' + ic('left') + 'Kembali ke Hasil</a></div></div>' +
      '<div class="chips" id="fChip" style="margin-bottom:14px"></div><div class="grid layout-8-4" style="grid-template-columns:minmax(0,2.2fr) minmax(0,1fr);align-items:start"><div id="pbIsi"></div><div class="stack"><div class="card pad"><div class="row between"><b class="small" style="color:var(--ink)">Peta Butir Soal (' + d.butir.length + ')</b></div><div class="row small" style="gap:10px;margin:10px 0"><span><span class="sw" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#10b981"></span> Benar (' + d.benar + ')</span><span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#e11d48"></span> Salah (' + d.salah + ')</span><span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#cbd5e1"></span> Kosong (' + d.kosong + ')</span></div><div class="nav-grid" id="pbNav"></div></div>' +
      '<div class="dark-card"><div class="tiny b" style="letter-spacing:.1em;color:#94a3b8">RINGKASAN HASIL UJIAN</div><div class="row between" style="margin-top:8px"><div class="xb" style="font-size:34px;color:#fff">' + F.angka(d.skor) + '<span style="font-size:14px;color:#94a3b8">/100</span></div><span class="badge ' + (d.lulus ? 'green' : 'rose') + '">' + (d.lulus ? 'Lulus KKM' : 'Belum Tuntas') + ' (' + d.kkm + ')</span></div>' +
      d.topik.slice(0, 4).map(function (t) { return '<div style="margin-top:12px"><div class="row between tiny"><span>' + esc(t.topik) + '</span><b style="color:' + (t.persen >= 75 ? '#34d399' : '#fbbf24') + '">' + t.persen + '%</b></div><div class="bar thin" style="background:rgba(255,255,255,.1);margin-top:5px"><i style="width:' + t.persen + '%;background:' + (t.persen >= 75 ? '#10b981' : '#f59e0b') + '"></i></div></div>'; }).join('') + '</div></div></div>';
    const daftar = function () { return d.butir.filter(function (b) { return (filter === 'semua' || (filter === 'benar' && b.status === 'Benar') || (filter === 'salah' && b.status === 'Salah') || (filter === 'kosong' && b.status === 'Kosong') || (filter === 'ragu' && b.ragu)) && (!cari || (b.teks + ' ' + b.topik).toLowerCase().indexOf(cari) > -1); }); };
    const chips = function () {
      const n = { semua: d.butir.length, benar: d.benar, salah: d.salah, kosong: d.kosong, ragu: d.butir.filter(function (b) { return b.ragu; }).length };
      $('#fChip').innerHTML = [['semua', 'Semua Soal'], ['benar', 'Jawaban Benar'], ['salah', 'Jawaban Salah'], ['kosong', 'Tidak Dijawab'], ['ragu', 'Ditandai Ragu']].map(function (c) { return '<button class="chip ' + (filter === c[0] ? 'on' : '') + '" data-f="' + c[0] + '">' + c[1] + ' <span class="pill-n">' + n[c[0]] + '</span></button>'; }).join('') +
        '<div class="search" style="margin-left:auto;min-width:220px"><svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input class="inp sm" id="pbCari" placeholder="Cari topik / konsep…" value="' + esc(cari) + '"></div>';
      $$('#fChip [data-f]').forEach(function (b) { b.onclick = function () { filter = b.dataset.f; const l = daftar(); if (l.length) idx = d.butir.indexOf(l[0]); chips(); tampil(); }; });
      $('#pbCari').oninput = A.debounce(function (e) { cari = e.target.value.toLowerCase(); const l = daftar(); if (l.length) idx = d.butir.indexOf(l[0]); tampil(); }, 250);
    };
    const tampil = function () {
      const b = d.butir[idx]; if (!b) return;
      const kunci = String(b.kunci).split(','), pil = String(b.pilihan).split(',').filter(Boolean);
      $('#pbIsi').innerHTML = '<div class="card q-card"><div class="row wrap" style="gap:8px"><span class="badge navy" style="height:28px;padding:0 12px">SOAL #' + String(b.no).padStart(2, '0') + '</span>' +
        (b.status === 'Benar' ? '<span class="badge green" style="height:28px">' + ic('checkc', 'sm') + 'Jawaban Benar (+' + b.bobot + ')</span>' : b.status === 'Salah' ? '<span class="badge rose" style="height:28px">' + ic('x', 'sm') + 'Jawaban Salah (0 / ' + b.bobot + ')</span>' : '<span class="badge" style="height:28px">Tidak dijawab</span>') +
        (b.ragu ? '<span class="badge amber" style="height:28px">' + ic('flag', 'sm') + 'Ditandai ragu</span>' : '') + '</div><div class="row wrap tiny" style="gap:6px;margin-top:10px"><span class="tag">' + esc(d.paket.mapel) + '</span>' + (b.topik ? '<span class="tag">' + esc(b.topik) + '</span>' : '') + (b.kesukaran ? '<span class="tag" style="color:var(--rose)">TINGKAT: ' + esc(String(b.kesukaran).toUpperCase()) + '</span>' : '') + '<span class="tag">Bobot: ' + b.bobot + ' Poin</span></div>' +
        '<div class="q-text" id="pbQ">' + A.soalHtml(b.teks) + (b.gambar ? '<div><img class="q-img" src="' + esc(b.gambar) + '" alt="" referrerpolicy="no-referrer"></div>' : '') + '</div><div class="tiny b muted" style="letter-spacing:.08em;margin-bottom:10px">ANALISIS PILIHAN JAWABAN</div><div id="pbOpsi">' +
        b.opsi.map(function (o) { const isK = kunci.indexOf(o.k) > -1, isP = pil.indexOf(o.k) > -1; return '<div class="opt ' + (isK ? 'benar' : isP ? 'salah' : '') + '" style="cursor:default"><span class="L">' + o.k + '</span><span class="grow">' + A.soalHtml(o.t) + (isP && !isK ? '<div class="tiny" style="color:var(--rose);margin-top:3px">' + ic('user', 'sm') + ' Jawaban yang Anda pilih (keliru)</div>' : isK ? '<div class="tiny" style="color:var(--green);margin-top:3px">' + ic('checkc', 'sm') + ' Kunci jawaban resmi' + (isP ? ' — pilihan Anda tepat' : '') + '</div>' : '') + '</span></div>'; }).join('') + '</div>' +
        (b.pembahasan ? '<div class="card soft" style="padding:18px;margin-top:8px"><div class="row" style="gap:10px"><span class="chip-ic sm t-blue">' + ic('spark', 'sm') + '</span><div><b style="color:var(--ink)">Solusi &amp; Pembahasan</b><div class="tiny muted">Penjelasan dari guru pengampu</div></div></div><div class="q-text" style="font-size:15px;margin:12px 0 0" id="pbP">' + A.soalHtml(b.pembahasan) + '</div></div>' : '<div class="alert blue" style="margin-top:8px">' + ic('info') + '<div>Guru belum menambahkan pembahasan untuk soal ini.</div></div>') +
        '<div class="row wrap" style="margin-top:18px;gap:10px"><button class="btn ghost" id="pbPrev" ' + (idx === 0 ? 'disabled' : '') + '>' + ic('cleft') + 'Pembahasan Sebelumnya</button><div class="grow"></div><button class="btn primary" id="pbNext" ' + (idx >= d.butir.length - 1 ? 'disabled' : '') + '>Pembahasan Berikutnya ' + ic('cright') + '</button></div></div>';
      A.renderMath($('#pbQ')); A.renderMath($('#pbOpsi')); A.renderMath($('#pbP'));
      $('#pbPrev').onclick = function () { idx--; tampil(); }; $('#pbNext').onclick = function () { idx++; tampil(); };
      $('#pbNav').innerHTML = d.butir.map(function (x, i) { return '<button data-i="' + i + '" class="' + (x.status === 'Benar' ? 'benar' : x.status === 'Salah' ? 'salah' : 'kosong') + (i === idx ? ' cur' : '') + '">' + x.no + '</button>'; }).join('');
      $$('#pbNav button').forEach(function (bt) { bt.onclick = function () { idx = Number(bt.dataset.i); tampil(); }; });
    };
    chips(); tampil();
  }

  // ============================================================================
  // RIWAYAT, NILAI, ANALITIK, MATERI, PROFIL, PENGATURAN
  // ============================================================================
  function pgRiwayat(v) {
    const d = S.home; if (!d) return loading(v);
    const q = (($('#cari') || {}).value || '').toLowerCase();
    const rows = d.riwayat.filter(function (x) { return !q || (x.paket + ' ' + x.mapel + ' ' + x.kode).toLowerCase().indexOf(q) > -1; });
    v.innerHTML = judul('Riwayat Ujian', 'Seluruh ujian yang telah Anda kerjakan.', '<button class="btn ghost" id="rf">' + ic('refresh') + 'Segarkan</button>') +
      '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ujian</th><th>Mapel</th><th>Tanggal</th><th>Durasi</th><th class="num">Nilai</th><th>Status</th><th></th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (x) { return '<tr><td><b style="color:var(--ink)">' + esc(x.paket) + '</b><div class="tiny muted mono">' + esc(x.kode) + '</div></td><td>' + esc(x.mapel) + '</td><td>' + F.tglJam(x.tanggal) + '</td><td>' + x.durasiMenit + ' mnt</td>' +
        '<td class="num b" style="font-size:15px;color:var(--ink)">' + (x.tampil ? F.angka(x.skor) : '<span class="tag">Disembunyikan</span>') + '</td><td>' + (x.tampil ? (x.lulus ? '<span class="badge green dot">Tuntas</span>' : '<span class="badge rose dot">Remedial</span>') : '<span class="badge">Terkirim</span>') + '</td>' +
        '<td class="act"><a class="btn sm ghost" href="#/hasil/' + x.sesiId + '">Hasil</a> ' + (x.pembahasan ? '<a class="btn sm soft" href="#/pembahasan/' + x.sesiId + '">Pembahasan</a>' : '') + '</td></tr>'; }).join('') : A.tabelKosong(7, q ? 'Tidak ada yang cocok dengan pencarian.' : 'Belum ada ujian yang dikerjakan.', 'history')) + '</tbody></table></div></div>';
    $('#rf').onclick = function () { muatHome(true); };
  }
  function pgNilai(v) {
    const d = S.home; if (!d) return loading(v);
    const rows = d.riwayat;
    v.innerHTML = judul('Nilai & Hasil', 'Hasil ujian yang sudah diumumkan.') + '<div class="grid g3">' + (rows.length ? rows.map(function (x) {
      return '<div class="card pad"><div class="row between"><span class="badge mono">' + esc(x.kode) + '</span>' + (x.tampil ? (x.lulus ? '<span class="badge green">Tuntas</span>' : '<span class="badge rose">Remedial</span>') : '<span class="badge">Menunggu</span>') + '</div>' +
        '<div class="row" style="margin-top:14px;gap:16px">' + (x.tampil ? A.chart.cincin(x.skor, { size: 76, warna: x.lulus ? '#1E4FD8' : '#e11d48', tengah: '<b style="font-size:18px;color:var(--ink)">' + F.angka(x.skor, 0) + '</b>' }) : '<div class="chip-ic t-slate" style="width:76px;height:76px;border-radius:50%">' + ic('lock', 'lg') + '</div>') +
        '<div class="grow"><b style="color:var(--ink)">' + esc(x.paket) + '</b><div class="small muted">' + esc(x.mapel) + ' · ' + F.tgl(x.tanggal) + '</div>' + (x.tampil ? '<div class="small" style="margin-top:4px">Benar ' + x.benar + '/' + x.jumlah + ' · KKM ' + x.kkm + '</div>' : '') + '</div></div>' +
        '<div class="row" style="margin-top:14px"><a class="btn ghost sm grow" href="#/hasil/' + x.sesiId + '">Detail Hasil</a>' + (x.pembahasan ? '<a class="btn soft sm grow" href="#/pembahasan/' + x.sesiId + '">Pembahasan</a>' : '') + '</div></div>';
    }).join('') : '<div class="card pad empty span3">Belum ada hasil ujian.</div>') + '</div>';
  }
  function pgAnalitik(v) {
    const d = S.home; if (!d) return loading(v);
    const st = d.statistik, warna = ['#1E4FD8', '#10b981', '#f59e0b', '#7c3aed', '#06b6d4', '#e11d48'];
    v.innerHTML = judul('Analitik Siswa', 'Perkembangan kemampuan Anda dari waktu ke waktu.') +
      '<div class="grid g4 keep2">' + stat('t-blue', 'clip', st.dikerjakan, '', 'Ujian Dikerjakan', '') + stat('t-green', 'spark', st.rata === null ? '—' : F.angka(st.rata), '', 'Rata-rata', '') + stat('t-purple', 'shieldc', st.lulus, '/' + st.dinilai, 'Lulus KKM', '') + stat('t-amber', 'star', F.angka(st.totalPoin, 0), '', 'Total Poin', '') + '</div>' +
      '<div class="grid g2" style="margin-top:16px"><div class="card pad"><h3 style="font-size:15px">Tren Skor</h3><div style="margin-top:14px">' + A.chart.garis(st.tren.map(function (t) { return { label: F.tgl(t.t).replace(/ \d{4}$/, ''), v: t.skor, tip: t.paket }; }), { h: 200, min: 0, max: 100, kosong: 'Belum ada data nilai.' }) + '</div></div>' +
      '<div class="card pad"><h3 style="font-size:15px">Rata-rata per Mata Pelajaran</h3><div style="margin-top:6px">' + (st.perMapel.length ? A.chart.batang(st.perMapel.map(function (m, i) { return { label: m.mapel, v: m.rata, warna: warna[i % warna.length], ket: m.n + ' ujian' }; }), { h: 170 }) : '<div class="empty">Belum ada data.</div>') + '</div></div></div>';
  }
  async function pgMateri(v) {
    v.innerHTML = judul('Materi Belajar', 'Bahan belajar yang dibagikan guru.') + '<div class="grid g3" id="mt"><div class="skel" style="height:140px"></div><div class="skel" style="height:140px"></div></div>';
    A.swr('materi', function () { return A.api('s.materi'); }, { maxAge: 300000, render: function (d) {
      $('#mt').innerHTML = d.rows.length ? d.rows.map(function (m) { return '<div class="card pad"><div class="row between"><span class="badge blue">' + esc(m.mapel || 'Umum') + '</span><span class="tiny muted">' + F.tgl(m.tanggal) + '</span></div><h3 style="font-size:15px;margin-top:12px">' + esc(m.judul) + '</h3><p class="small muted">' + esc(m.deskripsi || '') + '</p>' + (m.url ? '<a class="btn soft sm" href="' + esc(m.url) + '" target="_blank" rel="noopener">' + ic('ext', 'sm') + 'Buka Materi</a>' : '') + '</div>'; }).join('') : '<div class="card pad empty span3">Belum ada materi.</div>';
    } });
  }
  function pgProfil(v) {
    const d = S.home, sw = d ? d.siswa : (me().siswa || {});
    v.innerHTML = judul('Profil Siswa', 'Data identitas Anda di sistem ujian. Hubungi wali kelas bila ada kesalahan data.') +
      '<div class="grid g2"><div class="card pad-lg"><div class="row" style="gap:16px"><div class="avatar lg">' + esc(A.inisial(sw.nama)) + '</div><div><h3>' + esc(sw.nama) + '</h3><div class="small muted">Kelas ' + esc(sw.kelas) + '</div></div></div><div class="sep"></div>' +
      [['NIS', sw.nis], ['NISN', sw.nisn], ['Kelas', sw.kelas], ['Jenis kelamin', sw.jk === 'L' ? 'Laki-laki' : sw.jk === 'P' ? 'Perempuan' : '-'], ['Email', sw.email || '-'], ['WhatsApp', sw.wa || '-'], ['Nama wali', sw.wali || '-']].map(function (r) { return '<div class="row between small" style="padding:7px 0;border-bottom:1px solid var(--line-2)"><span class="muted">' + r[0] + '</span><b style="color:var(--ink)">' + esc(r[1] || '-') + '</b></div>'; }).join('') + '</div>' +
      '<div class="stack"><div class="card pad"><div class="row between small"><span class="muted">Kelengkapan Profil</span><b style="color:var(--brand)">' + (sw.kelengkapan || 0) + '%</b></div><div class="bar" style="margin-top:8px"><i style="width:' + (sw.kelengkapan || 0) + '%"></i></div><p class="small muted" style="margin-bottom:0">Kelengkapan dihitung dari data yang diisi sekolah.</p></div>' +
      '<div class="card pad"><h3 style="font-size:14px">Keamanan</h3><p class="small muted">Token PIN bersifat rahasia dan hanya berlaku untuk satu ujian. Jangan bagikan token kepada siapa pun.</p><button class="btn ghost" id="bOut2">' + ic('out') + 'Keluar dari perangkat ini</button></div></div></div>';
    $('#bOut2').onclick = keluar;
  }
  function pgPengaturan(v) {
    const tema = A.LS.get('uk_tema', 'terang'), fsz = A.LS.get('uk_fsz', 17);
    v.innerHTML = judul('Pengaturan', 'Sesuaikan tampilan portal ujian di perangkat ini.') +
      '<div class="grid g2"><div class="card pad-lg"><h3 style="font-size:15px">Tampilan</h3><div class="field" style="margin-top:14px"><label>Tema</label><div class="seg" id="sTema">' + [['terang', 'Terang'], ['gelap', 'Gelap'], ['sistem', 'Ikuti sistem']].map(function (t) { return '<button data-t="' + t[0] + '" class="' + (tema === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="field" style="margin-top:16px"><label>Ukuran huruf soal</label><div class="seg" id="sFs">' + [[15, 'Kecil'], [17, 'Normal'], [20, 'Besar']].map(function (t) { return '<button data-f="' + t[0] + '" class="' + (fsz === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div></div></div>' +
      '<div class="card pad-lg"><h3 style="font-size:15px">Data di perangkat</h3><p class="small muted">Portal menyimpan cache tampilan & cadangan jawaban sementara agar tetap cepat dan aman saat koneksi putus.</p><button class="btn ghost" id="bBersih">' + ic('trash') + 'Bersihkan cache tampilan</button></div></div>';
    $$('#sTema button').forEach(function (b) { b.onclick = function () { A.tema.set(b.dataset.t); pgPengaturan(v); }; });
    $$('#sFs button').forEach(function (b) { b.onclick = function () { A.LS.set('uk_fsz', Number(b.dataset.f)); pgPengaturan(v); A.toast('Ukuran huruf disimpan.', 'ok'); }; });
    $('#bBersih').onclick = function () { A.swrClear(); A.toast('Cache tampilan dibersihkan.', 'ok'); muatHome(true); };
  }

  // ============================================================================
  // MULAI
  // ============================================================================
  function mulai() {
    if (!A.Sesi.token()) { tampilLogin(); return; }
    tampilShell();
    // lanjutkan otomatis ke ruang ujian bila sesi sedang berjalan (mis. setelah refresh)
    A.api('s.home').then(function (r) {
      if (r.success && r.data.sesi && r.data.sesi.status === 'Berjalan' && rute().nama !== 'hasil') {
        A.toast('Ujian Anda masih berjalan — melanjutkan…', 'warn');
        A.api('s.mulai').then(function (m) { if (m.success && !m.data.selesai) mulaiUjian(m.data); });
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
})();
