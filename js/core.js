/* ============================================================================
   UjianKu Pro — core.js (dipakai portal siswa & dashboard guru/admin)
   API fetch → GAS (text/plain), dedupe + epoch tulis, batch otomatis, SWR
   localStorage, warmup, drain notifikasi, polling adaptif, UI kit, grafik SVG.
   Tidak ada rahasia di sini: hanya GAS_URL publik dari js/config.js.
   ============================================================================ */
(function () {
  'use strict';
  const CFG = window.APP_CONFIG || {};
  const GAS_URL = String(CFG.GAS_URL || '').trim();
  const KONFIG_OK = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(GAS_URL) && !/GANTI|XXXX/i.test(GAS_URL);
  const VERSI = '1.0.0';
  const App = window.App = window.App || {};
  App.versi = VERSI; App.konfigOk = KONFIG_OK; App.gasUrl = GAS_URL;

  // ---------------- Penyimpanan lokal (aman bila diblokir) ----------------
  const mk = function (st) {
    return {
      get: function (k, d) { try { const v = st.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
      set: function (k, v) { try { st.setItem(k, JSON.stringify(v)); } catch (e) { } },
      del: function (k) { try { st.removeItem(k); } catch (e) { } }
    };
  };
  let _ls, _ss;
  try { _ls = mk(window.localStorage); } catch (e) { _ls = mk({ getItem: () => null, setItem() { }, removeItem() { } }); }
  try { _ss = mk(window.sessionStorage); } catch (e) { _ss = mk({ getItem: () => null, setItem() { }, removeItem() { } }); }
  App.LS = _ls; App.SS = _ss;
  const uuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2));
  App.uuid = uuid;
  App.deviceId = function () { let d = _ls.get('uk_dev'); if (!d) { d = uuid(); _ls.set('uk_dev', d); } return d; };

  // ---------------- Sesi (token berumur pendek, bisa dicabut server) ----------------
  App.Sesi = {
    scope: 'staf',
    key: function () { return 'uk_sesi_' + this.scope; },
    data: function () { const s = _ls.get(this.key(), null); if (s && s.exp && s.exp < Date.now()) { _ls.del(this.key()); return null; } return s; },
    token: function () { const s = this.data(); return s ? s.token : ''; },
    set: function (token, me, exp) { _ls.set(this.key(), { token: token, me: me, exp: exp || Date.now() + 8 * 3600e3 }); },
    patch: function (me) { const s = this.data(); if (s) { s.me = Object.assign({}, s.me, me); _ls.set(this.key(), s); } },
    clear: function () { _ls.del(this.key()); }
  };

  // ---------------- Pengukur performa ----------------
  const Perf = App.Perf = {
    log: [],
    add: function (a, total, server, cached) { this.log.push({ aksi: a, total: Math.round(total), server: server || 0, net: Math.round(total - (server || 0)), cache: cached ? '✓' : '' }); if (this.log.length > 300) this.log.shift(); },
    table: function () { console.table(this.log.slice(-40)); },
    summary: function () { const m = {}; this.log.forEach(function (x) { const y = m[x.aksi] || (m[x.aksi] = { n: 0, total: 0, server: 0 }); y.n++; y.total += x.total; y.server += x.server; });
      console.table(Object.keys(m).map(function (k) { return { aksi: k, n: m[k].n, rataTotal: Math.round(m[k].total / m[k].n), rataServer: Math.round(m[k].server / m[k].n) }; })); }
  };
  window.Perf = Perf;

  // ---------------- API ----------------
  const READ = /^(ping|pub\.boot|auth\.me|batch|s\.(home|hasil|pembahasan|materi)|dash\.|sys\.status|(kelas|siswa|user|soal|paket|token|info|audit)\.list|monitor\.live|rekap\.(paket|sesi|global)|cfg\.get|notif\.(config|queue)|wa\.(device|audience|blastList)|crm\.(list|stats|detail|export)|backup\.(list|json)|de\.(template\.list|pejabat\.list|sumber|dok\.list|dok\.unduh|antrean|cek))$/;
  App.isRead = function (a) { return READ.test(a); };
  let _epoch = 0, _serverOffset = 0;
  const _inflight = {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  App.sleep = sleep;
  App.serverNow = function () { return Date.now() + _serverOffset; };
  async function run(action, data, opts) {
    if (!KONFIG_OK) return { success: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL /exec Apps Script.', code: 'CONFIG' };
    const body = { action: action, data: data || {}, dev: App.deviceId() };
    const tok = opts.token !== undefined ? opts.token : App.Sesi.token();
    if (tok && !opts.noToken) body.token = tok;
    if (!READ.test(action)) body.rid = opts.rid || uuid();
    let coba = 0;
    const maks = opts.retry === undefined ? 2 : opts.retry;
    for (;;) {
      const t0 = performance.now();
      try {
        const ctrl = new AbortController(), tm = setTimeout(function () { ctrl.abort(); }, opts.timeout || 45000);
        const res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctrl.signal, redirect: 'follow', credentials: 'omit' });
        clearTimeout(tm);
        const j = await res.json();
        Perf.add(action, performance.now() - t0, j.ms, j.cached);
        if (j.t) _serverOffset = j.t - Date.now();
        if (j.nq > 0) App.scheduleDrain();
        if (!j.success && j.code === 'BUSY' && coba < maks) { coba++; await sleep(700 * coba + Math.random() * 700); continue; }
        if (!j.success && j.code === 'AUTH' && !opts.quiet && App.onAuthFail && (!tok || tok === App.Sesi.token())) App.onAuthFail(j);
        if (!j.success && j.code === 'MUST_CHANGE' && App.onMustChange) App.onMustChange(j);
        return j;
      } catch (e) {
        if (coba < maks) { coba++; await sleep(900 * coba); continue; }
        return { success: false, code: 'NET', message: navigator.onLine === false ? 'Perangkat sedang offline. Periksa koneksi internet.' : 'Tidak dapat terhubung ke server. Coba lagi sebentar.' };
      }
    }
  }
  /** Panggil aksi. Baca identik yang sedang berjalan menumpang (dedupe); tulis menaikkan epoch. */
  App.api = function (action, data, opts) {
    opts = opts || {};
    if (!READ.test(action)) { _epoch++; return run(action, data, opts); }
    const k = _epoch + '|' + action + '|' + App.Sesi.token().slice(-12) + '|' + JSON.stringify(data || {});
    if (_inflight[k]) return _inflight[k];
    const p = run(action, data, opts);
    _inflight[k] = p;
    p.then(function () { delete _inflight[k]; }, function () { delete _inflight[k]; });
    return p;
  };
  /** Penggabung batch: beberapa baca dalam tik yang sama → 1 eksekusi server. */
  const Batcher = { q: null,
    add: function (action, data) {
      const self = this;
      return new Promise(function (res) { if (!self.q) { self.q = []; setTimeout(function () { self.flush(); }, 0); } self.q.push({ action: action, data: data || {}, res: res }); });
    },
    flush: function () {
      const q = this.q; this.q = null;
      const uniq = []; const map = {};
      q.forEach(function (x) { const k = x.action + '|' + JSON.stringify(x.data); if (!map[k]) { map[k] = []; uniq.push(x); } map[k].push(x.res); });
      const kirim = function (list) {
        if (list.length === 1) { const x = list[0]; App.api(x.action, x.data).then(function (r) { map[x.action + '|' + JSON.stringify(x.data)].forEach(function (f) { f(r); }); }); return; }
        App.api('batch', { calls: list.map(function (x) { return { action: x.action, data: x.data }; }) }).then(function (r) {
          list.forEach(function (x, i) { const hasil = r.success ? r.data.results[i] : r; map[x.action + '|' + JSON.stringify(x.data)].forEach(function (f) { f(hasil); }); });
        });
      };
      for (let i = 0; i < uniq.length; i += 10) kirim(uniq.slice(i, i + 10));
    }
  };
  App.apiQ = function (action, data) { return App.Sesi.token() && READ.test(action) ? Batcher.add(action, data) : App.api(action, data); };

  /** Stale-while-revalidate: tampilkan cache lokal dulu, segarkan di latar bila usang. */
  App.swr = function (key, fetcher, opts) {
    opts = opts || {};
    const kk = 'uk_c_' + App.Sesi.scope + '_' + key, ent = _ls.get(kk, null);
    if (ent && opts.render) { try { opts.render(ent.d, true); } catch (e) { console.error(e); } }
    const usang = !ent || opts.force || Date.now() - ent.t > (opts.maxAge === undefined ? 30000 : opts.maxAge);
    if (!usang) return Promise.resolve(ent.d);
    return fetcher().then(function (r) {
      if (!r || !r.success) { if (!ent && opts.onError) opts.onError(r); else if (opts.onError) opts.onError(r, true); return ent ? ent.d : null; }
      const s = JSON.stringify(r.data), berubah = !ent || ent.h !== s.length + ':' + hashStr(s);
      _ls.set(kk, { t: Date.now(), d: r.data, h: s.length + ':' + hashStr(s) });
      if (berubah && opts.render) { try { opts.render(r.data, false); } catch (e) { console.error(e); } }
      return r.data;
    });
  };
  App.swrClear = function (prefix) { try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('uk_c_' + App.Sesi.scope + '_' + (prefix || '')) === 0) localStorage.removeItem(k); }); } catch (e) { } };
  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i += 7) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

  /** Pemanasan server (GET no-cors), maks 1×/4 menit per lingkup. */
  App.warmUp = function (scope) {
    if (!KONFIG_OK) return;
    const k = 'uk_warm_' + scope, t = _ss.get(k, 0);
    if (Date.now() - t < 240000) return;
    _ss.set(k, Date.now());
    try { fetch(GAS_URL + '?w=' + scope, { mode: 'no-cors', credentials: 'omit' }).catch(function () { }); } catch (e) { }
  };
  /** Antrean notifikasi: respons nq>0 → panggil drain (debounce). */
  let _drainT = null, _drainN = 0;
  App.scheduleDrain = function () {
    clearTimeout(_drainT);
    _drainT = setTimeout(async function () {
      const r = await run('drain', {}, { noToken: true, retry: 0 });
      if (r.success && r.data && r.data.left > 0 && _drainN < 3) { _drainN++; App.scheduleDrain(); } else _drainN = 0;
    }, 400);
  };
  /** Aktivitas pengguna untuk polling adaptif. */
  App.Activity = { at: Date.now(), last: {},
    init: function () { const self = this; ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach(function (ev) { addEventListener(ev, function () { self.at = Date.now(); }, { passive: true }); }); },
    idle: function () { return Date.now() - this.at > 120000; },
    due: function (key, aktifMs, idleMs) {
      if (document.visibilityState !== 'visible') return false;
      if (Date.now() - (this.last[key] || 0) < (this.idle() ? idleMs : aktifMs) - 500) return false;
      this.last[key] = Date.now(); return true;
    }
  };
  App.Activity.init();

  // ---------------- Utilitas DOM & format ----------------
  const esc = App.esc = function (s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  App.$ = function (s, el) { return (el || document).querySelector(s); };
  App.$$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BLN_P = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const tgl = function (v) { const d = v instanceof Date ? v : new Date(v); return isNaN(d) ? null : d; };
  App.fmt = {
    tgl: function (v, panjang) { const d = tgl(v); return d ? d.getDate() + ' ' + (panjang ? BLN_P : BLN)[d.getMonth()] + ' ' + d.getFullYear() : '-'; },
    jam: function (v) { const d = tgl(v); return d ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : '-'; },
    tglJam: function (v) { const d = tgl(v); return d ? App.fmt.tgl(d) + ', ' + App.fmt.jam(d) + ' WIB' : '-'; },
    bln: function (v) { const d = tgl(v); return d ? BLN[d.getMonth()] : ''; }, hari: function (v) { const d = tgl(v); return d ? d.getDate() : ''; },
    relatif: function (v) {
      const d = tgl(v); if (!d) return '-'; const s = Math.round((App.serverNow() - d.getTime()) / 1000);
      if (s < 0) { const m = -s; return m < 3600 ? 'dalam ' + Math.ceil(m / 60) + ' mnt' : m < 86400 ? 'dalam ' + Math.round(m / 3600) + ' jam' : 'dalam ' + Math.round(m / 86400) + ' hari'; }
      return s < 10 ? 'baru saja' : s < 60 ? s + ' dtk lalu' : s < 3600 ? Math.floor(s / 60) + ' mnt lalu' : s < 86400 ? Math.floor(s / 3600) + ' jam lalu' : Math.floor(s / 86400) + ' hari lalu';
    },
    durasi: function (ms) { ms = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(ms / 3600), m = Math.floor(ms % 3600 / 60), s = ms % 60; return [h, m, s].map(function (x) { return String(x).padStart(2, '0'); }).join(':'); },
    menit: function (det) { det = Math.max(0, Math.round(det || 0)); const m = Math.floor(det / 60), s = det % 60; return m + 'm ' + String(s).padStart(2, '0') + 'd'; },
    angka: function (n, d) { if (n === null || n === undefined || n === '') return '-'; return Number(n).toLocaleString('id-ID', { maximumFractionDigits: d === undefined ? 1 : d }); },
    pct: function (n) { return n === null || n === undefined ? '-' : Math.round(n) + '%'; },
    inputDT: function (v) { const d = tgl(v); if (!d) return ''; const p = function (x) { return String(x).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); },
    bytes: function (b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB'; }
  };
  App.inisial = function (n) { return String(n || '?').replace(/[^A-Za-z\s]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) { return x[0]; }).join('').toUpperCase() || '?'; };
  App.debounce = function (fn, ms) { let t; return function () { const a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; };

  // ---------------- Ikon (garis, konsisten) ----------------
  const P = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>', edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>', check: '<path d="M5 12l5 5L20 7"/>',
    checkc: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16"/><path d="M9 7h6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0114 0"/><path d="M16 4.5a3.5 3.5 0 010 7M22 20a6 6 0 00-4-5.6"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    out: '<path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3"/><path d="M10 17l5-5-5-5M15 12H3"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>', left: '<path d="M19 12H5M11 18l-6-6 6-6"/>', cright: '<path d="M9 6l6 6-6 6"/>', cleft: '<path d="M15 6l-6 6 6 6"/>', cdown: '<path d="M6 9l6 6 6-6"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>', plus: '<path d="M12 5v14M5 12h14"/>', trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>', print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    refresh: '<path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/>', lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', shieldc: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    warn: '<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>', layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    ticket: '<path d="M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z"/><path d="M13 6v12" stroke-dasharray="2 2"/>',
    monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>', file: '<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    chat: '<path d="M21 12a8 8 0 01-11.8 7L3 21l2-6.2A8 8 0 1121 12z"/>', wa: '<path d="M3 21l1.7-5A8.5 8.5 0 1112 20.5a8.6 8.6 0 01-4.1-1z"/><path d="M8.5 8.5c0 4 3 7 7 7l1.5-1.5-2-1-1 1c-1.3-.5-2.5-1.7-3-3l1-1-1-2z"/>',
    contacts: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17a4 4 0 018 0"/>', db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    mega: '<path d="M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1z"/><path d="M15 9a3 3 0 010 6M18 6a7 7 0 010 12"/>', flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 13A9 9 0 1111 3a7 7 0 0010 10z"/>', wifi: '<path d="M5 12.6a10 10 0 0114 0M8.5 16a5 5 0 017 0M2 9a15 15 0 0120 0"/><circle cx="12" cy="19.5" r=".8"/>',
    wifioff: '<path d="M2 2l20 20M8.5 16a5 5 0 017 0M5 12.6a10 10 0 015.2-2.6M16.6 11a10 10 0 012.4 1.6M2 9a15 15 0 014.3-2.9M10.7 5A15 15 0 0122 9"/>', star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>', trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', pie: '<path d="M21 12A9 9 0 1112 3v9z"/><path d="M15 3.4A9 9 0 0120.6 9H15z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>', send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>', play: '<path d="M6 4l14 8-14 8z"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5L5 20"/>', link: '<path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>',
    ext: '<path d="M14 3h7v7M10 14L21 3M19 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6"/>', save: '<path d="M5 3h11l5 5v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M7 3v5h8M7 21v-7h10v7"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a2 2 0 002 2h10a2 2 0 002-2V9M10 13h4"/>', qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3M14 20h2M20 14h1"/>',
    pen: '<path d="M3 21c3-1 5-4 7-7l7-7a2 2 0 00-3-3l-7 7c-3 2-6 4-7 7"/><path d="M14 21h7"/>', history: '<path d="M3 12a9 9 0 103-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    phone: '<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>', pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0114 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6"/>', clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/>',
    minus: '<path d="M5 12h14"/>', tag: '<path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    stream: '<path d="M4 6h10M4 12h16M4 18h7"/><circle cx="18" cy="6" r="2"/><circle cx="15" cy="18" r="2"/>', speed: '<path d="M12 14l4-4"/><path d="M3.5 18a9 9 0 1117 0"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/>', laptop: '<rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
    hourglass: '<path d="M6 2h12M6 22h12M7 2v4l5 6-5 6v4M17 2v4l-5 6 5 6v4"/>', moretime: '<circle cx="11" cy="13" r="8"/><path d="M11 9v4l2 2M19 2v4M17 4h4"/>',
    gavel: '<path d="M14 13l-7 7a2 2 0 01-3-3l7-7"/><path d="M13 6l5 5M16 3l5 5-3 3-5-5z"/>', sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>', cloud: '<path d="M7 18a5 5 0 01-.6-10A7 7 0 0120 9.5 4.5 4.5 0 0118 18z"/>'
  };
  App.icon = function (n, cls) { return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || P.info) + '</svg>'; };
  App.logoSvg = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/></svg>';

  // ---------------- Toast, modal, konfirmasi, drawer ----------------
  App.toast = function (msg, type, ms) {
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.innerHTML = App.icon(type === 'ok' ? 'checkc' : type === 'err' ? 'warn' : type === 'warn' ? 'warn' : 'info') + '<span>' + esc(msg) + '</span>';
    t.setAttribute('role', 'status');
    box.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .3s, transform .3s'; t.style.opacity = '0'; t.style.transform = 'translateY(6px)'; setTimeout(function () { t.remove(); }, 320); }, ms || (type === 'err' ? 5200 : 3400));
  };
  App.hasil = function (r, okMsg) { if (r && r.success) { App.toast(okMsg || r.message || 'Berhasil.', 'ok'); return true; } App.toast((r && r.message) || 'Gagal.', 'err'); return false; };
  App.modal = function (o) {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true"><div class="modal-h">' + (o.icon ? '<div class="chip-ic ' + (o.iconTone || 't-blue') + '">' + App.icon(o.icon) + '</div>' : '') +
      '<div class="grow"><h3>' + esc(o.title || '') + '</h3>' + (o.sub ? '<p>' + esc(o.sub) + '</p>' : '') + '</div><button class="iconbtn" data-x aria-label="Tutup">' + App.icon('x') + '</button></div>' +
      '<div class="modal-b">' + (o.body || '') + '</div>' + (o.actions && o.actions.length ? '<div class="modal-f"></div>' : '') + '</div>';
    document.body.appendChild(bg);
    const close = function () { bg.remove(); document.removeEventListener('keydown', onKey); if (o.onClose) o.onClose(); };
    const onKey = function (e) { if (e.key === 'Escape' && !o.noEsc) close(); };
    document.addEventListener('keydown', onKey);
    bg.querySelector('[data-x]').onclick = close;
    if (!o.noBgClose) bg.addEventListener('mousedown', function (e) { if (e.target === bg) close(); });
    const f = bg.querySelector('.modal-f');
    (o.actions || []).forEach(function (a) {
      const b = document.createElement('button'); b.className = 'btn ' + (a.cls || 'ghost'); b.innerHTML = (a.icon ? App.icon(a.icon) : '') + esc(a.label);
      b.onclick = async function () {
        if (!a.onClick) { close(); return; }
        const r = a.onClick(b, bg);
        if (r && typeof r.then === 'function') { App.busy(b, true); const v = await r; App.busy(b, false); if (v !== false) close(); }
        else if (r !== false) close();
      };
      f.appendChild(b);
    });
    const m = { el: bg, body: bg.querySelector('.modal-b'), close: close };
    if (o.onOpen) o.onOpen(m);
    const first = bg.querySelector('input,select,textarea'); if (first && !o.noFocus) setTimeout(function () { first.focus(); }, 30);
    return m;
  };
  App.confirm = function (msg, o) {
    o = o || {};
    return new Promise(function (res) {
      let done = false;
      App.modal({ title: o.title || 'Konfirmasi', body: '<p style="margin:0;line-height:1.6">' + msg + '</p>' + (o.ketik ? '<div class="field" style="margin-top:14px"><label>Ketik <b>' + esc(o.ketik) + '</b> untuk melanjutkan</label><input class="inp" data-k autocomplete="off"></div>' : ''),
        icon: o.icon || 'warn', iconTone: o.tone || 't-amber', size: 'sm', onClose: function () { if (!done) res(false); },
        actions: [{ label: o.batal || 'Batal', cls: 'ghost' }, { label: o.ok || 'Ya, lanjutkan', cls: o.danger ? 'danger' : 'primary', onClick: function (b, bg) {
          if (o.ketik) { const v = bg.querySelector('[data-k]').value.trim(); if (v !== o.ketik) { App.toast('Ketik ' + o.ketik + ' dengan tepat.', 'warn'); return false; } done = true; res(v); return; }
          done = true; res(true);
        } }] });
    });
  };
  App.prompt = function (judul, o) {
    o = o || {};
    return new Promise(function (res) {
      let done = false;
      App.modal({ title: judul, sub: o.sub, size: 'sm', icon: o.icon || 'edit', onClose: function () { if (!done) res(null); },
        body: '<div class="field">' + (o.label ? '<label>' + esc(o.label) + '</label>' : '') + (o.area ? '<textarea class="ta" data-v rows="4" placeholder="' + esc(o.ph || '') + '">' + esc(o.nilai || '') + '</textarea>' : '<input class="inp" data-v type="' + (o.type || 'text') + '" value="' + esc(o.nilai || '') + '" placeholder="' + esc(o.ph || '') + '" ' + (o.attr || '') + '>') + '</div>',
        actions: [{ label: 'Batal' }, { label: o.ok || 'Simpan', cls: 'primary', onClick: function (b, bg) { const v = bg.querySelector('[data-v]').value; if (o.wajib && !v.trim()) { App.toast('Wajib diisi.', 'warn'); return false; } done = true; res(v); } }] });
    });
  };
  App.drawer = function (o) {
    const bg = document.createElement('div'); bg.className = 'drawer-bg';
    const d = document.createElement('aside'); d.className = 'drawer ' + (o.size || '');
    d.innerHTML = '<div class="drawer-h"><div class="grow"><h3 style="font-size:16px">' + esc(o.title || '') + '</h3>' + (o.sub ? '<div class="small muted">' + esc(o.sub) + '</div>' : '') + '</div><button class="iconbtn" data-x>' + App.icon('x') + '</button></div><div class="drawer-b">' + (o.body || '') + '</div>';
    document.body.appendChild(bg); document.body.appendChild(d);
    const close = function () { bg.remove(); d.remove(); if (o.onClose) o.onClose(); };
    bg.onclick = close; d.querySelector('[data-x]').onclick = close;
    const m = { el: d, body: d.querySelector('.drawer-b'), close: close };
    if (o.onOpen) o.onOpen(m);
    return m;
  };
  App.busy = function (btn, on, teks) {
    if (!btn) return;
    if (on) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>' + (teks ? esc(teks) : ''); }
    else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; }
  };
  /** Jalankan aksi dengan tombol sibuk + toast hasil. */
  App.aksi = async function (btn, action, data, okMsg) {
    App.busy(btn, true);
    const r = await App.api(action, data);
    App.busy(btn, false);
    App.hasil(r, okMsg);
    return r;
  };
  App.copy = function (t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { App.toast('Disalin: ' + t, 'ok'); }, function () { App.toast('Salin manual: ' + t); }); };
  App.tabelKosong = function (n, teks, ic) { return '<tr><td colspan="' + n + '"><div class="empty">' + App.icon(ic || 'list', 'xl') + '<div>' + esc(teks || 'Belum ada data.') + '</div></div></td></tr>'; };
  App.pager = function (el, total, hal, per, onGo) {
    const n = Math.max(1, Math.ceil(total / per)); hal = Math.min(hal, n);
    const mulai = total ? (hal - 1) * per + 1 : 0, akhir = Math.min(total, hal * per);
    const nums = []; for (let i = Math.max(1, hal - 2); i <= Math.min(n, hal + 2); i++) nums.push(i);
    el.innerHTML = '<div>Menampilkan <b>' + mulai + ' – ' + akhir + '</b> dari <b>' + total + '</b></div><div class="pg"><button data-p="' + (hal - 1) + '" ' + (hal <= 1 ? 'disabled' : '') + '>‹</button>' +
      nums.map(function (i) { return '<button data-p="' + i + '" class="' + (i === hal ? 'on' : '') + '">' + i + '</button>'; }).join('') + '<button data-p="' + (hal + 1) + '" ' + (hal >= n ? 'disabled' : '') + '>›</button></div>';
    App.$$('button[data-p]', el).forEach(function (b) { b.onclick = function () { onGo(Number(b.dataset.p)); }; });
  };

  // ---------------- Teks soal: escape + format ringan + KaTeX malas ----------------
  App.soalHtml = function (t) {
    let s = esc(t || '');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<i>$2</i>').replace(/__([^_\n]+)__/g, '<u>$1</u>');
    return s.replace(/\n/g, '<br>');
  };
  let _katex = null;
  App.renderMath = function (el) {
    if (!el || !/\$[^$]+\$/.test(el.textContent)) return;
    if (!_katex) _katex = App.loadCss('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css')
      .then(function () { return App.loadScript('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js'); })
      .then(function () { return App.loadScript('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js'); });
    _katex.then(function () { try { window.renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) { } }, function () { _katex = null; });
  };
  const _scripts = {};
  App.loadScript = function (src) {
    if (_scripts[src]) return _scripts[src];
    _scripts[src] = new Promise(function (res, rej) { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = function () { delete _scripts[src]; rej(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); });
    return _scripts[src];
  };
  App.loadCss = function (href) { return new Promise(function (res) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = res; l.onerror = res; document.head.appendChild(l); }); };

  // ---------------- Excel (SheetJS, dimuat saat perlu) ----------------
  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  App.exportXlsx = async function (sheets, nama) {
    await App.loadScript(XLSX_URL);
    const wb = window.XLSX.utils.book_new();
    Object.keys(sheets).forEach(function (k) { const ws = window.XLSX.utils.json_to_sheet(sheets[k].length ? sheets[k] : [{ Info: 'Tidak ada data' }]); window.XLSX.utils.book_append_sheet(wb, ws, k.slice(0, 31)); });
    window.XLSX.writeFile(wb, nama.replace(/[\\/:*?"<>|]+/g, '-') + '.xlsx');
  };
  App.readXlsx = async function (file) {
    await App.loadScript(XLSX_URL);
    const buf = await file.arrayBuffer(), wb = window.XLSX.read(buf, { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return window.XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
  };
  App.pilihBerkas = function (accept) {
    return new Promise(function (res) { const i = document.createElement('input'); i.type = 'file'; i.accept = accept || ''; i.onchange = function () { res(i.files[0] || null); }; i.click(); });
  };
  App.unduhB64 = function (b64, nama, mime) {
    const bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: mime || 'application/octet-stream' }));
    const a = document.createElement('a'); a.href = url; a.download = nama || 'berkas'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  };
  App.bukaB64 = function (b64, mime) {
    const bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    window.open(URL.createObjectURL(new Blob([arr], { type: mime })), '_blank');
  };
  /** Kompres gambar di peramban sebelum diunggah (hemat kuota & cepat di HP). */
  App.kompresGambar = function (file, maks, q) {
    maks = maks || 1400; q = q || 0.82;
    return new Promise(function (res, rej) {
      const r = new FileReader();
      r.onload = function () {
        const img = new Image();
        img.onload = function () {
          const s = Math.min(1, maks / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', q));
        };
        img.onerror = rej; img.src = r.result;
      };
      r.onerror = rej; r.readAsDataURL(file);
    });
  };
  /** Cetak potongan HTML (laporan, kartu token) → dialog cetak/Simpan sebagai PDF. */
  App.cetak = function (judul, html, css) {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentDocument;
    d.open();
    d.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>' + esc(judul) + '</title><style>body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;margin:24px;font-size:12px}h1{font-size:18px;margin:0 0 4px}h2{font-size:14px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}th{background:#eef3ff;font-size:11px;text-transform:uppercase}.muted{color:#64748b}.r{text-align:right}' + (css || '') + '</style></head><body>' + html + '</body></html>');
    d.close();
    setTimeout(function () { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(function () { f.remove(); }, 2000); }, 350);
  };
  App.qrSvg = function (teks, ukuran) {
    try { const q = window.qrcode(0, 'M'); q.addData(teks); q.make(); return q.createSvgTag({ cellSize: Math.max(2, Math.round((ukuran || 96) / (q.getModuleCount() + 4))), margin: 2, scalable: true }); }
    catch (e) { return ''; }
  };

  // ---------------- Grafik SVG ringan (tanpa pustaka) ----------------
  App.chart = {
    /** Garis halus + area gradasi + titik + label puncak. pts = [{label, v, tip}] */
    garis: function (pts, o) {
      o = o || {}; const W = 400, H = o.h || 150, pad = 14, warna = o.warna || 'var(--brand)', id = 'g' + Math.random().toString(36).slice(2, 7);
      if (!pts.length) return '<div class="empty small">' + esc(o.kosong || 'Belum ada data.') + '</div>';
      const min = o.min !== undefined ? o.min : 0, max = o.max !== undefined ? o.max : Math.max.apply(null, pts.map(p => p.v).concat([1]));
      const x = i => pts.length === 1 ? W / 2 : pad + i * (W - pad * 2) / (pts.length - 1), y = v => H - pad - (v - min) / Math.max(1, max - min) * (H - pad * 2);
      const xy = pts.map((p, i) => [x(i), y(p.v)]);
      let d = 'M' + xy[0][0] + ',' + xy[0][1];
      for (let i = 1; i < xy.length; i++) { const p0 = xy[i - 2] || xy[i - 1], p1 = xy[i - 1], p2 = xy[i], p3 = xy[i + 1] || p2;
        d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6) + ',' + (p1[1] + (p2[1] - p0[1]) / 6) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6) + ',' + (p2[1] - (p3[1] - p1[1]) / 6) + ' ' + p2[0] + ',' + p2[1]; }
      let pk = 0; pts.forEach((p, i) => { if (p.v > pts[pk].v) pk = i; });
      const grid = [0.25, 0.5, 0.75].map(f => '<line x1="0" x2="' + W + '" y1="' + (pad + f * (H - pad * 2)) + '" y2="' + (pad + f * (H - pad * 2)) + '" stroke="var(--line-2)"/>').join('');
      return '<div style="position:relative"><svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="height:' + H + 'px"><defs><linearGradient id="' + id + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#1E4FD8" stop-opacity=".3"/><stop offset="1" stop-color="#1E4FD8" stop-opacity="0"/></linearGradient></defs>' + grid +
        (xy.length > 1 ? '<path d="' + d + ' L' + xy[xy.length - 1][0] + ',' + (H - 4) + ' L' + xy[0][0] + ',' + (H - 4) + ' Z" fill="url(#' + id + ')"/>' : '') +
        '<path d="' + d + '" fill="none" stroke="' + warna + '" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
        xy.map((p, i) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === pk ? 5 : 3.5) + '" fill="' + warna + '" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"><title>' + esc(pts[i].tip || pts[i].label + ': ' + pts[i].v) + '</title></circle>').join('') + '</svg>' +
        '<div class="tip" style="left:' + (xy[pk][0] / W * 100) + '%;top:' + (xy[pk][1] / H * 100) + '%">' + esc(App.fmt.angka(pts[pk].v)) + (o.satuan || '') + '<div style="font-size:8.5px;opacity:.75;font-weight:500">' + esc(pts[pk].label) + '</div></div></div>' +
        '<div class="row between tiny muted" style="margin-top:6px;border-top:1px solid var(--line-2);padding-top:6px">' + pts.filter((p, i) => pts.length <= 7 || i % Math.ceil(pts.length / 7) === 0 || i === pts.length - 1).map(p => '<span>' + esc(p.label) + '</span>').join('') + '</div>';
    },
    /** Donat. segs = [{label, v, warna}] */
    donat: function (segs, o) {
      o = o || {}; const total = segs.reduce((a, s) => a + s.v, 0) || 1, r = 15.9155; let off = 0;
      const arc = segs.map(s => { const p = s.v / total * 100, el = '<circle cx="18" cy="18" r="' + r + '" fill="none" stroke="' + s.warna + '" stroke-width="' + (o.tebal || 4.2) + '" stroke-dasharray="' + Math.max(0, p - 0.6) + ' ' + (100 - Math.max(0, p - 0.6)) + '" stroke-dashoffset="' + (-off) + '"/>'; off += p; return el; }).join('');
      return '<div class="ring" style="width:' + (o.size || 128) + 'px;height:' + (o.size || 128) + 'px"><svg viewBox="0 0 36 36" style="width:100%;height:100%;transform:rotate(-90deg)"><circle cx="18" cy="18" r="' + r + '" fill="none" stroke="var(--line-2)" stroke-width="' + (o.tebal || 4.2) + '"/>' + arc + '</svg><div class="c">' + (o.tengah || '') + '</div></div>';
    },
    cincin: function (persen, o) {
      o = o || {}; const p = Math.max(0, Math.min(100, persen));
      return '<div class="ring" style="width:' + (o.size || 150) + 'px;height:' + (o.size || 150) + 'px"><svg viewBox="0 0 36 36" style="width:100%;height:100%;transform:rotate(-90deg)"><circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--line-2)" stroke-width="3"/><circle cx="18" cy="18" r="15.9155" fill="none" stroke="' + (o.warna || 'var(--brand)') + '" stroke-width="3" stroke-linecap="round" stroke-dasharray="' + p + ' 100"/></svg><div class="c">' + (o.tengah || '') + '</div></div>';
    },
    /** Batang vertikal. items = [{label, v, warna, ket}]. o.garis = {setelah: indeks, label} */
    batang: function (items, o) {
      o = o || {}; const H = o.h || 180, max = Math.max.apply(null, items.map(i => i.v).concat([1]));
      return '<div style="position:relative;display:flex;align-items:flex-end;gap:14px;height:' + (H + 42) + 'px;padding-top:22px">' + items.map((it, i) =>
        '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative">' +
        (o.garis && o.garis.setelah === i ? '<div style="position:absolute;left:-8px;top:-22px;bottom:30px;border-left:2px dashed #e11d48"><span class="badge rose" style="position:absolute;top:-4px;left:-30px;height:18px;font-size:10px">' + esc(o.garis.label) + '</span></div>' : '') +
        '<b class="small" style="color:var(--ink)">' + it.v + '</b><div title="' + esc(it.label + ': ' + it.v) + '" style="width:100%;max-width:70px;height:' + Math.max(4, it.v / max * H) + 'px;border-radius:9px 9px 3px 3px;background:' + (it.warna || 'var(--brand)') + '"></div>' +
        '<div class="tiny muted center" style="line-height:1.2">' + esc(it.label) + (it.ket ? '<br><span style="color:' + (it.warna || 'var(--brand)') + ';font-weight:700">' + esc(it.ket) + '</span>' : '') + '</div></div>').join('') + '</div>';
    }
  };

  // ---------------- Tema & branding ----------------
  App.tema = {
    terapkan: function (pref) {
      pref = pref || _ls.get('uk_tema', 'terang');
      const gelap = pref === 'gelap' || (pref === 'sistem' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.setAttribute('data-theme', gelap ? 'dark' : 'light');
    },
    set: function (p) { _ls.set('uk_tema', p); this.terapkan(p); }
  };
  App.tema.terapkan();
  App.brand = function (s) {
    s = s || {};
    if (/^#[0-9a-f]{6}$/i.test(s.WARNA_UTAMA || '')) document.documentElement.style.setProperty('--brand', s.WARNA_UTAMA);
    App.setting = s;
    App.$$('[data-brand="nama"]').forEach(function (e) { e.textContent = s.NAMA_APLIKASI || 'UjianKu'; });
    App.$$('[data-brand="lembaga"]').forEach(function (e) { e.textContent = s.NAMA_LEMBAGA || ''; });
    App.$$('[data-brand="logo"]').forEach(function (e) { e.innerHTML = /^https:\/\//.test(s.LOGO_URL || '') ? '<img src="' + esc(s.LOGO_URL) + '" alt="">' : App.logoSvg; });
  };
  App.bootPublik = function (cb) {
    return App.swr('pub_boot', function () { return App.api('pub.boot', {}, { noToken: true }); }, { maxAge: 10 * 60000, render: function (d) { App.brand(d.setting); if (cb) cb(d); } });
  };
  App.footerHtml = function () {
    const s = App.setting || {};
    return '<div class="row wrap" style="gap:22px">' +
      (s.WEBSITE ? '<span class="it">' + App.icon('globe') + esc(s.WEBSITE) + '</span>' : '') + (s.TELEPON ? '<span class="it">' + App.icon('phone') + esc(s.TELEPON) + '</span>' : '') +
      (s.ALAMAT ? '<span class="it">' + App.icon('pin') + esc(s.ALAMAT) + '</span>' : '') + '</div><div>© ' + new Date().getFullYear() + ' <b>' + esc(s.NAMA_APLIKASI || 'UjianKu Pro') + '</b> · ' + esc(s.NAMA_LEMBAGA || '') + '</div>';
  };
  App.bannerKonfig = function () {
    if (KONFIG_OK) return;
    const b = document.createElement('div'); b.className = 'banner-cfg';
    b.innerHTML = '⚠️ Konfigurasi belum lengkap — isi <code>GAS_URL</code> di <code>js/config.js</code> dengan URL <code>/exec</code> dari Apps Script, lalu unggah ulang.';
    document.body.prepend(b);
  };
})();
