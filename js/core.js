/**
 * core.js — klien API bersama untuk landing page & dashboard.
 * Pola gas-scale-turbo: dedupe permintaan baca + epoch tulis, penggabung batch
 * otomatis, cache lokal (stale-while-revalidate), pengosong antrean notifikasi,
 * warmup server, polling adaptif, dan pengukur kinerja (EK.Perf.table()).
 */
(function (global) {
  'use strict';
  var CFG = global.APP_CONFIG || {};
  var GAS_URL = String(CFG.GAS_URL || '');
  var SIAP = /^https?:\/\/\S+\/exec$/.test(GAS_URL) && !/GANTI|XXXX/.test(GAS_URL);

  // ------------------------------------------------------------ Util
  var Util = {
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    },
    rp: function (n) { return 'Rp ' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); },
    angka: function (n) { return (Number(n) || 0).toLocaleString('id-ID'); },
    hash: function (s) { s = typeof s === 'string' ? s : JSON.stringify(s); var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); },
    debounce: function (fn, ms) { var t; return function () { var a = arguments, me = this; clearTimeout(t); t = setTimeout(function () { fn.apply(me, a); }, ms); }; },
    tgl: function (s, opsi) {
      if (!s) return '-';
      var d = new Date(String(s).replace(' ', 'T') + (String(s).length <= 10 ? 'T00:00:00' : '') + '+07:00');
      if (isNaN(d)) return String(s);
      return d.toLocaleDateString('id-ID', Object.assign({ day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }, opsi || {}));
    },
    jam: function (s) {
      if (!s) return '';
      var d = new Date(String(s).replace(' ', 'T') + '+07:00');
      return isNaN(d) ? '' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    },
    relatif: function (s) {
      if (!s) return '-';
      var d = new Date(String(s).replace(' ', 'T') + '+07:00'), m = Math.round((Date.now() - d) / 60000);
      if (isNaN(m)) return String(s);
      if (m < 1) return 'baru saja'; if (m < 60) return m + ' mnt lalu';
      var h = Math.round(m / 60); if (h < 24) return h + ' jam lalu';
      var hr = Math.round(h / 24); if (hr < 7) return hr + ' hari lalu';
      return Util.tgl(s);
    },
    hariIni: function (geser) {
      var d = new Date(Date.now() + 7 * 3600e3 + (geser || 0) * 864e5);
      return d.toISOString().slice(0, 10);
    },
    wa62: function (v) {
      var s = String(v || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
      if (!s) return '';
      if (s.indexOf('62') === 0) return s;
      if (s.indexOf('0') === 0) return '62' + s.slice(1);
      if (s.indexOf('8') === 0) return '62' + s;
      return s;
    },
    waFormat: function (v) { var s = Util.wa62(v); return s ? '+' + s.replace(/^(\d{2})(\d{3})(\d{4})(\d+)$/, '$1 $2-$3-$4') : ''; },
    emailValid: function (e) { return /^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]{2,}$/.test(String(e || '').trim()); },
    inisial: function (n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (x) { return x[0] || ''; }).join('').toUpperCase() || '?'; },
    waLink: function (no, pesan) { var w = Util.wa62(no); return w ? 'https://wa.me/' + w + (pesan ? '?text=' + encodeURIComponent(pesan) : '') : ''; },
    ytId: function (u) { var m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : ''; },
    toast: function (pesan, tipe, ms) {
      var box = document.getElementById('toast');
      if (!box) { box = document.createElement('div'); box.id = 'toast'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
      var t = document.createElement('div');
      t.className = 'toast toast-' + (tipe || 'ok');
      t.textContent = pesan;
      box.appendChild(t);
      requestAnimationFrame(function () { t.classList.add('show'); });
      setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, ms || (tipe === 'err' ? 5200 : 3200));
    }
  };

  // ------------------------------------------------------------ Perf (EK.Perf.table() di console)
  var Perf = {
    log: [],
    add: function (e) { this.log.push(e); if (this.log.length > 400) this.log.shift(); },
    table: function () {
      console.table(this.log.slice(-40).map(function (e) {
        return { aksi: e.aksi, total_ms: e.total, server_ms: e.server, jaringan_ms: e.total - (e.server || 0), cache: e.cached ? '✓' : '', batch: e.batch || '' };
      }));
    },
    summary: function () {
      var g = {};
      this.log.forEach(function (e) { var x = g[e.aksi] || (g[e.aksi] = { n: 0, total: 0, server: 0, cache: 0 }); x.n++; x.total += e.total; x.server += e.server || 0; x.cache += e.cached ? 1 : 0; });
      console.table(Object.keys(g).map(function (k) { var x = g[k]; return { aksi: k, panggilan: x.n, rata_total_ms: Math.round(x.total / x.n), rata_server_ms: Math.round(x.server / x.n), cache_hit: x.cache }; }));
    },
    eksekusi: function () { return this.log.filter(function (e) { return !e.dariBatch; }).length; }
  };

  // ------------------------------------------------------------ Store (localStorage aman)
  var Store = {
    pfx: 'ek1:',
    get: function (k) { try { var s = localStorage.getItem(this.pfx + k); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
    val: function (k) { var e = this.get(k); return e ? e.v : null; },
    age: function (k) { var e = this.get(k); return e ? Date.now() - e.t : Infinity; },
    set: function (k, v) {
      var s = JSON.stringify({ t: Date.now(), v: v });
      try { localStorage.setItem(this.pfx + k, s); }
      catch (e) { try { this.bersih('a:'); localStorage.setItem(this.pfx + k, s); } catch (x) {} }
    },
    sentuh: function (k) { var e = this.get(k); if (e) this.set(k, e.v); },
    usang: function (k) { var e = this.get(k); if (e) { try { localStorage.setItem(this.pfx + k, JSON.stringify({ t: 0, v: e.v })); } catch (x) {} } },
    del: function (k) { try { localStorage.removeItem(this.pfx + k); } catch (e) {} },
    bersih: function (awal) {
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(Store.pfx + (awal || '')) === 0) localStorage.removeItem(k); }); } catch (e) {}
    }
  };

  // ------------------------------------------------------------ API
  var READ = /^(konten|auth\.(me|config)|dash\.ringkasan|sistem\.status|leads\.list|konten\.(list|semua)|pengaturan\.get|pengguna\.list|log\.list|keamanan\.status|notif\.(config|queue)|wa\.(audience|blastList|device)|crm\.(list|detail)|turbo\.performa)$/;
  var _token = '', _epoch = 0, _inflight = {}, _onAuthFail = null;

  function timeoutFetch(url, opsi, ms) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (ctl) opsi.signal = ctl.signal;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, ms || 30000) : null;
    return fetch(url, opsi).finally(function () { if (t) clearTimeout(t); });
  }
  function belumSiap() { return { success: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL Web App (…/exec).', code: 'CONFIG' }; }

  /** POST mentah ke GAS (text/plain → tanpa preflight CORS) */
  function raw(action, data, opsi) {
    opsi = opsi || {};
    if (!SIAP) return Promise.resolve(belumSiap());
    var t0 = performance.now();
    return timeoutFetch(GAS_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, token: _token, data: data || {} })
    }, opsi.timeout || 30000).then(function (r) { return r.json(); }).then(function (res) {
      Perf.add({ aksi: action, total: Math.round(performance.now() - t0), server: res.ms, cached: res.cached, batch: action === 'batch' ? (data.calls || []).length : '' });
      if (res && res.nq > 0) Drain.jadwalkan();
      cekAuth(res);
      return res;
    }).catch(function (e) {
      return { success: false, offline: true, message: e && e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' };
    });
  }
  function cekAuth(res) { if (res && !res.success && res.code === 'AUTH' && _token && _onAuthFail) _onAuthFail(res); }

  /** Panggilan dengan dedupe baca + epoch tulis */
  function call(action, data, opsi) {
    if (!READ.test(action)) { _epoch++; return raw(action, data, opsi); }
    var k = _epoch + '|' + action + '|' + _token.slice(-12) + '|' + JSON.stringify(data || {});
    if (_inflight[k]) return _inflight[k];
    var p = raw(action, data, opsi);
    _inflight[k] = p;
    p.then(function () { delete _inflight[k]; }, function () { delete _inflight[k]; });
    return p;
  }

  /** GET (konten publik) — tanpa header khusus agar bisa di-cache CDN Google */
  function get(params) {
    if (!SIAP) return Promise.resolve(belumSiap());
    var q = Object.keys(params || {}).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    var t0 = performance.now();
    return timeoutFetch(GAS_URL + (q ? '?' + q : ''), { method: 'GET', redirect: 'follow' }, 25000).then(function (r) { return r.json(); }).then(function (res) {
      Perf.add({ aksi: 'GET ' + (params.action || params.w || ''), total: Math.round(performance.now() - t0), server: res.ms, cached: res.cached });
      return res;
    }).catch(function () { return { success: false, offline: true, message: 'Tidak dapat terhubung ke server.' }; });
  }

  // ------------------------------------------------------------ Penggabung batch otomatis
  var Batcher = {
    q: null,
    add: function (action, data) {
      var me = this;
      return new Promise(function (res) {
        if (!me.q) { me.q = []; setTimeout(function () { me.flush(); }, 0); }
        me.q.push({ action: action, data: data || {}, res: res });
      });
    },
    flush: function () {
      var q = this.q; this.q = null;
      var grup = {}, urut = [];
      q.forEach(function (it) {
        var k = it.action + '|' + JSON.stringify(it.data);
        if (!grup[k]) { grup[k] = { action: it.action, data: it.data, res: [] }; urut.push(grup[k]); }
        grup[k].res.push(it.res);
      });
      for (var i = 0; i < urut.length; i += 10) (function (chunk) {
        if (chunk.length === 1) { call(chunk[0].action, chunk[0].data).then(function (r) { chunk[0].res.forEach(function (f) { f(r); }); }); return; }
        raw('batch', { calls: chunk.map(function (c) { return { action: c.action, data: c.data }; }) }).then(function (r) {
          chunk.forEach(function (c, j) {
            var x = r && r.success && r.data && r.data.results ? r.data.results[j] : r;
            if (x !== r) { Perf.add({ aksi: c.action, total: 0, server: x.ms, cached: x.cached, dariBatch: true }); cekAuth(x); }
            c.res.forEach(function (f) { f(x); });
          });
        });
      })(urut.slice(i, i + 10));
    }
  };
  function q(action, data) { return READ.test(action) ? Batcher.add(action, data) : call(action, data); }

  // ------------------------------------------------------------ Pengosong antrean notifikasi
  var Drain = {
    t: null, n: 0,
    jadwalkan: function () {
      var me = this; clearTimeout(this.t);
      this.t = setTimeout(function () { me.n = 0; me.jalan(); }, 400);
    },
    jalan: function () {
      var me = this;
      raw('drain', {}).then(function (r) {
        if (r && r.success && r.data && r.data.left > 0 && ++me.n < 3) setTimeout(function () { me.jalan(); }, 1500);
      });
    }
  };

  // ------------------------------------------------------------ Warmup server dari browser
  function warmUp(scope) {
    if (!SIAP) return;
    try {
      var k = 'ek_warm_' + scope, t = Number(sessionStorage.getItem(k) || 0);
      if (Date.now() - t < 240000) return;
      sessionStorage.setItem(k, String(Date.now()));
    } catch (e) {}
    try { fetch(GAS_URL + '?w=' + scope, { mode: 'no-cors', cache: 'no-store' }).catch(function () {}); } catch (e) {}
  }

  // ------------------------------------------------------------ Aktivitas (polling adaptif)
  var Activity = {
    at: Date.now(), last: {},
    init: function () {
      var me = this;
      ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach(function (ev) { addEventListener(ev, function () { me.at = Date.now(); }, { passive: true }); });
    },
    idle: function () { return Date.now() - this.at > 120000; },
    due: function (key, aktifMs, idleMs) {
      if (document.visibilityState !== 'visible') return false;
      if (Date.now() - (this.last[key] || 0) < (this.idle() ? idleMs : aktifMs) - 500) return false;
      this.last[key] = Date.now(); return true;
    },
    tandai: function (key) { this.last[key] = Date.now(); }
  };

  global.EK = {
    CFG: CFG, SIAP: SIAP, Util: Util, Perf: Perf, Store: Store, Activity: Activity,
    API: {
      call: call, q: q, get: get, raw: raw, warmUp: warmUp, drain: function () { Drain.jadwalkan(); },
      setToken: function (t) { _token = t || ''; }, token: function () { return _token; },
      onAuthFail: function (fn) { _onAuthFail = fn; }, isRead: function (a) { return READ.test(a); }
    }
  };
})(window);
