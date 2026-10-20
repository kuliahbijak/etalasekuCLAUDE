/**
 * admin.js — inti dashboard: sesi & login, router SPA, data SWR, perangkat UI.
 * Modul halaman (admin-*.js) mendaftar lewat EKA.daftar(id, {mount, muat}).
 */
window.EKA = (function () {
  'use strict';
  var U = EK.Util, API = EK.API, Store = EK.Store, esc = U.esc;
  var A = { me: null, halaman: {}, aktif: null, subs: {}, pending: {}, ukey: '' };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ic = function (id, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; };
  A.$ = $; A.$$ = $$; A.ic = ic; A.esc = esc; A.U = U;

  // ================================================================ MENU
  var MENU = [
    { grup: 'Utama & Analitik', item: [['dashboard', 'Dashboard Overview', 'i-grid'], ['leads', 'Data Leads Pembeli', 'i-users'], ['statistik', 'Statistik & Kunjungan', 'i-chart'], ['export', 'Export Data', 'i-download']] },
    { grup: 'Manajemen Konten', item: [['hero', 'Slide Hero', 'i-slides'], ['produk', 'Katalog Produk', 'i-box'], ['kelas', 'Kelas & Kurikulum', 'i-book'], ['video', 'Video YouTube Profil', 'i-video'], ['hasil', 'Hasil Karya & Testimoni', 'i-award']] },
    { grup: 'Pemasaran', item: [['wa', 'WhatsApp & Notifikasi', 'i-chat'], ['crm', 'CRM Kontak', 'i-contact']] },
    { grup: 'Superadmin', sa: true, item: [['pengaturan', 'Pengaturan', 'i-gear'], ['pengguna', 'Role & Akses Pengguna', 'i-userkey'], ['keamanan', 'Keamanan & Performa', 'i-shield'], ['migrasi', 'Migrasi Data', 'i-db'], ['log', 'Log Aktivitas', 'i-list']] }
  ];
  function infoMenu(id) { var o = null; MENU.forEach(function (g) { g.item.forEach(function (it) { if (it[0] === id) o = { id: id, judul: it[1], ikon: it[2], grup: g.grup, sa: !!g.sa }; }); }); return o; }
  A.isSA = function () { return A.me && A.me.role === 'superadmin'; };

  // ================================================================ SUMBER DATA (SWR)
  var SUMBER = {
    dash: ['dash.ringkasan', 30000], leads: ['leads.list', 30000], sistem: ['sistem.status', 300000], konten: ['konten.semua', 60000],
    crm: ['crm.list', 30000], blast: ['wa.blastList', 15000], antrean: ['notif.queue', 15000], notif: ['notif.config', 60000, 1],
    pengaturan: ['pengaturan.get', 60000, 1], pengguna: ['pengguna.list', 60000, 1], keamanan: ['keamanan.status', 60000, 1], log: ['log.list', 20000, 1],
    performa: ['turbo.performa', 60000, 1]
  };
  function kunciLokal(k) { return 'a:' + A.ukey + ':' + k; }
  A.lokal = function (k) { return Store.val(kunciLokal(k)); };
  A.umur = function (k) { return Store.age(kunciLokal(k)); };
  A.simpan = function (k, v, diam) { Store.set(kunciLokal(k), v); if (!diam) A.emit(k); };
  A.usang = function (k) { Store.usang(kunciLokal(k)); };
  A.on = function (k, fn) { (A.subs[k] = A.subs[k] || []).push(fn); };
  A.emit = function (k) { var v = A.lokal(k); (A.subs[k] || []).slice().forEach(function (f) { try { f(v); } catch (e) { console.error(e); } }); };
  A.kunciData = function (nama, p) { return p && Object.keys(p).length ? nama + ':' + U.hash(p) : nama; };

  /** Ambil data: tampilkan cache lokal, segarkan bila basi. opsi: {p, fresh, diam} */
  A.ambil = function (nama, opsi) {
    opsi = opsi || {};
    var s = SUMBER[nama]; if (!s) return Promise.resolve(null);
    if (s[2] && !A.isSA()) return Promise.resolve(null);
    var k = A.kunciData(nama, opsi.p), ada = A.lokal(k);
    if (!opsi.fresh && ada && A.umur(k) < s[1]) return Promise.resolve(ada);
    if (A.pending[k] && !opsi.fresh) return A.pending[k];
    var data = Object.assign({}, opsi.p || {}); if (opsi.fresh) data._fresh = true;
    tandaBasi(true);
    var pr = API.q(s[0], data).then(function (r) {
      delete A.pending[k]; tandaBasi(false);
      if (r && r.success) {
        var lama = A.lokal(k);
        if (!lama || U.hash(lama) !== U.hash(r.data)) A.simpan(k, r.data); else Store.sentuh(kunciLokal(k));
        return r.data;
      }
      if (r && r.code !== 'AUTH' && !opsi.diam && !(r.offline && ada)) U.toast(r.message || 'Gagal memuat data.', 'err');
      if (r && r.offline && ada) U.toast('Mode luring: menampilkan data tersimpan.', 'info');
      return ada;
    });
    A.pending[k] = pr;
    return pr;
  };
  var _basi = 0;
  function tandaBasi(on) { _basi = Math.max(0, _basi + (on ? 1 : -1)); var b = $('#btn-segar'); if (b) b.classList.toggle('putar', _basi > 0); }

  /** Aksi tulis: API.call + pesan galat seragam. Mengembalikan respons. */
  A.tulis = function (action, data, opsi) {
    opsi = opsi || {};
    return API.call(action, data, opsi).then(function (r) {
      if (r && r.success) { if (opsi.pesan !== false && (opsi.pesan || r.message)) U.toast(opsi.pesan || r.message); }
      else if (r && r.code !== 'AUTH') U.toast((r && r.message) || 'Gagal menyimpan.', 'err');
      return r || { success: false };
    });
  };

  // ================================================================ SESI & LOGIN
  function decodeExp(t) {
    try { var b = String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; return JSON.parse(decodeURIComponent(escape(atob(b)))).x || 0; } catch (e) { return 0; }
  }
  function sesi() { var s = Store.val('sesi'); return s && s.exp > Date.now() && s.token ? s : null; }

  A.mulai = function () {
    EK.Activity.init();
    API.onAuthFail(function () { A.keluar('Sesi Anda berakhir atau akses dicabut. Silakan masuk kembali.', true); });
    $('#login-year').textContent = new Date().getFullYear();
    pasangShell();
    var s = sesi();
    if (s) masukApp(s, true); else tampilLogin();
    window.addEventListener('hashchange', function () {
      if (location.hash === '#darurat' && !A.me) { tampilDarurat(); return; }
      if (A.me) tampilHalaman(ruteHash());
    });
  };

  function tampilLogin(pesan, tipe) {
    document.documentElement.classList.remove('ada-sesi');
    $('#app-view').hidden = true; $('#login-view').hidden = false;
    document.title = 'Masuk — Dashboard Admin';
    var cfg = Store.val('authcfg');
    if (cfg) brandLogin(cfg);
    alertLogin(pesan, tipe);
    if (location.hash === '#darurat') tampilDarurat();
    API.warmUp('admin');
    API.call('auth.config', {}).then(function (r) {
      if (r && r.success) { Store.set('authcfg', r.data); brandLogin(r.data); pasangGIS(r.data.googleClientId); }
      else { $('#gis-wrap').innerHTML = ''; alertLogin((r && r.message) || 'Server tidak dapat dihubungi.', 'err'); }
    });
  }
  function brandLogin(c) {
    $('#login-brand').textContent = c.brand || 'EtalaseKu'; $('#login-brand-2').textContent = c.brand || 'EtalaseKu';
    var m = $('#login-logo'); m.innerHTML = c.logo ? '<img src="' + esc(c.logo) + '" alt="" referrerpolicy="no-referrer">' : esc((c.brand || 'E')[0]);
  }
  function alertLogin(pesan, tipe) {
    var a = $('#login-alert');
    if (!pesan) { a.hidden = true; return; }
    a.className = 'login-alert' + (tipe === 'info' ? ' info' : '');
    a.innerHTML = ic(tipe === 'info' ? 'i-info' : 'i-alert') + '<span>' + esc(pesan) + '</span>';
    a.hidden = false;
  }
  function tampilDarurat() {
    if ($('#form-darurat')) return;
    // Form dibuat hanya saat alamat #darurat dibuka — tidak ada di HTML halaman login biasa
    var slot = $('#slot-x'), f = document.createElement('form');
    f.id = 'form-darurat'; f.className = 'darurat'; f.autocomplete = 'off';
    f.innerHTML = '<div class="sep"><span>Akses cadangan</span></div><div class="field"><label class="label" for="dr-u">Nama pengguna</label><input class="input" id="dr-u" autocomplete="off" spellcheck="false" required></div>' +
      '<div class="field"><label class="label" for="dr-p">Kata sandi</label><input class="input" id="dr-p" type="password" autocomplete="off" required></div><button class="btn btn-primary btn-block" type="submit" id="dr-btn" style="margin-top:16px">Masuk ' + ic('i-login') + '</button>';
    slot.appendChild(f);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var b = $('#dr-btn'); b.disabled = true; b.innerHTML = '<span class="spin"></span> Memeriksa…';
      API.call('auth.darurat', { username: $('#dr-u').value.trim(), password: $('#dr-p').value }).then(function (r) {
        b.disabled = false; b.innerHTML = 'Masuk ' + ic('i-login');
        $('#dr-p').value = '';
        if (r && r.success) { history.replaceState(null, '', location.pathname); simpanMasuk(r.data); }
        else alertLogin((r && r.message) || 'Gagal masuk.', 'err');
      });
    });
    setTimeout(function () { $('#dr-u').focus(); }, 50);
  }
  var _gis = false;
  function pasangGIS(cid) {
    var w = $('#gis-wrap');
    if (!cid) { w.innerHTML = '<div class="note warn" style="text-align:left">' + ic('i-info') + ' Login Google belum dikonfigurasi. Hubungi pemilik aplikasi.</div>'; return; }
    var render = function () {
      try {
        google.accounts.id.initialize({ client_id: cid, callback: onKredensial, ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true, itp_support: true });
        w.innerHTML = '';
        google.accounts.id.renderButton(w, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', logo_alignment: 'left', locale: 'id', width: Math.min(320, w.clientWidth || 320) });
      } catch (e) { w.innerHTML = ''; alertLogin('Tombol Google gagal dimuat. Muat ulang halaman.', 'err'); }
    };
    if (window.google && google.accounts && google.accounts.id) return render();
    if (_gis) return;
    _gis = true;
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
    s.onload = render;
    s.onerror = function () { w.innerHTML = ''; alertLogin('Layanan Google Sign-In tidak dapat dimuat. Periksa koneksi / pemblokir iklan.', 'err'); };
    document.head.appendChild(s);
  }
  function onKredensial(resp) {
    alertLogin('Memverifikasi akun Google…', 'info');
    var appUrl = location.href.split('#')[0].replace(/admin\.html.*$/, '');
    API.call('auth.google', { credential: resp.credential, appUrl: appUrl }).then(function (r) {
      if (r && r.success) simpanMasuk(r.data); else alertLogin((r && r.message) || 'Gagal masuk.', 'err');
    });
  }
  function simpanMasuk(d) {
    var s = { token: d.token, me: d.me, exp: decodeExp(d.token) || Date.now() + 4 * 3600e3 };
    Store.set('sesi', s);
    alertLogin('');
    masukApp(s, false);
  }

  A.keluar = function (pesan, otomatis) {
    if (!otomatis && API.token()) API.call('auth.logout', {});
    Store.del('sesi'); Store.bersih('a:');
    API.setToken(''); A.me = null;
    try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) {}
    history.replaceState(null, '', location.pathname);
    tampilLogin(pesan, otomatis ? 'err' : 'info');
  };

  function masukApp(s, dariCache) {
    A.me = s.me; A.ukey = U.hash(s.me.email);
    API.setToken(s.token);
    document.documentElement.classList.add('ada-sesi');
    $('#login-view').hidden = true; $('#app-view').hidden = false;
    renderSidebar();
    tampilHalaman(ruteHash());
    // Prefetch: semua jatuh di tik yang sama → 1 eksekusi batch
    API.q('auth.me', {}).then(function (r) {
      if (r && r.success) {
        var m = r.data.me;
        if (m.role !== A.me.role || m.nama !== A.me.nama) { A.me = m; s.me = m; Store.set('sesi', s); renderSidebar(); if (A.aktif) tampilHalaman(A.aktif); }
        Store.set('authcfg', { brand: r.data.brand, logo: r.data.logo, googleClientId: (Store.val('authcfg') || {}).googleClientId });
        renderBrand(r.data);
      }
    });
    A.ambil('dash', { diam: true }); A.ambil('leads', { diam: true }); A.ambil('sistem', { diam: true }); A.ambil('konten', { diam: true });
    var idle = window.requestIdleCallback || function (f) { setTimeout(f, 1200); };
    idle(function () {
      A.ambil('crm', { diam: true }); A.ambil('blast', { diam: true }); A.ambil('antrean', { diam: true });
      if (A.isSA()) { A.ambil('pengaturan', { diam: true }); A.ambil('pengguna', { diam: true }); A.ambil('notif', { diam: true }); A.ambil('keamanan', { diam: true }); }
    });
    if (!A._poll) A._poll = setInterval(polling, 15000);
    if (!dariCache) U.toast('Selamat datang, ' + (A.me.nama || A.me.email) + '!');
  }
  function polling() {
    if (!A.me || !A.aktif) return;
    var h = A.halaman[A.aktif];
    if (h && h.muat && EK.Activity.due('hal:' + A.aktif, 60000, 300000)) h.muat(false);
    if (EK.Activity.due('sistem', 300000, 900000)) A.ambil('sistem', { diam: true });
  }

  // ================================================================ SHELL
  function pasangShell() {
    var sb = $('#sb'), scrim = $('#sb-scrim');
    var buka = function (on) { sb.classList.toggle('buka', on); scrim.hidden = !on; };
    $('#burger').addEventListener('click', function () { buka(true); });
    $('#sb-close').addEventListener('click', function () { buka(false); });
    scrim.addEventListener('click', function () { buka(false); });
    $('#sb-nav').addEventListener('click', function (e) { if (e.target.closest('a')) buka(false); });
    $('#btn-keluar').addEventListener('click', function () {
      A.konfirmasi({ judul: 'Keluar dari dashboard?', pesan: 'Data tersimpan di perangkat ini akan dibersihkan.', ok: 'Keluar' }).then(function (y) { if (y) A.keluar('Anda telah keluar.'); });
    });
    $('#btn-segar').addEventListener('click', function () {
      var h = A.halaman[A.aktif];
      if (h && h.muat) h.muat(true);
      A.ambil('sistem', { fresh: true, diam: true });
      EK.Activity.tandai('hal:' + A.aktif);
    });
    $('#drawer-scrim').addEventListener('click', function () { A.drawer.tutup(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#drawer').hidden) A.drawer.tutup(); });
    A.on('sistem', renderSys);
    A.on('leads', hitungBaru);
  }
  function renderBrand(d) {
    $('#sb-brand').textContent = d.brand || 'EtalaseKu';
    $('#sb-logo').innerHTML = d.logo ? '<img src="' + esc(d.logo) + '" alt="" referrerpolicy="no-referrer">' : esc((d.brand || 'E')[0]);
  }
  function renderSidebar() {
    var cfg = Store.val('authcfg') || {}; renderBrand(cfg);
    $('#sb-nav').innerHTML = MENU.filter(function (g) { return !g.sa || A.isSA(); }).map(function (g) {
      return '<div class="sb-grp">' + esc(g.grup) + (g.sa ? ic('i-lock') : '') + '</div>' + g.item.map(function (it) {
        return '<a class="sb-item" href="#/' + it[0] + '" data-id="' + it[0] + '">' + ic(it[2]) + '<span>' + esc(it[1]) + '</span>' + (it[0] === 'leads' ? '<span class="sb-count" id="cnt-leads" hidden></span>' : '') + '</a>';
      }).join('');
    }).join('');
    $('#sb-nama').textContent = A.me.nama || A.me.email;
    $('#sb-role').textContent = A.me.darurat ? 'darurat' : A.me.role;
    $('#sb-av').textContent = U.inisial(A.me.nama || A.me.email);
    hitungBaru(A.lokal('leads')); renderSys(A.lokal('sistem'));
  }
  function hitungBaru(d) {
    var el = $('#cnt-leads'); if (!el) return;
    var n = d && d.rows ? d.rows.filter(function (l) { return l.status_followup === 'Baru'; }).length : 0;
    el.textContent = n > 99 ? '99+' : n; el.hidden = !n;
  }
  function renderSys(s) {
    var el = $('#sb-sys'); if (!el) return;
    if (!s) { el.innerHTML = '<span><i class="led"></i>Server GAS</span><b>…</b>'; return; }
    el.innerHTML = '<span><i class="led' + (s.sheets && s.sheets.ok ? '' : ' off') + '"></i>Sheets ' + (s.sheets && s.sheets.ok ? 'terhubung' : 'bermasalah') + '</span><b title="Sisa kuota email hari ini">✉ ' + (s.emailKuota == null ? '-' : s.emailKuota) + '</b>';
  }

  // ================================================================ ROUTER
  function ruteHash() { var m = location.hash.match(/^#\/([\w-]+)/); return m ? m[1] : 'dashboard'; }
  A.daftar = function (id, def) { A.halaman[id] = def; };
  A.ke = function (id, q) { location.hash = '#/' + id + (q ? '?' + q : ''); };
  A.query = function () { var i = location.hash.indexOf('?'); return new URLSearchParams(i > -1 ? location.hash.slice(i + 1) : ''); };
  function tampilHalaman(id) {
    var info = infoMenu(id) || infoMenu('dashboard');
    if (info.sa && !A.isSA()) { info = infoMenu('dashboard'); history.replaceState(null, '', '#/dashboard'); }
    id = info.id;
    var h = A.halaman[id];
    A.subs = {}; A.on('sistem', renderSys); A.on('leads', hitungBaru);
    A.aktif = id;
    A.drawer.tutup(true);
    $$('#sb-nav .sb-item').forEach(function (a) { a.toggleAttribute('aria-current', a.dataset.id === id); if (a.dataset.id === id) a.setAttribute('aria-current', 'page'); });
    $('#crumb').innerHTML = esc((Store.val('authcfg') || {}).brand || 'Admin') + ' / <b>' + esc(info.grup) + '</b>';
    $('#judul').textContent = info.judul;
    document.title = info.judul + ' — Dashboard';
    $('#top-act').innerHTML = '';
    var page = $('#page');
    page.classList.remove('masuk'); void page.offsetWidth; page.classList.add('masuk');
    page.innerHTML = '';
    if (!h) { page.innerHTML = '<div class="card kosong"><b>Halaman belum tersedia</b></div>'; return; }
    try { h.mount(page, $('#top-act')); } catch (e) { console.error(e); page.innerHTML = '<div class="card kosong"><b>Terjadi kesalahan tampilan</b>' + esc(e.message) + '</div>'; }
    if (h.muat) h.muat(false);
    EK.Activity.tandai('hal:' + id);
    window.scrollTo(0, 0);
  }

  // ================================================================ PERANGKAT UI
  A.drawer = {
    buka: function (o) {
      var d = $('#drawer'), inn = $('#drawer-in');
      inn.innerHTML = '<div class="dr-h">' + (o.ikon || '') + '<div style="min-width:0"><h3>' + esc(o.judul || '') + '</h3>' + (o.sub ? '<p>' + o.sub + '</p>' : '') + '</div><button class="dlg-x" type="button" data-tutup aria-label="Tutup">' + ic('i-x') + '</button></div>' +
        '<div class="dr-b">' + (o.isi || '') + '</div>' + (o.kaki ? '<div class="dr-f">' + o.kaki + '</div>' : '');
      d.hidden = false; $('#drawer-scrim').hidden = false;
      requestAnimationFrame(function () { d.classList.add('buka'); });
      $('[data-tutup]', inn).addEventListener('click', function () { A.drawer.tutup(); });
      A.drawer.onTutup = o.onTutup || null;
      if (o.onMount) o.onMount(inn);
      setTimeout(function () { var f = $('input:not([type=hidden]):not([disabled]),textarea,select', $('.dr-b', inn)); if (f && o.fokus !== false) f.focus({ preventScroll: true }); }, 280);
      return inn;
    },
    tutup: function (cepat) {
      var d = $('#drawer'); if (d.hidden) return;
      d.classList.remove('buka'); $('#drawer-scrim').hidden = true;
      var cb = A.drawer.onTutup; A.drawer.onTutup = null;
      setTimeout(function () { if (!d.classList.contains('buka')) { d.hidden = true; $('#drawer-in').innerHTML = ''; } }, cepat ? 0 : 280);
      if (cb) cb();
    }
  };
  A.modal = function (html, onMount) {
    var m = $('#modal'), inn = $('#modal-in');
    inn.innerHTML = '<button class="dlg-x" type="button" data-mtutup aria-label="Tutup">' + ic('i-x') + '</button>' + html;
    inn.querySelectorAll('[data-mtutup]').forEach(function (b) { b.addEventListener('click', function () { m.close(); }); });
    if (!m.open) m.showModal();
    if (onMount) onMount(inn, function () { m.close(); });
    return inn;
  };
  A.konfirmasi = function (o) {
    return new Promise(function (res) {
      var selesai = false;
      var m = $('#modal');
      A.modal('<div style="display:grid;gap:14px;padding-right:30px"><h3 style="font-size:1.35rem;font-weight:800">' + esc(o.judul || 'Yakin?') + '</h3><p class="muted">' + (o.html || esc(o.pesan || '')) + '</p>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:6px"><button class="btn btn-ghost" data-mtutup type="button">Batal</button><button class="btn ' + (o.bahaya ? 'btn-danger' : 'btn-primary') + '" type="button" id="kf-ok">' + esc(o.ok || 'Ya, lanjutkan') + '</button></div></div>',
        function (inn, tutup) {
          $('#kf-ok', inn).addEventListener('click', function () { selesai = true; tutup(); res(true); });
          setTimeout(function () { $('#kf-ok', inn).focus(); }, 30);
        });
      m.addEventListener('close', function h() { m.removeEventListener('close', h); if (!selesai) res(false); });
    });
  };

  A.pilStatus = function (s) {
    var k = { Baru: 'pill-info', Dihubungi: 'pill-warn', Closing: 'pill-ok', Batal: 'pill-err' }[s] || 'pill-mute';
    return '<span class="pill ' + k + '"><span class="dot"></span>' + esc(s || 'Baru') + '</span>';
  };
  A.ntf = function (l) {
    var satu = function (lbl, s) {
      s = String(s || '');
      var c = /^terkirim/.test(s) ? 'ok' : /^gagal/.test(s) ? 'gagal' : /^antri/.test(s) ? 'antri' : 'mati';
      return '<span class="' + c + '" title="' + esc(lbl + ': ' + (s || '-')) + '">' + lbl + '</span>';
    };
    return '<span class="ntf">' + satu('WA', l.status_notif_wa) + satu('✉', l.status_notif_email) + '</span>';
  };
  A.waktu = function (s) { return s ? '<span style="white-space:nowrap">' + esc(U.tgl(s, { day: 'numeric', month: 'short', year: undefined })) + '</span><small style="display:block">' + esc(U.jam(s)) + '</small>' : '-'; };
  A.delta = function (v, sufiks) {
    if (v === null || v === undefined || v === '') return '';
    var n = Number(v) || 0, c = n > 0 ? '' : n < 0 ? 'turun' : 'datar';
    return '<span class="delta ' + c + '">' + (n > 0 ? '↑ ' : n < 0 ? '↓ ' : '') + Math.abs(n).toLocaleString('id-ID') + (sufiks === undefined ? '%' : sufiks) + '</span>';
  };
  A.kosong = function (judul, teks, tombol) { return '<div class="kosong"><b>' + esc(judul) + '</b>' + esc(teks || '') + (tombol || '') + '</div>'; };
  A.skel = function (n, h) { var s = ''; for (var i = 0; i < (n || 3); i++) s += '<div class="skel" style="height:' + (h || 46) + 'px;margin-bottom:8px"></div>'; return s; };

  /** Paginasi: kembalikan HTML; tombol membawa data-hal */
  A.pager = function (total, hal, per) {
    var n = Math.max(1, Math.ceil(total / per)); hal = Math.min(Math.max(1, hal), n);
    var dari = total ? (hal - 1) * per + 1 : 0, sampai = Math.min(total, hal * per);
    var btn = function (h, lbl, cur) { return '<button class="btn btn-ghost btn-xs" type="button" data-hal="' + h + '"' + (cur ? ' aria-current="true"' : '') + (h < 1 || h > n ? ' disabled' : '') + '>' + lbl + '</button>'; };
    var nums = [], set = {};
    [1, hal - 1, hal, hal + 1, n].forEach(function (h) { if (h >= 1 && h <= n && !set[h]) { set[h] = 1; nums.push(h); } });
    nums.sort(function (a, b) { return a - b; });
    var html = btn(hal - 1, '←'), prev = 0;
    nums.forEach(function (h) { if (prev && h - prev > 1) html += '<span>…</span>'; html += btn(h, h, h === hal); prev = h; });
    html += btn(hal + 1, '→');
    return '<div class="pager"><span>Menampilkan <b>' + dari + '–' + sampai + '</b> dari <b>' + U.angka(total) + '</b></span><div class="btns">' + html + '</div></div>';
  };

  A.salin = function (teks) {
    (navigator.clipboard ? navigator.clipboard.writeText(teks) : Promise.reject()).then(function () { U.toast('Disalin ke papan klip.'); }, function () {
      var t = document.createElement('textarea'); t.value = teks; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); U.toast('Disalin.'); } catch (e) {} t.remove();
    });
  };

  // ================================================================ GRAFIK (SVG, tanpa pustaka)
  var tip = function () { return $('#tip'); };
  A.tipTampil = function (html, x, y) { var t = tip(); t.innerHTML = html; t.hidden = false; var w = t.offsetWidth, h = t.offsetHeight; t.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2)) + 'px'; t.style.top = Math.max(8, y - h - 12) + 'px'; };
  A.tipSembunyi = function () { tip().hidden = true; };

  /** Grafik garis satu seri dengan crosshair + tooltip. o: {label[], nilai[], warna:'burnt'|'leaf', satuan, tinggi} */
  A.grafikGaris = function (el, o) {
    var W = 680, H = o.tinggi || 230, pl = 36, pr = 12, pt = 14, pb = 28, n = o.nilai.length;
    if (!n) { el.innerHTML = A.kosong('Belum ada data'); return; }
    var mentah = Math.max.apply(null, o.nilai.concat([1])), langkah = [0, 0.25, 0.5, 0.75, 1];
    var kasar = mentah / 4, p10 = Math.pow(10, Math.floor(Math.log10(kasar))), stepT = [1, 2, 2.5, 5, 10].map(function (m) { return m * p10; }).filter(function (x) { return x >= kasar; })[0];
    stepT = Math.max(1, Math.ceil(stepT));
    var maks = stepT * 4;
    var x = function (i) { return pl + (n === 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (n - 1)); };
    var y = function (v) { return pt + (H - pt - pb) * (1 - v / maks); };
    var pts = o.nilai.map(function (v, i) { return [x(i), y(v)]; });
    var garis = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = garis + ' L' + x(n - 1).toFixed(1) + ' ' + y(0) + ' L' + x(0).toFixed(1) + ' ' + y(0) + ' Z';
    var w = o.warna === 'leaf' ? 'leaf' : '';
    var grid = langkah.map(function (s) { var yy = y(maks * s); return '<line class="grid-l" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy + '" y2="' + yy + '"/><text class="ax" x="' + (pl - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + Math.round(maks * s).toLocaleString('id-ID') + '</text>'; }).join('');
    var tiap = Math.max(1, Math.ceil(n / 7));
    var labelX = o.label.map(function (l, i) { return i % tiap === 0 || i === n - 1 ? '<text class="ax" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="' + (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') + '">' + esc(o.labelPendek ? o.labelPendek(l) : l) + '</text>' : ''; }).join('');
    var iMaks = o.nilai.indexOf(Math.max.apply(null, o.nilai));
    el.innerHTML = '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Grafik') + '">' +
      '<defs><linearGradient id="gradBurnt" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#B45309" stop-opacity=".26"/><stop offset="1" stop-color="#B45309" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="gradLeaf" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2F6B3A" stop-opacity=".24"/><stop offset="1" stop-color="#2F6B3A" stop-opacity="0"/></linearGradient></defs>' +
      grid + labelX + '<path class="area ' + w + '" d="' + area + '"/><path class="garis ' + w + '" d="' + garis + '"/>' +
      (o.nilai[iMaks] > 0 ? '<circle class="titik ' + w + '" cx="' + pts[iMaks][0] + '" cy="' + pts[iMaks][1] + '" r="5"/>' : '') +
      '<line class="guide" x1="0" x2="0" y1="' + pt + '" y2="' + y(0) + '" visibility="hidden"/><circle class="titik ' + w + ' hover" r="5" visibility="hidden"/>' +
      '<rect class="hit" x="' + pl + '" y="0" width="' + (W - pl - pr) + '" height="' + H + '"/></svg></div>';
    var svg = $('svg', el), guide = $('.guide', el), dot = $('.hover', el), hit = $('.hit', el);
    var gerak = function (ev) {
      var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * W;
      var i = Math.max(0, Math.min(n - 1, Math.round((px - pl) / ((W - pl - pr) / Math.max(1, n - 1)))));
      guide.setAttribute('x1', pts[i][0]); guide.setAttribute('x2', pts[i][0]); guide.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', pts[i][0]); dot.setAttribute('cy', pts[i][1]); dot.setAttribute('visibility', 'visible');
      A.tipTampil('<b>' + U.angka(o.nilai[i]) + ' ' + esc(o.satuan || '') + '</b>' + esc(o.labelTip ? o.labelTip(o.label[i]) : o.label[i]), r.left + pts[i][0] / W * r.width, r.top + pts[i][1] / H * r.height);
    };
    var keluar = function () { guide.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); A.tipSembunyi(); };
    hit.addEventListener('pointermove', gerak); hit.addEventListener('pointerdown', gerak); hit.addEventListener('pointerleave', keluar);
  };
  /** Batang horizontal. items: [{label, nilai, kanan, kiriBawah, kananBawah}] */
  A.grafikBatang = function (el, items, o) {
    o = o || {};
    if (!items.length) { el.innerHTML = A.kosong(o.kosong || 'Belum ada data'); return; }
    var maks = Math.max.apply(null, items.map(function (i) { return i.nilai; }).concat([1]));
    el.innerHTML = '<div class="bars">' + items.map(function (it, i) {
      return '<div class="bar-row" data-i="' + i + '"><div class="bh"><b>' + esc(it.label) + '</b><span>' + (it.kanan || U.angka(it.nilai)) + '</span></div>' +
        '<div class="bar-track"><div class="bar-fill ' + (o.warna || '') + '" style="width:' + Math.max(1.5, it.nilai / maks * 100) + '%"></div></div>' +
        (it.kiriBawah || it.kananBawah ? '<div class="bs"><span>' + (it.kiriBawah || '') + '</span><span>' + (it.kananBawah || '') + '</span></div>' : '') + '</div>';
    }).join('') + '</div>';
    $$('.bar-row', el).forEach(function (r) {
      r.addEventListener('pointermove', function (ev) { var it = items[+r.dataset.i]; A.tipTampil('<b>' + esc(it.kanan || U.angka(it.nilai)) + '</b>' + esc(it.label) + (it.tip ? '<br>' + esc(it.tip) : ''), ev.clientX, ev.clientY); });
      r.addEventListener('pointerleave', A.tipSembunyi);
    });
  };

  // ================================================================ EKSPOR CSV / XLSX
  A.unduh = function (nama, isi, mime) {
    var blob = isi instanceof Blob ? isi : new Blob([isi], { type: mime || 'text/plain;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  A.csv = function (rows, kolom) {
    var sel = function (v) { v = v == null ? '' : String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return /[",;\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return '﻿' + [kolom.map(function (k) { return sel(k[1]); }).join(',')].concat(rows.map(function (r) { return kolom.map(function (k) { return sel(typeof k[0] === 'function' ? k[0](r) : r[k[0]]); }).join(','); })).join('\r\n');
  };
  var _xlsx = null;
  A.xlsx = function (rows, kolom, namaFile, namaSheet) {
    var siap = _xlsx || (_xlsx = new Promise(function (res, rej) {
      if (window.XLSX) return res(window.XLSX);
      var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = function () { window.XLSX ? res(window.XLSX) : rej(new Error('XLSX tidak tersedia')); }; s.onerror = function () { _xlsx = null; rej(new Error('Pustaka XLSX gagal dimuat')); };
      document.head.appendChild(s);
    }));
    return siap.then(function (X) {
      var data = [kolom.map(function (k) { return k[1]; })].concat(rows.map(function (r) { return kolom.map(function (k) { var v = typeof k[0] === 'function' ? k[0](r) : r[k[0]]; return v == null ? '' : v; }); }));
      var ws = X.utils.aoa_to_sheet(data), wb = X.utils.book_new();
      ws['!cols'] = kolom.map(function (k) { return { wch: Math.min(48, Math.max(10, String(k[1]).length + 4)) }; });
      X.utils.book_append_sheet(wb, ws, (namaSheet || 'Data').slice(0, 30));
      X.writeFile(wb, namaFile);
    });
  };

  // ================================================================ UNGGAH GAMBAR (kompres di klien)
  A.kompres = function (file, opsi) {
    opsi = opsi || {};
    return new Promise(function (res, rej) {
      if (['image/jpeg', 'image/png', 'image/webp'].indexOf(file.type) === -1) return rej(new Error('Format harus JPG, PNG, atau WebP.'));
      var baca = new FileReader();
      baca.onerror = function () { rej(new Error('Berkas tidak bisa dibaca.')); };
      baca.onload = function () {
        var asli = baca.result;
        if (opsi.asli && file.size <= 2 * 1024 * 1024) return res({ mime: file.type, data: asli, ukuran: file.size, url: asli });
        var img = new Image();
        img.onerror = function () { rej(new Error('Gambar rusak atau tidak didukung.')); };
        img.onload = function () {
          var maks = opsi.maks || 1600, s = Math.min(1, maks / Math.max(img.width, img.height));
          var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          var x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
          var webp = c.toDataURL('image/webp', .86).indexOf('data:image/webp') === 0;
          var mime = webp ? 'image/webp' : 'image/jpeg', q = .86, out = c.toDataURL(mime, q);
          while (out.length * .75 > 1.9 * 1024 * 1024 && q > .4) { q -= .12; out = c.toDataURL(mime, q); }
          if (out.length * .75 > 2 * 1024 * 1024) return rej(new Error('Gambar masih di atas 2 MB setelah dikompres.'));
          res({ mime: mime, data: out, ukuran: Math.round(out.length * .75), url: out });
        };
        img.src = asli;
      };
      baca.readAsDataURL(file);
    });
  };
  A.unggah = function (file, jenis, opsi) {
    return A.kompres(file, opsi).then(function (k) {
      return API.call('upload.gambar', { jenis: jenis, mime: k.mime, data: k.data }, { timeout: 90000 }).then(function (r) {
        if (!r.success) throw new Error(r.message || 'Unggah gagal.');
        if (r.data.peringatan) U.toast(r.data.peringatan, 'info', 7000);
        return { url: r.data.url, preview: k.url, ukuran: k.ukuran };
      });
    });
  };
  /** Komponen input gambar (pratinjau + unggah + URL manual) */
  A.inputGambar = function (nama, nilai, jenis) {
    return '<div class="upl" data-upl="' + esc(nama) + '" data-jenis="' + esc(jenis || 'gambar') + '"><div class="upl-prev">' + (nilai ? '<img src="' + esc(nilai) + '" alt="" referrerpolicy="no-referrer">' : ic('i-img')) + '</div>' +
      '<div class="upl-act"><div class="row"><label class="btn btn-cream btn-sm" style="cursor:pointer">' + ic('i-upload') + '<span>Unggah</span><input type="file" accept="image/jpeg,image/png,image/webp" hidden></label>' +
      (nilai ? '<button class="btn btn-ghost btn-sm" type="button" data-hapus-img>Hapus</button>' : '') + '</div>' +
      '<input class="input input-sm" name="' + esc(nama) + '" value="' + esc(nilai || '') + '" placeholder="atau tempel URL gambar https://…"><span class="hint">JPG/PNG/WebP, maks 2 MB (dikompres otomatis)</span></div></div>';
  };
  A.pasangGambar = function (root) {
    $$('[data-upl]', root).forEach(function (box) {
      var inp = $('input[name]', box), prev = $('.upl-prev', box), file = $('input[type=file]', box);
      var setPrev = function (u) { prev.innerHTML = u ? '<img src="' + esc(u) + '" alt="" referrerpolicy="no-referrer">' : ic('i-img'); };
      inp.addEventListener('change', function () { setPrev(inp.value.trim()); });
      var hps = $('[data-hapus-img]', box); if (hps) hps.addEventListener('click', function () { inp.value = ''; setPrev(''); });
      file.addEventListener('change', function () {
        var f = file.files[0]; if (!f) return;
        prev.innerHTML = '<span class="spin"></span>';
        A.unggah(f, box.dataset.jenis, { asli: box.dataset.jenis === 'logo' }).then(function (r) {
          inp.value = r.url; prev.innerHTML = '<img src="' + esc(r.preview) + '" alt="">';
          U.toast('Gambar terunggah (' + Math.round(r.ukuran / 1024) + ' KB).');
        }).catch(function (e) { setPrev(inp.value); U.toast(e.message, 'err'); });
        file.value = '';
      });
    });
  };
  /** Ambil nilai form → objek */
  A.nilaiForm = function (form) {
    var o = {};
    $$('[name]', form).forEach(function (el) {
      if (el.type === 'file') return;
      if (el.type === 'checkbox') o[el.name] = el.checked; else o[el.name] = el.value;
    });
    return o;
  };

  return A;
})();
