/**
 * interaksi.js — efek interaktif landing page (v1.1)
 *  • EK.Musik — musik latar dari file audio yang diunggah Superadmin (MP3/M4A/OGG).
 *      Peramban memblokir audio bersuara sebelum pengunjung berinteraksi, jadi musik
 *      mulai pada klik/ketuk/tombol pertama. Pengunjung bisa membisukan; pilihannya diingat.
 *  • EK.Lebah — lebah kecil yang mengikuti kursor & menghampiri saat kursor berhenti.
 *      Hanya di perangkat bermouse; mati otomatis bila "kurangi gerakan" aktif.
 * Tidak memuat apa pun sampai dibutuhkan → tidak memperlambat halaman.
 */
(function () {
  'use strict';
  var EK = window.EK = window.EK || {};
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var simpanPref = function (v) { try { localStorage.setItem('ek_musik', v); } catch (e) {} };
  var bacaPref = function () { try { return localStorage.getItem('ek_musik'); } catch (e) { return null; } };

  // ====================================================================== MUSIK LATAR
  var IKON_NADA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  var IKON_BISU = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>';

  EK.Musik = (function () {
    var M = { url: '', vol: .35, judul: '', audio: null, keadaan: 'mati', btn: null, gestur: false, fade: null, jedaTab: false, gagal: false };

    function siapkan(set) {
      set = set || {};
      var url = String(set.BACKSOUND_URL || '').trim(), aktif = set.BACKSOUND_AKTIF !== 'TIDAK' && !!url;
      if (!aktif) { bongkar(); return; }
      M.vol = Math.max(5, Math.min(100, Number(set.BACKSOUND_VOLUME) || 35)) / 100;
      M.judul = String(set.BACKSOUND_JUDUL || '');
      if (M.btn && M.url === url) { label(); if (M.audio && M.keadaan === 'main') M.audio.volume = M.vol; return; }
      bongkar();
      M.url = url; M.gagal = false;
      buatTombol();
      if (bacaPref() === 'off') atur('mati');
      else { atur('menunggu'); pasangGestur(); setTimeout(function () { if (M.keadaan === 'menunggu') putar(false); }, 1200); }
      document.addEventListener('visibilitychange', onTab);
    }
    function bongkar() {
      lepasGestur();
      document.removeEventListener('visibilitychange', onTab);
      if (M.audio) { try { M.audio.pause(); } catch (e) {} M.audio.removeAttribute('src'); try { M.audio.load(); } catch (e) {} M.audio = null; }
      if (M.btn) { M.btn.remove(); M.btn = null; }
      M.url = ''; M.keadaan = 'mati';
    }
    function audio() {
      if (M.audio) return M.audio;
      var a = new Audio();
      a.loop = true; a.preload = 'none'; a.volume = 0; a.src = M.url;
      a.addEventListener('error', function () {
        if (!M.url) return;
        M.gagal = true; console.warn('[Musik] Berkas audio tidak bisa diputar:', M.url);
        if (M.btn) M.btn.hidden = true;
        lepasGestur();
      });
      return (M.audio = a);
    }
    /** olehPengunjung=true: dipicu klik/ketuk → boleh berbunyi */
    function putar(olehPengunjung) {
      if (M.gagal || !M.url) return;
      var a = audio();
      var p;
      try { p = a.play(); } catch (e) { p = null; }
      var sukses = function () { lepasGestur(); atur('main'); pudar(M.vol, 1400); if (olehPengunjung) kabar(); };
      // Satu ketukan memicu beberapa event; hanya yang diizinkan peramban yang berhasil — abaikan penolakan lainnya
      if (p && p.then) p.then(sukses).catch(function (e) { if (e && e.name === 'NotAllowedError' && M.keadaan !== 'main' && M.keadaan !== 'mati') atur('menunggu'); });
      else if (!a.paused) sukses();
    }
    function berhenti(simpan) {
      if (simpan) simpanPref('off');
      atur('mati');
      if (M.audio && !M.audio.paused) pudar(0, 450, function () { if (M.keadaan !== 'main' && M.audio) M.audio.pause(); });
    }
    function pudar(ke, ms, selesai) {
      var a = M.audio; if (!a) return;
      clearInterval(M.fade);
      var dari = a.volume, t0 = Date.now();
      M.fade = setInterval(function () {
        var k = Math.min(1, (Date.now() - t0) / ms);
        try { a.volume = Math.max(0, Math.min(1, dari + (ke - dari) * k)); } catch (e) {}
        if (k >= 1) { clearInterval(M.fade); if (selesai) selesai(); }
      }, 40);
    }
    // Interaksi pertama (klik/ketuk/tombol) → mulai musik. Gulir tidak dihitung oleh peramban.
    function onGestur(e) {
      if (M.keadaan !== 'menunggu') { lepasGestur(); return; }
      if (e.target && e.target.closest && e.target.closest('.musik')) return;
      if (e.type === 'keydown' && (e.key === 'Escape' || e.key === 'Tab')) return;
      putar(true);
    }
    var EV = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'];
    function pasangGestur() { if (M.gestur) return; M.gestur = true; EV.forEach(function (n) { window.addEventListener(n, onGestur, true); }); }
    function lepasGestur() { if (!M.gestur) return; M.gestur = false; EV.forEach(function (n) { window.removeEventListener(n, onGestur, true); }); }
    function onTab() {
      if (!M.audio) return;
      if (document.visibilityState === 'hidden') { if (M.keadaan === 'main') { M.jedaTab = true; M.audio.pause(); } }
      else if (M.jedaTab) { M.jedaTab = false; if (M.keadaan === 'main') M.audio.play().catch(function () {}); }
    }

    function buatTombol() {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'musik'; b.id = 'musik';
      b.innerHTML = '<span class="mz-ic">' + IKON_NADA + '</span><span class="mz-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="mz-lbl"></span>';
      b.addEventListener('click', function () {
        if (M.keadaan === 'main') berhenti(true);
        else { simpanPref('on'); putar(true); }
      });
      document.body.appendChild(b);
      M.btn = b;
    }
    function atur(k) {
      M.keadaan = k;
      if (!M.btn) return;
      M.btn.dataset.keadaan = k;
      M.btn.setAttribute('aria-pressed', k === 'main' ? 'true' : 'false');
      $ic(k === 'mati' ? IKON_BISU : IKON_NADA);
      label();
    }
    function $ic(svg) { var x = M.btn.querySelector('.mz-ic'); if (x.innerHTML !== svg) x.innerHTML = svg; }
    function label() {
      if (!M.btn) return;
      var j = M.judul ? '“' + M.judul + '”' : 'Musik latar';
      var t = M.keadaan === 'main' ? j + ' — klik untuk membisukan' : M.keadaan === 'menunggu' ? 'Ketuk di mana saja untuk memutar musik' : 'Putar musik latar';
      M.btn.setAttribute('aria-label', t); M.btn.title = t;
      M.btn.querySelector('.mz-lbl').textContent = M.keadaan === 'main' ? (M.judul ? '♪ ' + M.judul : '♪ Musik diputar') : M.keadaan === 'menunggu' ? 'Putar musik' : 'Musik mati';
    }
    function kabar() { if (!M.btn) return; M.btn.classList.add('kabar'); clearTimeout(M.kabarT); M.kabarT = setTimeout(function () { if (M.btn) M.btn.classList.remove('kabar'); }, 3200); }
    /** Video diputar dengan suara → musik dijeda (tidak menyimpan preferensi; pengunjung bisa memutar lagi) */
    function jedaUntukVideo() { if (M.keadaan === 'main' || M.keadaan === 'menunggu') { lepasGestur(); berhenti(false); } }

    return { siapkan: siapkan, jedaUntukVideo: jedaUntukVideo, keadaan: function () { return M.keadaan; }, _m: M };
  })();

  // ====================================================================== LEBAH
  var SVG_LEBAH = '<svg viewBox="0 0 48 40" width="44" height="37" aria-hidden="true">' +
    '<defs><clipPath id="lb-badan"><ellipse cx="22" cy="25" rx="14.5" ry="10.5"/></clipPath></defs>' +
    '<g class="lb-sayap">' +
      '<ellipse cx="18" cy="11" rx="7.5" ry="10.5" transform="rotate(-28 18 15)" fill="rgba(226,242,255,.78)" stroke="rgba(59,42,26,.45)" stroke-width="1.1"/>' +
      '<ellipse cx="27" cy="11.5" rx="6.5" ry="9.5" transform="rotate(22 27 15)" fill="rgba(226,242,255,.62)" stroke="rgba(59,42,26,.4)" stroke-width="1.1"/>' +
    '</g>' +
    '<path d="M8.4 26.2 2.6 25l5.7-2.6z" fill="#3B2A1A"/>' +
    '<ellipse cx="22" cy="25" rx="14.5" ry="10.5" fill="#F5C542"/>' +
    '<g clip-path="url(#lb-badan)" fill="#3B2A1A"><rect x="13.5" y="12" width="4.2" height="26" rx="1"/><rect x="21.2" y="12" width="4.2" height="26" rx="1"/></g>' +
    '<ellipse cx="22" cy="25" rx="14.5" ry="10.5" fill="none" stroke="#3B2A1A" stroke-width="1.6"/>' +
    '<ellipse cx="17" cy="20.5" rx="5" ry="2.2" fill="#fff" opacity=".45"/>' +
    '<circle cx="37.5" cy="22.5" r="7.2" fill="#3B2A1A"/>' +
    '<circle cx="40" cy="20.6" r="2.3" fill="#fff"/><circle cx="40.7" cy="20.9" r="1.1" fill="#3B2A1A"/>' +
    '<path d="M39.5 26.2q1.6 1.1 3.1 0" stroke="#F5C542" stroke-width="1.1" fill="none" stroke-linecap="round"/>' +
    '<path d="M36.5 15.6q1-5 4.6-6.6M39.4 16.4q2.6-3.8 6.4-3.6" stroke="#3B2A1A" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="41.2" cy="8.9" r="1.4" fill="#3B2A1A"/><circle cx="45.8" cy="12.8" r="1.4" fill="#3B2A1A"/>' +
  '</svg>';

  EK.Lebah = (function () {
    var L = { on: false, el: null, inn: null, x: 0, y: 0, vx: 0, vy: 0, mx: null, my: null, tGerak: 0, raf: 0, hadap: 1, hinggap: false, muncul: false };
    function bisa() {
      return !REDUCED && window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth >= 768;
    }
    function atur(nyala) { if (nyala && bisa()) mulai(); else henti(); }
    function mulai() {
      if (L.on) return;
      L.on = true;
      var el = document.createElement('div');
      el.className = 'lebah'; el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<div class="lb-in">' + SVG_LEBAH + '</div>';
      document.body.appendChild(el);
      L.el = el; L.inn = el.firstChild;
      L.x = window.innerWidth + 40; L.y = 90; L.vx = -2; L.vy = 0; L.muncul = false;
      window.addEventListener('mousemove', gerak, { passive: true });
      document.addEventListener('visibilitychange', tab);
    }
    function henti() {
      if (!L.on) return;
      L.on = false;
      window.removeEventListener('mousemove', gerak);
      document.removeEventListener('visibilitychange', tab);
      cancelAnimationFrame(L.raf); L.raf = 0;
      if (L.el) L.el.remove();
      L.el = L.inn = null; L.mx = L.my = null;
    }
    function gerak(e) {
      L.mx = e.clientX; L.my = e.clientY; L.tGerak = performance.now();
      if (!L.muncul) { L.muncul = true; L.el.classList.add('tampil'); }
      if (L.hinggap) { L.hinggap = false; L.el.classList.remove('hinggap'); }
      jalan();
    }
    function tab() { if (document.visibilityState === 'hidden') { cancelAnimationFrame(L.raf); L.raf = 0; } else if (L.mx !== null && !L.hinggap) jalan(); }
    function jalan() { if (!L.raf && L.on) L.raf = requestAnimationFrame(langkah); }
    function langkah(t) {
      L.raf = 0;
      if (!L.on || L.mx === null) return;
      var diam = t - L.tGerak, tx, ty, vmax, gaya;
      if (diam < 260) {
        // kursor bergerak: membuntuti dari samping atas, sedikit tertinggal
        tx = L.mx - 34 * L.hadap; ty = L.my - 30; vmax = 7.5; gaya = .42;
      } else if (diam < 7000) {
        // kursor berhenti: menghampiri lalu terbang berputar di dekat kursor
        var a = t / 820;
        tx = L.mx + Math.cos(a) * 24; ty = L.my - 22 + Math.sin(a * 2) * 10; vmax = 4.6; gaya = .26;
      } else {
        // lama diam: hinggap di dekat ujung kursor
        tx = L.mx + 16; ty = L.my - 16; vmax = 2.4; gaya = .18;
      }
      var dx = tx - L.x, dy = ty - L.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var sp = d < 110 ? vmax * (d / 110) : vmax;
      var sx = dx / d * sp - L.vx, sy = dy / d * sp - L.vy, f = Math.sqrt(sx * sx + sy * sy);
      if (f > gaya) { sx = sx / f * gaya; sy = sy / f * gaya; }
      L.vx += sx; L.vy += sy; L.x += L.vx; L.y += L.vy;
      if (L.vx > .45) L.hadap = 1; else if (L.vx < -.45) L.hadap = -1;
      var miring = Math.max(-24, Math.min(24, L.vx * 3.2)), dengung = diam < 7000 ? Math.sin(t / 95) * 1.4 : 0;
      L.el.style.transform = 'translate3d(' + (L.x - 22).toFixed(1) + 'px,' + (L.y - 18 + dengung).toFixed(1) + 'px,0) rotate(' + miring.toFixed(1) + 'deg)';
      L.inn.style.transform = 'scaleX(' + L.hadap + ')';
      if (diam >= 7000 && d < 1.5 && Math.abs(L.vx) + Math.abs(L.vy) < .25) { L.hinggap = true; L.el.classList.add('hinggap'); return; }
      jalan();
    }
    return { atur: atur, _l: L };
  })();
})();
