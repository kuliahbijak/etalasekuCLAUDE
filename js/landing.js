/**
 * landing.js — etalase publik (SPA satu halaman)
 * Alur: render instan dari cache lokal → revalidasi ke GAS (GET ?action=konten)
 * → render ulang hanya bila isi berubah. Kunjungan dicatat sekali per sesi.
 */
(function () {
  'use strict';
  var U = EK.Util, API = EK.API, Store = EK.Store, esc = U.esc;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ic = function (id, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; };
  var S = { data: null, produk: {}, slide: 0, n: 0, timer: null, jeda: false, co: null, kirim: false, sumber: null };
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', mulai);

  function mulai() {
    if (!EK.SIAP) {
      var w = document.createElement('div'); w.className = 'cfg-warn';
      w.innerHTML = '<b>Konfigurasi belum lengkap.</b> Isi <code>GAS_URL</code> di <code>js/config.js</code> dengan URL Web App Apps Script (…/exec).';
      document.body.appendChild(w);
    }
    pasangNavigasi(); pasangCheckout(); pasangSlider(); pasangDetail(); pasangHasil(); pasangTesti();
    var cache = Store.val('konten');
    if (cache) render(cache);
    var sesiBaru = true;
    try { sesiBaru = !sessionStorage.getItem('ek_vis'); } catch (e) {}
    if (sesiBaru || !cache || Store.age('konten') > 60000) muat(sesiBaru);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && Store.age('konten') > 300000) muat(false);
    });
  }

  function sumberKunjungan() {
    if (S.sumber) return S.sumber;
    var q = new URLSearchParams(location.search), s = q.get('utm_source') || q.get('src') || q.get('ref');
    if (!s && document.referrer) {
      try {
        var h = new URL(document.referrer).hostname.replace(/^www\.|^m\.|^l\./, '');
        if (h !== location.hostname) {
          s = /instagram/.test(h) ? 'instagram' : /facebook|fb\./.test(h) ? 'facebook' : /google/.test(h) ? 'google' : /tiktok/.test(h) ? 'tiktok' :
            /youtube|youtu\.be/.test(h) ? 'youtube' : /t\.co|twitter|x\.com/.test(h) ? 'twitter' : /wa\.me|whatsapp/.test(h) ? 'whatsapp' : h.split('.').slice(-2, -1)[0];
        }
      } catch (e) {}
    }
    return (S.sumber = String(s || 'langsung').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40) || 'langsung');
  }
  function hashKonten(d) { var c = Object.assign({}, d); delete c.dibangun; return U.hash(c); }

  function muat(sesiBaru) {
    var p = { action: 'konten' };
    if (sesiBaru) { p.v = '1'; p.src = sumberKunjungan(); }
    API.get(p).then(function (r) {
      if (r && r.success) {
        if (sesiBaru) { try { sessionStorage.setItem('ek_vis', '1'); } catch (e) {} }
        var lama = Store.val('konten');
        Store.set('konten', r.data);
        if (!lama || hashKonten(lama) !== hashKonten(r.data)) render(r.data);
      } else if (!Store.val('konten')) tampilGalat(r && r.message);
    });
  }

  // =================================================================== RENDER
  function render(d) {
    S.data = d; S.produk = {};
    (d.produk || []).forEach(function (p) { S.produk[String(p.id)] = p; });
    var set = d.pengaturan || {};
    renderBrand(set); renderHero(d.hero || [], set); renderProduk(d.produk || []); renderHasil(d.hasil || []);
    renderKelas(d.kelas); renderVideo(d.kelas); renderTesti(d.testimoni || []);
    amati();
    if (EK.Musik) EK.Musik.siapkan(set);
    if (EK.Lebah) EK.Lebah.atur(set.LEBAH_AKTIF !== 'TIDAK');
    if (/^#beli:/.test(location.hash)) { var id = decodeURIComponent(location.hash.slice(6)); if (S.produk[id]) bukaCheckout(id); }
  }

  function brandHTML(n) {
    n = String(n || '');
    var i = n.lastIndexOf(' ');
    if (i > 0) return esc(n.slice(0, i)) + ' <em>' + esc(n.slice(i + 1)) + '</em>';
    var m = n.match(/^(.+?)([A-Z][a-z0-9]+)$/);
    return m && m[1].length > 1 ? esc(m[1]) + '<em>' + esc(m[2]) + '</em>' : esc(n);
  }
  function waAdmin(pesan) { return U.waLink((S.data && S.data.pengaturan.WA_ADMIN) || '', pesan); }

  function renderBrand(set) {
    var brand = set.NAMA_BRAND || 'EtalaseKu';
    $('#brand-name').innerHTML = brandHTML(brand);
    $('#brand-name-2').innerHTML = brandHTML(brand);
    $('#brand-tag').textContent = set.TAGLINE || '';
    ['#logo-mark', '#logo-mark-2'].forEach(function (s) {
      if (set.LOGO_URL) $(s).innerHTML = '<img src="' + esc(set.LOGO_URL) + '" alt="" referrerpolicy="no-referrer">';
    });
    $$('[data-set]').forEach(function (el) { var v = set[el.getAttribute('data-set')]; if (v) el.textContent = v; });
    if (set.SEO_JUDUL) document.title = set.SEO_JUDUL;
    var md = document.querySelector('meta[name="description"]'); if (md && set.SEO_DESKRIPSI) md.setAttribute('content', set.SEO_DESKRIPSI);
    var pr = $('#promo');
    if (set.PROMO_BAR_AKTIF === 'YA' && set.PROMO_BAR_TEKS) {
      pr.innerHTML = (set.PROMO_BAR_LABEL ? '<span class="badge nyala">' + esc(set.PROMO_BAR_LABEL) + '</span>' : '') + '<span>' + esc(set.PROMO_BAR_TEKS) + '</span><a href="#produk">Ambil promo →</a>';
      pr.hidden = false;
    } else pr.hidden = true;
    var tanya = 'Halo Admin ' + brand + ', saya ingin bertanya tentang produk digitalnya.';
    var wa = waAdmin(tanya);
    ['#nav-wa', '#wa-float', '#cta-wa', '#foot-wa', '#foot-wa2', '#foot-wa3'].forEach(function (s) { var a = $(s); if (!a) return; if (wa) { a.href = wa; a.hidden = false; } else a.hidden = true; });
    $('#foot-wa2').href = waAdmin('Halo Admin ' + brand + ', saya ingin konfirmasi pembayaran.') || '#';
    $('#foot-wa span').textContent = set.WA_ADMIN ? U.waFormat(set.WA_ADMIN) : '';
    var em = $('#foot-email');
    if (set.EMAIL_ADMIN) { em.href = 'mailto:' + set.EMAIL_ADMIN; $('span', em).textContent = set.EMAIL_ADMIN; em.hidden = false; } else em.hidden = true;
    $('#foot-alamat').hidden = !set.ALAMAT;
    $('#copy').textContent = '© ' + new Date().getFullYear() + ' ' + brand + '. Seluruh hak cipta dilindungi.';
  }

  function gambar(url, alt, eager) {
    if (!url) return '<div class="ph">' + ic('i-img') + '</div>';
    return '<img src="' + esc(url) + '" alt="' + esc(alt || '') + '" ' + (eager ? 'fetchpriority="high"' : 'loading="lazy"') + ' decoding="async" referrerpolicy="no-referrer" onerror="this.outerHTML=\'<div class=&quot;ph&quot;><svg class=&quot;ic&quot;><use href=&quot;#i-img&quot;/></svg></div>\'">';
  }
  function diskon(p) { return p.harga_coret > p.harga && p.harga > 0 ? Math.round((1 - p.harga / p.harga_coret) * 100) : 0; }

  // ---------- Hero ----------
  function renderHero(list, set) {
    if (!list.length) list = [{ judul: 'Selamat datang di ' + (set.NAMA_BRAND || 'etalase kami') + '.', subjudul: set.SEO_DESKRIPSI || '', cta_teks: 'Lihat Produk', cta_link: '#produk', gambar_url: '' }];
    var faces = ['#FDE68A', '#FDBA74', '#FBCFE8', '#BBF7D0'], namaContoh = ['A', 'R', 'S'];
    var html = list.map(function (h, i) {
      var pid = /^#beli:/.test(h.cta_link || '') ? h.cta_link.slice(6) : '', p = S.produk[pid];
      var judul = i === 0 ? '<h1>' + esc(h.judul) + '</h1>' : '<h2 class="h1">' + esc(h.judul) + '</h2>';
      return '<div class="slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' dari ' + list.length + '">' +
        '<div class="hero-copy">' +
          (set.HERO_BADGE ? '<span class="hero-kicker">' + ic('i-zap') + esc(set.HERO_BADGE) + '</span>' : '') + judul +
          (h.subjudul ? '<p class="hero-sub">' + esc(h.subjudul) + '</p>' : '') +
          '<div class="hero-cta">' +
            (h.cta_teks ? '<a class="btn btn-primary btn-lg" href="' + esc(h.cta_link || '#produk') + '"' + (/^https?:/.test(h.cta_link) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(h.cta_teks) + ic('i-arrow-r') + '</a>' : '') +
            '<a class="btn btn-cream btn-lg" href="#kurikulum">Lihat Kurikulum</a>' +
          '</div>' +
          (set.SOSIAL_BUKTI ? '<div class="hero-proof"><div class="faces">' + namaContoh.map(function (x, j) { return '<span style="background:' + faces[j] + '">' + x + '</span>'; }).join('') + '<span style="background:' + faces[3] + '">+</span></div><div class="proof-txt"><span class="stars">' + bintang(5) + '</span><br>' + esc(set.SOSIAL_BUKTI) + '</div></div>' : '') +
        '</div>' +
        '<div class="hero-visual">' +
          '<div class="hero-frame"><div class="img">' + gambar(h.gambar_url, h.judul, i === 0) + '</div></div>' +
          (p ? '<span class="badge hero-badge' + (diskon(p) ? ' nyala' : ' badge-burnt') + '">' + (diskon(p) ? 'Hemat ' + diskon(p) + '%' : 'Pilihan Utama') + '</span>' +
            '<button class="hero-chip" type="button" data-beli="' + esc(p.id) + '" style="border:0;cursor:pointer"><span><span class="t1">' + esc(p.tipe || 'Produk') + (diskon(p) ? '<span class="chip-off nyala">−' + diskon(p) + '%</span>' : '') + '</span><br><span class="t2">' + esc(p.nama) + '</span><br><span class="t3">' + U.rp(p.harga) + (p.harga_coret > p.harga ? '<s>' + U.rp(p.harga_coret) + '</s>' : '') + '</span></span></button>' : '') +
        '</div></div>';
    }).join('');
    $('#slides').innerHTML = html;
    S.n = list.length;
    $('#dots').innerHTML = list.map(function (h, i) { return '<button role="tab" aria-label="Slide ' + (i + 1) + '" data-i="' + i + '"></button>'; }).join('');
    $('#slider-ctl').hidden = S.n < 2;
    keSlide(Math.min(S.slide, S.n - 1), false);
    jalankanSlider();
  }
  function bintang(n) { var s = ''; for (var i = 1; i <= 5; i++) s += '<svg class="' + (i <= n ? '' : 'off') + '" viewBox="0 0 24 24"><use href="#i-star"/></svg>'; return s; }

  function pasangSlider() {
    $('#prev').addEventListener('click', function () { keSlide(S.slide - 1, true); });
    $('#next').addEventListener('click', function () { keSlide(S.slide + 1, true); });
    $('#dots').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) keSlide(+b.dataset.i, true); });
    var sl = $('#slider');
    sl.addEventListener('mouseenter', function () { S.jeda = true; });
    sl.addEventListener('mouseleave', function () { S.jeda = false; });
    sl.addEventListener('focusin', function () { S.jeda = true; });
    sl.addEventListener('focusout', function () { S.jeda = false; });
    var x0 = null, y0 = null;
    sl.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    sl.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) keSlide(S.slide + (dx < 0 ? 1 : -1), true);
      x0 = null;
    }, { passive: true });
    document.addEventListener('keydown', function (e) {
      if (!sl.contains(document.activeElement)) return;
      if (e.key === 'ArrowLeft') keSlide(S.slide - 1, true); else if (e.key === 'ArrowRight') keSlide(S.slide + 1, true);
    });
  }
  function keSlide(i, olehUser) {
    if (!S.n) return;
    S.slide = (i + S.n) % S.n;
    $('#slides').style.transform = 'translateX(' + (-S.slide * 100) + '%)';
    $$('#slides .slide').forEach(function (el, j) { if (j === S.slide) el.removeAttribute('inert'); else el.setAttribute('inert', ''); el.setAttribute('aria-hidden', j === S.slide ? 'false' : 'true'); });
    $$('#dots button').forEach(function (b, j) { b.setAttribute('aria-current', j === S.slide ? 'true' : 'false'); });
    if (olehUser) jalankanSlider();
  }
  function jalankanSlider() {
    clearInterval(S.timer);
    if (S.n < 2 || REDUCED) return;
    S.timer = setInterval(function () { if (!S.jeda && document.visibilityState === 'visible') keSlide(S.slide + 1, false); }, 5000);
  }

  // ---------- Produk ----------
  var WARNA_TIPE = ['badge-burnt', 'badge-leaf', '', 'badge-honey'];
  function renderProduk(list) {
    var el = $('#produk-list');
    if (!list.length) { el.innerHTML = '<div class="empty" style="grid-column:1/-1"><b>Produk segera hadir</b>Hubungi admin untuk info produk terbaru.</div>'; return; }
    var tipe = {};
    el.innerHTML = list.map(function (p) {
      if (tipe[p.tipe] === undefined) tipe[p.tipe] = Object.keys(tipe).length % WARNA_TIPE.length;
      p._warna = WARNA_TIPE[tipe[p.tipe]];
      var off = diskon(p);
      var tanya = waAdmin('Halo Admin, saya ingin bertanya tentang produk *' + p.nama + '* (' + U.rp(p.harga) + ').');
      return '<article class="pcard reveal">' +
        '<button class="pcard-img" type="button" data-detail="' + esc(p.id) + '" aria-label="Lihat detail ' + esc(p.nama) + '">' + gambar(p.gambar_url, p.nama) + (p.tipe ? '<span class="badge ' + WARNA_TIPE[tipe[p.tipe]] + '">' + esc(p.tipe) + '</span>' : '') + (off ? '<span class="off nyala">−' + off + '%</span>' : '') +
          '<span class="zoom">' + ic('i-zoom') + 'Lihat detail</span></button>' +
        '<div class="pcard-body"><h3>' + esc(p.nama) + '</h3><p class="pcard-desc">' + esc(p.deskripsi) + '</p>' +
        '<div class="pcard-foot"><div class="price"><b>' + (p.harga > 0 ? U.rp(p.harga) : 'Gratis') + '</b>' + (p.harga_coret > p.harga ? '<s>' + U.rp(p.harga_coret) + '</s>' : '') + '</div>' +
        '<div class="pcard-act"><button class="btn btn-honey btn-block" type="button" data-beli="' + esc(p.id) + '">Beli Sekarang ' + ic('i-arrow-r') + '</button>' +
        (tanya ? '<a class="ask" href="' + esc(tanya) + '" target="_blank" rel="noopener">Tanya admin lewat WhatsApp</a>' : '') + '</div></div></div></article>';
    }).join('');
  }

  // ---------- Hasil kelas ----------
  var WARNA_AV = ['#FDE68A', '#BBF7D0', '#FDBA74', '#FBCFE8', '#BFDBFE'];
  function renderHasil(list) {
    var sec = $('#hasil-kelas'); sec.hidden = !list.length;
    hentikanSlideshow();
    $('#hasil-list').innerHTML = list.map(function (h, i) {
      return '<article class="rcard reveal">' + mediaHasil(h) + '<div class="rcard-body">' +
        '<h3>' + esc(h.judul) + '</h3>' +
        '<div class="who"><span class="avatar" style="background:' + WARNA_AV[i % WARNA_AV.length] + '">' + esc(U.inisial(h.nama_member)) + '</span><div><b>' + esc(h.nama_member) + '</b><small>' + esc(U.tgl(h.tanggal)) + '</small></div></div>' +
        (h.ringkasan ? '<p>“' + esc(h.ringkasan) + '”</p>' : '') + '</div></article>';
    }).join('');
    $$('#hasil-list [data-ss]').forEach(function (el, i) { el.dataset.tunda = String(i * 900); if (SS.io) SS.io.observe(el); else mulaiSS(el); });
  }

  // ---------- Media hasil: video YouTube (klik = putar) / slideshow galeri (maks 5) ----------
  var SS = { io: null, timer: {} };
  function galeriDari(h) {
    var g = Array.isArray(h.galeri) ? h.galeri.filter(Boolean) : String(h.galeri || '').split(/\r?\n/).filter(Boolean);
    if (!g.length && h.gambar_url) g = [h.gambar_url];
    return g.slice(0, 5);
  }
  function mediaHasil(h) {
    var vid = h.video_id || U.ytId(h.video_url || '');
    if (vid) {
      return '<div class="rcard-img rvid" data-yt="' + esc(vid) + '" data-judul="' + esc(h.judul) + '" role="button" tabindex="0" aria-label="Putar video: ' + esc(h.judul) + '">' +
        '<img src="https://i.ytimg.com/vi/' + esc(vid) + '/hqdefault.jpg" alt="" loading="lazy" decoding="async">' +
        '<span class="vplay">' + ic('i-play') + '</span><span class="rtag">' + ic('i-play') + 'Video</span></div>';
    }
    var g = galeriDari(h);
    if (g.length < 2) return '<div class="rcard-img">' + gambar(g[0], h.judul) + '</div>';
    return '<div class="rcard-img rss" data-ss data-i="0" data-n="' + g.length + '" aria-roledescription="slideshow" aria-label="Galeri ' + esc(h.judul) + '">' +
      g.map(function (u, j) { return '<div class="ss-item' + (j === 0 ? ' on' : '') + '"' + (j ? ' aria-hidden="true"' : '') + '>' + gambar(u, h.judul + ' — gambar ' + (j + 1)) + '</div>'; }).join('') +
      '<button class="ss-nav prev" type="button" data-ss-geser="-1" aria-label="Gambar sebelumnya">' + ic('i-arrow-l') + '</button>' +
      '<button class="ss-nav next" type="button" data-ss-geser="1" aria-label="Gambar berikutnya">' + ic('i-arrow-r') + '</button>' +
      '<span class="rtag" data-ss-hit>1/' + g.length + '</span>' +
      '<span class="ss-dots">' + g.map(function (u, j) { return '<button type="button" data-ss-ke="' + j + '" aria-label="Gambar ' + (j + 1) + '"' + (j === 0 ? ' aria-current="true"' : '') + '></button>'; }).join('') + '</span></div>';
  }
  function keSS(el, i) {
    var n = +el.dataset.n; i = (i + n) % n; el.dataset.i = String(i);
    $$('.ss-item', el).forEach(function (x, j) { x.classList.toggle('on', j === i); if (j === i) x.removeAttribute('aria-hidden'); else x.setAttribute('aria-hidden', 'true'); });
    $$('[data-ss-ke]', el).forEach(function (b, j) { b.setAttribute('aria-current', j === i ? 'true' : 'false'); });
    var hit = $('[data-ss-hit]', el); if (hit) hit.textContent = (i + 1) + '/' + n;
  }
  function mulaiSS(el) {
    if (REDUCED || SS.timer[el.dataset.k]) return;
    var k = el.dataset.k || (el.dataset.k = 'ss' + Math.random().toString(36).slice(2, 8));
    SS.timer[k] = setTimeout(function jalan() {
      if (!el.isConnected) { delete SS.timer[k]; return; }
      if (!el.matches(':hover') && document.visibilityState === 'visible') keSS(el, +el.dataset.i + 1);
      SS.timer[k] = setTimeout(jalan, 3500);
    }, 3500 + (+el.dataset.tunda || 0));
  }
  function hentiSS(el) { var k = el.dataset.k; if (k && SS.timer[k]) { clearTimeout(SS.timer[k]); delete SS.timer[k]; } }
  function hentikanSlideshow() { Object.keys(SS.timer).forEach(function (k) { clearTimeout(SS.timer[k]); }); SS.timer = {}; if (SS.io) SS.io.disconnect(); }
  function pasangHasil() {
    if ('IntersectionObserver' in window) SS.io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) mulaiSS(x.target); else hentiSS(x.target); }); }, { threshold: .25 });
    var box = $('#hasil-list');
    box.addEventListener('click', function (e) {
      var g = e.target.closest('[data-ss-geser]'), d = e.target.closest('[data-ss-ke]'), v = e.target.closest('[data-yt]');
      if (g) { var el = g.closest('[data-ss]'); keSS(el, +el.dataset.i + (+g.dataset.ssGeser)); return; }
      if (d) { keSS(d.closest('[data-ss]'), +d.dataset.ssKe); return; }
      if (v) putarVideoHasil(v);
    });
    box.addEventListener('keydown', function (e) { var v = e.target.closest('[data-yt]'); if (v && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); putarVideoHasil(v); } });
    var x0 = null;
    box.addEventListener('touchstart', function (e) { if (e.target.closest('[data-ss]')) x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      var el = e.target.closest('[data-ss]'); if (!el || x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) keSS(el, +el.dataset.i + (dx < 0 ? 1 : -1));
    }, { passive: true });
    $('#vlight').addEventListener('close', function () { $('#vl-frame').innerHTML = ''; });
    $('#vlight').addEventListener('click', function (e) { if (e.target === e.currentTarget || e.target.closest('[data-tutup]')) e.currentTarget.close(); });
  }
  function srcYT(id) {
    var asal = /^https?:/.test(location.protocol) ? '&origin=' + encodeURIComponent(location.origin) : '';
    return 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0&modestbranding=1' + asal;
  }
  function putarVideoHasil(el) {
    var id = el.dataset.yt; if (!id) return;
    if (EK.Musik) EK.Musik.jedaUntukVideo();
    var ifr = '<iframe src="' + srcYT(id) + '" title="' + esc(el.dataset.judul || 'Video') + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
    // Pemutar YouTube minimal 200×200 px: bila kartu terlalu kecil (HP sempit), putar di jendela besar
    if (el.getBoundingClientRect().height >= 200) { el.classList.add('main'); el.removeAttribute('role'); el.removeAttribute('tabindex'); el.innerHTML = ifr; return; }
    var dlg = $('#vlight'); $('#vl-judul').textContent = el.dataset.judul || ''; $('#vl-frame').innerHTML = ifr;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }

  // ---------- Kelas & kurikulum ----------
  function renderKelas(k) {
    var sec = $('#kurikulum');
    if (!k) { sec.hidden = true; return; }
    sec.hidden = false;
    var mod = k.kurikulum || [];
    var tanya = waAdmin('Halo Admin, saya ingin bertanya tentang kelas *' + k.nama + '*.');
    $('#kelas-info').innerHTML = '<span class="kicker">Struktur Pembelajaran</span><h2 id="h-kelas">' + esc(k.nama || 'Penjelasan Kelas & Kurikulum') + '</h2>' +
      '<p class="kelas-desc">' + esc(k.deskripsi) + '</p>' +
      '<div class="stat-grid">' +
        '<div class="stat">' + ic('i-clock') + '<small>Total durasi</small><b>' + esc(k.durasi || '-') + '</b></div>' +
        '<div class="stat">' + ic('i-trend') + '<small>Tingkatan</small><b>' + esc(k.level || 'Semua level') + '</b></div>' +
        '<div class="stat">' + ic('i-gift') + '<small>Jumlah modul</small><b>' + mod.length + ' modul</b></div>' +
        '<a class="stat" href="#video-profil" style="text-decoration:none">' + ic('i-play') + '<small>Cuplikan kelas</small><b>Tonton video</b></a>' +
      '</div>' +
      (tanya ? '<div class="guarantee">' + ic('i-shield') + '<div><b>Masih ragu?</b> Konsultasikan kebutuhan Anda dulu — <a href="' + esc(tanya) + '" target="_blank" rel="noopener" style="font-weight:700;color:var(--leaf-700)">chat admin lewat WhatsApp</a>.</div></div>' : '');
    $('#kurikulum-list').innerHTML = mod.length ? mod.map(function (m, i) {
      var topik = String(m.topik || '').split(/\r?\n|;/).map(function (t) { return t.trim().replace(/^[-•*]\s*/, ''); }).filter(Boolean);
      var no = m.modul_ke || i + 1;
      return '<details class="acc-item reveal"' + (i === 0 ? ' open' : '') + '><summary><span class="acc-no">' + String(no).padStart(2, '0') + '</span><span class="acc-title"><small>Modul ' + esc(no) + '</small>' + esc(m.judul) + '</span><span class="acc-tog">' + ic('i-plus') + '</span></summary>' +
        '<div class="acc-body">' + (topik.length ? '<ul>' + topik.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '<p class="muted" style="padding-top:10px">Detail modul segera diperbarui.</p>') + '</div></details>';
    }).join('') : '<div class="empty"><b>Kurikulum segera hadir</b></div>';
    // akordeon: satu terbuka
    $$('#kurikulum-list details').forEach(function (d) {
      d.addEventListener('toggle', function () { if (d.open) $$('#kurikulum-list details').forEach(function (o) { if (o !== d) o.open = false; }); });
    });
  }

  // ---------- Video (autoplay mute saat terlihat) ----------
  var V = { id: '', obs: null, muted: true, iframe: null };
  function renderVideo(k) {
    var sec = $('#video-profil'), id = k ? U.ytId(k.video_youtube_url) : '';
    if (!id) { sec.hidden = true; return; }
    sec.hidden = false;
    if (V.id === id && V.iframe) return;
    V.id = id; V.iframe = null; V.muted = true;
    var auto = !k || k.video_autoplay !== 'TIDAK';
    var fr = $('#vframe');
    fr.innerHTML = '<div class="vposter" style="background-image:url(\'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg\')" role="button" tabindex="0" aria-label="Putar video profil"><span class="vplay">' + ic('i-play') + '</span></div>';
    var poster = $('.vposter', fr);
    var putar = function (suara) { if (suara && EK.Musik) EK.Musik.jedaUntukVideo(); pasangIframe(id, true, !suara); };
    poster.addEventListener('click', function () { putar(true); });
    poster.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); putar(true); } });
    if (V.obs) V.obs.disconnect();
    if (auto && 'IntersectionObserver' in window) {
      V.obs = new IntersectionObserver(function (en) {
        en.forEach(function (x) { if (x.isIntersecting && !V.iframe) { pasangIframe(id, true, true); V.obs.disconnect(); } });
      }, { threshold: .4 });
      V.obs.observe(fr);
    }
  }
  function pasangIframe(id, autoplay, mute) {
    var fr = $('#vframe'), asal = /^https?:/.test(location.protocol) ? '&origin=' + encodeURIComponent(location.origin) : '';
    var src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=' + (autoplay ? 1 : 0) + '&mute=' + (mute ? 1 : 0) + '&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&loop=1&playlist=' + id + asal;
    V.muted = mute;
    fr.innerHTML = '<iframe src="' + src + '" title="Video profil kelas" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
      '<div class="vbar"><span class="vlive"><i></i>' + (mute ? 'Diputar tanpa suara' : 'Sedang diputar') + '</span>' +
      '<button class="btn btn-cream btn-sm" type="button" id="vsound">' + ic(mute ? 'i-vol-x' : 'i-vol') + '<span>' + (mute ? 'Nyalakan suara' : 'Matikan suara') + '</span></button></div>';
    V.iframe = $('iframe', fr);
    $('#vsound').addEventListener('click', aturSuara);
  }
  function aturSuara() {
    var w = V.iframe && V.iframe.contentWindow; if (!w) return;
    var kirim = function (fn, args) { w.postMessage(JSON.stringify({ event: 'command', func: fn, args: args || [] }), '*'); };
    if (V.muted) { if (EK.Musik) EK.Musik.jedaUntukVideo(); kirim('unMute'); kirim('setVolume', [100]); kirim('playVideo'); } else kirim('mute');
    V.muted = !V.muted;
    var b = $('#vsound');
    b.innerHTML = ic(V.muted ? 'i-vol-x' : 'i-vol') + '<span>' + (V.muted ? 'Nyalakan suara' : 'Matikan suara') + '</span>';
    var lv = $('.vlive'); if (lv) lv.lastChild.textContent = V.muted ? 'Diputar tanpa suara' : 'Sedang diputar';
  }

  // ---------- Testimoni ----------
  // Maks 4 kartu tampil; bila testimoni > 4, kartu berganti satu per satu dengan efek flip.
  var T = { list: [], nSlot: 0, tampil: [], sisi: [], giliran: 0, berikut: 0, timer: null, jeda: false, terlihat: true, buka: -1 };
  function avatarTesti(t, i) {
    var av = t.avatar_url ? '<img src="' + esc(t.avatar_url) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : esc(U.inisial(t.nama));
    return '<span class="avatar" style="background:' + WARNA_AV[(i + 2) % WARNA_AV.length] + '">' + av + '</span>';
  }
  function kartuTesti(t, i) {
    return '<figure class="tcard" data-ti="' + i + '" role="button" tabindex="0" aria-label="Baca testimoni ' + esc(t.nama) + '"><span class="tq" aria-hidden="true">“</span>' +
      '<span class="stars" aria-label="Rating ' + t.rating + ' dari 5">' + bintang(Number(t.rating) || 5) + '</span>' +
      '<q>' + esc(t.isi) + '</q><span class="tmore">' + (String(t.isi).length > 150 ? 'Baca selengkapnya' : 'Perbesar') + ic('i-arrow-r') + '</span>' +
      '<figcaption class="who">' + avatarTesti(t, i) + '<div><b>' + esc(t.nama) + '</b><small>' + esc(t.peran) + '</small></div></figcaption></figure>';
  }
  function renderTesti(list) {
    var sec = $('#testimoni'); sec.hidden = !list.length;
    clearInterval(T.timer);
    T.list = list; T.nSlot = Math.min(list.length, 4); T.giliran = 0; T.berikut = T.nSlot % (list.length || 1);
    T.tampil = []; T.sisi = [];
    var html = '';
    for (var s = 0; s < T.nSlot; s++) {
      T.tampil.push(s); T.sisi.push(0);
      html += '<div class="tslot reveal" data-slot="' + s + '"><div class="tflip"><div class="tface f0">' + kartuTesti(list[s], s) + '</div><div class="tface f1" aria-hidden="true" inert></div></div></div>';
    }
    var g = $('#testi-list'); g.innerHTML = html;
    g.classList.toggle('g4', T.nSlot === 4);
    $('#tdots').innerHTML = T.tampil.map(function () { return '<span></span>'; }).join('');
    $('#testi-putar').hidden = list.length <= 4;
    if (list.length > 4) T.timer = setInterval(putarTesti, 4200);
  }
  function putarTesti() {
    if (T.jeda || !T.terlihat || T.buka > -1 || document.visibilityState !== 'visible' || T.list.length <= T.nSlot) return;
    var n = T.list.length, s = T.giliran % T.nSlot, idx = T.berikut, jaga = 0;
    T.giliran++;
    while (T.tampil.indexOf(idx) > -1 && jaga++ < n) idx = (idx + 1) % n;
    T.berikut = (idx + 1) % n;
    var slot = $('#testi-list [data-slot="' + s + '"]'); if (!slot) return;
    var baru = T.sisi[s] ^ 1, fBaru = $('.f' + baru, slot), fLama = $('.f' + T.sisi[s], slot);
    fBaru.innerHTML = kartuTesti(T.list[idx], idx);
    fBaru.removeAttribute('inert'); fBaru.removeAttribute('aria-hidden');
    fLama.setAttribute('inert', ''); fLama.setAttribute('aria-hidden', 'true');
    $('.tflip', slot).classList.toggle('balik', baru === 1);
    T.sisi[s] = baru; T.tampil[s] = idx;
  }
  function pasangTesti() {
    var g = $('#testi-list'), dlg = $('#tmodal');
    g.addEventListener('mouseenter', function () { T.jeda = true; });
    g.addEventListener('mouseleave', function () { T.jeda = false; $$('.tslot', g).forEach(function (x) { x.style.removeProperty('--rx'); x.style.removeProperty('--ry'); }); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { T.terlihat = en[0].isIntersecting; }, { threshold: .15 }).observe($('#testimoni'));
    // Interaktif: kartu miring mengikuti kursor + kilau cahaya
    if (matchMedia('(hover: hover) and (pointer: fine)').matches && !REDUCED) {
      g.addEventListener('pointermove', function (e) {
        var slot = e.target.closest('.tslot'); if (!slot) return;
        var r = slot.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        slot.style.setProperty('--rx', ((.5 - py) * 9).toFixed(2) + 'deg'); slot.style.setProperty('--ry', ((px - .5) * 11).toFixed(2) + 'deg');
        slot.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); slot.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      g.addEventListener('pointerout', function (e) { var slot = e.target.closest('.tslot'); if (slot && !slot.contains(e.relatedTarget)) { slot.style.removeProperty('--rx'); slot.style.removeProperty('--ry'); } });
    }
    g.addEventListener('click', function (e) { var c = e.target.closest('[data-ti]'); if (c) bukaTesti(+c.dataset.ti); });
    g.addEventListener('keydown', function (e) { var c = e.target.closest('[data-ti]'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); bukaTesti(+c.dataset.ti); } });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-tutup]')) { dlg.close(); return; }
      var nav = e.target.closest('[data-tgeser]'); if (nav) bukaTesti(T.buka + (+nav.dataset.tgeser));
    });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') bukaTesti(T.buka + 1); else if (e.key === 'ArrowLeft') bukaTesti(T.buka - 1); });
    dlg.addEventListener('close', function () { T.buka = -1; });
  }
  function bukaTesti(i) {
    var n = T.list.length; if (!n) return;
    i = (i + n) % n; T.buka = i;
    var t = T.list[i], dlg = $('#tmodal');
    $('#tm-isi').innerHTML = '<span class="stars" aria-label="Rating ' + t.rating + ' dari 5">' + bintang(Number(t.rating) || 5) + '</span>' +
      '<blockquote class="tm-q">' + esc(t.isi) + '</blockquote>' +
      '<div class="who">' + avatarTesti(t, i).replace('class="avatar"', 'class="avatar avatar-lg"') + '<div><b id="tm-nama">' + esc(t.nama) + '</b><small>' + esc(t.peran) + '</small></div></div>';
    $('#tm-pos').textContent = (i + 1) + ' / ' + n;
    $$('[data-tgeser]', dlg).forEach(function (b) { b.hidden = n < 2; });
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  }

  // ---------- Detail produk (pop-up gambar penuh + deskripsi + CTA menyala) ----------
  function pasangDetail() {
    var dlg = $('#pdetail');
    document.addEventListener('click', function (e) { var t = e.target.closest('[data-detail]'); if (t) { e.preventDefault(); bukaDetail(t.getAttribute('data-detail')); } });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-tutup]')) dlg.close(); });
    $('#pd-beli').addEventListener('click', function () { var id = dlg.dataset.id; dlg.close(); bukaCheckout(id); });
  }
  function bukaDetail(id) {
    var p = S.produk[String(id)];
    if (!p) { U.toast('Produk tidak ditemukan atau sudah tidak tersedia.', 'err'); return; }
    var dlg = $('#pdetail'), off = diskon(p);
    dlg.dataset.id = p.id;
    var box = $('#pd-img');
    box.innerHTML = p.gambar_url ? '<span class="pd-bg"></span>' + gambar(p.gambar_url, p.nama, true) : '<div class="ph">' + ic('i-img') + '</div>';
    if (p.gambar_url) $('.pd-bg', box).style.backgroundImage = 'url(' + JSON.stringify(String(p.gambar_url)) + ')';
    var tp = $('#pd-tipe'); tp.className = 'badge ' + (p._warna || ''); tp.textContent = p.tipe || ''; tp.hidden = !p.tipe;
    var po = $('#pd-off'); po.textContent = off ? '−' + off + '%' : ''; po.hidden = !off;
    $('#pd-nama').textContent = p.nama;
    $('#pd-harga').innerHTML = '<b>' + (p.harga > 0 ? U.rp(p.harga) : 'Gratis') + '</b>' + (p.harga_coret > p.harga ? '<s>' + U.rp(p.harga_coret) + '</s>' : '') +
      (off ? '<span class="hemat nyala">Hemat ' + U.rp(p.harga_coret - p.harga) + '</span>' : '');
    $('#pd-desc').textContent = p.deskripsi || 'Detail produk akan segera diperbarui. Tanyakan langsung ke admin lewat WhatsApp.';
    var tanya = waAdmin('Halo Admin, saya ingin bertanya tentang produk *' + p.nama + '* (' + U.rp(p.harga) + ').'), a = $('#pd-tanya');
    if (tanya) { a.href = tanya; a.hidden = false; } else a.hidden = true;
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    setTimeout(function () { $('#pd-beli').focus({ preventScroll: true }); }, 60);
  }

  function tampilGalat(pesan) {
    var tombol = '<button class="btn btn-primary btn-sm" type="button" id="coba-lagi" style="margin-top:14px">Coba lagi</button>';
    $('#produk-list').innerHTML = '<div class="empty" style="grid-column:1/-1"><b>Etalase belum bisa dimuat</b>' + esc(pesan || 'Periksa koneksi internet Anda.') + '<br>' + tombol + '</div>';
    $('#coba-lagi').addEventListener('click', function () { location.reload(); });
  }

  // Efek muncul saat discroll
  var IO = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
    en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); IO.unobserve(x.target); } });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  function amati() {
    $$('.reveal:not(.in)').forEach(function (el) { if (IO && !REDUCED) IO.observe(el); else el.classList.add('in'); });
    clearTimeout(S.revealT);
    S.revealT = setTimeout(function () { $$('.reveal:not(.in)').forEach(function (el) { el.classList.add('in'); }); }, 2500);   // cadangan
  }

  // =================================================================== NAVIGASI
  function pasangNavigasi() {
    var b = $('#burger'), m = $('#mnav');
    b.addEventListener('click', function () { var buka = m.hidden; m.hidden = !buka; b.setAttribute('aria-expanded', String(buka)); });
    m.addEventListener('click', function (e) { if (e.target.closest('a')) { m.hidden = true; b.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-beli], a[href^="#beli:"]');
      if (!t) return;
      e.preventDefault();
      bukaCheckout(t.getAttribute('data-beli') || decodeURIComponent(t.getAttribute('href').slice(6)));
    });
  }

  // =================================================================== CHECKOUT
  function pasangCheckout() {
    var dlg = $('#checkout'), f = $('#co-form');
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-tutup]')) tutup(); });
    dlg.addEventListener('close', function () { clearInterval(S.redir); if (/^#beli:/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); });
    ['nama', 'profesi', 'no_wa', 'email'].forEach(function (k) {
      var el = f.elements[k];
      el.addEventListener('blur', function () { if (el.value) cekField(k); });
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true' || k === 'no_wa') cekField(k); });
    });
    f.addEventListener('submit', kirim);
  }
  function tutup() { var dlg = $('#checkout'); if (dlg.open) dlg.close(); }

  function bukaCheckout(id) {
    var p = S.produk[String(id)];
    if (!p) { U.toast('Produk tidak ditemukan atau sudah tidak tersedia.', 'err'); return; }
    S.co = p;
    $('#co-nama').textContent = p.nama;
    $('#co-harga').textContent = p.harga > 0 ? U.rp(p.harga) : 'Gratis';
    $('#co-coret').textContent = p.harga_coret > p.harga ? U.rp(p.harga_coret) : '';
    $('#co-form-wrap').hidden = false; $('#co-ok').hidden = true; $('#co-err').hidden = true;
    kunci(false);
    var dlg = $('#checkout');
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    setTimeout(function () { var n = $('#co-n'); if (!n.value) n.focus(); else $('#co-submit').focus(); }, 60);
  }

  function nilai() {
    var f = $('#co-form');
    return { nama: f.elements.nama.value.trim(), profesi: f.elements.profesi.value.trim(), no_wa: f.elements.no_wa.value.trim(), email: f.elements.email.value.trim().toLowerCase() };
  }
  function cekField(k) {
    var v = nilai()[k], pesan = '', el = $('#co-form').elements[k], hint = $('[data-err="' + k + '"]');
    if (k === 'nama' && v.length < 2) pesan = 'Nama wajib diisi (minimal 2 huruf).';
    if (k === 'profesi' && v.length < 2) pesan = 'Profesi wajib diisi.';
    if (k === 'email' && !U.emailValid(v)) pesan = 'Format email belum benar, contoh: nama@email.com';
    if (k === 'no_wa') {
      var w = U.wa62(v);
      if (!/^62\d{8,13}$/.test(w)) pesan = v ? 'Nomor WhatsApp tidak valid. Awali dengan 08 atau 62.' : 'Nomor WhatsApp wajib diisi.';
      else { hint.className = 'hint ok'; hint.textContent = '✓ Akan dihubungi di ' + U.waFormat(w); hint.hidden = false; el.setAttribute('aria-invalid', 'false'); return true; }
      if (!v) { hint.className = 'hint'; hint.textContent = 'Awali dengan 08 atau 62'; el.removeAttribute('aria-invalid'); return false; }
    }
    el.setAttribute('aria-invalid', pesan ? 'true' : 'false');
    hint.className = 'hint err'; hint.textContent = pesan; hint.hidden = !pesan;
    return !pesan;
  }
  function kunci(on) {
    S.kirim = on;
    var b = $('#co-submit'); b.disabled = on;
    b.innerHTML = on ? '<span class="spin"></span><span>Menyimpan data…</span>' : '<span>Lanjutkan ke Pembayaran</span>' + ic('i-arrow-r');
  }

  function kirim(e) {
    e.preventDefault();
    if (S.kirim || !S.co) return;
    var ok = ['nama', 'profesi', 'no_wa', 'email'].map(cekField);
    var salah = ['nama', 'profesi', 'no_wa', 'email'].filter(function (k, i) { return !ok[i]; });
    if (salah.length) { $('#co-form').elements[salah[0]].focus(); return; }
    var v = nilai(), err = $('#co-err');
    err.hidden = true;
    kunci(true);
    API.call('leads.simpan', { nama: v.nama, profesi: v.profesi, no_wa: U.wa62(v.no_wa), email: v.email, produk_id: S.co.id, sumber: sumberKunjungan(), website: $('#co-hp').value })
      .then(function (r) {
        if (!r || !r.success) { kunci(false); err.textContent = (r && r.message) || 'Gagal menyimpan. Coba lagi.'; err.hidden = false; return; }
        var link = (r.data && r.data.link) || waAdmin('Halo Admin, saya ' + v.nama + ' sudah mengisi formulir untuk ' + S.co.nama + '.');
        sukses(v.nama, r.message, link);
      });
  }
  function sukses(nama, pesan, link) {
    $('#co-form-wrap').hidden = true; $('#co-ok').hidden = false;
    $('#co-ok-msg').textContent = pesan || ('Terima kasih, ' + nama + '!');
    var a = $('#co-lanjut'), bar = $('#co-ok-bar');
    a.href = link || '#';
    a.hidden = !link;
    var keWA = /wa\.me/.test(link || '');
    $('#co-ok-redir').textContent = link ? (keWA ? 'Mengarahkan ke WhatsApp admin untuk info pembayaran…' : 'Mengarahkan ke halaman pembayaran…') : 'Tim kami akan segera menghubungi Anda.';
    $('#co-form').reset(); $$('#co-form [aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
    var h = $('[data-err="no_wa"]'); h.className = 'hint'; h.textContent = 'Awali dengan 08 atau 62';
    kunci(false);
    if (!link) return;
    var total = 3500, t0 = Date.now();
    bar.style.transition = 'none'; bar.style.width = '0';
    requestAnimationFrame(function () { bar.style.transition = 'width ' + total + 'ms linear'; bar.style.width = '100%'; });
    clearInterval(S.redir);
    S.redir = setInterval(function () { if (Date.now() - t0 >= total) { clearInterval(S.redir); if ($('#checkout').open) location.href = link; } }, 200);
  }
})();
