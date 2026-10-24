/* ============================================================================
   UjianKu Pro — Doc Engine: dokumen dari template Google Docs/Sheets/Slides,
   isian otomatis dari data ujian, persetujuan pejabat (akun + PIN), QR
   verifikasi, generate massal per peserta, pengaturan template & pejabat.
   ============================================================================ */
(function () {
  'use strict';
  const A = window.App, ADM = window.ADM, $ = A.$, $$ = A.$$, esc = A.esc, ic = A.icon, F = A.fmt;
  const ST = { DRAF: ['Draf', 'amber'], MENUNGGU_TTD: ['Menunggu TTD', 'blue'], TERBIT: ['Terbit', 'green'], DITARIK: ['Ditarik', 'rose'] };
  const ENG = { docs: ['Docs', 'blue'], sheets: ['Sheets', 'green'], slides: ['Slides', 'amber'] };
  const TIPE = [['teks', 'Teks singkat'], ['area', 'Teks panjang'], ['naskah', 'Naskah (paragraf)'], ['tanggal', 'Tanggal'], ['angka', 'Angka'], ['pilihan', 'Pilihan'], ['gambar', 'URL gambar'], ['daftar', 'Daftar/tabel']];
  const D = { tab: 'dokumen', status: '', tpl: null, pej: null };
  const urlVerif = function (kode) { const b = (A.setting || {}).VERIFIKASI_URL || location.href.replace(/[#?].*$/, '').replace(/admin\.html$/, 'verifikasi.html'); return b + (b.indexOf('?') > -1 ? '&' : '?') + 'k=' + encodeURIComponent(kode); };
  const muatTpl = function (paksa) { return A.swr('de_tpl', function () { return A.apiQ('de.template.list', {}); }, { maxAge: paksa ? 0 : 60000, force: !!paksa }).then(function (d) { D.tpl = d; return d; }); };
  const muatPej = function (paksa) { return A.swr('de_pej', function () { return A.apiQ('de.pejabat.list', {}); }, { maxAge: paksa ? 0 : 60000, force: !!paksa }).then(function (d) { D.pej = d; return d; }); };

  /** Tampilkan PDF base64 di modal (aman dari pemblokir popup) + tombol unduh. */
  ADM.tampilPdf = function (b64, nama, mime) {
    const bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: mime || 'application/pdf' }));
    A.modal({ title: nama || 'Pratinjau', icon: 'file', size: 'xl', body: '<iframe src="' + url + '" style="width:100%;height:70vh;border:1px solid var(--line);border-radius:12px;background:#fff" title="Pratinjau"></iframe><p class="tiny muted">Tidak tampil di HP? Gunakan tombol Unduh.</p>',
      onClose: function () { setTimeout(function () { URL.revokeObjectURL(url); }, 2000); },
      actions: [{ label: 'Unduh', icon: 'download', onClick: function () { A.unduhB64(b64, nama, mime); return false; } }, { label: 'Tutup', cls: 'primary' }] });
  };

  ADM.reg('dokumen', function (v, id) {
    const admin = ADM.isAdmin();
    let sub = '';
    if (id) { const m = id.split(':'); if (['dokumen', 'buat', 'massal', 'template', 'pejabat', 'pin'].indexOf(m[0]) > -1) D.tab = m[0]; else if (m[0] === 'ubah') { D.tab = 'buat'; sub = m[1]; } if (m[0] === 'buat' && m[1]) sub = m[1]; }
    v.innerHTML = ADM.judul('Dokumen & Tanda Tangan', 'Terbitkan surat keterangan hasil ujian, berita acara, rekap nilai, dan sertifikat dari template Google — lengkap dengan persetujuan pejabat dan QR verifikasi keaslian.', '', 'Data &amp; Layanan › <b>Dokumen &amp; TTD</b>') +
      '<div class="chips scroll" id="deTab" style="margin-bottom:16px">' + [['dokumen', 'Dokumen', 'file'], ['buat', 'Buat Dokumen', 'plus'], ['massal', 'Generate Massal', 'layers'], ['template', 'Template', 'clip'], ['pejabat', 'Pejabat & Spesimen', 'user'], ['pin', 'PIN Saya', 'key']].map(function (t) { return '<button class="chip ' + (D.tab === t[0] ? 'on' : '') + '" data-t="' + t[0] + '">' + ic(t[2], 'sm') + t[1] + '</button>'; }).join('') + '</div><div id="deIsi"><div class="skel" style="height:360px"></div></div>';
    $$('#deTab [data-t]').forEach(function (b) { b.onclick = function () { D.tab = b.dataset.t; history.replaceState(null, '', '#/dokumen/' + D.tab); $$('#deTab [data-t]').forEach(function (x) { x.classList.toggle('on', x === b); }); tampil(''); }; });
    const tampil = function (s) { ADM.timers.forEach(clearInterval); ADM.timers = []; ({ dokumen: tabDokumen, buat: tabBuat, massal: tabMassal, template: tabTemplate, pejabat: tabPejabat, pin: tabPin })[D.tab]($('#deIsi'), s, admin); };
    tampil(sub);
  });

  // ============================================================================
  // DAFTAR DOKUMEN + PERSETUJUAN
  // ============================================================================
  function tabDokumen(el, s, admin) {
    el.innerHTML = '<div class="grid g4" id="dkKpi"></div><div id="dkTunggu"></div><div class="card" style="margin-top:16px"><div class="card-b row wrap between"><div class="chips" id="dkF">' + [['', 'Semua'], ['DRAF', 'Draf'], ['MENUNGGU_TTD', 'Menunggu TTD'], ['TERBIT', 'Terbit'], ['DITARIK', 'Ditarik']].map(function (t) { return '<button class="chip ' + (D.status === t[0] ? 'on' : '') + '" data-f="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="search" style="min-width:220px">' + ic('search') + '<input class="inp" id="dkQ" placeholder="Cari judul, nomor, template…"></div></div><div class="tbl-wrap"><table class="tbl" id="dkT"><thead><tr><th>Dokumen</th><th>Nomor</th><th>Status</th><th>Penanda Tangan</th><th>Dibuat</th><th class="right">Aksi</th></tr></thead><tbody><tr><td colspan="6"><div class="skel" style="height:200px"></div></td></tr></tbody></table></div><div class="pager" id="dkT_pg"></div></div>';
    let L = null;
    const t = ADM.tabelKlien({ id: 'dkT', kolom: 6, per: 20, kosong: 'Belum ada dokumen. Buka tab "Buat Dokumen" atau "Generate Massal".',
      rows: function () { return L ? L.rows.filter(function (x) { return !D.status || x.status === D.status; }) : []; }, cari: function (x) { return x.judul + ' ' + x.nomor + ' ' + x.template + ' ' + x.oleh; },
      baris: function (x) {
        const st = ST[x.status] || [x.status, ''];
        return '<tr><td style="max-width:320px"><b style="color:var(--ink)">' + esc(x.judul) + '</b><div class="tiny muted">' + esc(x.template) + ' · <span class="badge ' + (ENG[x.engine] || ['', ''])[1] + '" style="height:17px;font-size:9.5px">' + esc((ENG[x.engine] || [x.engine])[0]) + '</span></div>' + (x.catatan ? '<div class="tiny" style="color:var(--rose)">' + esc(x.catatan) + '</div>' : '') + '</td>' +
          '<td class="small mono">' + (x.nomor ? esc(x.nomor) : '<span class="muted">—</span>') + '</td><td><span class="badge dot ' + st[1] + '">' + st[0] + '</span></td>' +
          '<td><div class="stack-sm" style="gap:4px">' + (x.ttd.length ? x.ttd.map(function (g) { return '<div class="tiny row" style="gap:6px">' + (g.status === 'SETUJU' ? '<span style="color:var(--green)">' + ic('checkc', 'sm') + '</span>' : ic('clock', 'sm')) + '<span><b>' + esc(g.label) + '</b> · ' + esc(g.nama || '—') + (g.metode ? ' <span class="muted">(' + esc(g.metode) + ')</span>' : '') + '</span></div>'; }).join('') : '<span class="tiny muted">Tanpa tanda tangan</span>') + '</div></td>' +
          '<td class="tiny muted">' + esc(x.oleh) + '<br>' + F.tglJam(x.terbit || x.dibuat) + '</td><td class="act">' +
          (x.status === 'TERBIT' ? x.berkas.map(function (f) { return '<button class="btn sm ' + (f === 'pdf' ? 'soft' : 'ghost') + '" data-unduh="' + x.id + '" data-f="' + f + '">' + ic('download', 'sm') + f.toUpperCase() + '</button>'; }).join(' ') + '<button class="iconbtn" data-qr="' + x.id + '" title="Tautan verifikasi">' + ic('qr') + '</button>' : '<button class="iconbtn" data-prev="' + x.id + '" title="Pratinjau">' + ic('eye') + '</button>') +
          (x.status === 'DRAF' ? '<a class="iconbtn blue" href="#/dokumen/ubah:' + x.id + '" title="Ubah">' + ic('edit') + '</a><button class="iconbtn green" data-ajukan="' + x.id + '" title="Ajukan">' + ic('send') + '</button>' : '') +
          (admin && (x.status === 'TERBIT' || x.status === 'MENUNGGU_TTD') ? '<button class="iconbtn rose" data-tarik="' + x.id + '" title="Tarik/batalkan">' + ic('x') + '</button>' : '') +
          (admin && x.status === 'MENUNGGU_TTD' ? '<button class="iconbtn amber" data-bypass="' + x.id + '" title="Sahkan (bypass admin)">' + ic('gavel') + '</button>' : '') + '</td></tr>';
      },
      after: function () { ikatAksi($('#dkT')); } });
    const ikatAksi = function (root) {
      $$('[data-unduh]', root).forEach(function (b) { b.onclick = function () { ADM.unduh(b, b.dataset.unduh, b.dataset.f); }; });
      $$('[data-prev]', root).forEach(function (b) { b.onclick = async function () { A.busy(b, true); const r = await A.api('de.dok.pratinjau', { id: b.dataset.prev }, { timeout: 120000 }); A.busy(b, false); if (!r.success) return A.toast(r.message, 'err'); ADM.tampilPdf(r.data.base64, r.data.nama, r.data.mime); }; });
      $$('[data-ajukan]', root).forEach(function (b) { b.onclick = async function () { if (!await A.confirm('Ajukan dokumen ini ke pejabat penanda tangan? Setelah diajukan, isi tidak dapat diubah.', { ok: 'Ajukan', icon: 'send', tone: 't-blue' })) return; const r = await A.aksi(b, 'de.dok.ajukan', { id: b.dataset.ajukan }); if (r.success) muat(); }; });
      $$('[data-tarik]', root).forEach(function (b) { b.onclick = async function () { const a = await A.prompt('Tarik dokumen', { label: 'Alasan penarikan (tampil di halaman verifikasi)', area: true, ok: 'Tarik dokumen', icon: 'x', wajib: true }); if (a === null) return; const r = await A.api('de.dok.tarik', { id: b.dataset.tarik, alasan: a }); if (A.hasil(r)) muat(); }; });
      $$('[data-qr]', root).forEach(function (b) { b.onclick = function () { const x = L.rows.filter(function (y) { return y.id === b.dataset.qr; })[0], u = urlVerif(x.kode);
        A.modal({ title: 'Verifikasi Keaslian', sub: x.nomor, icon: 'qr', body: '<div class="center"><div style="width:180px;margin:0 auto">' + A.qrSvg(u, 180) + '</div><div class="tag mono" style="margin-top:10px">' + esc(x.kode) + '</div><p class="tiny muted" style="word-break:break-all">' + esc(u) + '</p>' + (x.hash ? '<p class="tiny muted mono" style="word-break:break-all">SHA-256 PDF: ' + esc(x.hash) + '</p>' : '') + '</div>',
          actions: [{ label: 'Salin tautan', icon: 'copy', onClick: function () { A.copy(u); return false; } }, { label: 'Buka', cls: 'primary', icon: 'ext', onClick: function () { window.open(u, '_blank', 'noopener'); } }] }); }; });
      $$('[data-bypass]', root).forEach(function (b) { b.onclick = function () { setujui(L.rows.filter(function (y) { return y.id === b.dataset.bypass; })[0], true); }; });
      $$('[data-setuju]', root).forEach(function (b) { b.onclick = function () { setujui(L.rows.filter(function (y) { return y.id === b.dataset.setuju; })[0], false); }; });
    };
    const setujui = function (x, bypass) {
      const giliran = x.ttd.filter(function (g) { return g.status !== 'SETUJU' && !x.ttd.some(function (h) { return h.urutan < g.urutan && h.status !== 'SETUJU' && h.wajibSetuju !== false; }); });
      const milik = bypass ? giliran : giliran.filter(function (g) { return L.saya && g.pejabatId === L.saya.id; });
      if (!milik.length) return A.toast('Tidak ada slot yang menunggu persetujuan Anda saat ini.', 'warn');
      A.modal({ title: bypass ? 'Sahkan sebagai Admin (bypass)' : 'Setujui & Tanda Tangani', sub: x.judul, icon: bypass ? 'gavel' : 'pen', iconTone: bypass ? 't-amber' : 't-green',
        body: '<div class="field"><label>Slot</label><select class="sel" id="stSlot">' + milik.map(function (g) { return '<option value="' + g.slot + '">' + esc(g.label) + ' — ' + esc(g.nama || '-') + '</option>'; }).join('') + '</select></div>' +
          (bypass ? '<div class="field" style="margin-top:12px"><label>Alasan bypass (wajib, tampil di verifikasi)</label><textarea class="ta" id="stAlasan" rows="3" placeholder="mis. Pejabat dinas luar, disetujui lisan via telepon"></textarea></div>' : '<div class="field" style="margin-top:12px"><label>PIN penandatanganan (6 angka)</label><input class="inp pin-input" id="stPin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" style="height:54px;font-size:24px;letter-spacing:.4em;text-align:center"></div><p class="tiny muted">Belum punya PIN? Atur di tab <a href="#/dokumen/pin">PIN Saya</a>. Salah 5× → terkunci 15 menit.</p>') +
          '<div class="field" style="margin-top:10px"><label>Catatan (opsional)</label><input class="inp" id="stCat"></div>',
        actions: [{ label: 'Batal' }, { label: bypass ? 'Sahkan' : 'Setujui', cls: bypass ? 'danger' : 'primary', icon: 'checkc', onClick: async function (bb, bg) {
          const d = { id: x.id, slot: Number($('#stSlot', bg).value), catatan: bypass ? $('#stAlasan', bg).value : $('#stCat', bg).value };
          if (bypass) d.bypass = true; else d.pin = $('#stPin', bg).value;
          const r = await A.api('de.dok.setujui', d, { timeout: 180000 }); if (!A.hasil(r)) return false; muat(); ADM.cekTtd();
        } }] });
    };
    const muat = function () {
      A.api('de.dok.list', {}).then(function (r) {
        if (!$('#dkT')) return;
        if (!r.success) { $('#dkT tbody').innerHTML = A.tabelKosong(6, r.message); return; }
        L = r.data;
        const n = function (s) { return L.rows.filter(function (x) { return x.status === s; }).length; };
        $('#dkKpi').innerHTML = ADM.kpi('Draf', n('DRAF'), 'Belum diajukan', 't-amber', 'edit') + ADM.kpi('Menunggu TTD', n('MENUNGGU_TTD'), 'Proses persetujuan', 't-blue', 'pen') + ADM.kpi('Terbit', n('TERBIT'), 'Bernomor & ber-QR', 't-green', 'checkc') + ADM.kpi('Ditarik', n('DITARIK'), 'Dibatalkan', 't-rose', 'x');
        $('#dkTunggu').innerHTML = L.menungguSaya.length ? '<div class="card" style="margin-top:16px;border-color:var(--brand-100);background:var(--brand-50)"><div class="card-h"><div><h3>' + ic('pen', 'sm') + ' Menunggu Tanda Tangan Anda</h3><p>' + esc(L.saya.jabatan) + ' · ' + L.menungguSaya.length + ' dokumen</p></div></div><div class="card-b stack-sm">' +
          L.menungguSaya.map(function (x) { return '<div class="list-item" style="background:var(--card)"><span class="chip-ic sm t-blue">' + ic('file', 'sm') + '</span><div class="grow"><b class="small" style="color:var(--ink)">' + esc(x.judul) + '</b><div class="tiny muted">' + esc(x.template) + ' · diajukan oleh ' + esc(x.oleh) + ' · ' + F.relatif(x.dibuat) + '</div></div><button class="btn sm ghost" data-prev="' + x.id + '">' + ic('eye', 'sm') + 'Lihat</button><button class="btn sm primary" data-setuju="' + x.id + '">' + ic('pen', 'sm') + 'Setujui</button></div>'; }).join('') + '</div></div>' : '';
        ikatAksi($('#dkTunggu'));
        t.reset();
      });
    };
    $$('#dkF [data-f]').forEach(function (b) { b.onclick = function () { D.status = b.dataset.f; $$('#dkF [data-f]').forEach(function (x) { x.classList.toggle('on', x === b); }); t.reset(); }; });
    $('#dkQ').oninput = A.debounce(function (e) { t.cari(e.target.value); }, 200);
    muat();
    ADM.every(function () { if ($('#dkT') && L && L.rows.some(function (x) { return x.status === 'MENUNGGU_TTD'; }) && A.Activity.due('dok', 30000, 120000)) muat(); }, 5000);
  }

  // ============================================================================
  // BUAT / UBAH DOKUMEN (form otomatis dari skema template)
  // ============================================================================
  async function tabBuat(el, dokId) {
    el.innerHTML = '<div class="skel" style="height:360px"></div>';
    const x = await Promise.all([muatTpl(), muatPej(), ADM.muatPaket()]);
    const T = x[0], P = x[1], PK = x[2];
    if (!T || !P) { el.innerHTML = '<div class="card pad empty">Gagal memuat template.</div>'; return; }
    const aktif = T.rows.filter(function (t) { return t.aktif; });
    let dok = null;
    if (dokId) {
      const r = await A.api('de.dok.list', { status: 'DRAF' });
      dok = r.success ? r.data.rows.filter(function (d) { return d.id === dokId; })[0] : null;
      if (!dok) { el.innerHTML = '<div class="card pad empty">Draf tidak ditemukan atau sudah diajukan.</div>'; return; }
    }
    if (!aktif.length) { el.innerHTML = '<div class="card pad empty">' + ic('clip', 'xl') + '<div>Belum ada template aktif.' + (ADM.isAdmin() ? ' Tambahkan di tab <b>Template</b>.' : ' Minta admin menambahkan template.') + '</div></div>'; return; }
    if (!dok) {
      el.innerHTML = '<p class="small muted" style="margin-top:0">Pilih template. Kolom isian dibuat otomatis dari placeholder <span class="mono">{{…}}</span> di berkas Google.</p><div class="grid g3">' + aktif.map(function (t) {
        const sb = T.sumber.filter(function (s) { return s.kode === t.sumber; })[0];
        return '<button class="card pad" data-pilih="' + t.id + '" style="text-align:left;cursor:pointer"><div class="row between"><span class="chip-ic t-' + ((ENG[t.engine] || ['', 'blue'])[1]) + '">' + ic(t.engine === 'sheets' ? 'sheet' : t.engine === 'slides' ? 'image' : 'file') + '</span><span class="tag mono">' + esc(t.kode) + '</span></div><h3 style="font-size:15px;margin-top:12px">' + esc(t.nama) + '</h3>' +
          '<p class="tiny muted" style="margin:6px 0 0">' + t.bidang.length + ' kolom isian · ' + t.slot.length + ' penanda tangan · ' + t.keluaran.join('/').toUpperCase() + '</p>' + (sb && sb.kode ? '<span class="badge purple" style="margin-top:8px">' + ic('bolt', 'sm') + esc(sb.label) + '</span>' : '') + '</button>';
      }).join('') + '</div>';
      $$('[data-pilih]', el).forEach(function (b) { b.onclick = function () { formDok(el, aktif.filter(function (t) { return t.id === b.dataset.pilih; })[0], null, T, P, PK); }; });
      return;
    }
    formDok(el, T.rows.filter(function (t) { return t.id === dok.templateId; })[0], dok, T, P, PK);
  }
  function formDok(el, tpl, dok, T, P, PK) {
    if (!tpl) { el.innerHTML = '<div class="card pad empty">Template dokumen ini sudah dihapus.</div>'; return; }
    const isian = Object.assign({}, dok ? dok.isian : {});
    const sumber = T.sumber.filter(function (s) { return s.kode === tpl.sumber; })[0] || { kode: '', kunci: [] };
    const paketL = (PK ? PK.rows : []).filter(function (p) { return p.Status === 'Terbit' && p.Sesi && p.Sesi.selesai; });
    const pejAktif = P.rows.filter(function (p) { return p.Aktif === 'YA'; });
    const pilihPej = {}; (dok ? dok.ttd : tpl.slot).forEach(function (s) { pilihPej[s.slot] = s.pejabatId || ''; });
    let pesertaL = [];
    el.innerHTML = '<div class="grid" id="fdGrid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px;align-items:start"><div class="stack">' +
      '<div class="card pad-lg"><div class="row between wrap"><div><h3 style="font-size:16px">' + esc(tpl.nama) + '</h3><p class="tiny muted" style="margin:4px 0 0">Template v' + tpl.versi + ' · ' + esc((ENG[tpl.engine] || [tpl.engine])[0]) + ' · keluaran ' + tpl.keluaran.join(', ').toUpperCase() + '</p></div>' + (dok ? '<span class="badge amber">Draf ' + esc(dok.id) + '</span>' : '<button class="btn sm ghost" id="fdGanti">' + ic('left', 'sm') + 'Ganti template</button>') + '</div>' +
      '<div class="field" style="margin-top:14px"><label>Judul dokumen</label><input class="inp" id="fdJudul" value="' + esc(dok ? dok.judul : tpl.nama) + '"></div></div>' +
      (sumber.kode ? '<div class="card pad-lg" style="border-color:var(--purple-100,#e9d5ff)"><h3 style="font-size:15px">' + ic('bolt', 'sm') + ' Isi otomatis dari data ujian</h3><p class="small muted" style="margin:4px 0 12px">' + esc(sumber.label) + ' — kolom yang cocok terisi otomatis dan tetap dapat diubah.</p><div class="form-grid"><div class="field' + (sumber.kode === 'paket' ? ' full' : '') + '"><label>Paket ujian</label><select class="sel" id="fdPaket"><option value="">— pilih paket —</option>' + paketL.map(function (p) { return '<option value="' + p.ID + '"' + (isian._paketId === p.ID ? ' selected' : '') + '>' + esc(p.Nama) + ' (' + esc(p.Kode) + ')</option>'; }).join('') + '</select></div>' +
        (sumber.kode === 'peserta' ? '<div class="field"><label>Peserta</label><select class="sel" id="fdPeserta" disabled><option value="">— pilih paket dulu —</option></select></div>' : '') + '</div></div>' : '') +
      '<div class="card pad-lg"><h3 style="font-size:15px">' + ic('edit', 'sm') + ' Kolom Isian</h3><div id="fdBidang" style="margin-top:14px"></div></div>' +
      '<div class="card pad-lg"><h3 style="font-size:15px">' + ic('pen', 'sm') + ' Penanda Tangan</h3>' + (tpl.slot.length ? '<div class="stack-sm" style="margin-top:12px">' + tpl.slot.map(function (s) {
        return '<div class="opt-tile"><div class="grow"><b>' + esc(s.label) + '</b><p>Slot ' + s.slot + ' · tanda: ' + esc(s.tanda) + (s.wajibSetuju === false || s.tanda === 'kosong' ? ' · tanpa persetujuan' : ' · wajib persetujuan (PIN)') + '</p></div><select class="sel" data-slot="' + s.slot + '" style="max-width:260px"><option value="">— pilih pejabat —</option>' + pejAktif.map(function (p) { return '<option value="' + p.ID + '"' + (pilihPej[s.slot] === p.ID ? ' selected' : '') + '>' + esc(p.Nama) + ' · ' + esc(p.Jabatan) + '</option>'; }).join('') + '</select></div>';
      }).join('') + '</div>' : '<p class="small muted">Template ini tidak memiliki slot tanda tangan — dokumen langsung terbit saat diajukan.</p>') + '</div></div>' +
      '<div class="stack" style="position:sticky;top:84px"><div class="card pad-lg"><h3 style="font-size:15px">Alur Terbit</h3><ol class="small muted" style="padding-left:18px;line-height:1.9;margin:10px 0 14px"><li>Simpan draf & pratinjau</li><li>Ajukan → pejabat menyetujui dengan PIN</li><li>Terbit: nomor otomatis, QR verifikasi, PDF terkunci (hash SHA-256)</li></ol>' +
      '<button class="btn ghost block" id="fdPrev">' + ic('eye', 'sm') + 'Pratinjau PDF</button><button class="btn soft block" id="fdDraf" style="margin-top:8px">' + ic('save', 'sm') + 'Simpan Draf</button><button class="btn primary block" id="fdAjukan" style="margin-top:8px;height:46px">' + ic('send', 'sm') + 'Simpan & Ajukan</button>' +
      '<div class="field" style="margin-top:14px"><label>Catatan internal</label><input class="inp" id="fdCat" value="' + esc(dok ? dok.catatan || '' : '') + '"></div></div>' +
      '<div class="card pad"><b class="small" style="color:var(--ink)">Diisi otomatis oleh sistem</b><p class="tiny muted" style="margin:6px 0 0">NOMOR, TANGGAL, HARI, BULAN, TAHUN, identitas sekolah (INSTITUSI_*), nama/jabatan/NIP pejabat, TTD/QR, dan KODE_VERIFIKASI.</p></div></div></div>';
    if (innerWidth < 1100) $('#fdGrid').style.gridTemplateColumns = '1fr';
    const bidangHtml = function () {
      $('#fdBidang').innerHTML = tpl.bidang.length ? '<div class="form-grid">' + tpl.bidang.map(function (b) {
        const v = isian[b.kunci], auto = sumber.kunci.indexOf(b.kunci) > -1, lbl = '<label>' + esc(b.label) + (b.wajib ? ' <span style="color:var(--rose)">*</span>' : '') + (auto ? ' <span class="badge purple" style="height:16px;font-size:9px">otomatis</span>' : '') + ' <span class="tiny muted mono">{{' + esc(b.kunci) + '}}</span></label>';
        if (b.tipe === 'daftar') {
          const kol = (b.kolom || []).map(function (k) { return k.kunci; }), rows = Array.isArray(v) ? v : [];
          return '<div class="field full">' + lbl + '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:12px;max-height:300px;overflow:auto"><table class="tbl"><thead><tr><th>#</th>' + kol.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
            rows.map(function (r, i) { return '<tr><td class="tiny muted">' + (i + 1) + '</td>' + kol.map(function (k) { return '<td><input class="inp sm" data-dft="' + b.kunci + '" data-i="' + i + '" data-k="' + k + '" value="' + esc(r[k] === undefined ? '' : r[k]) + '"></td>'; }).join('') + '<td><button class="iconbtn rose" data-dfdel="' + b.kunci + '" data-i="' + i + '">' + ic('x') + '</button></td></tr>'; }).join('') +
            '</tbody></table></div><div class="row" style="margin-top:6px"><button type="button" class="btn sm soft" data-dfadd="' + b.kunci + '">' + ic('plus', 'sm') + 'Tambah baris</button><span class="tiny muted">' + rows.length + ' baris</span></div></div>';
        }
        let inp;
        if (b.tipe === 'area' || b.tipe === 'naskah') inp = '<textarea class="ta" data-b="' + b.kunci + '" rows="' + (b.tipe === 'naskah' ? 6 : 3) + '">' + esc(v || '') + '</textarea>';
        else if (b.tipe === 'pilihan') inp = '<select class="sel" data-b="' + b.kunci + '"><option value="">—</option>' + (b.opsi || []).map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
        else inp = '<input class="inp" data-b="' + b.kunci + '" type="' + (b.tipe === 'tanggal' ? 'date' : b.tipe === 'angka' ? 'text' : 'text') + '" value="' + esc(v === undefined ? '' : v) + '"' + (b.tipe === 'gambar' ? ' placeholder="https://…"' : '') + '>';
        return '<div class="field' + (b.tipe === 'area' || b.tipe === 'naskah' ? ' full' : '') + '">' + lbl + inp + (b.bantu ? '<div class="hint">' + esc(b.bantu) + '</div>' : '') + '</div>';
      }).join('') + '</div>' : '<p class="small muted">Template ini tidak memiliki kolom isian manual.</p>';
      $$('[data-b]', el).forEach(function (i) { i.oninput = function () { isian[i.dataset.b] = i.value; }; i.onchange = i.oninput; });
      $$('[data-dft]', el).forEach(function (i) { i.oninput = function () { isian[i.dataset.dft][Number(i.dataset.i)][i.dataset.k] = i.value; }; });
      $$('[data-dfdel]', el).forEach(function (bt) { bt.onclick = function () { isian[bt.dataset.dfdel].splice(Number(bt.dataset.i), 1); bidangHtml(); }; });
      $$('[data-dfadd]', el).forEach(function (bt) { bt.onclick = function () { const k = bt.dataset.dfadd; if (!Array.isArray(isian[k])) isian[k] = []; isian[k].push({}); bidangHtml(); }; });
    };
    bidangHtml();
    const terapkan = function (data) { Object.keys(data).forEach(function (k) { if (data[k] !== undefined && data[k] !== null && k !== 'PESERTA') isian[k] = data[k]; }); bidangHtml(); };
    if ($('#fdGanti')) $('#fdGanti').onclick = function () { tabBuat(el, ''); };
    if ($('#fdPaket')) $('#fdPaket').onchange = async function () {
      const pid = this.value; isian._paketId = pid; if (!pid) return;
      const s = this; s.disabled = true;
      const r = await A.api('de.sumber', { paketId: pid }, { timeout: 90000 });
      s.disabled = false;
      if (!r.success) return A.toast(r.message, 'err');
      if (sumber.kode === 'paket') {
        terapkan(r.data.umum);
        const daf = tpl.bidang.filter(function (b) { return b.tipe === 'daftar'; })[0];
        if (daf) { const kol = (daf.kolom || []).map(function (k) { return k.kunci; }); isian[daf.kunci] = r.data.peserta.map(function (p) { const o = {}; kol.forEach(function (k) { o[k] = p[k] === undefined || p[k] === null ? '' : p[k]; }); return o; }); bidangHtml(); }
        A.toast('Data paket diterapkan (' + r.data.peserta.length + ' peserta).', 'ok');
      } else {
        pesertaL = r.data.peserta.filter(function (p) { return p._sesiId; });
        const ps = $('#fdPeserta'); ps.disabled = false;
        ps.innerHTML = '<option value="">— pilih peserta (' + pesertaL.length + ') —</option>' + pesertaL.map(function (p, i) { return '<option value="' + i + '">' + esc(p.NAMA) + ' · ' + esc(p.KELAS) + ' · nilai ' + esc(p.NILAI) + '</option>'; }).join('');
      }
    };
    if ($('#fdPeserta')) $('#fdPeserta').onchange = function () {
      const p = pesertaL[Number(this.value)]; if (!p) return;
      isian._siswaId = p._siswaId; terapkan(p);
      if ($('#fdJudul').value === tpl.nama) $('#fdJudul').value = tpl.nama + ' — ' + p.NAMA;
      A.toast('Data ' + p.NAMA + ' diterapkan.', 'ok');
    };
    $$('[data-slot]', el).forEach(function (s) { s.onchange = function () { pilihPej[s.dataset.slot] = s.value; }; });
    const paket = function (ajukan) { return { id: dok ? dok.id : '', templateId: tpl.id, judul: $('#fdJudul').value.trim(), isian: isian, pejabat: pilihPej, catatan: $('#fdCat').value.trim(), ajukan: !!ajukan }; };
    $('#fdPrev').onclick = async function () {
      const b = this; A.busy(b, true, 'Membuat pratinjau…');
      const r = await A.api('de.dok.pratinjau', { templateId: tpl.id, judul: $('#fdJudul').value.trim(), isian: isian, pejabat: pilihPej }, { timeout: 150000 });
      A.busy(b, false);
      if (!r.success) return A.toast(r.message, 'err');
      ADM.tampilPdf(r.data.base64, r.data.nama, r.data.mime);
    };
    const simpan = async function (b, ajukan) {
      if (ajukan && !await A.confirm('Simpan & ajukan dokumen ini? Isi tidak dapat diubah setelah diajukan.' + (tpl.slot.length ? '' : ' Dokumen akan langsung <b>terbit</b>.'), { ok: 'Ajukan', icon: 'send', tone: 't-blue' })) return;
      A.busy(b, true, ajukan ? 'Memproses…' : 'Menyimpan…');
      const r = await A.api('de.dok.simpan', { dok: paket(ajukan) }, { timeout: 180000 });
      A.busy(b, false);
      if (!A.hasil(r)) return;
      ADM.cekTtd(); D.tab = 'dokumen'; location.hash = '#/dokumen/dokumen'; ADM.render();
    };
    $('#fdDraf').onclick = function () { simpan(this, false); };
    $('#fdAjukan').onclick = function () { simpan(this, true); };
  }

  // ============================================================================
  // GENERATE MASSAL
  // ============================================================================
  async function tabMassal(el) {
    el.innerHTML = '<div class="skel" style="height:360px"></div>';
    const x = await Promise.all([muatTpl(), muatPej(), ADM.muatPaket()]);
    const T = x[0], P = x[1], PK = x[2];
    if (!T || !P) { el.innerHTML = '<div class="card pad empty">Gagal memuat data.</div>'; return; }
    const tplL = T.rows.filter(function (t) { return t.aktif && t.sumber === 'peserta'; });
    const paketL = (PK ? PK.rows : []).filter(function (p) { return p.Status === 'Terbit' && p.Sesi && p.Sesi.selesai; });
    el.innerHTML = '<div class="grid" id="msGrid" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:16px;align-items:start"><div class="card pad-lg"><h3 style="font-size:15px">Generate Dokumen per Peserta</h3><p class="small muted">Satu dokumen untuk setiap peserta yang sudah selesai — mis. Surat Keterangan Hasil Ujian atau Sertifikat. Disetujui sekali untuk seluruh batch, lalu diproses di latar ±20 dokumen/menit.</p>' +
      (tplL.length ? '<div class="form-grid" style="margin-top:14px"><div class="field full"><label>Template (sumber: per peserta)</label><select class="sel" id="msTpl">' + tplL.map(function (t) { return '<option value="' + t.id + '">' + esc(t.nama) + ' (' + esc(t.kode) + ')</option>'; }).join('') + '</select></div>' +
        '<div class="field full"><label>Paket ujian</label><select class="sel" id="msPaket">' + (paketL.length ? paketL.map(function (p) { return '<option value="' + p.ID + '">' + esc(p.Nama) + ' (' + esc(p.Kode) + ') · ' + p.Sesi.selesai + ' selesai</option>'; }).join('') : '<option value="">Belum ada paket dengan hasil</option>') + '</select></div>' +
        '<div class="field full"><label>Peserta</label>' + ADM.seg('msHanya', [['semua', 'Semua selesai'], ['tuntas', 'Hanya tuntas'], ['remedial', 'Hanya remedial']], 'semua') + '</div></div><div id="msSlot" style="margin-top:14px"></div>' +
        '<div class="field" style="margin-top:12px"><label>PIN Anda (bila Anda pejabat pada slot di atas)</label><input class="inp" id="msPin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" style="max-width:200px;letter-spacing:.3em"></div>' +
        (ADM.isAdmin() ? '<div class="field" style="margin-top:10px"><label>…atau alasan pengesahan admin (bypass)</label><input class="inp" id="msAlasan" placeholder="mis. Disetujui kepala sekolah pada rapat 12/10"></div>' : '') +
        '<button class="btn primary block" id="msJalan" style="margin-top:16px;height:46px">' + ic('layers') + 'Masukkan ke Antrean</button>' : '<div class="empty">Belum ada template dengan sumber "per peserta". ' + (ADM.isAdmin() ? 'Atur sumber template di tab Template.' : '') + '</div>') + '</div>' +
      '<div class="card"><div class="card-h"><div><h3>Antrean Massal</h3><p>Diperbarui otomatis</p></div><button class="iconbtn" id="msRef">' + ic('refresh') + '</button></div><div class="card-b stack-sm" id="msAntre"><div class="skel" style="height:160px"></div></div></div></div>';
    if (innerWidth < 1100) $('#msGrid').style.gridTemplateColumns = '1fr';
    const pejAktif = P.rows.filter(function (p) { return p.Aktif === 'YA'; });
    const slotHtml = function () {
      const t = tplL.filter(function (z) { return z.id === $('#msTpl').value; })[0]; if (!t) return;
      $('#msSlot').innerHTML = t.slot.length ? '<div class="lbl-f" style="margin-bottom:8px">Penanda tangan</div><div class="stack-sm">' + t.slot.map(function (s) { return '<div class="opt-tile"><div><b>' + esc(s.label) + '</b><p>' + (s.wajibSetuju === false || s.tanda === 'kosong' ? 'tanpa persetujuan' : 'butuh PIN pejabat / alasan admin') + '</p></div><select class="sel" data-ms="' + s.slot + '" style="max-width:240px"><option value="">—</option>' + pejAktif.map(function (p) { return '<option value="' + p.ID + '"' + (s.pejabatId === p.ID ? ' selected' : '') + '>' + esc(p.Nama) + '</option>'; }).join('') + '</select></div>'; }).join('') + '</div>' : '<p class="small muted">Tanpa tanda tangan.</p>';
    };
    const antre = function () {
      A.api('de.antrean', {}, { quiet: true }).then(function (r) {
        if (!$('#msAntre')) return;
        const rows = r.success ? r.data.rows : [];
        $('#msAntre').innerHTML = rows.length ? rows.slice(0, 15).map(function (b) { return '<div class="list-item" style="align-items:flex-start"><span class="chip-ic sm ' + (b.menunggu ? 't-blue' : b.gagal ? 't-rose' : 't-green') + '">' + ic(b.menunggu ? 'hourglass' : 'checkc', 'sm') + '</span><div class="grow"><div class="row between"><b class="small" style="color:var(--ink)">' + esc(b.template) + '</b><span class="tiny muted">' + F.relatif(b.dibuat) + '</span></div><div class="row" style="gap:8px;margin-top:6px"><div class="bar grow ' + (b.gagal ? 'amber' : 'green') + '"><i style="width:' + b.persen + '%"></i></div><span class="tiny b">' + b.selesai + '/' + b.total + (b.gagal ? ' · <span style="color:var(--rose)">' + b.gagal + ' gagal</span>' : '') + '</span></div><div class="tiny muted mono">' + esc(b.batch) + '</div></div></div>'; }).join('') : '<div class="empty small">Belum ada antrean.</div>';
      });
    };
    if ($('#msTpl')) { slotHtml(); $('#msTpl').onchange = slotHtml; ADM.ikatSeg('msHanya'); }
    if ($('#msJalan')) $('#msJalan').onclick = async function () {
      const pej = {}; $$('[data-ms]', el).forEach(function (s) { pej[s.dataset.ms] = s.value; });
      if (!$('#msPaket').value) return A.toast('Pilih paket.', 'warn');
      const r = await A.aksi(this, 'de.massal', { templateId: $('#msTpl').value, paketId: $('#msPaket').value, hanya: ADM.nilaiSeg('msHanya'), pejabat: pej, pin: $('#msPin').value, alasan: $('#msAlasan') ? $('#msAlasan').value : '' });
      if (r.success) { $('#msPin').value = ''; antre(); }
    };
    $('#msRef').onclick = antre;
    antre();
    ADM.every(function () { if ($('#msAntre') && A.Activity.due('massal', 20000, 90000)) antre(); }, 5000);
  }

  // ============================================================================
  // TEMPLATE
  // ============================================================================
  async function tabTemplate(el, s, admin) {
    el.innerHTML = '<div class="skel" style="height:360px"></div>';
    const T = await muatTpl(true), P = await muatPej();
    if (!T) { el.innerHTML = '<div class="card pad empty">Gagal memuat template.</div>'; return; }
    el.innerHTML = '<div class="grid" id="tpGrid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px;align-items:start"><div class="card"><div class="card-h"><div><h3>Template Dokumen</h3><p>Berkas master di folder Template_Dokumen — tidak pernah diubah saat generate.</p></div>' + (admin ? '<button class="btn primary" id="tpBaru">' + ic('plus', 'sm') + 'Tambah Template</button>' : '') + '</div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Template</th><th>Mesin</th><th>Sumber Data</th><th>Isian · TTD</th><th>Keluaran</th><th>Status</th><th class="right">Aksi</th></tr></thead><tbody>' + (T.rows.length ? T.rows.map(function (t) {
        const sb = T.sumber.filter(function (x) { return x.kode === t.sumber; })[0];
        return '<tr><td><b style="color:var(--ink)">' + esc(t.nama) + '</b><div class="tiny muted"><span class="mono">' + esc(t.kode) + '</span> · v' + t.versi + ' · ' + F.tgl(t.diperbarui) + '</div></td><td><span class="badge ' + (ENG[t.engine] || ['', ''])[1] + '">' + esc((ENG[t.engine] || [t.engine])[0]) + '</span></td><td class="small">' + esc(sb && sb.kode ? sb.label : 'Isi manual') + '</td>' +
          '<td class="small">' + t.bidang.length + ' kolom · ' + t.slot.length + ' slot</td><td class="small mono">' + t.keluaran.join(', ').toUpperCase() + '</td><td><span class="badge dot ' + (t.aktif ? 'green' : '') + '">' + (t.aktif ? 'Aktif' : 'Nonaktif') + '</span></td>' +
          '<td class="act">' + (t.url ? '<a class="iconbtn" href="' + esc(t.url) + '" target="_blank" rel="noopener" title="Buka berkas Google">' + ic('ext') + '</a>' : '') + (admin ? '<button class="iconbtn" data-pindai="' + t.id + '" title="Pindai ulang placeholder">' + ic('refresh') + '</button><button class="iconbtn blue" data-atur="' + t.id + '" title="Atur skema">' + ic('sliders') + '</button><button class="iconbtn rose" data-hapus="' + t.id + '" title="Hapus">' + ic('trash') + '</button>' : '') + '</td></tr>';
      }).join('') : A.tabelKosong(7, 'Belum ada template.', 'clip')) + '</tbody></table></div></div>' +
      '<div class="stack"><div class="dark-card"><h3 style="font-size:15px">' + ic('info', 'sm') + ' Penanda di Template</h3><div class="stack-sm" style="margin-top:12px">' +
      [['{{NAMA}}', 'kolom isian (otomatis jadi form)'], ['{{NAMA|kapital}}', 'pengubah: kapital, kecil, judul, rupiah, terbilang, tanggal, bawaan:…'], ['{{#PESERTA}} … {{PESERTA.NAMA}}', 'baris tabel berulang'], ['{{?CATATAN}}…{{/CATATAN}}', 'bagian bersyarat'], ['{{NOMOR}} {{TANGGAL}}', 'diisi sistem saat terbit'],
        ['{{NAMA_PEJABAT_1}} {{JABATAN_1}} {{NIP_1}}', 'identitas pejabat slot 1'], ['{{TTD_1}} / {{QR_1}}', 'spesimen tanda tangan / QR per pejabat'], ['{{QR}} {{KODE_VERIFIKASI}}', 'QR & kode verifikasi dokumen'], ['{{INSTITUSI_NAMA}}', 'identitas sekolah']].map(function (x) { return '<div class="tile"><b>' + esc(x[0]) + '</b><small>' + esc(x[1]) + '</small></div>'; }).join('') + '</div></div>' +
      (T.folderTemplate ? '<a class="btn ghost block" href="' + esc(T.folderTemplate) + '" target="_blank" rel="noopener">' + ic('cloud', 'sm') + 'Buka folder Template_Dokumen</a>' : '') + '</div></div>';
    if (innerWidth < 1100) $('#tpGrid').style.gridTemplateColumns = '1fr';
    if (!admin) return;
    const ulang = function () { A.swrClear('de_tpl'); tabTemplate(el, s, admin); };
    $('#tpBaru').onclick = function () {
      A.modal({ title: 'Tambah Template', sub: 'Google Docs, Sheets, atau Slides berisi placeholder {{…}}', icon: 'clip', body: '<div class="stack-sm"><div class="field"><label>URL berkas Google</label><input class="inp" id="tbUrl" placeholder="https://docs.google.com/document/d/…"></div><div class="form-grid"><div class="field"><label>Nama template</label><input class="inp" id="tbNama" placeholder="mis. Surat Keterangan Lulus"></div><div class="field"><label>Kode (untuk nomor surat)</label><input class="inp" id="tbKode" placeholder="SKL" maxlength="12"></div></div>' +
        '<div class="field"><label>Sumber data otomatis</label><select class="sel" id="tbSum">' + T.sumber.map(function (x) { return '<option value="' + x.kode + '">' + esc(x.label) + '</option>'; }).join('') + '</select></div><div class="alert blue">' + ic('info') + '<div class="small">Bila berkas berada di luar folder aplikasi, sistem membuat <b>salinan</b> ke folder Template_Dokumen (master Anda tetap utuh). Berkas harus dapat dibuka akun pemilik aplikasi.</div></div></div>',
        actions: [{ label: 'Batal' }, { label: 'Pindai & Simpan', cls: 'primary', icon: 'search', onClick: async function (b, bg) { const r = await A.api('de.template.pindai', { url: $('#tbUrl', bg).value.trim(), nama: $('#tbNama', bg).value.trim(), kode: $('#tbKode', bg).value.trim(), sumber: $('#tbSum', bg).value }, { timeout: 120000 }); if (!A.hasil(r)) return false; ulang(); } }] });
    };
    $$('[data-pindai]', el).forEach(function (b) { b.onclick = async function () { if (!await A.confirm('Pindai ulang placeholder dari berkas template? Pengaturan kolom yang masih ada dipertahankan; versi template naik.', { ok: 'Pindai ulang' })) return; const r = await A.aksi(b, 'de.template.pindai', { id: b.dataset.pindai }); if (r.success) ulang(); }; });
    $$('[data-hapus]', el).forEach(function (b) { b.onclick = async function () { if (!await A.confirm('Hapus template dari daftar? Template yang sudah dipakai akan dinonaktifkan. Berkas di Drive tetap ada.', { danger: true, ok: 'Hapus' })) return; const r = await A.api('de.template.hapus', { id: b.dataset.hapus }); if (A.hasil(r)) ulang(); }; });
    $$('[data-atur]', el).forEach(function (b) { b.onclick = function () { aturTemplate(T.rows.filter(function (t) { return t.id === b.dataset.atur; })[0], T, P, ulang); }; });
  }
  function aturTemplate(t, T, P, ulang) {
    const tp = JSON.parse(JSON.stringify(t)), pej = P ? P.rows : [];
    A.modal({ title: 'Atur Template', sub: t.nama + ' · v' + t.versi, icon: 'sliders', size: 'xl',
      body: '<div class="form-grid"><div class="field"><label>Nama</label><input class="inp" id="atNama" value="' + esc(tp.nama) + '"></div><div class="field"><label>Kode</label><input class="inp" id="atKode" value="' + esc(tp.kode) + '" maxlength="12"></div>' +
        '<div class="field"><label>Sumber data otomatis</label><select class="sel" id="atSum">' + T.sumber.map(function (x) { return '<option value="' + x.kode + '"' + (x.kode === tp.sumber ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Format keluaran</label><div class="chips" id="atKel">' + ['pdf', 'docx', 'xlsx', 'png'].map(function (k) { return '<button type="button" class="chip ' + (tp.keluaran.indexOf(k) > -1 ? 'on' : '') + '" data-v="' + k + '">' + k.toUpperCase() + '</button>'; }).join('') + '</div><div class="hint">DOCX untuk Docs, XLSX untuk Sheets, PNG untuk Slides. PDF selalu dibuat.</div></div>' +
        '<label class="check"><input type="checkbox" id="atQr"' + (tp.qrPerPenandatangan ? ' checked' : '') + '> QR terpisah per penanda tangan</label><label class="check"><input type="checkbox" id="atAktif"' + (tp.aktif ? ' checked' : '') + '> Template aktif</label></div>' +
        '<h3 style="font-size:14px;margin:18px 0 8px">Kolom Isian</h3><div class="tbl-wrap" style="border:1px solid var(--line);border-radius:12px;max-height:300px;overflow:auto"><table class="tbl"><thead><tr><th>Penanda</th><th>Label</th><th>Tipe</th><th>Wajib</th><th>Bantuan / opsi</th></tr></thead><tbody>' +
        tp.bidang.map(function (b, i) { return '<tr><td class="mono tiny">{{' + esc(b.kunci) + '}}</td><td><input class="inp sm" data-bi="' + i + '" data-f="label" value="' + esc(b.label) + '"></td><td><select class="sel sm" data-bi="' + i + '" data-f="tipe">' + TIPE.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === b.tipe ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></td><td class="center"><input type="checkbox" data-bi="' + i + '" data-f="wajib"' + (b.wajib ? ' checked' : '') + '></td><td><input class="inp sm" data-bi="' + i + '" data-f="' + (b.tipe === 'pilihan' ? 'opsi' : 'bantu') + '" value="' + esc(b.tipe === 'pilihan' ? (b.opsi || []).join(', ') : b.bantu || '') + '" placeholder="' + (b.tipe === 'pilihan' ? 'opsi dipisah koma' : 'teks bantuan') + '"></td></tr>'; }).join('') + '</tbody></table></div>' +
        '<h3 style="font-size:14px;margin:18px 0 8px">Slot Penanda Tangan</h3>' + (tp.slot.length ? '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:12px"><table class="tbl"><thead><tr><th>Slot</th><th>Label</th><th>Pejabat bawaan</th><th>Tanda</th><th>Urutan</th><th>Wajib setuju</th></tr></thead><tbody>' +
        tp.slot.map(function (s, i) { return '<tr><td><b>' + s.slot + '</b><div class="tiny muted">' + esc((s.penanda || []).join(', ')) + '</div></td><td><input class="inp sm" data-si="' + i + '" data-f="label" value="' + esc(s.label) + '"></td><td><select class="sel sm" data-si="' + i + '" data-f="pejabatId"><option value="">—</option>' + pej.map(function (p) { return '<option value="' + p.ID + '"' + (p.ID === s.pejabatId ? ' selected' : '') + '>' + esc(p.Nama) + '</option>'; }).join('') + '</select></td>' +
          '<td><select class="sel sm" data-si="' + i + '" data-f="tanda">' + [['qr', 'QR eTTD'], ['spesimen', 'Spesimen'], ['qr+spesimen', 'QR + spesimen'], ['kosong', 'Kosong (TTD basah)']].map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === s.tanda ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></td><td><input class="inp sm" type="number" min="1" data-si="' + i + '" data-f="urutan" value="' + s.urutan + '" style="width:70px"></td><td class="center"><input type="checkbox" data-si="' + i + '" data-f="wajibSetuju"' + (s.wajibSetuju !== false ? ' checked' : '') + '></td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="small muted">Tidak ada penanda pejabat (NAMA_PEJABAT_n, TTD_n, QR_n) di template.</p>'),
      onOpen: function (m) { ADM.ikatChips(m.el); },
      actions: [{ label: 'Batal' }, { label: 'Simpan Setelan', cls: 'primary', icon: 'save', onClick: async function (b, bg) {
        $$('[data-bi]', bg).forEach(function (x) { const o = tp.bidang[Number(x.dataset.bi)], f = x.dataset.f; o[f] = x.type === 'checkbox' ? x.checked : f === 'opsi' ? x.value.split(',').map(function (y) { return y.trim(); }).filter(Boolean) : x.value; });
        $$('[data-si]', bg).forEach(function (x) { const o = tp.slot[Number(x.dataset.si)], f = x.dataset.f; o[f] = x.type === 'checkbox' ? x.checked : f === 'urutan' ? Number(x.value) || o.slot : x.value; });
        const r = await A.api('de.template.simpan', { template: { id: tp.id, nama: $('#atNama', bg).value, kode: $('#atKode', bg).value, sumber: $('#atSum', bg).value, keluaran: $$('#atKel .chip.on', bg).map(function (c) { return c.dataset.v; }), qrPerPenandatangan: $('#atQr', bg).checked, aktif: $('#atAktif', bg).checked, bidang: tp.bidang, slot: tp.slot } });
        if (!A.hasil(r)) return false; ulang();
      } }] });
  }

  // ============================================================================
  // PEJABAT & SPESIMEN
  // ============================================================================
  async function tabPejabat(el, s, admin) {
    el.innerHTML = '<div class="skel" style="height:300px"></div>';
    const P = await muatPej(true);
    if (!P) { el.innerHTML = '<div class="card pad empty">Gagal memuat.</div>'; return; }
    el.innerHTML = '<div class="card"><div class="card-h"><div><h3>Pejabat Penanda Tangan</h3><p>Tautkan ke akun dashboard agar pejabat dapat menyetujui dengan PIN pribadinya. Spesimen disimpan privat di Drive.</p></div>' + (admin ? '<button class="btn primary" id="pjBaru">' + ic('plus', 'sm') + 'Tambah Pejabat</button>' : '') + '</div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pejabat</th><th>Jabatan</th><th>Akun Dashboard</th><th>PIN</th><th>Spesimen</th><th>Masa Jabatan</th><th>Status</th><th class="right"></th></tr></thead><tbody>' + (P.rows.length ? P.rows.map(function (p) {
        return '<tr><td><b style="color:var(--ink)">' + esc([p.Nama, p.Gelar].filter(Boolean).join(', ')) + '</b>' + (p.NIP ? '<div class="tiny muted mono">NIP ' + esc(p.NIP) + '</div>' : '') + '</td><td class="small">' + esc(p.Jabatan) + '</td><td class="small">' + (p.Akun ? '@' + esc(p.Akun) : '<span class="badge amber">belum ditautkan</span>') + '</td>' +
          '<td>' + (p.AdaPIN ? '<span class="badge green">' + ic('check', 'sm') + 'Siap</span>' : '<span class="badge">Belum</span>') + '</td><td>' + (p.AdaSpesimen ? '<span class="badge green">Ada</span>' : '<span class="badge">—</span>') + '</td><td class="tiny muted">' + (p.Mulai ? F.tgl(p.Mulai) : '—') + ' s.d. ' + (p.Selesai ? F.tgl(p.Selesai) : 'sekarang') + '</td>' +
          '<td><span class="badge dot ' + (p.Aktif === 'YA' ? 'green' : '') + '">' + (p.Aktif === 'YA' ? 'Aktif' : 'Nonaktif') + '</span></td><td class="act">' + (admin ? '<button class="iconbtn blue" data-ed="' + p.ID + '">' + ic('edit') + '</button>' : '') + '</td></tr>';
      }).join('') : A.tabelKosong(8, 'Belum ada pejabat.', 'user')) + '</tbody></table></div></div>';
    if (!admin) return;
    const form = function (p) {
      p = p || { Aktif: 'YA' };
      let spes = '';
      const f = [{ k: 'Nama', label: 'Nama (tanpa gelar)', req: true }, { k: 'Gelar', label: 'Gelar', ph: 'mis. M.Pd' }, { k: 'Jabatan', label: 'Jabatan', req: true, ph: 'mis. Kepala Sekolah' }, { k: 'NIP', label: 'NIP' },
        { k: 'PenggunaID', label: 'Tautkan ke akun dashboard', type: 'select', opsi: [{ v: '', l: '— tidak ditautkan —' }].concat(P.akun.map(function (a) { return { v: a.id, l: a.nama + ' (@' + a.username + ')' }; })), full: true, hint: 'Hanya akun ini yang dapat menyetujui dokumen atas nama pejabat (dengan PIN miliknya).' },
        { k: 'Mulai', label: 'Mulai menjabat', type: 'datetime-local' }, { k: 'Selesai', label: 'Selesai menjabat', type: 'datetime-local' }, { k: 'Aktif', label: 'Status', type: 'switch', ket: 'Aktif', full: true }];
      ADM.modalForm({ title: p.ID ? 'Ubah Pejabat' : 'Tambah Pejabat', icon: 'user', fields: f, nilai: p,
        bawah: '<div class="opt-tile" style="margin-top:14px"><div><b>Spesimen tanda tangan (PNG transparan)</b><p id="spInfo">' + (p.AdaSpesimen ? 'Sudah ada — unggah untuk mengganti.' : 'Belum ada.') + '</p></div><button type="button" class="btn sm soft" id="spPilih">' + ic('upload', 'sm') + 'Unggah</button></div>',
        onOpen: function (m) { $('#spPilih', m.el).onclick = async function () { const fl = await A.pilihBerkas('image/png,image/jpeg'); if (!fl) return; spes = await A.kompresGambar(fl, 900, 0.9); $('#spInfo', m.el).innerHTML = '<img src="' + spes + '" alt="" style="max-height:60px;background:#fff;border-radius:6px">'; }; },
        onSave: function (d) { d.ID = p.ID; if (spes) d.spesimenDataUrl = spes; return A.api('de.pejabat.simpan', { pejabat: d }, { timeout: 60000 }); }, after: function () { A.swrClear('de_pej'); tabPejabat(el, s, admin); } });
    };
    $('#pjBaru').onclick = function () { form(null); };
    $$('[data-ed]', el).forEach(function (b) { b.onclick = function () { form(P.rows.filter(function (p) { return p.ID === b.dataset.ed; })[0]); }; });
  }

  // ============================================================================
  // PIN SAYA
  // ============================================================================
  async function tabPin(el) {
    el.innerHTML = '<div class="skel" style="height:240px"></div>';
    const P = await muatPej(true);
    const saya = P && P.saya;
    if (!saya) { el.innerHTML = '<div class="card pad-lg" style="max-width:640px"><h3 style="font-size:15px">' + ic('key', 'sm') + ' PIN Penandatanganan</h3><p class="small muted">Akun Anda belum ditautkan sebagai pejabat penanda tangan. Admin dapat menautkannya di tab <b>Pejabat &amp; Spesimen</b>.</p></div>'; return; }
    el.innerHTML = '<div class="card pad-lg" style="max-width:560px"><h3 style="font-size:15px">' + ic('key', 'sm') + ' PIN Penandatanganan — ' + esc(saya.jabatan) + '</h3><p class="small muted">PIN 6 angka dipakai setiap kali Anda menyetujui dokumen. Disimpan sebagai hash + salt — admin pun tidak dapat melihatnya.</p>' +
      '<div class="stack-sm" style="margin-top:12px">' + (saya.adaPin ? '<div class="field"><label>PIN lama</label><input class="inp" id="pnLama" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></div>' : '<div class="alert amber">' + ic('info') + '<div class="small">Anda belum memiliki PIN.</div></div>') +
      '<div class="field"><label>PIN baru (6 angka)</label><input class="inp" id="pnBaru" type="password" inputmode="numeric" maxlength="6" autocomplete="off"><div class="hint">Hindari 123456, 000000, atau tanggal lahir.</div></div><div class="field"><label>Ulangi PIN baru</label><input class="inp" id="pnUlang" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></div>' +
      '<button class="btn primary" id="pnSimpan" style="margin-top:6px">' + ic('save', 'sm') + 'Simpan PIN</button></div></div>';
    $('#pnSimpan').onclick = async function () {
      if ($('#pnBaru').value !== $('#pnUlang').value) return A.toast('Ulangi PIN tidak cocok.', 'warn');
      const r = await A.aksi(this, 'de.pin', { pinLama: $('#pnLama') ? $('#pnLama').value : '', pinBaru: $('#pnBaru').value });
      if (r.success) { A.swrClear('de_pej'); tabPin(el); }
    };
  }
})();
