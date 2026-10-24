/* ============================================================================
   UjianKu Pro — Bank Soal (daftar, editor + pratinjau, impor/ekspor Excel),
   Paket Ujian (daftar + penyusun & penjadwalan), Token PIN (kartu, WA, aksi).
   Admin: lihat bank soal & paket semua guru, kelola token — tanpa membuat paket.
   ============================================================================ */
(function () {
  'use strict';
  const A = window.App, ADM = window.ADM, $ = A.$, $$ = A.$$, esc = A.esc, ic = A.icon, F = A.fmt;
  const BLOOM = { C1: 'Mengingat', C2: 'Memahami', C3: 'Menerapkan', C4: 'Menganalisis', C5: 'Mengevaluasi', C6: 'Mencipta' };
  const HURUF = ['A', 'B', 'C', 'D', 'E'];
  const KOLOM_SOAL = ['Mapel', 'Tingkat', 'Topik', 'KD', 'Bloom', 'Tipe', 'Pertanyaan', 'URLGambar', 'A', 'B', 'C', 'D', 'E', 'Kunci', 'Bobot', 'Kesukaran', 'Pembahasan', 'Status'];
  const ALIAS_SOAL = { matapelajaran: 'Mapel', mapel: 'Mapel', tingkat: 'Tingkat', kelas: 'Tingkat', topik: 'Topik', materi: 'Topik', kd: 'KD', kompetensidasar: 'KD', tp: 'KD', bloom: 'Bloom', levelkognitif: 'Bloom',
    tipe: 'Tipe', jenissoal: 'Tipe', pertanyaan: 'Pertanyaan', soal: 'Pertanyaan', tekssoal: 'Pertanyaan', urlgambar: 'URLGambar', gambar: 'URLGambar', a: 'A', opsia: 'A', pilihana: 'A', b: 'B', opsib: 'B', pilihanb: 'B',
    c: 'C', opsic: 'C', pilihanc: 'C', d: 'D', opsid: 'D', pilihand: 'D', e: 'E', opsie: 'E', pilihane: 'E', kunci: 'Kunci', kuncijawaban: 'Kunci', jawabanbenar: 'Kunci', bobot: 'Bobot', skor: 'Bobot',
    kesukaran: 'Kesukaran', tingkatkesukaran: 'Kesukaran', pembahasan: 'Pembahasan', penjelasan: 'Pembahasan', status: 'Status', id: 'ID' };

  ADM.portalUrl = function () { const s = (A.setting || {}).PORTAL_URL; return s || location.href.replace(/[#?].*$/, '').replace(/admin\.html$/, 'index.html').replace(/\/$/, '/index.html'); };
  ADM.teksPolos = function (t, n) { const s = String(t || '').replace(/\*\*|__|\$/g, '').replace(/\s+/g, ' ').trim(); return n && s.length > n ? s.slice(0, n) + '…' : s; };
  ADM.seg = function (id, list, val) { return '<div class="seg" id="' + id + '">' + list.map(function (o) { const v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<button type="button" data-v="' + esc(v) + '" class="' + (String(v) === String(val) ? 'on' : '') + '">' + esc(l) + '</button>'; }).join('') + '</div>'; };
  ADM.ikatSeg = function (id, cb, root) { $$('#' + id + ' button', root).forEach(function (b) { b.onclick = function () { $$('#' + id + ' button', root).forEach(function (x) { x.classList.toggle('on', x === b); }); if (cb) cb(b.dataset.v); }; }); };
  ADM.nilaiSeg = function (id, root) { const b = $('#' + id + ' button.on', root); return b ? b.dataset.v : ''; };

  /** Pemetaan header Excel bebas → kolom kanonik. */
  ADM.petakanBaris = function (rows, alias) {
    return rows.map(function (r) { const o = {}; Object.keys(r).forEach(function (k) { const n = String(k).toLowerCase().replace(/[^a-z0-9]/g, ''); const t = alias[n]; if (t && (o[t] === undefined || o[t] === '')) o[t] = String(r[k]).trim(); }); return o; });
  };
  /** Wizard impor Excel generik: unggah → pindai (dry-run) → tulis. */
  ADM.imporExcel = function (o) {
    let data = null;
    const m = A.modal({ title: o.judul, sub: 'Unggah berkas .xlsx/.csv · baris pertama = judul kolom', icon: 'upload', size: 'lg',
      body: '<div class="stack"><div class="opt-tile"><div><b>1. Unduh template</b><p>Kolom: ' + esc(o.kolom.join(', ')) + '</p></div><button class="btn sm soft" data-tpl>' + ic('download', 'sm') + 'Template</button></div>' +
        '<div class="opt-tile"><div><b>2. Pilih berkas</b><p id="imF">Belum ada berkas.</p></div><button class="btn sm primary" data-pilih>' + ic('upload', 'sm') + 'Pilih berkas</button></div>' +
        (o.ekstra || '') + '<div id="imH"></div></div>',
      actions: [{ label: 'Tutup' }, { label: 'Pindai dulu (aman)', cls: 'ghost', icon: 'search', onClick: function () { pindai(true); return false; } }, { label: 'Impor sekarang', cls: 'primary', icon: 'save', onClick: function () { pindai(false); return false; } }] });
    $('[data-tpl]', m.el).onclick = function () { A.exportXlsx({ Template: o.contoh }, o.namaTemplate || 'Template impor'); };
    $('[data-pilih]', m.el).onclick = async function () {
      const f = await A.pilihBerkas('.xlsx,.xls,.csv'); if (!f) return;
      $('#imF', m.el).textContent = 'Membaca ' + f.name + '…';
      try {
        const mentah = await A.readXlsx(f);
        data = ADM.petakanBaris(mentah, o.alias).filter(function (r) { return Object.keys(r).some(function (k) { return r[k] !== ''; }); });
        $('#imF', m.el).innerHTML = '<b style="color:var(--ink)">' + esc(f.name) + '</b> · ' + data.length + ' baris terbaca' + (mentah.length && !data.length ? ' — <span style="color:var(--rose)">judul kolom tidak dikenali</span>' : '');
        const kol = data.length ? Object.keys(data[0]) : [];
        $('#imH', m.el).innerHTML = data.length ? '<div class="tbl-wrap" style="max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:12px"><table class="tbl"><thead><tr>' + kol.slice(0, 7).map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          data.slice(0, 5).map(function (r) { return '<tr>' + kol.slice(0, 7).map(function (k) { return '<td class="small">' + esc(ADM.teksPolos(r[k], 40)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div><p class="tiny muted">Pratinjau 5 baris pertama. Klik <b>Pindai dulu</b> untuk melihat hasil tanpa menulis data.</p>' : '';
      } catch (e) { $('#imF', m.el).textContent = 'Gagal membaca berkas: ' + e.message; }
    };
    const pindai = async function (dry) {
      if (!data || !data.length) return A.toast('Pilih berkas terlebih dahulu.', 'warn');
      const btn = $$('.modal-f .btn', m.el)[dry ? 1 : 2];
      A.busy(btn, true);
      const r = await A.api(o.aksi, Object.assign({ rows: data, dryRun: dry }, o.dataTambahan ? o.dataTambahan(m.el) : {}), { timeout: 120000 });
      A.busy(btn, false);
      if (!r.success) return A.toast(r.message, 'err');
      const h = r.data;
      $('#imH', m.el).innerHTML = '<div class="alert ' + (dry ? 'blue' : 'green') + '">' + ic(dry ? 'search' : 'checkc') + '<div><b>' + esc(r.message) + '</b><div class="row wrap" style="gap:8px;margin-top:8px"><span class="badge green">+' + h.baru + ' baru</span><span class="badge blue">' + h.diperbarui + ' diperbarui</span><span class="badge">' + h.dilewati + ' dilewati</span></div>' +
        (h.galat && h.galat.length ? '<ul class="tiny" style="margin:10px 0 0;padding-left:18px;max-height:140px;overflow:auto">' + h.galat.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>' : '') + '</div></div>';
      if (!dry) { A.toast(r.message, 'ok'); if (o.after) o.after(h); }
    };
  };

  // ============================================================================
  // BANK SOAL — DAFTAR
  // ============================================================================
  const S = { q: '', mapel: '', tingkat: '', tipe: '', bloom: '', kes: '', status: '', hal: 1, pilih: {}, data: null };
  function muatSoal(paksa) { return A.swr('soal', function () { return A.apiQ('soal.list', {}); }, { maxAge: paksa ? 0 : 60000, force: !!paksa }); }
  ADM.muatSoal = muatSoal;

  ADM.reg('bank-soal', function (v, id) {
    if (id) return editorSoal(v, id);
    const guru = ADM.isGuru();
    v.innerHTML = ADM.judul('Bank Soal', guru ? 'Kelola butir soal Anda: pilihan ganda & pilihan ganda kompleks, level Bloom, gambar, rumus LaTeX, dan pembahasan.' : 'Seluruh butir soal dari semua guru (mode lihat). Penyusunan soal dilakukan oleh guru pengampu.',
      (guru ? '<button class="btn ghost" id="bsImp">' + ic('upload', 'sm') + 'Impor Excel</button>' : '') + '<button class="btn ghost" id="bsExp">' + ic('download', 'sm') + 'Ekspor</button>' + (guru ? '<a class="btn primary" href="#/bank-soal/baru">' + ic('plus', 'sm') + 'Soal Baru</a>' : ''), 'Utama › <b>Bank Soal</b>') +
      '<div id="bsKpi" class="grid g4"><div class="skel" style="height:110px"></div><div class="skel" style="height:110px"></div><div class="skel" style="height:110px"></div><div class="skel" style="height:110px"></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-b stack-sm"><div class="row wrap"><div class="search grow" style="min-width:220px">' + ic('search') + '<input class="inp" id="bsQ" placeholder="Cari teks soal, topik, KD…" value="' + esc(S.q) + '"></div>' +
      '<select class="sel" id="bsMapel" style="width:auto"></select><select class="sel" id="bsTingkat" style="width:auto"></select><select class="sel" id="bsTipe" style="width:auto"><option value="">Semua tipe</option><option value="PG">Pilihan Ganda</option><option value="PGK">PG Kompleks</option></select>' +
      '<select class="sel" id="bsStatus" style="width:auto"><option value="">Semua status</option><option>Aktif</option><option>Draf</option><option>Arsip</option></select></div>' +
      '<div class="chips scroll" id="bsBloom"></div></div>' +
      '<div class="row between wrap hidden" id="bsBulk" style="padding:10px 18px;background:var(--brand-50);border-top:1px solid var(--line)"><b class="small" id="bsN"></b><div class="row wrap"><button class="btn sm ghost" id="bsBatal">Batal pilih</button><button class="btn sm ghost" id="bsExpSel">' + ic('download', 'sm') + 'Ekspor terpilih</button>' + (guru ? '<button class="btn sm danger" id="bsDel">' + ic('trash', 'sm') + 'Hapus terpilih</button>' : '') + '</div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:34px"><input type="checkbox" id="bsAll"></th><th>Butir Soal</th><th>Mapel</th><th>Tipe · Bloom</th><th>Kesukaran</th><th>Kunci</th><th class="num">Dipakai</th>' + (guru ? '' : '<th>Pembuat</th>') + '<th class="right">Aksi</th></tr></thead><tbody id="bsBody"><tr><td colspan="9"><div class="skel" style="height:240px"></div></td></tr></tbody></table></div><div class="pager" id="bsPg"></div></div>';
    const render = function (d) {
      if (!$('#bsBody')) return;
      S.data = d;
      const f = d.facet, dipakai = d.rows.filter(function (r) { return r.Dipakai > 0; }).length, hots = (f.bloom.C4 || 0) + (f.bloom.C5 || 0) + (f.bloom.C6 || 0);
      $('#bsKpi').innerHTML = ADM.kpi('Total Butir', d.total, Object.keys(f.mapel).length + ' mata pelajaran', 't-blue', 'book') + ADM.kpi('Ditambah Bulan Ini', f.bulanIni, 'Soal baru', 't-green', 'plus') +
        ADM.kpi('Soal HOTS (C4–C6)', hots, d.total ? Math.round(hots / d.total * 100) + '% dari bank' : '-', 't-purple', 'spark') + ADM.kpi('Dipakai di Paket', dipakai, (f.media || 0) + ' soal bergambar', 't-amber', 'layers');
      const opsi = function (list, val, semua) { return '<option value="">' + semua + '</option>' + list.map(function (x) { return '<option' + (x === val ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join(''); };
      $('#bsMapel').innerHTML = opsi(Object.keys(f.mapel).sort(), S.mapel, 'Semua mapel');
      $('#bsTingkat').innerHTML = opsi(d.tingkat, S.tingkat, 'Semua tingkat');
      $('#bsTipe').value = S.tipe; $('#bsStatus').value = S.status;
      $('#bsBloom').innerHTML = '<button class="chip ' + (!S.bloom ? 'on' : '') + '" data-b="">Semua level</button>' + Object.keys(BLOOM).map(function (b) { return '<button class="chip ' + (S.bloom === b ? 'on' : '') + '" data-b="' + b + '">' + b + ' ' + BLOOM[b] + ' <span class="pill-n">' + (f.bloom[b] || 0) + '</span></button>'; }).join('') +
        '<span style="width:1px;background:var(--line);margin:0 4px"></span>' + ['Mudah', 'Sedang', 'Sukar'].map(function (k) { return '<button class="chip ' + (S.kes === k ? 'on' : '') + '" data-k="' + k + '">' + k + ' <span class="pill-n">' + (f.kesukaran[k] || 0) + '</span></button>'; }).join('');
      $$('#bsBloom [data-b]').forEach(function (b) { b.onclick = function () { S.bloom = b.dataset.b; S.hal = 1; render(S.data); }; });
      $$('#bsBloom [data-k]').forEach(function (b) { b.onclick = function () { S.kes = S.kes === b.dataset.k ? '' : b.dataset.k; S.hal = 1; render(S.data); }; });
      tabel();
    };
    const tersaring = function () {
      const q = S.q.toLowerCase();
      return S.data.rows.filter(function (r) {
        if (S.mapel && r.Mapel !== S.mapel) return false;
        if (S.tingkat && r.Tingkat !== S.tingkat) return false;
        if (S.tipe && r.Tipe !== S.tipe) return false;
        if (S.bloom && r.Bloom !== S.bloom) return false;
        if (S.kes && r.Kesukaran !== S.kes) return false;
        if (S.status && r.Status !== S.status) return false;
        return !q || (r.Pertanyaan + ' ' + r.Topik + ' ' + r.KD + ' ' + r.ID).toLowerCase().indexOf(q) > -1;
      });
    };
    const tabel = function () {
      const rows = tersaring(), per = 20, tampil = rows.slice((S.hal - 1) * per, S.hal * per);
      $('#bsBody').innerHTML = tampil.length ? tampil.map(function (r) {
        return '<tr class="' + (S.pilih[r.ID] ? 'sel' : '') + '"><td><input type="checkbox" data-ck="' + r.ID + '"' + (S.pilih[r.ID] ? ' checked' : '') + '></td>' +
          '<td style="max-width:460px"><div class="small" style="color:var(--ink);cursor:pointer;line-height:1.45" data-lihat="' + r.ID + '">' + (r.URLGambar ? ic('image', 'sm') + ' ' : '') + esc(ADM.teksPolos(r.Pertanyaan, 150)) + '</div>' +
          '<div class="row wrap tiny" style="gap:6px;margin-top:6px">' + (r.Topik ? '<span class="tag">' + esc(r.Topik) + '</span>' : '') + (r.KD ? '<span class="tag mono">' + esc(r.KD) + '</span>' : '') + (r.Status !== 'Aktif' ? '<span class="badge ' + (r.Status === 'Draf' ? 'amber' : '') + '">' + esc(r.Status) + '</span>' : '') + '<span class="muted mono">' + esc(r.ID) + '</span></div></td>' +
          '<td><b class="small" style="color:var(--ink)">' + esc(r.Mapel) + '</b><div class="tiny muted">Tingkat ' + esc(r.Tingkat || '-') + '</div></td>' +
          '<td><span class="badge ' + (r.Tipe === 'PGK' ? 'purple' : 'blue') + '">' + (r.Tipe === 'PGK' ? 'PG Kompleks' : 'PG') + '</span><div class="tiny muted" style="margin-top:4px">' + esc(r.Bloom) + ' · ' + esc(BLOOM[r.Bloom] || '') + '</div></td>' +
          '<td><span class="badge dot ' + ({ Mudah: 'green', Sedang: 'amber', Sukar: 'rose' }[r.Kesukaran] || '') + '">' + esc(r.Kesukaran || '-') + '</span></td>' +
          '<td><span class="tag mono b">' + esc(r.Kunci) + '</span><div class="tiny muted">bobot ' + r.Bobot + '</div></td><td class="num">' + (r.Dipakai ? '<b>' + r.Dipakai + '</b> paket' : '<span class="muted">—</span>') + '</td>' +
          (guru ? '' : '<td class="small">' + esc(r.NamaPembuat || '-') + '</td>') +
          '<td class="act"><button class="iconbtn" data-lihat="' + r.ID + '" title="Pratinjau">' + ic('eye') + '</button>' + (guru ? '<a class="iconbtn blue" href="#/bank-soal/' + r.ID + '" title="Ubah">' + ic('edit') + '</a><a class="iconbtn" href="#/bank-soal/salin:' + r.ID + '" title="Duplikat">' + ic('copy') + '</a><button class="iconbtn rose" data-del="' + r.ID + '" title="Hapus">' + ic('trash') + '</button>' : '') + '</td></tr>';
      }).join('') : A.tabelKosong(9, S.data.total ? 'Tidak ada soal yang cocok dengan filter.' : (guru ? 'Bank soal masih kosong — buat soal pertama atau impor dari Excel.' : 'Belum ada soal dari guru.'), 'book');
      A.pager($('#bsPg'), rows.length, S.hal, per, function (h) { S.hal = h; tabel(); });
      $$('[data-ck]', v).forEach(function (c) { c.onchange = function () { if (c.checked) S.pilih[c.dataset.ck] = 1; else delete S.pilih[c.dataset.ck]; c.closest('tr').classList.toggle('sel', c.checked); bulk(); }; });
      $$('[data-lihat]', v).forEach(function (b) { b.onclick = function () { pratinjauSoal(S.data.rows.filter(function (r) { return r.ID === b.dataset.lihat; })[0]); }; });
      $$('[data-del]', v).forEach(function (b) { b.onclick = function () { hapus([b.dataset.del]); }; });
      $('#bsAll').checked = tampil.length > 0 && tampil.every(function (r) { return S.pilih[r.ID]; });
      bulk();
    };
    const bulk = function () { const n = Object.keys(S.pilih).length; $('#bsBulk').classList.toggle('hidden', !n); $('#bsN').textContent = n + ' soal dipilih'; };
    const hapus = async function (ids) {
      if (!await A.confirm('Hapus ' + ids.length + ' soal? Soal yang sudah dipakai di paket ujian akan <b>diarsipkan</b> (tidak dihapus) agar hasil ujian tetap utuh.', { danger: true, ok: 'Hapus' })) return;
      const r = await A.api('soal.hapus', { ids: ids }); if (!A.hasil(r)) return;
      S.pilih = {}; A.swrClear('soal'); muatSoal(true).then(function (d) { if (d) render(d); });
    };
    $('#bsQ').oninput = A.debounce(function (e) { S.q = e.target.value; S.hal = 1; tabel(); }, 200);
    $('#bsMapel').onchange = function () { S.mapel = this.value; S.hal = 1; tabel(); };
    $('#bsTingkat').onchange = function () { S.tingkat = this.value; S.hal = 1; tabel(); };
    $('#bsTipe').onchange = function () { S.tipe = this.value; S.hal = 1; tabel(); };
    $('#bsStatus').onchange = function () { S.status = this.value; S.hal = 1; tabel(); };
    $('#bsAll').onchange = function () { const on = this.checked; $$('[data-ck]', v).forEach(function (c) { c.checked = on; if (on) S.pilih[c.dataset.ck] = 1; else delete S.pilih[c.dataset.ck]; c.closest('tr').classList.toggle('sel', on); }); bulk(); };
    $('#bsBatal').onclick = function () { S.pilih = {}; tabel(); };
    if ($('#bsDel')) $('#bsDel').onclick = function () { hapus(Object.keys(S.pilih)); };
    const ekspor = function (rows) { A.exportXlsx({ BankSoal: rows.map(function (r) { const o = { ID: r.ID }; KOLOM_SOAL.forEach(function (k) { o[k] = r[k]; }); o.Dipakai = r.Dipakai; return o; }) }, 'Bank Soal ' + F.tgl(new Date())); };
    $('#bsExp').onclick = function () { if (S.data) ekspor(tersaring()); };
    $('#bsExpSel').onclick = function () { ekspor(S.data.rows.filter(function (r) { return S.pilih[r.ID]; })); };
    if ($('#bsImp')) $('#bsImp').onclick = function () {
      ADM.imporExcel({ judul: 'Impor Soal dari Excel', aksi: 'soal.impor', kolom: KOLOM_SOAL, alias: ALIAS_SOAL, namaTemplate: 'Template Bank Soal UjianKu',
        contoh: [{ Mapel: 'Fisika', Tingkat: 'XI', Topik: 'Hukum Newton', KD: '3.7', Bloom: 'C3', Tipe: 'PG', Pertanyaan: 'Sebuah balok bermassa 2 kg ditarik gaya 10 N. Percepatan balok adalah …', URLGambar: '', A: '2 m/s²', B: '5 m/s²', C: '10 m/s²', D: '20 m/s²', E: '', Kunci: 'B', Bobot: 1, Kesukaran: 'Mudah', Pembahasan: 'a = F/m = 10/2 = 5 m/s²', Status: 'Aktif' },
          { Mapel: 'Fisika', Tingkat: 'XI', Topik: 'Usaha & Energi', KD: '3.9', Bloom: 'C4', Tipe: 'PGK', Pertanyaan: 'Pilih SEMUA pernyataan yang benar tentang energi mekanik …', URLGambar: '', A: 'Kekal bila hanya gaya konservatif', B: 'Selalu bertambah', C: 'Ek + Ep', D: 'Satuannya Watt', E: '', Kunci: 'A,C', Bobot: 2, Kesukaran: 'Sedang', Pembahasan: 'Rumus $EM = E_k + E_p$', Status: 'Aktif' }],
        ekstra: '<div class="alert blue">' + ic('info') + '<div class="small">Soal yang teksnya sama (per mapel) dianggap <b>soal yang sama</b> dan diperbarui — impor aman diulang. Kunci PG Kompleks ditulis dipisah koma, mis. <span class="mono">A,C</span>.</div></div>',
        after: function () { A.swrClear('soal'); muatSoal(true).then(function (d) { if (d) render(d); }); } });
    };
    muatSoal().then(function (d) { if (d) render(d); else if ($('#bsBody')) $('#bsBody').innerHTML = A.tabelKosong(9, 'Gagal memuat bank soal.'); });
  });

  /** Pratinjau soal seperti tampilan siswa (+ kunci & pembahasan). */
  function pratinjauSoal(q) {
    if (!q) return;
    const kunci = String(q.Kunci).split(',');
    const dr = A.drawer({ title: 'Pratinjau Soal', sub: q.Mapel + ' · ' + (q.Topik || '-') + ' · ' + q.ID, size: 'lg',
      body: '<div class="row wrap" style="gap:6px;margin-bottom:12px"><span class="badge blue">' + (q.Tipe === 'PGK' ? 'PG Kompleks' : 'Pilihan Ganda') + '</span><span class="badge purple">' + esc(q.Bloom) + ' ' + esc(BLOOM[q.Bloom] || '') + '</span><span class="badge">' + esc(q.Kesukaran) + '</span><span class="badge">Bobot ' + q.Bobot + '</span>' + (q.KD ? '<span class="tag mono">KD ' + esc(q.KD) + '</span>' : '') + '</div>' +
        '<div class="q-card" style="padding:18px"><div class="q-text">' + A.soalHtml(q.Pertanyaan) + '</div>' + (q.URLGambar ? '<img class="q-img" src="' + esc(q.URLGambar) + '" alt="Gambar soal" loading="lazy" referrerpolicy="no-referrer">' : '') +
        '<div class="stack-sm" style="margin-top:14px">' + HURUF.filter(function (k) { return String(q[k] || '').trim(); }).map(function (k) { return '<div class="opt ' + (q.Tipe === 'PGK' ? 'sq ' : '') + (kunci.indexOf(k) > -1 ? 'benar' : '') + '"><span class="L">' + k + '</span><span class="grow">' + A.soalHtml(q[k]) + '</span>' + (kunci.indexOf(k) > -1 ? '<span class="badge green">Kunci</span>' : '') + '</div>'; }).join('') + '</div></div>' +
        (q.Pembahasan ? '<div class="card soft" style="padding:16px;margin-top:14px"><b class="small">' + ic('book', 'sm') + ' Pembahasan</b><div class="small" style="margin-top:8px;line-height:1.6">' + A.soalHtml(q.Pembahasan) + '</div></div>' : '') +
        '<div class="tiny muted" style="margin-top:12px">Dibuat oleh ' + esc(q.NamaPembuat || '-') + ' · diperbarui ' + F.tglJam(q.DiperbaruiPada) + ' · dipakai di ' + q.Dipakai + ' paket</div>' +
        (ADM.isGuru() ? '<div class="row" style="margin-top:14px"><a class="btn primary" href="#/bank-soal/' + q.ID + '">' + ic('edit', 'sm') + 'Ubah soal</a><a class="btn ghost" href="#/bank-soal/salin:' + q.ID + '">' + ic('copy', 'sm') + 'Duplikat</a></div>' : '') });
    $$('a', dr.el).forEach(function (a) { a.addEventListener('click', function () { dr.close(); }); });
    A.renderMath(dr.body);
  }

  // ============================================================================
  // BANK SOAL — EDITOR + PRATINJAU LANGSUNG
  // ============================================================================
  async function editorSoal(v, id) {
    if (!ADM.isGuru()) { v.innerHTML = '<div class="card pad empty">Mode admin: bank soal hanya dapat dilihat. <a href="#/bank-soal">Kembali</a></div>'; return; }
    ADM.loading(v);
    const d = await muatSoal();
    if (!d) { v.innerHTML = '<div class="card pad empty">Gagal memuat data.</div>'; return; }
    const salin = /^salin:/.test(id), sid = id.replace(/^salin:/, ''), baru = id === 'baru';
    let q = baru ? null : d.rows.filter(function (r) { return r.ID === sid; })[0];
    if (!baru && !q) { v.innerHTML = '<div class="card pad empty">Soal tidak ditemukan. <a href="#/bank-soal">Kembali ke bank soal</a></div>'; return; }
    const ingat = A.LS.get('uk_soal_terakhir', {});
    q = q ? Object.assign({}, q) : { Mapel: ingat.Mapel || (ADM.me.mapel || [])[0] || '', Tingkat: ingat.Tingkat || '', Topik: ingat.Topik || '', KD: '', Bloom: 'C2', Tipe: 'PG', Pertanyaan: '', URLGambar: '', A: '', B: '', C: '', D: '', E: '', Kunci: '', Bobot: 1, Kesukaran: 'Sedang', Pembahasan: '', Status: 'Aktif' };
    if (salin) { delete q.ID; q.Pertanyaan = q.Pertanyaan + ' (salinan)'; }
    const mapelList = d.mapelList.concat(ADM.me.mapel || []).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    if (q.Mapel && mapelList.indexOf(q.Mapel) < 0) mapelList.unshift(q.Mapel);
    let kotor = false;
    const opsiAktif = function () { let n = 0; HURUF.forEach(function (k, i) { if (String(q[k] || '').trim()) n = i + 1; }); return Math.max(4, n); };
    let jumlahOpsi = opsiAktif();
    v.innerHTML = ADM.judul(q.ID ? 'Ubah Soal' : 'Soal Baru', 'Gunakan **tebal**, *miring*, __garis bawah__, dan $rumus LaTeX$ — pratinjau di kanan sama dengan tampilan siswa.', '<a class="btn ghost" href="#/bank-soal">' + ic('left', 'sm') + 'Kembali</a>', 'Bank Soal › <b>' + (q.ID ? esc(q.ID) : 'Baru') + '</b>') +
      '<div class="grid" style="grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);align-items:start;gap:18px" id="edGrid"><div class="stack">' +
      '<div class="card pad-lg"><h3 style="font-size:15px;margin-bottom:14px">' + ic('tag', 'sm') + ' Identitas Butir</h3><div class="form-grid">' +
      '<div class="field"><label>Mata pelajaran *</label><select class="sel" id="eMapel">' + mapelList.map(function (m) { return '<option' + (m === q.Mapel ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>Tingkat</label><select class="sel" id="eTingkat"><option value="">—</option>' + d.tingkat.map(function (t) { return '<option' + (t === q.Tingkat ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>Topik / materi</label><input class="inp" id="eTopik" value="' + esc(q.Topik) + '" placeholder="mis. Hukum Newton" list="dlTopik"><datalist id="dlTopik">' + d.rows.map(function (r) { return r.Topik; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).slice(0, 80).map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist></div>' +
      '<div class="field"><label>KD / Tujuan Pembelajaran</label><input class="inp" id="eKD" value="' + esc(q.KD) + '" placeholder="mis. 3.7"></div>' +
      '<div class="field full"><label>Level kognitif (Taksonomi Bloom)</label><div class="chips" id="eBloom">' + Object.keys(BLOOM).map(function (b) { return '<button type="button" class="chip ' + (q.Bloom === b ? 'on' : '') + '" data-v="' + b + '"><b>' + b + '</b> ' + BLOOM[b] + '</button>'; }).join('') + '</div><div class="hint">C4–C6 tergolong HOTS (Higher Order Thinking Skills).</div></div>' +
      '<div class="field"><label>Tipe soal</label>' + ADM.seg('eTipe', [['PG', 'Pilihan Ganda'], ['PGK', 'PG Kompleks']], q.Tipe) + '</div>' +
      '<div class="field"><label>Tingkat kesukaran</label>' + ADM.seg('eKes', ['Mudah', 'Sedang', 'Sukar'], q.Kesukaran) + '</div>' +
      '<div class="field"><label>Bobot skor</label><input class="inp" type="number" id="eBobot" min="1" max="100" value="' + esc(q.Bobot) + '"></div>' +
      '<div class="field"><label>Status</label><select class="sel" id="eStatus">' + ['Aktif', 'Draf', 'Arsip'].map(function (s) { return '<option' + (s === q.Status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div></div></div>' +
      '<div class="card pad-lg"><div class="row between"><h3 style="font-size:15px">' + ic('edit', 'sm') + ' Pertanyaan</h3><div class="row" style="gap:4px" id="eTool"><button type="button" class="iconbtn" data-w="**" title="Tebal"><b>B</b></button><button type="button" class="iconbtn" data-w="*" title="Miring"><i>I</i></button><button type="button" class="iconbtn" data-w="__" title="Garis bawah"><u>U</u></button><button type="button" class="iconbtn" data-w="$" title="Rumus LaTeX">∑</button><button type="button" class="iconbtn" id="eImg" title="Unggah gambar">' + ic('image') + '</button></div></div>' +
      '<textarea class="ta" id="ePert" rows="6" style="margin-top:12px;font-size:14px" placeholder="Tulis pertanyaan…">' + esc(q.Pertanyaan) + '</textarea>' +
      '<div class="field" style="margin-top:12px"><label>URL gambar (opsional)</label><div class="row"><input class="inp grow" id="eGbr" value="' + esc(q.URLGambar) + '" placeholder="https://… atau unggah dengan tombol gambar"><button type="button" class="btn sm ghost" id="eGbrX">' + ic('x', 'sm') + '</button></div><div class="hint">Gambar dikompres otomatis di browser sebelum diunggah ke Google Drive.</div></div></div>' +
      '<div class="card pad-lg"><div class="row between"><h3 style="font-size:15px">' + ic('list', 'sm') + ' Pilihan Jawaban</h3><span class="tiny muted" id="eKunciInfo"></span></div><div class="stack-sm" id="eOpsi" style="margin-top:12px"></div>' +
      '<div class="row" style="margin-top:10px"><button type="button" class="btn sm soft" id="eTambah">' + ic('plus', 'sm') + 'Tambah pilihan</button><button type="button" class="btn sm ghost" id="eKurang">' + ic('minus', 'sm') + 'Kurangi</button></div></div>' +
      '<div class="card pad-lg"><h3 style="font-size:15px">' + ic('book', 'sm') + ' Pembahasan</h3><p class="tiny muted" style="margin:4px 0 10px">Ditampilkan ke siswa setelah jadwal ujian ditutup (bila diizinkan).</p><textarea class="ta" id="ePemb" rows="4" placeholder="Langkah penyelesaian…">' + esc(q.Pembahasan) + '</textarea></div>' +
      '<div class="unsaved hidden" id="eBar"><span class="dot"></span><span class="grow small">Perubahan belum disimpan</span><button class="btn sm" style="background:transparent;color:#fff;border:1px solid #334155" id="eBatal">Batalkan</button>' + (q.ID ? '' : '<button class="btn sm" style="background:#1e293b;color:#fff" id="eSimpanBaru">Simpan &amp; buat lagi</button>') + '<button class="btn sm primary" id="eSimpan">' + ic('save', 'sm') + 'Simpan</button></div></div>' +
      '<div class="stack" style="position:sticky;top:84px"><div class="card"><div class="card-h"><div><h3>Pratinjau Siswa</h3><p>Tampilan di ruang ujian</p></div><span class="badge live">Langsung</span></div><div class="card-b" id="ePrev"></div></div>' +
      '<div class="card pad"><div class="small b" style="color:var(--ink)">Kualitas butir</div><ul class="tiny muted" id="eCek" style="margin:8px 0 0;padding-left:18px;line-height:1.8"></ul><div class="row" style="margin-top:12px"><button class="btn primary block" id="eSimpan2">' + ic('save', 'sm') + 'Simpan Soal</button></div><p class="tiny muted" style="margin:8px 0 0">Pintasan: <span class="kbd">Ctrl</span>+<span class="kbd">S</span></p></div></div></div>';
    if (innerWidth < 1100) $('#edGrid').style.gridTemplateColumns = '1fr';
    const ambil = function () {
      q.Mapel = $('#eMapel').value; q.Tingkat = $('#eTingkat').value; q.Topik = $('#eTopik').value.trim(); q.KD = $('#eKD').value.trim();
      const b = $('#eBloom .chip.on'); q.Bloom = b ? b.dataset.v : 'C2'; q.Tipe = ADM.nilaiSeg('eTipe'); q.Kesukaran = ADM.nilaiSeg('eKes'); q.Bobot = Number($('#eBobot').value) || 1; q.Status = $('#eStatus').value;
      q.Pertanyaan = $('#ePert').value; q.URLGambar = $('#eGbr').value.trim(); q.Pembahasan = $('#ePemb').value;
      HURUF.forEach(function (k, i) { const el = $('#eO' + k); q[k] = el && i < jumlahOpsi ? el.value : ''; });
      q.Kunci = $$('#eOpsi [data-kunci].on').map(function (x) { return x.dataset.kunci; }).filter(function (k) { return String(q[k] || '').trim(); }).join(',');
      return q;
    };
    const tandai = function () { if (!kotor) { kotor = true; $('#eBar').classList.remove('hidden'); } };
    const opsiHtml = function () {
      const kunci = String(q.Kunci || '').split(',');
      $('#eOpsi').innerHTML = HURUF.slice(0, jumlahOpsi).map(function (k) {
        return '<div class="row top" style="gap:10px"><button type="button" class="opt-key ' + (kunci.indexOf(k) > -1 ? 'on' : '') + '" data-kunci="' + k + '" title="Tandai sebagai kunci" style="width:38px;height:38px;flex:none;border-radius:' + (q.Tipe === 'PGK' ? '9px' : '50%') + ';border:2px solid ' + (kunci.indexOf(k) > -1 ? 'var(--green)' : 'var(--line)') + ';background:' + (kunci.indexOf(k) > -1 ? 'var(--green)' : 'var(--card)') + ';color:' + (kunci.indexOf(k) > -1 ? '#fff' : 'var(--ink-2)') + ';font-weight:800">' + k + '</button>' +
          '<textarea class="ta grow" id="eO' + k + '" rows="1" style="min-height:40px" placeholder="Pilihan ' + k + '">' + esc(q[k] || '') + '</textarea></div>';
      }).join('');
      $$('#eOpsi [data-kunci]').forEach(function (b) { b.onclick = function () {
        if (q.Tipe !== 'PGK') $$('#eOpsi [data-kunci]').forEach(function (x) { if (x !== b) x.classList.remove('on'); });
        b.classList.toggle('on'); ambil(); opsiHtml(); prev(); tandai();
      }; });
      $$('#eOpsi textarea').forEach(function (t) { t.oninput = function () { tandai(); prevD(); }; });
      $('#eKunciInfo').textContent = q.Tipe === 'PGK' ? 'Klik huruf untuk menandai SEMUA jawaban benar (min. 2)' : 'Klik huruf untuk menandai kunci jawaban';
    };
    const prev = function () {
      ambil();
      const kunci = q.Kunci.split(',');
      $('#ePrev').innerHTML = '<div class="row between tiny muted" style="margin-bottom:10px"><span>Soal No. 1 · ' + esc(q.Mapel) + '</span><span>' + (q.Tipe === 'PGK' ? 'Pilih lebih dari satu' : 'Pilih satu jawaban') + '</span></div>' +
        '<div class="q-text" style="font-size:15px">' + (q.Pertanyaan.trim() ? A.soalHtml(q.Pertanyaan) : '<span class="muted">Teks pertanyaan akan tampil di sini…</span>') + '</div>' +
        (q.URLGambar ? '<img class="q-img" src="' + esc(q.URLGambar) + '" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'alert amber\',textContent:\'Gambar tidak dapat dimuat — periksa URL/izin berbagi.\'}))">' : '') +
        '<div class="stack-sm" style="margin-top:12px">' + HURUF.slice(0, jumlahOpsi).filter(function (k) { return String(q[k] || '').trim(); }).map(function (k) { return '<div class="opt ' + (q.Tipe === 'PGK' ? 'sq ' : '') + (kunci.indexOf(k) > -1 ? 'benar' : '') + '"><span class="L">' + k + '</span><span class="grow">' + A.soalHtml(q[k]) + '</span><span class="rd"></span></div>'; }).join('') + '</div>' +
        (q.Pembahasan.trim() ? '<div class="alert blue" style="margin-top:12px">' + ic('book', 'sm') + '<div class="small">' + A.soalHtml(q.Pembahasan) + '</div></div>' : '');
      A.renderMath($('#ePrev'));
      const ada = HURUF.filter(function (k) { return String(q[k] || '').trim(); }), cek = [];
      cek.push([q.Pertanyaan.trim().length >= 10, 'Pertanyaan cukup jelas']);
      cek.push([ada.length >= 2 && ada.every(function (k, i) { return k === HURUF[i]; }), 'Pilihan berurutan mulai A (' + ada.length + ' terisi)']);
      cek.push([q.Tipe === 'PGK' ? kunci.filter(String).length >= 2 : kunci.filter(String).length === 1, q.Tipe === 'PGK' ? 'Minimal 2 kunci (PG kompleks)' : 'Satu kunci jawaban ditandai']);
      cek.push([ada.length >= 4, 'Disarankan 4–5 pilihan (pengecoh efektif)']);
      cek.push([new Set(ada.map(function (k) { return String(q[k]).trim().toLowerCase(); })).size === ada.length, 'Tidak ada pilihan kembar']);
      cek.push([!!q.Pembahasan.trim(), 'Pembahasan diisi (membantu remedial)']);
      $('#eCek').innerHTML = cek.map(function (c) { return '<li style="color:' + (c[0] ? 'var(--green)' : 'var(--muted)') + '">' + (c[0] ? '✓ ' : '○ ') + esc(c[1]) + '</li>'; }).join('');
    };
    const prevD = A.debounce(prev, 250);
    opsiHtml(); prev();
    $$('#eBloom .chip').forEach(function (b) { b.onclick = function () { $$('#eBloom .chip').forEach(function (x) { x.classList.toggle('on', x === b); }); tandai(); }; });
    ADM.ikatSeg('eTipe', function () { ambil(); if (q.Tipe === 'PG' && q.Kunci.indexOf(',') > -1) q.Kunci = q.Kunci.split(',')[0]; opsiHtml(); prev(); tandai(); });
    ADM.ikatSeg('eKes', tandai);
    ['eMapel', 'eTingkat', 'eTopik', 'eKD', 'eBobot', 'eStatus'].forEach(function (i) { $('#' + i).addEventListener('input', tandai); $('#' + i).addEventListener('change', tandai); });
    ['ePert', 'eGbr', 'ePemb'].forEach(function (i) { $('#' + i).oninput = function () { tandai(); prevD(); }; });
    $('#eGbrX').onclick = function () { $('#eGbr').value = ''; tandai(); prev(); };
    $('#eTambah').onclick = function () { ambil(); if (jumlahOpsi < 5) { jumlahOpsi++; opsiHtml(); prev(); } };
    $('#eKurang').onclick = function () { ambil(); if (jumlahOpsi > 2) { const k = HURUF[jumlahOpsi - 1]; q[k] = ''; q.Kunci = q.Kunci.split(',').filter(function (x) { return x !== k; }).join(','); jumlahOpsi--; opsiHtml(); prev(); tandai(); } };
    let fokus = $('#ePert');
    v.addEventListener('focusin', function (e) { if (e.target.tagName === 'TEXTAREA') fokus = e.target; });
    $$('#eTool [data-w]').forEach(function (b) { b.onmousedown = function (e) { e.preventDefault(); }; b.onclick = function () {
      const t = fokus, w = b.dataset.w, a = t.selectionStart, z = t.selectionEnd, isi = t.value.slice(a, z) || (w === '$' ? 'x^2' : 'teks');
      t.value = t.value.slice(0, a) + w + isi + w + t.value.slice(z); t.focus(); t.setSelectionRange(a + w.length, a + w.length + isi.length); tandai(); prev();
    }; });
    $('#eImg').onclick = async function () {
      const f = await A.pilihBerkas('image/*'); if (!f) return;
      const b = this; A.busy(b, true);
      try {
        const dataUrl = await A.kompresGambar(f, 1400, 0.82);
        const r = await A.api('upload.gambar', { dataUrl: dataUrl, nama: f.name.replace(/\.\w+$/, '') }, { timeout: 90000 });
        if (r.success) { $('#eGbr').value = r.data.url; tandai(); prev(); A.toast('Gambar diunggah.', 'ok'); } else A.toast(r.message, 'err');
      } catch (e) { A.toast('Gambar tidak dapat diproses.', 'err'); }
      A.busy(b, false);
    };
    const simpan = async function (btn, lagi) {
      ambil();
      A.busy(btn, true);
      const r = await A.api('soal.simpan', { soal: q });
      A.busy(btn, false);
      if (!A.hasil(r)) return;
      kotor = false; A.LS.set('uk_soal_terakhir', { Mapel: q.Mapel, Tingkat: q.Tingkat, Topik: q.Topik });
      A.swrClear('soal'); await muatSoal(true);
      const tujuan = lagi ? '#/bank-soal/baru' : '#/bank-soal';
      if (location.hash === tujuan) ADM.render(); else location.hash = tujuan;
    };
    $('#eSimpan').onclick = function () { simpan(this); };
    $('#eSimpan2').onclick = function () { simpan(this); };
    if ($('#eSimpanBaru')) $('#eSimpanBaru').onclick = function () { simpan(this, true); };
    $('#eBatal').onclick = async function () { if (await A.confirm('Buang perubahan yang belum disimpan?', { ok: 'Buang' })) { kotor = false; location.hash = '#/bank-soal'; } };
    ADM._editor = { el: $('#ePert'), simpan: function () { simpan($('#eSimpan2')); }, kotor: function () { return kotor; } };
  }
  // Pintasan & penjaga perubahan editor (dipasang sekali)
  const editorAktif = function () { return ADM._editor && ADM._editor.el && document.body.contains(ADM._editor.el) ? ADM._editor : null; };
  document.addEventListener('keydown', function (e) { const ed = editorAktif(); if (ed && (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); ed.simpan(); } });
  window.addEventListener('beforeunload', function (e) { const ed = editorAktif(); if (ed && ed.kotor()) { e.preventDefault(); e.returnValue = ''; } });

  // ============================================================================
  // PAKET UJIAN — DAFTAR
  // ============================================================================
  const P = { filter: 'semua', q: '' };
  function muatPaket(paksa) { return A.swr('paket', function () { return A.apiQ('paket.list', {}); }, { maxAge: paksa ? 0 : 20000, force: !!paksa }); }
  ADM.muatPaket = muatPaket;
  ADM.reg('paket', function (v, id) {
    if (id) return penyusunPaket(v, id);
    const guru = ADM.isGuru();
    v.innerHTML = ADM.judul('Paket Ujian & Penjadwalan', guru ? 'Susun paket dari bank soal, atur jadwal & aturan, lalu terbitkan dan bagikan token.' : 'Pantau seluruh paket ujian dari semua guru. Paket dibuat oleh guru pengampu.',
      guru ? '<a class="btn primary" href="#/paket/baru">' + ic('plus', 'sm') + 'Buat Paket Ujian</a>' : '', 'Utama › <b>Paket Ujian</b>') +
      '<div class="grid g5" id="pkKpi"></div><div class="card" style="margin-top:16px"><div class="card-b row wrap between"><div class="chips scroll" id="pkF"></div><div class="search" style="min-width:240px">' + ic('search') + '<input class="inp" id="pkQ" placeholder="Cari nama, kode, mapel, kelas…" value="' + esc(P.q) + '"></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Paket</th><th>Kelas Sasaran</th><th>Jadwal</th><th class="num">Soal</th><th>Token</th><th>Peserta</th><th class="num">Rata-rata</th><th>Status</th><th class="right">Aksi</th></tr></thead><tbody id="pkBody"><tr><td colspan="9"><div class="skel" style="height:220px"></div></td></tr></tbody></table></div></div>';
    let D = null;
    const render = function (d) {
      if (!$('#pkBody')) return; D = d;
      const k = d.kpi;
      $('#pkKpi').innerHTML = ADM.kpi('Total Paket', k.total, k.soalTerdistribusi + ' soal terdistribusi', 't-blue', 'layers') + ADM.kpi('Berlangsung', k.aktif, k.sesiBerjalan + ' siswa mengerjakan', 't-green', 'play') +
        ADM.kpi('Terjadwal', k.terjadwal, 'Menunggu waktu buka', 't-purple', 'cal') + ADM.kpi('Draf', k.draf, 'Belum diterbitkan', 't-amber', 'edit') + ADM.kpi('Token Aktif', k.tokenAktif, 'Siap dibagikan', 't-rose', 'ticket');
      const hit = {}; d.rows.forEach(function (r) { hit[r.StatusTampil] = (hit[r.StatusTampil] || 0) + 1; });
      $('#pkF').innerHTML = [['semua', 'Semua', d.rows.length], ['Berlangsung', 'Berlangsung'], ['Terjadwal', 'Terjadwal'], ['Draf', 'Draf'], ['Selesai', 'Selesai'], ['Arsip', 'Arsip']].map(function (t) { return '<button class="chip ' + (P.filter === t[0] ? 'on' : '') + '" data-f="' + t[0] + '">' + t[1] + ' <span class="pill-n">' + (t[2] !== undefined ? t[2] : hit[t[0]] || 0) + '</span></button>'; }).join('');
      $$('#pkF [data-f]').forEach(function (b) { b.onclick = function () { P.filter = b.dataset.f; render(D); }; });
      tabel();
    };
    const tabel = function () {
      const q = P.q.toLowerCase();
      const rows = D.rows.filter(function (r) { return (P.filter === 'semua' || r.StatusTampil === P.filter) && (!q || (r.Nama + ' ' + r.Kode + ' ' + r.Mapel + ' ' + r.KelasSasaran + ' ' + r.NamaPemilik).toLowerCase().indexOf(q) > -1); });
      $('#pkBody').innerHTML = rows.length ? rows.map(function (r) {
        const milik = r.Pemilik === ADM.me.id, pct = r.Token.total ? Math.round(r.Sesi.selesai / r.Token.total * 100) : 0;
        return '<tr><td style="min-width:220px"><b style="color:var(--ink)">' + esc(r.Nama) + '</b><div class="tiny muted"><span class="mono">' + esc(r.Kode) + '</span> · ' + esc(r.Mapel) + (r.Tingkat ? ' · ' + esc(r.Tingkat) : '') + (ADM.isAdmin() ? ' · ' + esc(r.NamaPemilik) : '') + '</div></td>' +
          '<td><div class="row wrap" style="gap:4px">' + String(r.KelasSasaran || '').split(/\s*,\s*/).filter(Boolean).slice(0, 4).map(function (k) { return '<span class="tag">' + esc(k) + '</span>'; }).join('') + '</div></td>' +
          '<td class="small nowrap"><b style="color:var(--ink)">' + F.tgl(r.WaktuBuka) + '</b><div class="tiny muted">' + F.jam(r.WaktuBuka) + '–' + F.jam(r.WaktuTutup) + ' · ' + r.Durasi + ' mnt</div></td>' +
          '<td class="num"><b>' + r.JumlahSoal + '</b><span class="tiny muted">/' + r.JumlahPool + '</span></td>' +
          '<td class="small">' + (r.Token.total ? '<b>' + r.Token.aktif + '</b> aktif<div class="tiny muted">' + r.Token.terpakai + ' terpakai / ' + r.Token.total + '</div>' : '<span class="muted">Belum ada</span>') + '</td>' +
          '<td style="min-width:120px"><div class="tiny b">' + r.Sesi.selesai + '/' + r.Token.total + ' selesai' + (r.Sesi.berjalan ? ' · <span style="color:var(--green)">' + r.Sesi.berjalan + ' jalan</span>' : '') + '</div><div class="bar green" style="margin-top:5px"><i style="width:' + pct + '%"></i></div></td>' +
          '<td class="num">' + (r.RataRata === null ? '<span class="muted">—</span>' : '<b style="color:' + (r.RataRata >= r.KKMEfektif ? 'var(--green)' : 'var(--rose)') + '">' + F.angka(r.RataRata) + '</b><div class="tiny muted">KKM ' + r.KKMEfektif + '</div>') + '</td>' +
          '<td>' + ADM.badgeStatus(r.StatusTampil) + '</td>' +
          '<td class="act">' + (r.Status === 'Terbit' ? '<a class="iconbtn green" href="#/monitoring/' + r.ID + '" title="Monitoring">' + ic('monitor') + '</a><a class="iconbtn amber" href="#/token/' + r.ID + '" title="Token PIN">' + ic('ticket') + '</a>' : '') +
          (r.Sesi.selesai ? '<a class="iconbtn blue" href="#/rekap/' + r.ID + '" title="Rekap & analisis">' + ic('chart') + '</a>' : '') +
          (milik ? '<a class="iconbtn" href="#/paket/' + r.ID + '" title="Ubah">' + ic('edit') + '</a><a class="iconbtn" href="#/paket/salin:' + r.ID + '" title="Duplikat">' + ic('copy') + '</a><button class="iconbtn rose" data-del="' + r.ID + '" data-n="' + esc(r.Nama) + '" data-s="' + r.Sesi.total + '" title="Hapus/arsip">' + ic('trash') + '</button>' : '<button class="iconbtn" data-info="' + r.ID + '" title="Detail">' + ic('eye') + '</button>') + '</td></tr>';
      }).join('') : A.tabelKosong(9, D.rows.length ? 'Tidak ada paket pada filter ini.' : (ADM.isGuru() ? 'Belum ada paket — klik "Buat Paket Ujian".' : 'Belum ada paket ujian dari guru.'), 'layers');
      $$('[data-del]', v).forEach(function (b) { b.onclick = async function () {
        const ada = Number(b.dataset.s) > 0;
        if (!await A.confirm(ada ? 'Paket <b>' + esc(b.dataset.n) + '</b> sudah memiliki hasil ujian sehingga akan <b>diarsipkan</b> (hasil tetap tersimpan). Lanjutkan?' : 'Hapus paket <b>' + esc(b.dataset.n) + '</b> beserta seluruh tokennya?', { danger: !ada, ok: ada ? 'Arsipkan' : 'Hapus' })) return;
        const r = await A.api('paket.hapus', { id: b.dataset.del }); if (A.hasil(r)) { A.swrClear('paket'); muatPaket(true).then(function (d) { if (d) render(d); }); }
      }; });
      $$('[data-info]', v).forEach(function (b) { b.onclick = function () { infoPaket(D.rows.filter(function (r) { return r.ID === b.dataset.info; })[0]); }; });
    };
    $('#pkQ').oninput = A.debounce(function (e) { P.q = e.target.value; if (D) tabel(); }, 200);
    muatPaket().then(function (d) { if (d) render(d); else if ($('#pkBody')) $('#pkBody').innerHTML = A.tabelKosong(9, 'Gagal memuat paket.'); });
  });
  function infoPaket(r) {
    if (!r) return;
    const ya = function (x) { return x === 'YA' ? 'Ya' : x === 'TIDAK' ? 'Tidak' : x === 'SETELAH_TUTUP' ? 'Setelah jadwal ditutup' : 'Ikut pengaturan sekolah'; };
    A.drawer({ title: r.Nama, sub: r.Kode + ' · ' + r.Mapel + ' · oleh ' + (r.NamaPemilik || '-'), body: '<div class="stack-sm">' + [['Status', r.StatusTampil], ['Kelas sasaran', r.KelasSasaran], ['Jadwal', F.tglJam(r.WaktuBuka) + ' – ' + F.tglJam(r.WaktuTutup)], ['Durasi', r.Durasi + ' menit'], ['Toleransi mulai', r.Toleransi ? r.Toleransi + ' menit' : 'Sampai tutup'],
      ['Soal', r.JumlahSoal + ' dari ' + r.JumlahPool + ' butir' + (r.AcakSoal === 'YA' ? ' · diacak' : '') + (r.AcakOpsi === 'YA' ? ' · opsi diacak' : '')], ['KKM', r.KKMEfektif + (r.KKM === '' ? ' (standar sekolah)' : ' (khusus paket)')], ['Tampil nilai', ya(r.TampilNilai)], ['Pembahasan', ya(r.IzinPembahasan)],
      ['Anti-cheat', r.AntiCheat === 'YA' ? 'Aktif · maks ' + (r.MaksPelanggaran || '-') + ' pelanggaran' : 'Nonaktif'], ['Satu perangkat', r.SingleDevice === 'YA' ? 'Ya' : 'Tidak'], ['Token', r.Token.aktif + ' aktif · ' + r.Token.terpakai + ' terpakai · ' + r.Token.total + ' total'], ['Catatan', r.Catatan || '-']]
      .map(function (x) { return '<div class="row between small" style="padding:9px 0;border-bottom:1px solid var(--line-2);gap:16px"><span class="muted">' + x[0] + '</span><b style="color:var(--ink);text-align:right">' + esc(x[1]) + '</b></div>'; }).join('') + '</div>' });
  }

  // ============================================================================
  // PAKET UJIAN — PENYUSUN & PENJADWALAN (khusus guru)
  // ============================================================================
  async function penyusunPaket(v, id) {
    if (!ADM.isGuru()) { v.innerHTML = '<div class="card pad empty">Paket ujian disusun oleh guru pengampu. Admin dapat memantau, mengelola token, dan melihat rekap. <a href="#/paket">Kembali</a></div>'; return; }
    ADM.loading(v);
    const hasil = await Promise.all([muatPaket(), muatSoal()]);
    const dp = hasil[0], ds = hasil[1];
    if (!dp || !ds) { v.innerHTML = '<div class="card pad empty">Gagal memuat data.</div>'; return; }
    const salin = /^salin:/.test(id), pid = id.replace(/^salin:/, ''), baru = id === 'baru';
    const lama = baru ? null : dp.rows.filter(function (r) { return r.ID === pid; })[0];
    if (!baru && !lama) { v.innerHTML = '<div class="card pad empty">Paket tidak ditemukan. <a href="#/paket">Kembali</a></div>'; return; }
    if (lama && lama.Pemilik !== ADM.me.id) { v.innerHTML = '<div class="card pad empty">Anda hanya dapat mengubah paket milik Anda.</div>'; return; }
    const besok = new Date(); besok.setDate(besok.getDate() + 1); besok.setHours(7, 30, 0, 0);
    const p = lama ? Object.assign({}, lama) : { Nama: '', Mapel: (dp.mapelGuru || [])[0] || '', Tingkat: '', KelasSasaran: '', DaftarSoal: '', JumlahSoal: 0, AcakSoal: 'YA', AcakOpsi: 'YA', Durasi: 90, WaktuBuka: besok.toISOString(), WaktuTutup: new Date(besok.getTime() + 3 * 3600e3).toISOString(), Toleransi: 0, KKM: '', TampilNilai: 'IKUT', IzinPembahasan: 'IKUT', AntiCheat: 'YA', SingleDevice: 'YA', MaksPelanggaran: 3, Status: 'Draf', Catatan: '' };
    if (salin) { delete p.ID; p.Nama = p.Nama + ' (salinan)'; p.Status = 'Draf'; p.Sesi = null; }
    const terkunci = !!(p.ID && p.Sesi && p.Sesi.total > 0);
    const pilih = {}; String(p.DaftarSoal || '').split(',').filter(Boolean).forEach(function (x) { pilih[x] = 1; });
    const soalMilik = ds.rows.filter(function (r) { return r.Status !== 'Arsip' && r.Pembuat === ADM.me.id; });
    const fs = { mapel: p.Mapel, tingkat: '', bloom: '', q: '', hanyaPilih: false };
    const kelasSel = String(p.KelasSasaran || '').split(/\s*,\s*/).filter(Boolean);
    const mapelL = (dp.mapelGuru || []).concat(p.Mapel ? [p.Mapel] : []).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    v.innerHTML = ADM.judul(p.ID ? 'Ubah Paket Ujian' : 'Buat Paket Ujian', 'Langkah: identitas → pilih soal → jadwal → aturan → terbitkan.', '<a class="btn ghost" href="#/paket">' + ic('left', 'sm') + 'Kembali</a>', 'Paket Ujian › <b>' + (p.ID ? esc(p.Kode) : 'Baru') + '</b>') +
      (terkunci ? '<div class="alert amber" style="margin-bottom:16px">' + ic('lock') + '<div>Paket ini sudah dikerjakan <b>' + p.Sesi.total + ' siswa</b>. Daftar & jumlah soal dikunci agar hasil tetap sahih — jadwal, aturan, dan status masih dapat diubah. Butuh versi baru? Gunakan <a href="#/paket/salin:' + p.ID + '">Duplikat</a>.</div></div>' : '') +
      '<div class="grid" id="pbGrid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:18px;align-items:start"><div class="stack">' +
      '<div class="card pad-lg"><h3 style="font-size:15px;margin-bottom:14px"><span class="badge blue">1</span> Identitas Paket</h3><div class="form-grid">' +
      '<div class="field full"><label>Nama paket *</label><input class="inp" id="pNama" value="' + esc(p.Nama) + '" placeholder="mis. Penilaian Tengah Semester Ganjil — Fisika XI"></div>' +
      '<div class="field"><label>Mata pelajaran *</label><select class="sel" id="pMapel">' + mapelL.map(function (m) { return '<option' + (m === p.Mapel ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>Tingkat</label><select class="sel" id="pTingkat"><option value="">—</option>' + ds.tingkat.map(function (t) { return '<option' + (t === p.Tingkat ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field full"><label>Kelas sasaran *</label><div class="chips" id="pKelas">' + (dp.kelasGuru.length ? dp.kelasGuru.map(function (k) { return '<button type="button" class="chip ' + (kelasSel.indexOf(k) > -1 ? 'on' : '') + '" data-v="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') : '<span class="small muted">Anda belum ditugaskan ke kelas mana pun — minta admin mengisi kelas diampu pada akun Anda.</span>') + '</div><div class="hint">Token dibuat otomatis untuk siswa aktif di kelas terpilih.</div></div>' +
      '<div class="field full"><label>Catatan untuk siswa (opsional)</label><input class="inp" id="pCat" value="' + esc(p.Catatan) + '" placeholder="mis. Siapkan kalkulator ilmiah"></div></div></div>' +
      '<div class="card"><div class="card-h"><div><h3><span class="badge blue">2</span> Pilih Soal dari Bank Soal</h3><p id="pbInfo"></p></div><a class="btn sm ghost" href="#/bank-soal/baru" target="_blank" rel="noopener">' + ic('plus', 'sm') + 'Soal baru</a></div>' +
      '<div class="card-b stack-sm"><div class="row wrap"><div class="search grow" style="min-width:200px">' + ic('search') + '<input class="inp sm" id="sQ" placeholder="Cari soal / topik…"></div><select class="sel" id="sMapel" style="width:auto"></select><select class="sel" id="sTingkat" style="width:auto"><option value="">Semua tingkat</option>' + ds.tingkat.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select>' +
      '<select class="sel" id="sBloom" style="width:auto"><option value="">Semua Bloom</option>' + Object.keys(BLOOM).map(function (b) { return '<option value="' + b + '">' + b + ' ' + BLOOM[b] + '</option>'; }).join('') + '</select><label class="check"><input type="checkbox" id="sHanya"> Hanya terpilih</label></div>' +
      '<div class="row wrap"><button class="btn sm soft" id="sSemua"' + (terkunci ? ' disabled' : '') + '>' + ic('check', 'sm') + 'Pilih semua hasil filter</button><button class="btn sm ghost" id="sAcak"' + (terkunci ? ' disabled' : '') + '>' + ic('spark', 'sm') + 'Pilih acak…</button><button class="btn sm ghost" id="sKosong"' + (terkunci ? ' disabled' : '') + '>' + ic('x', 'sm') + 'Kosongkan</button></div></div>' +
      '<div class="tbl-wrap" style="max-height:460px;overflow:auto"><table class="tbl"><thead><tr><th style="width:34px"></th><th>Butir Soal</th><th>Topik</th><th>Bloom</th><th>Kesukaran</th><th class="num">Bobot</th></tr></thead><tbody id="sBody"></tbody></table></div></div>' +
      '<div class="card pad-lg"><h3 style="font-size:15px;margin-bottom:14px"><span class="badge blue">3</span> Jadwal &amp; Durasi</h3><div class="form-grid">' +
      '<div class="field"><label>Waktu buka *</label><input class="inp" type="datetime-local" id="pBuka" value="' + F.inputDT(p.WaktuBuka) + '"></div>' +
      '<div class="field"><label>Waktu tutup *</label><input class="inp" type="datetime-local" id="pTutup" value="' + F.inputDT(p.WaktuTutup) + '"></div>' +
      '<div class="field"><label>Durasi pengerjaan (menit) *</label><input class="inp" type="number" id="pDur" min="5" max="600" value="' + esc(p.Durasi) + '"><div class="hint">Timer per siswa dihitung server sejak siswa menekan Mulai.</div></div>' +
      '<div class="field"><label>Batas terlambat mulai (menit)</label><input class="inp" type="number" id="pTol" min="0" max="600" value="' + esc(p.Toleransi) + '"><div class="hint">0 = boleh mulai kapan saja sebelum jadwal ditutup.</div></div>' +
      '<div class="field full"><label>Jumlah soal per siswa</label><div class="row"><input class="inp" type="number" id="pJml" min="1" style="max-width:140px" value="' + esc(p.JumlahSoal || '') + '"' + (terkunci ? ' disabled' : '') + '><span class="small muted" id="pJmlInfo"></span></div><div class="hint">Lebih kecil dari jumlah soal terpilih → tiap siswa mendapat subset acak (bank soal paket).</div></div></div></div>' +
      '<div class="card pad-lg"><h3 style="font-size:15px;margin-bottom:14px"><span class="badge blue">4</span> Aturan &amp; Keamanan</h3><div class="grid g2" style="gap:12px">' +
      '<div class="opt-tile"><div><b>Acak urutan soal</b><p>Setiap siswa mendapat urutan berbeda.</p></div><label class="switch"><input type="checkbox" id="pAcakS"' + (p.AcakSoal === 'YA' ? ' checked' : '') + (terkunci ? ' disabled' : '') + '><span></span></label></div>' +
      '<div class="opt-tile"><div><b>Acak pilihan jawaban</b><p>Posisi A–E diacak per siswa.</p></div><label class="switch"><input type="checkbox" id="pAcakO"' + (p.AcakOpsi === 'YA' ? ' checked' : '') + (terkunci ? ' disabled' : '') + '><span></span></label></div>' +
      '<div class="opt-tile"><div><b>Anti-cheat</b><p>Catat pindah tab & keluar layar penuh.</p></div><label class="switch"><input type="checkbox" id="pAC"' + (p.AntiCheat === 'YA' ? ' checked' : '') + '><span></span></label></div>' +
      '<div class="opt-tile"><div><b>Satu token satu perangkat</b><p>Cegah token dipakai bersamaan.</p></div><label class="switch"><input type="checkbox" id="pSD"' + (p.SingleDevice === 'YA' ? ' checked' : '') + '><span></span></label></div></div>' +
      '<div class="form-grid" style="margin-top:14px"><div class="field"><label>Batas pelanggaran → kirim paksa</label><input class="inp" type="number" id="pMaks" min="1" max="50" value="' + esc(p.MaksPelanggaran || 3) + '"></div>' +
      '<div class="field"><label>KKM khusus paket</label><input class="inp" type="number" id="pKKM" min="0" max="100" value="' + esc(p.KKM) + '" placeholder="Kosong = standar KKM sekolah"></div>' +
      '<div class="field"><label>Tampilkan nilai ke siswa</label><select class="sel" id="pTN">' + [['IKUT', 'Ikut pengaturan sekolah'], ['YA', 'Langsung setelah kirim'], ['SETELAH_TUTUP', 'Setelah jadwal ditutup'], ['TIDAK', 'Disembunyikan']].map(function (o) { return '<option value="' + o[0] + '"' + (p.TampilNilai === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>Kunci &amp; pembahasan</label><select class="sel" id="pIP">' + [['IKUT', 'Ikut pengaturan sekolah'], ['YA', 'Dibuka setelah jadwal ditutup'], ['TIDAK', 'Tidak dibuka']].map(function (o) { return '<option value="' + o[0] + '"' + (p.IzinPembahasan === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div></div></div>' +
      '<div class="stack" style="position:sticky;top:84px"><div class="card pad-lg"><h3 style="font-size:15px">Ringkasan Paket</h3><div id="pbRing" class="stack-sm" style="margin-top:12px"></div>' +
      '<div class="sep"></div><div class="field"><label>Status</label>' + ADM.seg('pStatus', [['Draf', 'Draf'], ['Terbit', 'Terbitkan']], p.Status === 'Arsip' ? 'Draf' : p.Status) + '</div>' +
      '<div id="pbTerbit" class="stack-sm" style="margin-top:10px"><label class="check"><input type="checkbox" id="pGen" checked> Buat token PIN untuk semua siswa kelas sasaran</label><label class="check"><input type="checkbox" id="pUmum"> Umumkan jadwal via WhatsApp/Email</label></div>' +
      '<button class="btn primary block" id="pSimpan" style="margin-top:14px;height:46px">' + ic('save') + 'Simpan Paket</button><p class="tiny muted center" style="margin:8px 0 0">Siswa hanya melihat paket berstatus Terbit.</p></div></div></div>';
    if (innerWidth < 1100) $('#pbGrid').style.gridTemplateColumns = '1fr';
    const mapelSoal = soalMilik.map(function (r) { return r.Mapel; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
    $('#sMapel').innerHTML = '<option value="">Semua mapel</option>' + mapelSoal.map(function (m) { return '<option' + (m === fs.mapel ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('');
    if (mapelSoal.indexOf(fs.mapel) < 0) fs.mapel = '';
    const daftarTersaring = function () {
      const q = fs.q.toLowerCase();
      return soalMilik.filter(function (r) {
        if (fs.hanyaPilih && !pilih[r.ID]) return false;
        if (fs.mapel && r.Mapel !== fs.mapel) return false;
        if (fs.tingkat && r.Tingkat !== fs.tingkat) return false;
        if (fs.bloom && r.Bloom !== fs.bloom) return false;
        return !q || (r.Pertanyaan + ' ' + r.Topik + ' ' + r.KD).toLowerCase().indexOf(q) > -1;
      });
    };
    const tabelSoal = function () {
      const rows = daftarTersaring();
      $('#sBody').innerHTML = rows.length ? rows.slice(0, 400).map(function (r) {
        return '<tr class="' + (pilih[r.ID] ? 'sel' : '') + '"><td><input type="checkbox" data-s="' + r.ID + '"' + (pilih[r.ID] ? ' checked' : '') + (terkunci ? ' disabled' : '') + '></td><td style="max-width:380px"><div class="small" style="color:var(--ink)">' + esc(ADM.teksPolos(r.Pertanyaan, 120)) + '</div><div class="tiny muted">' + esc(r.Mapel) + ' · ' + (r.Tipe === 'PGK' ? 'PG Kompleks' : 'PG') + (r.Status === 'Draf' ? ' · <b style="color:var(--amber)">Draf</b>' : '') + '</div></td>' +
          '<td class="small">' + esc(r.Topik || '-') + '</td><td><span class="tag">' + esc(r.Bloom) + '</span></td><td><span class="badge dot ' + ({ Mudah: 'green', Sedang: 'amber', Sukar: 'rose' }[r.Kesukaran] || '') + '">' + esc(r.Kesukaran) + '</span></td><td class="num">' + r.Bobot + '</td></tr>';
      }).join('') : A.tabelKosong(6, soalMilik.length ? 'Tidak ada soal pada filter ini.' : 'Bank soal Anda masih kosong — buat atau impor soal terlebih dahulu.', 'book');
      $$('[data-s]', v).forEach(function (c) { c.onchange = function () { if (c.checked) pilih[c.dataset.s] = 1; else delete pilih[c.dataset.s]; c.closest('tr').classList.toggle('sel', c.checked); ringkas(); }; });
      ringkas();
    };
    const ringkas = function () {
      const ids = Object.keys(pilih), terpilih = soalMilik.filter(function (r) { return pilih[r.ID]; });
      const bobot = terpilih.reduce(function (a, r) { return a + r.Bobot; }, 0), kes = { Mudah: 0, Sedang: 0, Sukar: 0 }, hots = terpilih.filter(function (r) { return /C[456]/.test(r.Bloom); }).length;
      terpilih.forEach(function (r) { kes[r.Kesukaran] = (kes[r.Kesukaran] || 0) + 1; });
      $('#pbInfo').textContent = ids.length + ' soal terpilih dari ' + soalMilik.length + ' soal milik Anda';
      const jml = $('#pJml'); if (!terkunci) { jml.max = ids.length || 1; if (!jmlManual || !jml.value || Number(jml.value) > ids.length) jml.value = ids.length || ''; }
      $('#pJmlInfo').textContent = ids.length ? 'dari ' + ids.length + ' soal terpilih' + (Number(jml.value) < ids.length ? ' · subset acak per siswa' : '') : '';
      const kelas = $$('#pKelas .chip.on').map(function (b) { return b.dataset.v; }), buka = $('#pBuka').value, tutup = $('#pTutup').value;
      const n = ids.length || 1, bar = function (k, w) { return '<span style="width:' + (kes[k] / n * 100) + '%;background:' + w + '">' + (kes[k] ? kes[k] : '') + '</span>'; };
      const cek = [[$('#pNama').value.trim(), 'Nama paket'], [kelas.length, 'Kelas sasaran (' + kelas.length + ')'], [ids.length, 'Soal dipilih (' + ids.length + ')'], [buka && tutup && new Date(tutup) > new Date(buka), 'Jadwal valid'],
        [buka && tutup && (new Date(tutup) - new Date(buka)) / 60000 >= Number($('#pDur').value || 0), 'Rentang jadwal ≥ durasi']];
      $('#pbRing').innerHTML = cek.map(function (c) { return '<div class="row small" style="gap:8px;color:' + (c[0] ? 'var(--green)' : 'var(--muted)') + '">' + ic(c[0] ? 'checkc' : 'clock', 'sm') + esc(c[1]) + '</div>'; }).join('') +
        '<div class="sep" style="margin:6px 0"></div><div class="row between small"><span class="muted">Total bobot</span><b>' + bobot + '</b></div><div class="row between small"><span class="muted">Soal HOTS</span><b>' + hots + ' (' + Math.round(hots / n * 100) + '%)</b></div>' +
        '<div class="tiny muted" style="margin-top:4px">Komposisi kesukaran</div><div class="ratio" style="background:var(--line-2)">' + bar('Mudah', '#10b981') + bar('Sedang', '#f59e0b') + bar('Sukar', '#e11d48') + '</div>';
      $('#pbTerbit').style.display = ADM.nilaiSeg('pStatus') === 'Terbit' ? '' : 'none';
    };
    let jmlManual = !!(p.ID && p.JumlahSoal && Number(p.JumlahSoal) < Object.keys(pilih).length);
    $('#pJml').addEventListener('input', function () { jmlManual = true; });
    tabelSoal();
    $('#sQ').oninput =A.debounce(function (e) { fs.q = e.target.value; tabelSoal(); }, 200);
    $('#sMapel').onchange = function () { fs.mapel = this.value; tabelSoal(); };
    $('#sTingkat').onchange = function () { fs.tingkat = this.value; tabelSoal(); };
    $('#sBloom').onchange = function () { fs.bloom = this.value; tabelSoal(); };
    $('#sHanya').onchange = function () { fs.hanyaPilih = this.checked; tabelSoal(); };
    $('#sSemua').onclick = function () { daftarTersaring().forEach(function (r) { pilih[r.ID] = 1; }); tabelSoal(); };
    $('#sKosong').onclick = function () { Object.keys(pilih).forEach(function (k) { delete pilih[k]; }); tabelSoal(); };
    $('#sAcak').onclick = async function () {
      const pool = daftarTersaring().filter(function (r) { return !pilih[r.ID]; });
      if (!pool.length) return A.toast('Tidak ada soal tersisa pada filter ini.', 'warn');
      const n = await A.prompt('Pilih acak dari hasil filter', { label: 'Jumlah soal (tersedia ' + pool.length + ')', nilai: String(Math.min(10, pool.length)), type: 'number', attr: 'min="1" max="' + pool.length + '"', ok: 'Pilih acak', icon: 'spark' });
      if (n === null) return;
      pool.sort(function () { return Math.random() - 0.5; }).slice(0, Math.max(1, Math.min(pool.length, Number(n) || 0))).forEach(function (r) { pilih[r.ID] = 1; }); tabelSoal();
    };
    ADM.ikatChips(v);
    $$('#pKelas .chip').forEach(function (b) { b.addEventListener('click', function () { setTimeout(ringkas, 0); }); });
    ['pNama', 'pBuka', 'pTutup', 'pDur', 'pJml'].forEach(function (i) { $('#' + i).addEventListener('input', ringkas); });
    $('#pMapel').onchange = function () { if (mapelSoal.indexOf(this.value) > -1) { fs.mapel = this.value; $('#sMapel').value = this.value; tabelSoal(); } };
    ADM.ikatSeg('pStatus', ringkas);
    ringkas();
    $('#pSimpan').onclick = async function () {
      const ids = soalMilik.filter(function (r) { return pilih[r.ID]; }).map(function (r) { return r.ID; });
      const data = { ID: p.ID, Nama: $('#pNama').value.trim(), Mapel: $('#pMapel').value, Tingkat: $('#pTingkat').value, KelasSasaran: $$('#pKelas .chip.on').map(function (b) { return b.dataset.v; }).join(','),
        DaftarSoal: terkunci ? p.DaftarSoal : ids.join(','), JumlahSoal: terkunci ? p.JumlahSoal : Number($('#pJml').value) || ids.length, AcakSoal: $('#pAcakS').checked ? 'YA' : 'TIDAK', AcakOpsi: $('#pAcakO').checked ? 'YA' : 'TIDAK',
        Durasi: Number($('#pDur').value), WaktuBuka: $('#pBuka').value ? new Date($('#pBuka').value).toISOString() : '', WaktuTutup: $('#pTutup').value ? new Date($('#pTutup').value).toISOString() : '', Toleransi: Number($('#pTol').value) || 0,
        KKM: $('#pKKM').value, TampilNilai: $('#pTN').value, IzinPembahasan: $('#pIP').value, AntiCheat: $('#pAC').checked ? 'YA' : 'TIDAK', SingleDevice: $('#pSD').checked ? 'YA' : 'TIDAK', MaksPelanggaran: Number($('#pMaks').value) || 3,
        Status: ADM.nilaiSeg('pStatus'), Catatan: $('#pCat').value.trim() };
      if (!data.Nama) return A.toast('Isi nama paket.', 'warn');
      if (!data.KelasSasaran) return A.toast('Pilih minimal satu kelas sasaran.', 'warn');
      if (!terkunci && !ids.length) return A.toast('Pilih soal untuk paket ini.', 'warn');
      if (data.Status === 'Terbit' && !await A.confirm('Terbitkan paket <b>' + esc(data.Nama) + '</b>? Siswa kelas sasaran akan melihat jadwal ini di portal' + ($('#pGen').checked ? ' dan token PIN langsung dibuat' : '') + '.', { ok: 'Terbitkan', icon: 'send', tone: 't-blue' })) return;
      const b = this; A.busy(b, true, 'Menyimpan…');
      const r = await A.api('paket.simpan', { paket: data, generateToken: data.Status === 'Terbit' && $('#pGen').checked, umumkan: data.Status === 'Terbit' && $('#pUmum').checked }, { timeout: 90000 });
      A.busy(b, false);
      if (!A.hasil(r)) return;
      A.swrClear('paket'); A.swrClear('dash'); muatPaket(true);
      location.hash = data.Status === 'Terbit' && r.data.token ? '#/token/' + r.data.id : '#/paket';
    };
  }

  // ============================================================================
  // TOKEN PIN
  // ============================================================================
  const T = { paketId: '', kelas: '', status: '', q: '', pilih: {} };
  ADM.reg('token', async function (v, id) {
    if (id) T.paketId = id;
    v.innerHTML = ADM.judul('Token PIN Siswa', 'Satu token unik per siswa per paket. Cetak kartu, kirim lewat WhatsApp, reset perangkat, atau ganti PIN bila bocor.', '', 'Utama › <b>Token PIN</b>') +
      '<div class="card pad" style="margin-bottom:16px"><div class="row wrap"><div class="field grow" style="min-width:260px"><label>Paket ujian</label><select class="sel" id="tkPaket"><option>Memuat…</option></select></div>' +
      '<div class="row wrap" style="align-self:flex-end"><button class="btn primary" id="tkGen">' + ic('plus', 'sm') + 'Buat Token</button><button class="btn ghost" id="tkCetak">' + ic('print', 'sm') + 'Cetak Kartu</button><button class="btn ghost" id="tkWA">' + ic('wa', 'sm') + 'Kirim WA</button><button class="btn ghost" id="tkExp">' + ic('download', 'sm') + 'Ekspor</button></div></div></div>' +
      '<div class="grid g4" id="tkKpi"></div><div class="card" style="margin-top:16px"><div class="card-b row wrap"><div class="search grow" style="min-width:220px">' + ic('search') + '<input class="inp" id="tkQ" placeholder="Cari nama, NIS, PIN…"></div><select class="sel" id="tkKelas" style="width:auto"></select><select class="sel" id="tkStatus" style="width:auto"><option value="">Semua status</option><option>Aktif</option><option>Terpakai</option><option>Nonaktif</option></select></div>' +
      '<div class="row between wrap hidden" id="tkBulk" style="padding:10px 18px;background:var(--brand-50);border-top:1px solid var(--line)"><b class="small" id="tkN"></b><div class="row wrap">' +
      [['resetPerangkat', 'refresh', 'Reset login/perangkat'], ['ganti', 'key', 'Ganti PIN'], ['nonaktif', 'lock', 'Nonaktifkan'], ['aktifkan', 'checkc', 'Aktifkan'], ['hapus', 'trash', 'Hapus']].map(function (a) { return '<button class="btn sm ' + (a[0] === 'hapus' ? 'danger' : 'ghost') + '" data-aksi="' + a[0] + '">' + ic(a[1], 'sm') + a[2] + '</button>'; }).join('') + '</div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:34px"><input type="checkbox" id="tkAll"></th><th>Siswa</th><th>Kelas</th><th>PIN</th><th>Status</th><th>Perangkat</th><th>Dipakai</th><th class="right">Aksi</th></tr></thead><tbody id="tkBody"><tr><td colspan="8"><div class="skel" style="height:200px"></div></td></tr></tbody></table></div><div class="pager" id="tkPg"></div></div>';
    const dp = await muatPaket();
    if (!$('#tkPaket')) return;
    const terbit = (dp ? dp.rows : []).filter(function (r) { return r.Status === 'Terbit'; });
    if (!terbit.length) { $('#tkPaket').innerHTML = '<option value="">Belum ada paket terbit</option>'; $('#tkBody').innerHTML = A.tabelKosong(8, 'Terbitkan paket ujian terlebih dahulu, lalu buat token di sini.', 'ticket'); $('#tkKpi').innerHTML = ''; return; }
    if (!T.paketId || !terbit.some(function (r) { return r.ID === T.paketId; })) T.paketId = (terbit.filter(function (r) { return r.StatusTampil !== 'Selesai'; })[0] || terbit[0]).ID;
    $('#tkPaket').innerHTML = terbit.map(function (r) { return '<option value="' + r.ID + '"' + (r.ID === T.paketId ? ' selected' : '') + '>' + esc(r.Nama) + ' (' + esc(r.Kode) + ') · ' + r.StatusTampil + '</option>'; }).join('');
    let D = null, hal = 1;
    const paket = function () { return terbit.filter(function (r) { return r.ID === T.paketId; })[0]; };
    const muat = async function (paksa) {
      const r = await A.api('token.list', { paketId: T.paketId }, { quiet: !paksa });
      if (!$('#tkBody')) return;
      if (!r.success) { $('#tkBody').innerHTML = A.tabelKosong(8, r.message); return; }
      D = r.data; render();
    };
    const tersaring = function () { const q = T.q.toLowerCase(); return D.rows.filter(function (r) { return (!T.kelas || r.Kelas === T.kelas) && (!T.status || r.Status === T.status) && (!q || (r.Nama + ' ' + r.NIS + ' ' + r.PIN).toLowerCase().indexOf(q) > -1); }); };
    const render = function () {
      const k = D.kpi;
      $('#tkKpi').innerHTML = ADM.kpi('Total Token', k.total, esc(paket().KelasSasaran), 't-blue', 'ticket') + ADM.kpi('Aktif', k.aktif, 'Belum dipakai', 't-green', 'key') + ADM.kpi('Terpakai', k.terpakai, 'Sudah login/mengerjakan', 't-purple', 'checkc') + ADM.kpi('Nonaktif', k.nonaktif, 'Dicabut', 't-rose', 'lock');
      const kelas = D.rows.map(function (r) { return r.Kelas; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).sort();
      $('#tkKelas').innerHTML = '<option value="">Semua kelas</option>' + kelas.map(function (x) { return '<option' + (x === T.kelas ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
      tabel();
    };
    const tabel = function () {
      const rows = tersaring(), per = 30, tampil = rows.slice((hal - 1) * per, hal * per);
      $('#tkBody').innerHTML = tampil.length ? tampil.map(function (r) {
        return '<tr class="' + (T.pilih[r.ID] ? 'sel' : '') + '"><td><input type="checkbox" data-ck="' + r.ID + '"' + (T.pilih[r.ID] ? ' checked' : '') + '></td><td><b style="color:var(--ink)">' + esc(r.Nama) + '</b><div class="tiny muted mono">NIS ' + esc(r.NIS) + '</div></td><td class="small">' + esc(r.Kelas) + '</td>' +
          '<td><span class="tag mono b" style="font-size:13px;letter-spacing:.12em;cursor:pointer" data-copy="' + esc(r.PIN) + '" title="Salin">' + esc(r.PIN) + '</span></td>' +
          '<td><span class="badge dot ' + ({ Aktif: 'green', Terpakai: 'blue', Nonaktif: 'rose' }[r.Status] || '') + '">' + esc(r.Status) + '</span></td>' +
          '<td class="small">' + (r.Perangkat ? '<span style="color:var(--brand)">' + ic('laptop', 'sm') + ' Terikat</span>' : '<span class="muted">—</span>') + '</td><td class="tiny muted">' + (r.DipakaiPada ? F.tglJam(r.DipakaiPada) : '—') + '</td>' +
          '<td class="act"><button class="iconbtn" data-satu="cetak" data-id="' + r.ID + '" title="Cetak kartu">' + ic('print') + '</button><button class="iconbtn" data-satu="resetPerangkat" data-id="' + r.ID + '" title="Reset login/perangkat">' + ic('refresh') + '</button>' + (r.SesiID ? '' : '<button class="iconbtn" data-satu="ganti" data-id="' + r.ID + '" title="Ganti PIN">' + ic('key') + '</button>') + '</td></tr>';
      }).join('') : A.tabelKosong(8, D.rows.length ? 'Tidak ada token pada filter ini.' : 'Belum ada token. Klik "Buat Token" untuk membuat token semua siswa kelas sasaran.', 'ticket');
      A.pager($('#tkPg'), rows.length, hal, per, function (h) { hal = h; tabel(); });
      $$('[data-ck]', v).forEach(function (c) { c.onchange = function () { if (c.checked) T.pilih[c.dataset.ck] = 1; else delete T.pilih[c.dataset.ck]; c.closest('tr').classList.toggle('sel', c.checked); bulk(); }; });
      $$('[data-copy]', v).forEach(function (s) { s.onclick = function () { A.copy(s.dataset.copy); }; });
      $$('[data-satu]', v).forEach(function (b) { b.onclick = function () { if (b.dataset.satu === 'cetak') cetak(D.rows.filter(function (r) { return r.ID === b.dataset.id; })); else aksi(b.dataset.satu, [b.dataset.id]); }; });
      $('#tkAll').checked = tampil.length > 0 && tampil.every(function (r) { return T.pilih[r.ID]; });
      bulk();
    };
    const bulk = function () { const n = Object.keys(T.pilih).length; $('#tkBulk').classList.toggle('hidden', !n); $('#tkN').textContent = n + ' token dipilih'; };
    const LABEL = { resetPerangkat: 'Reset login/perangkat: siswa dapat masuk dari perangkat baru dan melanjutkan ujian yang sedang berjalan.', ganti: 'Ganti PIN: PIN lama tidak berlaku lagi (hanya token yang belum dipakai mengerjakan).', nonaktif: 'Nonaktifkan token: siswa tidak dapat masuk.', aktifkan: 'Aktifkan kembali token yang dinonaktifkan.', hapus: 'Hapus token yang belum dipakai (token terpakai tidak dihapus).' };
    const aksi = async function (a, ids) {
      if (!await A.confirm(LABEL[a] + '<br><br>Proses <b>' + ids.length + '</b> token?', { danger: a === 'hapus' || a === 'nonaktif', ok: 'Proses' })) return;
      const r = await A.api('token.aksi', { aksi: a, ids: ids });
      if (A.hasil(r)) { T.pilih = {}; A.swrClear('paket'); muat(true); }
    };
    const cetak = function (rows) {
      rows = rows.filter(function (r) { return r.Status !== 'Nonaktif'; });
      if (!rows.length) return A.toast('Tidak ada token aktif untuk dicetak.', 'warn');
      const p = paket(), s = A.setting || {}, url = ADM.portalUrl();
      const html = '<div class="grid">' + rows.map(function (r) {
        return '<div class="kartu"><div class="kh"><div><b>' + esc(s.NAMA_LEMBAGA || 'UjianKu Pro') + '</b><span>KARTU TOKEN UJIAN CBT</span></div><span class="kode">' + esc(p.Kode) + '</span></div>' +
          '<div class="kb"><div class="info"><div class="nm">' + esc(r.Nama) + '</div><div class="mt">NIS ' + esc(r.NIS) + ' · ' + esc(r.Kelas) + '</div><div class="mt">' + esc(p.Nama) + '</div><div class="mt">' + F.tgl(p.WaktuBuka) + ', ' + F.jam(p.WaktuBuka) + '–' + F.jam(p.WaktuTutup) + ' WIB · ' + p.Durasi + ' mnt</div>' +
          '<div class="pin">' + esc(r.PIN) + '</div></div><div class="qr">' + A.qrSvg(url + '#pin=' + r.PIN, 92) + '<small>Pindai untuk masuk</small></div></div>' +
          '<div class="kf">Buka ' + esc(url.replace(/^https?:\/\//, '')) + ' · Jangan bagikan token kepada siapa pun.</div></div>';
      }).join('') + '</div>';
      A.cetak('Kartu Token ' + p.Kode, html, '@page{size:A4;margin:10mm}body{margin:0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8mm}.kartu{border:1.5px dashed #94a3b8;border-radius:10px;padding:10px 12px;break-inside:avoid;font-size:11px}.kh{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:6px}.kh b{display:block;font-size:12px;color:#13265C}.kh span{font-size:9px;letter-spacing:.12em;color:#64748b}.kh .kode{font-family:monospace;font-size:10px;background:#eef3ff;color:#1E4FD8;padding:2px 6px;border-radius:5px;letter-spacing:0}.kb{display:flex;gap:10px;margin-top:8px}.info{flex:1}.nm{font-weight:800;font-size:13px}.mt{color:#475569;font-size:10.5px;margin-top:2px}.pin{font-family:monospace;font-size:24px;font-weight:800;letter-spacing:.22em;color:#1E4FD8;margin-top:8px;background:#f4f7fc;border-radius:8px;padding:4px 8px;display:inline-block}.qr{width:96px;text-align:center}.qr svg{width:92px;height:92px}.qr small{font-size:8px;color:#64748b}.kf{font-size:8.5px;color:#64748b;margin-top:6px;border-top:1px solid #f1f5f9;padding-top:5px}');
    };
    $('#tkPaket').onchange = function () { T.paketId = this.value; T.pilih = {}; T.kelas = ''; hal = 1; history.replaceState(null, '', '#/token/' + T.paketId); $('#tkBody').innerHTML = '<tr><td colspan="8"><div class="skel" style="height:200px"></div></td></tr>'; muat(true); };
    $('#tkQ').oninput = A.debounce(function (e) { T.q = e.target.value; hal = 1; if (D) tabel(); }, 200);
    $('#tkKelas').onchange = function () { T.kelas = this.value; hal = 1; tabel(); };
    $('#tkStatus').onchange = function () { T.status = this.value; hal = 1; tabel(); };
    $('#tkAll').onchange = function () { const on = this.checked; $$('[data-ck]', v).forEach(function (c) { c.checked = on; if (on) T.pilih[c.dataset.ck] = 1; else delete T.pilih[c.dataset.ck]; c.closest('tr').classList.toggle('sel', on); }); bulk(); };
    $$('#tkBulk [data-aksi]').forEach(function (b) { b.onclick = function () { aksi(b.dataset.aksi, Object.keys(T.pilih)); }; });
    $('#tkGen').onclick = function () {
      const p = paket(), kelas = String(p.KelasSasaran).split(/\s*,\s*/).filter(Boolean);
      A.modal({ title: 'Buat Token PIN', sub: p.Nama + ' · ' + p.Kode, icon: 'ticket', body: '<p class="small muted" style="margin-top:0">Token dibuat untuk siswa <b>aktif</b> yang belum memiliki token di paket ini (aman diulang — tidak menggandakan).</p><div class="field"><label>Kelas</label><div class="chips" id="gK">' + kelas.map(function (k) { return '<button type="button" class="chip on" data-v="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') + '</div></div>',
        onOpen: function (m) { ADM.ikatChips(m.el); },
        actions: [{ label: 'Batal' }, { label: 'Buat Token', cls: 'primary', icon: 'plus', onClick: async function (b, bg) {
          const k = $$('#gK .chip.on', bg).map(function (x) { return x.dataset.v; }); if (!k.length) { A.toast('Pilih kelas.', 'warn'); return false; }
          const r = await A.api('token.generate', { paketId: T.paketId, kelas: k }, { timeout: 90000 }); if (!A.hasil(r)) return false; A.swrClear('paket'); muat(true);
        } }] });
    };
    $('#tkCetak').onclick = function () { if (!D) return; const sel = Object.keys(T.pilih); cetak(sel.length ? D.rows.filter(function (r) { return T.pilih[r.ID]; }) : tersaring()); };
    $('#tkExp').onclick = function () { if (!D) return; const p = paket(); A.exportXlsx({ Token: tersaring().map(function (r) { return { Nama: r.Nama, NIS: r.NIS, Kelas: r.Kelas, PIN: r.PIN, Status: r.Status, Paket: p.Nama, Kode: p.Kode, Link: ADM.portalUrl() + '#pin=' + r.PIN, Dipakai: r.DipakaiPada }; }) }, 'Token ' + p.Kode); };
    $('#tkWA').onclick = function () {
      if (!D) return;
      const sel = Object.keys(T.pilih), ids = sel.length ? sel : tersaring().filter(function (r) { return r.Status === 'Aktif'; }).map(function (r) { return r.ID; });
      if (!ids.length) return A.toast('Tidak ada token aktif.', 'warn');
      const tanpaWA = D.rows.filter(function (r) { return ids.indexOf(r.ID) > -1 && !r.NoWA; }).length;
      A.modal({ title: 'Kirim Token via WhatsApp/Email', icon: 'wa', iconTone: 't-green', body: '<p class="small" style="margin-top:0">Kirim <b>' + ids.length + '</b> token aktif ke nomor WA/email siswa lewat antrean notifikasi (terkirim bertahap, aman dari blokir).</p>' + (tanpaWA ? '<div class="alert amber">' + ic('warn') + '<div class="small">' + tanpaWA + ' siswa belum memiliki nomor WA.</div></div>' : '') + '<label class="check" style="margin-top:10px"><input type="checkbox" id="wW"> Kirim juga ke nomor WA wali</label><p class="tiny muted">Pastikan saklar WhatsApp & event "Token ujian" aktif di menu WhatsApp &amp; Notifikasi.</p>',
        actions: [{ label: 'Batal' }, { label: 'Kirim', cls: 'primary', icon: 'send', onClick: async function (b, bg) { const r = await A.api('token.aksi', { aksi: 'kirimWA', ids: ids, keWali: $('#wW', bg).checked }); if (!A.hasil(r)) return false; } }] });
    };
    muat(true);
  });
})();
