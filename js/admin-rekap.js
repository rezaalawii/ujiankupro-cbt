/* ============================================================================
   UjianKu Pro — Rekap Nilai, Analisis Butir Soal (P, D, pengecoh, KR-20),
   Rekap Global per kelas/mapel. Ekspor Excel, cetak laporan, umumkan nilai.
   ============================================================================ */
(function () {
  'use strict';
  const A = window.App, ADM = window.ADM, $ = A.$, $$ = A.$$, esc = A.esc, ic = A.icon, F = A.fmt;
  const R = { paketId: '', tab: A.LS.get('uk_rekap_tab', 'nilai'), kelas: '', status: '', q: '', urut: 'skor', fButir: '', data: null, global: null };
  const warnaD = { 'Sangat Baik': 'green', Baik: 'green', Cukup: 'amber', Jelek: 'rose', Negatif: 'rose' };
  const warnaP = { Mudah: 'green', Sedang: 'blue', Sukar: 'rose' };
  const warnaSt = { Diterima: 'green', Revisi: 'amber', Dibuang: 'rose' };

  function statusBaris(r, kkm) {
    if (r.status === 'Selesai') return r.skor >= kkm ? ['Tuntas', 'green'] : ['Remedial', 'rose'];
    if (r.status === 'Berjalan') return ['Mengerjakan', 'blue'];
    if (r.status === 'Tidak Hadir') return ['Belum/Tidak Hadir', ''];
    return [r.status, 'amber'];
  }

  ADM.reg('rekap', function (v, id) {
    if (id) R.paketId = id;
    v.innerHTML = ADM.judul('Rekap Nilai & Analisis Butir', 'Statistik hasil, ketuntasan KKM, analisis butir soal (tingkat kesukaran, daya pembeda, efektivitas pengecoh) dan reliabilitas KR-20.',
      '<button class="btn ghost" id="rxCetak">' + ic('print', 'sm') + 'Cetak</button><button class="btn ghost" id="rxExp">' + ic('download', 'sm') + 'Ekspor Excel</button><button class="btn primary" id="rxUmum">' + ic('send', 'sm') + 'Umumkan</button>', 'Utama › <b>Rekap &amp; Analisis</b>') +
      '<div class="row wrap between" style="margin-bottom:16px"><div class="chips" id="rxTab">' + [['nilai', 'Rekap Nilai', 'chart'], ['butir', 'Analisis Butir Soal', 'target'], ['global', 'Rekap Global', 'globe']].map(function (t) { return '<button class="chip ' + (R.tab === t[0] ? 'on' : '') + '" data-t="' + t[0] + '">' + ic(t[2], 'sm') + t[1] + '</button>'; }).join('') + '</div>' +
      '<select class="sel" id="rxPaket" style="width:auto;min-width:280px"><option>Memuat paket…</option></select></div><div id="rxIsi"><div class="skel" style="height:420px"></div></div>';
    $$('#rxTab [data-t]').forEach(function (b) { b.onclick = function () { R.tab = b.dataset.t; A.LS.set('uk_rekap_tab', R.tab); $$('#rxTab [data-t]').forEach(function (x) { x.classList.toggle('on', x === b); }); tampil(); }; });
    $('#rxPaket').onchange = function () { R.paketId = this.value; R.kelas = ''; history.replaceState(null, '', '#/rekap/' + R.paketId); muat(); };
    $('#rxExp').onclick = ekspor; $('#rxCetak').onclick = cetak; $('#rxUmum').onclick = umumkan;
    const muat = function () {
      $('#rxIsi').innerHTML = '<div class="skel" style="height:420px"></div>';
      A.swr('rekap_' + (R.paketId || 'auto'), function () { return A.apiQ('rekap.paket', { paketId: R.paketId }); }, { maxAge: 30000, render: function (d) { R.data = d; if (d.paket) R.paketId = d.paket.id; isiPilihan(); tampil(); }, onError: function (r) { if ($('#rxIsi')) $('#rxIsi').innerHTML = '<div class="card pad empty">' + esc(r.message) + '</div>'; } });
    };
    const isiPilihan = function () {
      const d = R.data, s = $('#rxPaket'); if (!s) return;
      s.innerHTML = d.daftarPaket.length ? d.daftarPaket.map(function (p) { return '<option value="' + p.id + '"' + (d.paket && p.id === d.paket.id ? ' selected' : '') + '>' + esc(p.nama) + ' (' + esc(p.kode) + ') · ' + p.status + '</option>'; }).join('') : '<option value="">Belum ada paket terbit</option>';
    };
    const tampil = function () {
      if (!$('#rxIsi')) return;
      const umum = $('#rxUmum'), exp = $('#rxExp'), ct = $('#rxCetak');
      [umum, exp, ct].forEach(function (b) { b.style.display = R.tab === 'global' && b !== exp ? 'none' : ''; });
      if (R.tab === 'global') return tabGlobal($('#rxIsi'));
      if (!R.data) return;
      if (!R.data.paket) { $('#rxIsi').innerHTML = '<div class="card pad empty">' + ic('chart', 'xl') + '<div>Belum ada paket ujian yang diterbitkan.</div></div>'; return; }
      $('#rxIsi').innerHTML = banner() + (R.tab === 'butir' ? tabButir() : tabNilai());
      ikat();
    };
    R._muat = muat; R._tampil = tampil;
    muat();
  });

  function banner() {
    const d = R.data, p = d.paket, k = d.kpi;
    return '<div class="navy-banner row between wrap" style="gap:14px;margin-bottom:16px"><div class="row" style="gap:14px"><span class="chip-ic" style="background:rgba(255,255,255,.1);color:#a5f3fc">' + ic('layers') + '</span><div><div class="row wrap" style="gap:8px"><b style="color:#fff;font-size:16px">' + esc(p.nama) + '</b>' + ADM.badgeStatus(p.status) + '</div>' +
      '<div class="small" style="color:#cbd5e1">' + esc(p.mapel) + ' · ' + esc(p.kelas) + ' · ' + F.tglJam(p.buka) + ' · ' + p.jumlahSoal + ' soal · ' + p.durasi + ' menit · <span class="mono">' + esc(p.kode) + '</span></div></div></div>' +
      '<div class="row" style="gap:10px"><div style="text-align:right"><div class="tiny" style="color:#94a3b8;letter-spacing:.08em">KKM</div><b style="color:#fff;font-size:22px">' + p.kkm + '</b></div></div></div>' +
      '<div class="grid g5">' + ADM.kpi('Peserta', k.selesai + ' <small>/ ' + k.peserta + '</small>', k.hadir + ' hadir · ' + (k.peserta - k.hadir) + ' belum', 't-blue', 'users') +
      ADM.kpi('Rata-rata', k.selesai ? F.angka(k.rata) : '—', 'Simpangan baku ' + (k.selesai ? F.angka(k.deviasi, 2) : '-'), 't-purple', 'chart') +
      ADM.kpi('Tertinggi', k.tertinggi ? F.angka(k.tertinggi.skor) : '—', k.tertinggi ? esc(k.tertinggi.nama) : '-', 't-green', 'trophy') +
      ADM.kpi('Terendah', k.terendah ? F.angka(k.terendah.skor) : '—', k.terendah ? esc(k.terendah.nama) : '-', 't-amber', 'target') +
      ADM.kpi('Ketuntasan', k.selesai ? F.angka(k.ketuntasan) + '%' : '—', k.lulus + ' tuntas · ' + k.remedial + ' remedial', 't-rose', 'checkc', '<div class="bar green" style="margin-top:10px;position:relative"><i style="width:' + k.ketuntasan + '%"></i></div>') + '</div>';
  }

  // ---------------------------------------------------------------- NILAI
  function tabNilai() {
    const d = R.data, p = d.paket, idxT = d.distribusi.map(function (x) { return x.kategori; }).indexOf('Tuntas');
    const grafik = A.chart.batang(d.distribusi.map(function (x) { return { label: x.label, v: x.jumlah, warna: x.kategori === 'Remedial' ? '#e11d48' : x.kategori === 'Optimal' ? '#10b981' : '#1E4FD8', ket: x.kategori }; }), { h: 170, garis: idxT > 0 ? { setelah: idxT, label: 'KKM ' + p.kkm } : null });
    return '<div class="grid layout-2-1" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr);margin-top:16px;align-items:start"><div class="card"><div class="card-h"><div><h3>Distribusi Nilai</h3><p>Sebaran berdasarkan rentang terhadap KKM ' + p.kkm + '</p></div></div><div class="card-b">' + (d.kpi.selesai ? grafik : '<div class="empty">Belum ada peserta yang selesai.</div>') + '</div></div>' +
      '<div class="card"><div class="card-h"><div><h3>Rekomendasi Remedial</h3><p>Topik dengan jawaban salah tertinggi</p></div></div><div class="card-b stack-sm">' + (d.remedial.length ? d.remedial.map(function (t, i) {
        return '<div class="list-item"><span class="chip-ic sm ' + (i === 0 ? 't-rose' : 't-amber') + '">' + (i + 1) + '</span><div class="grow"><b class="small" style="color:var(--ink)">' + esc(t.topik || 'Tanpa topik') + '</b><div class="bar ' + (t.salahPersen >= 50 ? 'rose' : 'amber') + '" style="margin-top:6px"><i style="width:' + t.salahPersen + '%"></i></div></div><b class="small" style="color:var(--rose)">' + F.angka(t.salahPersen) + '%</b></div>';
      }).join('') + '<p class="tiny muted" style="margin:4px 0 0">Persentase jawaban salah dari seluruh butir bertopik sama.</p>' : '<div class="empty small">Data belum cukup.</div>') + '</div></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-h wrap" style="gap:12px"><div><h3>Daftar Nilai Peserta</h3><p>Klik nama untuk melihat jawaban per butir</p></div><div class="row wrap"><div class="search" style="min-width:200px">' + ic('search') + '<input class="inp sm" id="rnQ" placeholder="Cari nama/NIS…" value="' + esc(R.q) + '"></div>' +
      '<select class="sel" id="rnKelas" style="width:auto"><option value="">Semua kelas</option>' + d.kelas.map(function (k) { return '<option' + (k === R.kelas ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select>' +
      '<select class="sel" id="rnStatus" style="width:auto"><option value="">Semua status</option>' + ['Tuntas', 'Remedial', 'Mengerjakan', 'Belum/Tidak Hadir'].map(function (s) { return '<option' + (s === R.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num" style="width:50px">#</th><th data-sort="nama" style="cursor:pointer">Siswa ' + ic('cdown', 'sm') + '</th><th>Kelas</th><th class="num">Benar</th><th class="num">Salah</th><th class="num">Kosong</th><th data-sort="skor" class="num" style="cursor:pointer">Nilai ' + ic('cdown', 'sm') + '</th><th>Status</th><th data-sort="durasi" style="cursor:pointer">Durasi ' + ic('cdown', 'sm') + '</th><th class="num">Pelanggaran</th><th class="right">Aksi</th></tr></thead><tbody id="rnBody"></tbody></table></div></div>';
  }
  function barisNilai() {
    const d = R.data, kkm = d.paket.kkm, q = R.q.toLowerCase();
    let rows = d.rows.filter(function (r) { const s = statusBaris(r, kkm)[0]; return (!R.kelas || r.kelas === R.kelas) && (!R.status || s === R.status) && (!q || (r.nama + ' ' + r.nis).toLowerCase().indexOf(q) > -1); });
    rows = rows.slice().sort(function (a, b) {
      if (R.urut === 'nama') return String(a.nama).localeCompare(b.nama);
      if (R.urut === 'durasi') return (a.detik === null || a.detik === undefined ? 1e9 : a.detik) - (b.detik === null || b.detik === undefined ? 1e9 : b.detik);
      return (b.skor === null || b.skor === undefined ? -1 : b.skor) - (a.skor === null || a.skor === undefined ? -1 : a.skor);
    });
    return rows;
  }
  function isiTabelNilai() {
    const d = R.data, kkm = d.paket.kkm, rows = barisNilai();
    const peringkat = {}; d.rows.filter(function (r) { return r.skor !== null && r.skor !== undefined; }).forEach(function (r, i) { peringkat[r.siswaId] = i + 1; });
    $('#rnBody').innerHTML = rows.length ? rows.map(function (r) {
      const st = statusBaris(r, kkm), ada = r.skor !== null && r.skor !== undefined;
      return '<tr class="' + (st[0] === 'Remedial' ? 'warn' : '') + '"><td class="num"><b>' + (peringkat[r.siswaId] || '—') + '</b></td><td><div class="row" style="gap:10px"><div class="avatar sm">' + esc(A.inisial(r.nama)) + '</div><div><b style="color:var(--ink);' + (r.sesiId ? 'cursor:pointer' : '') + '" ' + (r.sesiId ? 'data-det="' + r.sesiId + '"' : '') + '>' + esc(r.nama) + '</b><div class="tiny muted mono">' + esc(r.nis) + '</div></div></div></td>' +
        '<td class="small">' + esc(r.kelas) + '</td><td class="num" style="color:var(--green)">' + (ada ? r.benar : '—') + '</td><td class="num" style="color:var(--rose)">' + (ada ? r.salah : '—') + '</td><td class="num muted">' + (ada ? r.kosong : '—') + '</td>' +
        '<td class="num"><b style="font-size:15px;color:' + (!ada ? 'var(--muted)' : r.skor >= kkm ? 'var(--green)' : 'var(--rose)') + '">' + (ada ? F.angka(r.skor) : '—') + '</b></td>' +
        '<td><span class="badge dot ' + st[1] + '">' + esc(st[0]) + '</span></td><td class="small mono">' + (r.detik ? F.menit(r.detik) : '—') + (r.cara && r.cara !== 'Siswa' ? '<div class="tiny muted">' + esc(r.cara) + '</div>' : '') + '</td>' +
        '<td class="num">' + (r.pelanggaran ? '<span class="badge rose">' + r.pelanggaran + '×</span>' : '<span class="muted">0</span>') + '</td>' +
        '<td class="act">' + (r.sesiId ? '<button class="btn sm ghost" data-det="' + r.sesiId + '">' + ic('eye', 'sm') + 'Jawaban</button>' : '') + '</td></tr>';
    }).join('') : A.tabelKosong(11, 'Tidak ada peserta pada filter ini.', 'users');
    $$('[data-det]', $('#rnBody')).forEach(function (b) { b.onclick = function () { ADM.detailSesi(b.dataset.det); }; });
  }

  // ---------------------------------------------------------------- BUTIR
  function tabButir() {
    const b = R.data.butir, p = R.data.paket;
    if (!b.cukup) return '<div class="card pad empty" style="margin-top:16px">' + ic('target', 'xl') + '<div>' + esc(b.pesan) + '</div><div class="tiny muted">Peserta selesai saat ini: ' + b.n + '</div></div>';
    const total = b.items.length || 1;
    const kartu = function (lbl, val, sub, tone) { return '<div class="card stat"><div class="row between"><span class="l">' + lbl + '</span><span class="badge ' + tone + '">' + sub + '</span></div><div class="v">' + val + '</div></div>'; };
    return '<div class="grid g4" style="margin-top:16px">' + kartu('Reliabilitas KR-20', b.kr20 === null ? '—' : F.angka(b.kr20, 2), esc(b.labelKr20), b.kr20 >= 0.7 ? 'green' : b.kr20 >= 0.5 ? 'amber' : 'rose') +
      kartu('Rata-rata Kesukaran (P)', F.angka(b.rataP, 2), b.rataP > 0.7 ? 'Mudah' : b.rataP < 0.3 ? 'Sukar' : 'Sedang', 'blue') + kartu('Rata-rata Daya Pembeda (D)', F.angka(b.rataD, 2), b.rataD >= 0.3 ? 'Baik' : b.rataD >= 0.2 ? 'Cukup' : 'Rendah', b.rataD >= 0.3 ? 'green' : b.rataD >= 0.2 ? 'amber' : 'rose') +
      kartu('Efektivitas Pengecoh', b.efektivitasPengecoh + '%', b.efektivitasPengecoh >= 75 ? 'Baik' : 'Perlu revisi', b.efektivitasPengecoh >= 75 ? 'green' : 'amber') + '</div>' +
      '<div class="grid g2" style="margin-top:16px"><div class="card pad"><div class="row between"><b style="color:var(--ink)">Keputusan Butir</b><span class="tiny muted">' + b.n + ' peserta · kelompok atas/bawah ' + b.k27 + ' siswa (27%)</span></div><div class="row" style="gap:18px;margin-top:12px">' +
      A.chart.donat([{ v: b.status.Diterima, warna: '#10b981' }, { v: b.status.Revisi, warna: '#f59e0b' }, { v: b.status.Dibuang, warna: '#e11d48' }], { size: 104, tengah: '<b>' + b.items.length + '</b><div class="tiny muted">butir</div>' }) +
      '<div class="legend grow">' + [['Diterima', '#10b981'], ['Revisi', '#f59e0b'], ['Dibuang', '#e11d48']].map(function (x) { return '<div class="li"><span><span class="sw" style="background:' + x[1] + '"></span>' + x[0] + '</span><b>' + b.status[x[0]] + ' <span class="muted tiny">(' + Math.round(b.status[x[0]] / total * 100) + '%)</span></b></div>'; }).join('') + '</div></div></div>' +
      '<div class="card pad"><b style="color:var(--ink)">Komposisi Tingkat Kesukaran (empiris)</b><div class="ratio" style="margin-top:14px;height:22px;background:var(--line-2)">' + [['Mudah', '#10b981'], ['Sedang', '#1E4FD8'], ['Sukar', '#e11d48']].map(function (x) { return '<span style="width:' + (b.kesukaran[x[0]] / total * 100) + '%;background:' + x[1] + '">' + (b.kesukaran[x[0]] ? b.kesukaran[x[0]] : '') + '</span>'; }).join('') + '</div>' +
      '<div class="row between tiny muted" style="margin-top:8px"><span>Mudah P&gt;0,70</span><span>Sedang 0,30–0,70</span><span>Sukar P&lt;0,30</span></div>' +
      (p.pemilikSaya && ADM.isGuru() ? '<button class="btn sm soft" id="rbTerap" style="margin-top:14px">' + ic('refresh', 'sm') + 'Terapkan label kesukaran ke bank soal</button>' : '') + '</div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-h wrap" style="gap:10px"><div><h3>Analisis per Butir</h3><p>Kotak = persentase pemilih tiap opsi · <span class="badge blue" style="height:18px">kunci</span> <span class="badge amber" style="height:18px">pengecoh menjebak</span> <span class="badge rose" style="height:18px">pengecoh mati</span></p></div>' +
      '<div class="chips" id="rbF">' + [['', 'Semua', b.items.length], ['Diterima', 'Diterima', b.status.Diterima], ['Revisi', 'Revisi', b.status.Revisi], ['Dibuang', 'Dibuang', b.status.Dibuang]].map(function (t) { return '<button class="chip ' + (R.fButir === t[0] ? 'on' : '') + '" data-f="' + t[0] + '">' + t[1] + ' <span class="pill-n">' + t[2] + '</span></button>'; }).join('') + '</div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num">No</th><th>Butir Soal</th><th>Kesukaran (P)</th><th>Daya Pembeda (D)</th><th>Atas / Bawah</th><th>Distribusi Jawaban</th><th>Keputusan</th><th class="right"></th></tr></thead><tbody id="rbBody"></tbody></table></div></div>';
  }
  function isiTabelButir() {
    const items = R.data.butir.items.filter(function (it) { return !R.fButir || it.status === R.fButir; });
    $('#rbBody').innerHTML = items.length ? items.map(function (it) {
      const jebak = it.opsi.filter(function (o) { return !o.kunci && o.atas > it.grupBenar.atas && o.atas > 0; }).map(function (o) { return o.k; });
      return '<tr class="' + (it.status === 'Dibuang' ? 'warn' : '') + '"><td class="num"><b>' + it.no + '</b></td><td style="max-width:340px"><div class="small" style="color:var(--ink);cursor:pointer" data-ins="' + it.id + '">' + esc(ADM.teksPolos(it.teks, 110)) + '</div><div class="row wrap tiny" style="gap:5px;margin-top:5px">' + (it.topik ? '<span class="tag">' + esc(it.topik) + '</span>' : '') + '<span class="tag">' + esc(it.bloom || '') + '</span>' + (it.kosong ? '<span class="muted">' + it.kosong + ' kosong</span>' : '') + '</div></td>' +
        '<td><b class="mono">' + F.angka(it.P, 2) + '</b> <span class="badge ' + warnaP[it.labelP] + '">' + it.labelP + '</span>' + (it.kesukaranBank && it.kesukaranBank !== it.labelP ? '<div class="tiny muted">bank: ' + esc(it.kesukaranBank) + '</div>' : '') + '</td>' +
        '<td><b class="mono" style="color:' + (it.D < 0 ? 'var(--rose)' : 'var(--ink)') + '">' + F.angka(it.D, 2) + '</b> <span class="badge ' + warnaD[it.labelD] + '">' + it.labelD + '</span></td>' +
        '<td style="min-width:120px"><div class="ratio" style="background:var(--line-2)"><span style="width:' + (it.atas || 0) / 2 + '%;background:#1E4FD8">' + (it.atas === null ? '' : it.atas + '%') + '</span><span style="width:' + (it.bawah || 0) / 2 + '%;background:#f59e0b">' + (it.bawah === null ? '' : it.bawah + '%') + '</span></div><div class="tiny muted" style="margin-top:3px">benar atas · bawah</div></td>' +
        '<td><div class="row" style="gap:4px">' + it.opsi.map(function (o) { return '<span class="dist-box ' + (o.kunci ? 'k ' : '') + (jebak.indexOf(o.k) > -1 ? 'jebak ' : '') + (!o.kunci && o.total === 0 ? 'mati' : '') + '" title="' + esc(o.k + ': ' + o.total + ' pemilih (' + o.persen + '%)') + '"><b>' + o.k + '</b>' + Math.round(o.persen) + '</span>'; }).join('') + '</div></td>' +
        '<td><span class="badge dot ' + warnaSt[it.status] + '">' + it.status + '</span></td><td class="act"><button class="iconbtn" data-ins="' + it.id + '" title="Inspeksi">' + ic('search') + '</button></td></tr>';
    }).join('') : A.tabelKosong(8, 'Tidak ada butir pada filter ini.');
    $$('[data-ins]', $('#rbBody')).forEach(function (b) { b.onclick = function () { inspeksi(R.data.butir.items.filter(function (x) { return x.id === b.dataset.ins; })[0]); }; });
  }
  function inspeksi(it) {
    if (!it) return;
    const n = it.grupN, gb = it.grupBenar;
    const dr = A.drawer({ title: 'Inspektur Butir No. ' + it.no, sub: (it.topik || '-') + ' · ' + (it.bloom || '') + ' · ' + it.n + ' peserta', size: 'lg',
      body: '<div class="grid g4 keep2">' + [['P', F.angka(it.P, 2), it.labelP, warnaP[it.labelP]], ['D', F.angka(it.D, 2), it.labelD, warnaD[it.labelD]], ['Atas benar', gb.atas + '/' + n.atas, it.atas === null ? '-' : it.atas + '%', 'blue'], ['Bawah benar', gb.bawah + '/' + n.bawah, it.bawah === null ? '-' : it.bawah + '%', 'amber']].map(function (x) { return '<div class="card soft" style="padding:12px"><div class="tiny muted">' + x[0] + '</div><div class="xb" style="font-size:20px;color:var(--ink)">' + x[1] + '</div><span class="badge ' + x[3] + '">' + esc(x[2]) + '</span></div>'; }).join('') + '</div>' +
        '<div class="q-card" style="padding:16px;margin-top:14px"><div class="q-text">' + A.soalHtml(it.teks) + '</div>' + (it.gambar ? '<img class="q-img" src="' + esc(it.gambar) + '" alt="" referrerpolicy="no-referrer">' : '') + '</div>' +
        '<div class="tbl-wrap" style="margin-top:14px;border:1px solid var(--line);border-radius:12px"><table class="tbl"><thead><tr><th>Opsi</th><th>Teks</th><th class="num">Atas</th><th class="num">Tengah</th><th class="num">Bawah</th><th class="num">Total</th><th>Efektif</th></tr></thead><tbody>' +
        it.opsi.map(function (o) { return '<tr class="' + (o.kunci ? 'ok' : '') + '"><td><b>' + o.k + '</b>' + (o.kunci ? ' <span class="badge green">kunci</span>' : '') + '</td><td class="small" style="max-width:260px">' + A.soalHtml(String(o.teks || '').slice(0, 160)) + '</td><td class="num">' + o.atas + '</td><td class="num">' + o.tengah + '</td><td class="num">' + o.bawah + '</td><td class="num"><b>' + o.total + '</b> <span class="tiny muted">' + o.persen + '%</span></td>' +
          '<td>' + (o.kunci ? '—' : o.efektif ? '<span class="badge green">Efektif</span>' : o.total === 0 ? '<span class="badge rose">Mati</span>' : '<span class="badge amber">Kurang</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="alert ' + (it.status === 'Diterima' ? 'green' : it.status === 'Revisi' ? 'amber' : 'rose') + '" style="margin-top:14px">' + ic(it.status === 'Diterima' ? 'checkc' : 'warn') + '<div><b>Keputusan: ' + it.status + '</b>' + (it.catatan.length ? '<ul class="small" style="margin:6px 0 0;padding-left:18px">' + it.catatan.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' : '<div class="small">Butir berfungsi baik: tingkat kesukaran wajar dan mampu membedakan siswa.</div>') + '</div></div>' +
        '<p class="tiny muted">Kriteria: P = proporsi menjawab benar. D = P(atas) − P(bawah) dengan kelompok 27% teratas & terbawah. Pengecoh efektif bila dipilih ≥5% dan lebih banyak oleh kelompok bawah.</p>' +
        (R.data.paket.pemilikSaya && ADM.isGuru() ? '<a class="btn primary" href="#/bank-soal/' + it.id + '">' + ic('edit', 'sm') + 'Revisi soal di bank soal</a>' : '') });
    $$('a', dr.el).forEach(function (a) { a.addEventListener('click', function () { dr.close(); }); });
    A.renderMath(dr.body);
  }

  function ikat() {
    if ($('#rnBody')) {
      isiTabelNilai();
      $('#rnQ').oninput = A.debounce(function (e) { R.q = e.target.value; isiTabelNilai(); }, 200);
      $('#rnKelas').onchange = function () { R.kelas = this.value; isiTabelNilai(); };
      $('#rnStatus').onchange = function () { R.status = this.value; isiTabelNilai(); };
      $$('[data-sort]').forEach(function (th) { th.onclick = function () { R.urut = th.dataset.sort; isiTabelNilai(); }; });
    }
    if ($('#rbBody')) {
      isiTabelButir();
      $$('#rbF [data-f]').forEach(function (b) { b.onclick = function () { R.fButir = b.dataset.f; $$('#rbF [data-f]').forEach(function (x) { x.classList.toggle('on', x === b); }); isiTabelButir(); }; });
      if ($('#rbTerap')) $('#rbTerap').onclick = async function () {
        if (!await A.confirm('Perbarui label kesukaran (Mudah/Sedang/Sukar) di bank soal sesuai hasil analisis empiris paket ini? Hanya soal milik Anda yang diubah.', { ok: 'Terapkan' })) return;
        const r = await A.aksi(this, 'rekap.terapkanKesukaran', { paketId: R.paketId }); if (r.success) { A.swrClear('soal'); A.swrClear('rekap_'); R._muat(); }
      };
    }
  }

  // ---------------------------------------------------------------- GLOBAL
  function tabGlobal(el) {
    el.innerHTML = '<div class="skel" style="height:420px"></div>';
    A.swr('rekap_global', function () { return A.apiQ('rekap.global', {}); }, { maxAge: 60000, render: function (d) {
      R.global = d; if (R.tab !== 'global' || !$('#rxIsi')) return;
      const q = { s: '' };
      el.innerHTML = '<div class="grid g2"><div class="card"><div class="card-h"><div><h3>Rata-rata per Kelas</h3><p>' + d.perKelas.length + ' kelas · seluruh ujian selesai</p></div></div><div class="card-b">' +
        (d.perKelas.length ? A.chart.batang(d.perKelas.sort(function (a, b) { return String(a.kelas).localeCompare(b.kelas); }).map(function (k) { return { label: k.kelas, v: k.rata, warna: k.ketuntasan >= 75 ? '#1E4FD8' : k.ketuntasan >= 50 ? '#f59e0b' : '#e11d48', ket: k.ketuntasan + '% tuntas' }; }), { h: 160 }) : '<div class="empty">Belum ada data.</div>') + '</div></div>' +
        '<div class="card"><div class="card-h"><div><h3>Per Mata Pelajaran</h3><p>Rata-rata & ketuntasan</p></div></div><div class="card-b stack-sm">' + (d.perMapel.length ? d.perMapel.sort(function (a, b) { return b.rata - a.rata; }).map(function (m) {
          return '<div><div class="row between small"><b style="color:var(--ink)">' + esc(m.mapel) + '</b><span><b>' + F.angka(m.rata) + '</b> <span class="muted">· ' + m.ketuntasan + '% tuntas · ' + m.n + ' sesi</span></span></div><div class="bar ' + (m.ketuntasan >= 75 ? 'green' : m.ketuntasan >= 50 ? 'amber' : 'rose') + '" style="margin-top:5px"><i style="width:' + m.ketuntasan + '%"></i></div></div>';
        }).join('') : '<div class="empty">Belum ada data.</div>') + '</div></div></div>' +
        '<div class="card" style="margin-top:16px"><div class="card-h"><div><h3>Riwayat Nilai Terbaru</h3><p>Maks. 1.000 hasil terakhir</p></div><div class="search" style="min-width:220px">' + ic('search') + '<input class="inp sm" id="rgQ" placeholder="Cari nama, kelas, paket…"></div></div><div class="tbl-wrap"><table class="tbl" id="rgT"><thead><tr><th>Tanggal</th><th>Siswa</th><th>Kelas</th><th>Paket</th><th>Mapel</th><th class="num">Nilai</th><th>Status</th><th></th></tr></thead><tbody id="rgBody"></tbody></table></div><div class="pager" id="rgT_pg"></div></div>';
      const t = ADM.tabelKlien({ id: 'rgT', kolom: 8, per: 25, rows: function () { return d.rows; }, cari: function (r) { return r.nama + ' ' + r.nis + ' ' + r.kelas + ' ' + r.paket + ' ' + r.mapel + ' ' + r.kode; },
        baris: function (r) { return '<tr><td class="small nowrap">' + F.tgl(r.tanggal) + '</td><td><b style="color:var(--ink)">' + esc(r.nama) + '</b><div class="tiny muted mono">' + esc(r.nis) + '</div></td><td class="small">' + esc(r.kelas) + '</td><td class="small">' + esc(r.paket) + ' <span class="tiny muted mono">' + esc(r.kode) + '</span></td><td class="small">' + esc(r.mapel) + '</td><td class="num"><b style="color:' + (r.lulus ? 'var(--green)' : 'var(--rose)') + '">' + F.angka(r.skor) + '</b></td><td><span class="badge dot ' + (r.lulus ? 'green' : 'rose') + '">' + (r.lulus ? 'Tuntas' : 'Remedial') + '</span></td><td class="act"><button class="iconbtn" data-det="' + r.sesiId + '">' + ic('eye') + '</button></td></tr>'; },
        after: function () { $$('#rgBody [data-det]').forEach(function (b) { b.onclick = function () { ADM.detailSesi(b.dataset.det); }; }); } });
      t.render();
      $('#rgQ').oninput = A.debounce(function (e) { t.cari(e.target.value); }, 200);
    }, onError: function (r) { el.innerHTML = '<div class="card pad empty">' + esc(r.message) + '</div>'; } });
  }

  // ---------------------------------------------------------------- EKSPOR / CETAK / UMUMKAN
  function ekspor() {
    if (R.tab === 'global') {
      const g = R.global; if (!g) return;
      return A.exportXlsx({ PerKelas: g.perKelas.map(function (k) { return { Kelas: k.kelas, Sesi: k.n, RataRata: k.rata, Tuntas: k.lulus, KetuntasanPersen: k.ketuntasan }; }), PerMapel: g.perMapel.map(function (m) { return { Mapel: m.mapel, Sesi: m.n, RataRata: m.rata, Tuntas: m.lulus, KetuntasanPersen: m.ketuntasan }; }),
        Riwayat: g.rows.map(function (r) { return { Tanggal: F.tglJam(r.tanggal), Nama: r.nama, NIS: r.nis, Kelas: r.kelas, Paket: r.paket, Kode: r.kode, Mapel: r.mapel, Nilai: r.skor, KKM: r.kkm, Status: r.lulus ? 'Tuntas' : 'Remedial' }; }) }, 'Rekap Global ' + F.tgl(new Date()));
    }
    const d = R.data; if (!d || !d.paket) return;
    const kkm = d.paket.kkm, sh = {
      Nilai: d.rows.map(function (r, i) { return { No: i + 1, Nama: r.nama, NIS: r.nis, Kelas: r.kelas, Benar: r.benar, Salah: r.salah, Kosong: r.kosong, Nilai: r.skor, KKM: kkm, Status: statusBaris(r, kkm)[0], DurasiMenit: r.menit, Pelanggaran: r.pelanggaran, Selesai: r.selesai ? F.tglJam(r.selesai) : '' }; }),
      Ringkasan: [{ Paket: d.paket.nama, Kode: d.paket.kode, Mapel: d.paket.mapel, Kelas: d.paket.kelas, Peserta: d.kpi.peserta, Selesai: d.kpi.selesai, RataRata: d.kpi.rata, SimpanganBaku: d.kpi.deviasi, Tertinggi: d.kpi.tertinggi ? d.kpi.tertinggi.skor : '', Terendah: d.kpi.terendah ? d.kpi.terendah.skor : '', Tuntas: d.kpi.lulus, Remedial: d.kpi.remedial, KetuntasanPersen: d.kpi.ketuntasan, KR20: d.butir.kr20 }],
      Distribusi: d.distribusi.map(function (x) { return { Rentang: x.label, Kategori: x.kategori, Jumlah: x.jumlah }; })
    };
    if (d.butir.cukup) sh.AnalisisButir = d.butir.items.map(function (it) { const o = { No: it.no, IDSoal: it.id, Topik: it.topik, Bloom: it.bloom, Kunci: it.kunci, P: it.P, LabelP: it.labelP, D: it.D, LabelD: it.labelD, BenarAtasPersen: it.atas, BenarBawahPersen: it.bawah, Keputusan: it.status, Catatan: it.catatan.join(' ') }; it.opsi.forEach(function (op) { o['Opsi' + op.k + 'Persen'] = op.persen; }); return o; });
    A.exportXlsx(sh, 'Rekap ' + d.paket.kode + ' ' + d.paket.nama);
  }
  function cetak() {
    const d = R.data; if (!d || !d.paket) return;
    const p = d.paket, k = d.kpi, s = A.setting || {}, kkm = p.kkm;
    const html = '<div style="display:flex;justify-content:space-between;border-bottom:2px solid #13265C;padding-bottom:8px"><div><h1>' + esc(s.NAMA_LEMBAGA || 'UjianKu Pro') + '</h1><div class="muted">Laporan Hasil Ujian CBT · dicetak ' + F.tglJam(new Date()) + '</div></div><div style="text-align:right"><b>' + esc(p.kode) + '</b><div class="muted">KKM ' + kkm + '</div></div></div>' +
      '<h2>' + esc(p.nama) + '</h2><div class="muted">' + esc(p.mapel) + ' · ' + esc(p.kelas) + ' · ' + F.tglJam(p.buka) + ' · ' + p.jumlahSoal + ' soal · ' + p.durasi + ' menit</div>' +
      '<table><tr><th>Peserta</th><th>Selesai</th><th>Rata-rata</th><th>Simp. baku</th><th>Tertinggi</th><th>Terendah</th><th>Tuntas</th><th>Remedial</th><th>Ketuntasan</th><th>KR-20</th></tr><tr><td>' + k.peserta + '</td><td>' + k.selesai + '</td><td>' + F.angka(k.rata) + '</td><td>' + F.angka(k.deviasi, 2) + '</td><td>' + (k.tertinggi ? F.angka(k.tertinggi.skor) : '-') + '</td><td>' + (k.terendah ? F.angka(k.terendah.skor) : '-') + '</td><td>' + k.lulus + '</td><td>' + k.remedial + '</td><td>' + F.angka(k.ketuntasan) + '%</td><td>' + (d.butir.kr20 === null || d.butir.kr20 === undefined ? '-' : F.angka(d.butir.kr20, 2)) + '</td></tr></table>' +
      '<h2>Daftar Nilai</h2><table><tr><th>No</th><th>Nama</th><th>NIS</th><th>Kelas</th><th class="r">B</th><th class="r">S</th><th class="r">K</th><th class="r">Nilai</th><th>Status</th></tr>' + d.rows.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td>' + esc(r.nama) + '</td><td>' + esc(r.nis) + '</td><td>' + esc(r.kelas) + '</td><td class="r">' + (r.benar === undefined ? '-' : r.benar) + '</td><td class="r">' + (r.salah === undefined ? '-' : r.salah) + '</td><td class="r">' + (r.kosong === undefined ? '-' : r.kosong) + '</td><td class="r"><b>' + (r.skor === null || r.skor === undefined ? '-' : F.angka(r.skor)) + '</b></td><td>' + statusBaris(r, kkm)[0] + '</td></tr>'; }).join('') + '</table>' +
      (d.butir.cukup ? '<h2 style="page-break-before:always">Analisis Butir Soal</h2><table><tr><th>No</th><th>Topik</th><th>Kunci</th><th class="r">P</th><th>Kesukaran</th><th class="r">D</th><th>Daya Pembeda</th><th>Distribusi (%)</th><th>Keputusan</th></tr>' + d.butir.items.map(function (it) { return '<tr><td>' + it.no + '</td><td>' + esc(it.topik || '-') + '</td><td>' + esc(it.kunci) + '</td><td class="r">' + F.angka(it.P, 2) + '</td><td>' + it.labelP + '</td><td class="r">' + F.angka(it.D, 2) + '</td><td>' + it.labelD + '</td><td>' + it.opsi.map(function (o) { return (o.kunci ? '<b>' + o.k + '</b>' : o.k) + ':' + Math.round(o.persen); }).join(' ') + '</td><td>' + it.status + '</td></tr>'; }).join('') + '</table>' : '') +
      '<div style="margin-top:36px;display:flex;justify-content:flex-end"><div style="text-align:center;width:220px">' + F.tgl(new Date(), true) + '<br>Guru Mata Pelajaran<br><br><br><br>(_____________________)</div></div>';
    A.cetak('Laporan ' + p.kode, html);
  }
  function umumkan() {
    const d = R.data; if (!d || !d.paket) return;
    A.modal({ title: 'Umumkan Hasil Ujian', sub: d.paket.nama, icon: 'send', body: '<div class="stack-sm"><label class="opt-tile" style="cursor:pointer"><div><b>Kirim nilai ke semua peserta selesai</b><p>' + d.kpi.selesai + ' siswa · event "Nilai ujian terbit"</p></div><input type="radio" name="jn" value="nilai" checked></label>' +
      '<label class="opt-tile" style="cursor:pointer"><div><b>Kirim pemberitahuan remedial</b><p>' + d.kpi.remedial + ' siswa di bawah KKM · event "Remedial"</p></div><input type="radio" name="jn" value="remedial"></label>' +
      '<label class="check"><input type="checkbox" id="unW" checked> Sertakan nomor WA wali</label><div class="alert blue">' + ic('info') + '<div class="small">Pesan masuk antrean dan dikirim bertahap. Atur saklar kanal & isi template di menu <a href="#/notifikasi">WhatsApp &amp; Notifikasi</a>.</div></div></div>',
      actions: [{ label: 'Batal' }, { label: 'Kirim', cls: 'primary', icon: 'send', onClick: async function (b, bg) { const r = await A.api('rekap.umumkan', { paketId: d.paket.id, jenis: $('input[name=jn]:checked', bg).value, keWali: $('#unW', bg).checked }); if (!A.hasil(r)) return false; } }] });
  }
})();
