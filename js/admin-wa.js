/**
 * admin-wa.js — WhatsApp & Notifikasi (Blast · Antrean · Konfigurasi) + CRM Kontak
 * (skill gas-notifikasi-wa-crm)
 */
(function (A) {
  'use strict';
  var U = A.U, esc = A.esc, $ = A.$, $$ = A.$$, ic = A.ic, API = EK.API;
  var hp08 = function (v) { var s = String(v || '').replace(/[^\d]/g, ''); if (s.indexOf('62') === 0) s = '0' + s.slice(2); else if (s.indexOf('8') === 0) s = '0' + s; return s; };
  var hpValid = function (v) { return /^08\d{8,12}$/.test(hp08(v)); };
  var badgeWA = function (s) { return s === 'Terdaftar' ? '<span class="wa-badge ya">✓ WA</span>' : s === 'Tidak Terdaftar' ? '<span class="wa-badge tidak">✕ bukan WA</span>' : '<span class="wa-badge belum">? belum dicek</span>'; };

  // =============================================================== WHATSAPP & NOTIFIKASI
  var W = { tab: 'blast' };
  var BL = { sumber: 'crm', segmen: '', tag: '', statusWA: '', produk: '', status: '', manual: '', aud: null, pilih: {}, hanyaWA: false, judul: '', pesan: 'Halo {nama} 👋\n\nAda kabar baik dari {brand}! ', ukuran: 20, jeda: '5', aktif: '', otomatis: false, tOto: null };
  A.daftar('wa', {
    mount: function (el, act) {
      var q = A.query();
      if (q.get('tab')) W.tab = q.get('tab');
      if (q.get('dari')) {
        try { var pen = JSON.parse(sessionStorage.getItem('ek_blast_penerima') || '[]'); if (pen.length) { BL.sumber = 'pilihan'; setAud(pen.map(function (p) { return { id: '', nama: p.nama, hp: hp08(p.hp), statusWA: p.statusWA || '', optOut: !!p.optOut, vars: p.vars || {} }; })); } } catch (e) {}
        sessionStorage.removeItem('ek_blast_penerima');
      }
      if (W.tab === 'config' && !A.isSA()) W.tab = 'blast';
      el.innerHTML = '<div class="tabs" role="tablist" id="wa-tabs"><button role="tab" data-t="blast">' + ic('i-send') + 'Blast WhatsApp</button><button role="tab" data-t="antrean">' + ic('i-list') + 'Antrean & Riwayat</button>' +
        (A.isSA() ? '<button role="tab" data-t="config">' + ic('i-gear') + 'Konfigurasi</button>' : '') + '</div><div id="wa-isi" class="grid"></div>';
      $('#wa-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) { W.tab = b.dataset.t; history.replaceState(null, '', '#/wa?tab=' + W.tab); renderTab(); A.halaman.wa.muat(false); } });
      renderTab();
    },
    muat: function (fresh) {
      if (W.tab === 'blast') { A.ambil('blast', { fresh: fresh }); A.ambil('notif', { diam: true }); A.ambil('crm', { diam: true }); A.ambil('konten', { diam: true }); }
      else if (W.tab === 'antrean') A.ambil('antrean', { fresh: fresh });
      else A.ambil('notif', { fresh: fresh });
    }
  });
  function renderTab() {
    $$('#wa-tabs [data-t]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.t === W.tab)); });
    clearTimeout(BL.tOto); BL.otomatis = false;
    ['blast', 'antrean', 'notif', 'crm', 'konten'].forEach(function (k) { delete A.subs[k]; });
    var el = $('#wa-isi');
    if (W.tab === 'blast') tabBlast(el); else if (W.tab === 'antrean') tabAntrean(el); else tabConfig(el);
  }

  // ---------------- Tab Blast ----------------
  function tabBlast(el) {
    el.innerHTML = '<div id="bl-aktif"></div><div class="g-2 rata">' +
      '<div class="card"><div class="card-h"><div><span class="kick">Langkah 1</span><h2>Pilih Sasaran</h2><p>Nomor tidak valid, ganda, dan opt-out otomatis dibuang.</p></div></div>' +
      '<div class="tb" style="margin-bottom:12px"><div class="seg" id="bl-sumber">' + [['crm', 'CRM Kontak'], ['leads', 'Leads'], ['manual', 'Tempel manual']].concat(BL.sumber === 'pilihan' ? [['pilihan', 'Dipilih']] : []).map(function (s) { return '<button type="button" data-s="' + s[0] + '" aria-pressed="' + (BL.sumber === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div></div>' +
      '<div id="bl-filter"></div><div class="tb" style="margin:12px 0"><button class="btn btn-cream btn-sm" type="button" id="bl-muat">' + ic('i-users') + 'Muat penerima</button><button class="btn btn-ghost btn-sm" type="button" id="bl-deteksi">' + ic('i-search') + 'Deteksi nomor WA</button><span class="basi" id="bl-prog"></span></div>' +
      '<div id="bl-ringkas"></div><label class="switch" style="margin:10px 0"><input type="checkbox" id="bl-hanyawa"' + (BL.hanyaWA ? ' checked' : '') + '><span class="track"></span>Kirim hanya ke nomor yang terdeteksi WhatsApp</label><div id="bl-tabel"></div></div>' +
      '<div class="grid" style="gap:22px;align-content:start"><div class="card"><div class="card-h"><div><span class="kick">Langkah 2</span><h2>Tulis Pesan</h2></div></div>' +
      '<div class="field"><label class="label" for="bl-judul">Judul internal</label><input class="input" id="bl-judul" value="' + esc(BL.judul) + '" placeholder="Mis. Promo akhir bulan"></div>' +
      '<div class="field"><span class="label">Sisipkan variabel</span><div class="var-btns" id="bl-var">' + ['{nama}', '{brand}', '{produk}', '{profesi}', '{link}'].map(function (v) { return '<button type="button">' + v + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label class="label" for="bl-pesan">Isi pesan</label><textarea class="textarea" id="bl-pesan" style="min-height:150px">' + esc(BL.pesan) + '</textarea><span class="hint">*teks* = tebal di WhatsApp. Tambahkan "Balas STOP untuk berhenti." bila perlu.</span></div>' +
      '<div class="field"><span class="label">Pratinjau (penerima pertama)</span><div class="wa-preview"><div class="wa-bubble" id="bl-prev"></div></div></div></div>' +
      '<div class="card"><div class="card-h"><div><span class="kick">Langkah 3</span><h2>Ukuran Batch & Jeda</h2><p>Anti-banned: mulai batch kecil, jeda acak ≥5 detik.</p></div></div>' +
      '<div class="tb"><div class="seg" id="bl-ukuran">' + [10, 20, 50].map(function (n) { return '<button type="button" data-u="' + n + '" aria-pressed="' + (BL.ukuran === n) + '">' + n + ' / batch</button>'; }).join('') + '</div>' +
      '<label class="field" style="margin:0"><span class="sr-only">Jeda</span><input class="input input-sm" id="bl-jeda" value="' + esc(BL.jeda) + '" style="width:120px" placeholder="5 atau 3-8"></label><span class="hint">detik (boleh rentang 3-8)</span></div>' +
      '<p class="note" id="bl-est" style="margin-top:14px"></p><button class="btn btn-primary btn-lg btn-block" style="margin-top:14px" type="button" id="bl-mulai">' + ic('i-send') + '<span>Mulai blast</span></button></div></div></div>' +
      '<div class="card"><div class="card-h"><div><span class="kick">Riwayat</span><h2>Blast Terakhir</h2><p>Server tetap mengirim 1 batch per menit walau halaman ditutup.</p></div></div><div id="bl-riwayat">' + A.skel(3) + '</div></div>';
    $('#bl-sumber').addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (!b) return; BL.sumber = b.dataset.s; $$('#bl-sumber button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); BL.aud = null; BL.pilih = {}; filterBlast(); isiAud(); });
    $('#bl-muat').addEventListener('click', muatAud);
    $('#bl-deteksi').addEventListener('click', deteksi);
    $('#bl-hanyawa').addEventListener('change', function (e) { BL.hanyaWA = e.target.checked; isiAud(); });
    $('#bl-var').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var t = $('#bl-pesan'), p = t.selectionStart || t.value.length; t.value = t.value.slice(0, p) + b.textContent + t.value.slice(t.selectionEnd || p); t.focus(); t.selectionStart = t.selectionEnd = p + b.textContent.length; BL.pesan = t.value; prev(); });
    $('#bl-pesan').addEventListener('input', function (e) { BL.pesan = e.target.value; prev(); });
    $('#bl-judul').addEventListener('input', function (e) { BL.judul = e.target.value; });
    $('#bl-ukuran').addEventListener('click', function (e) { var b = e.target.closest('[data-u]'); if (!b) return; BL.ukuran = +b.dataset.u; $$('#bl-ukuran button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); estimasi(); });
    $('#bl-jeda').addEventListener('input', function (e) { BL.jeda = e.target.value.trim(); estimasi(); });
    $('#bl-mulai').addEventListener('click', mulaiBlast);
    $('#bl-tabel').addEventListener('change', function (e) {
      var t = e.target;
      if (t.matches('[data-all]')) { daftarKirim(true).forEach(function (r) { if (t.checked) BL.pilih[r.hp] = 1; else delete BL.pilih[r.hp]; }); isiAud(); }
      else if (t.matches('[data-hp]')) { if (t.checked) BL.pilih[t.dataset.hp] = 1; else delete BL.pilih[t.dataset.hp]; ringkasAud(); estimasi(); prev(); }
    });
    var notif = A.lokal('notif'); if (notif && !BL._def) { BL._def = 1; BL.ukuran = notif.batchDefault || 20; BL.jeda = notif.jeda || '5'; }
    filterBlast(); isiAud(); prev(); estimasi();
    A.on('blast', isiRiwayat); isiRiwayat(A.lokal('blast'));
    A.on('crm', function () { if (BL.sumber === 'crm') filterBlast(); });
  }
  function filterBlast() {
    var f = $('#bl-filter'); if (!f) return;
    if (BL.sumber === 'crm') {
      var c = A.lokal('crm'), seg = c ? Object.keys(c.stats.segmen) : [], tag = c ? Object.keys(c.stats.tag) : [];
      f.innerHTML = '<div class="fgrid c2"><select class="select select-sm" id="bf-seg"><option value="">Semua segmen</option>' + seg.map(function (s) { return '<option' + (BL.segmen === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>' +
        '<select class="select select-sm" id="bf-tag"><option value="">Semua tag</option>' + tag.map(function (s) { return '<option' + (BL.tag === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>' +
        '<select class="select select-sm" id="bf-wa"><option value="">Status WA: semua</option><option value="Terdaftar"' + (BL.statusWA === 'Terdaftar' ? ' selected' : '') + '>Terdaftar WA</option><option value="belum"' + (BL.statusWA === 'belum' ? ' selected' : '') + '>Belum dicek</option></select></div>';
      ['seg', 'tag', 'wa'].forEach(function (k) { $('#bf-' + k).addEventListener('change', function (e) { BL[{ seg: 'segmen', tag: 'tag', wa: 'statusWA' }[k]] = e.target.value; }); });
    } else if (BL.sumber === 'leads') {
      var k = A.lokal('konten') || {};
      f.innerHTML = '<div class="fgrid c2"><select class="select select-sm" id="bf-prod"><option value="">Semua produk</option>' + (k.produk || []).map(function (p) { return '<option value="' + esc(p.id) + '"' + (BL.produk === String(p.id) ? ' selected' : '') + '>' + esc(p.nama) + '</option>'; }).join('') + '</select>' +
        '<select class="select select-sm" id="bf-st"><option value="">Semua status</option>' + ['Baru', 'Dihubungi', 'Closing', 'Batal'].map(function (s) { return '<option' + (BL.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>';
      $('#bf-prod').addEventListener('change', function (e) { BL.produk = e.target.value; });
      $('#bf-st').addEventListener('change', function (e) { BL.status = e.target.value; });
    } else if (BL.sumber === 'manual') {
      f.innerHTML = '<textarea class="textarea" id="bf-manual" placeholder="Satu nomor per baris, opsional dengan nama:&#10;081234567890|Budi&#10;6281298765432|Siti">' + esc(BL.manual) + '</textarea>';
      $('#bf-manual').addEventListener('input', function (e) { BL.manual = e.target.value; });
    } else f.innerHTML = '<p class="note">Penerima dari pilihan Anda di menu sebelumnya.</p>';
  }
  function setAud(rows) {
    var seen = {}, r = { total: 0, valid: 0, tidakValid: 0, ganda: 0, terdaftarWA: 0, tidakTerdaftarWA: 0, optOut: 0 };
    rows.forEach(function (o) { r.total++; o.hp = hp08(o.hp); o.valid = hpValid(o.hp); if (!o.valid) r.tidakValid++; o.ganda = o.valid && !!seen[o.hp]; if (o.ganda) r.ganda++; if (o.valid) seen[o.hp] = 1; if (o.optOut) r.optOut++; if (o.statusWA === 'Terdaftar') r.terdaftarWA++; if (o.valid && !o.ganda && !o.optOut) r.valid++; });
    BL.aud = { rows: rows, ringkas: r }; BL.pilih = {};
    rows.forEach(function (o) { if (o.valid && !o.ganda && !o.optOut) BL.pilih[o.hp] = 1; });
  }
  function muatAud() {
    if (BL.sumber === 'pilihan') { isiAud(); return; }
    var b = $('#bl-muat'); b.disabled = true; b.innerHTML = '<span class="spin"></span>Memuat…';
    var p = { sumber: BL.sumber };
    if (BL.sumber === 'crm') { p.segmen = BL.segmen; p.tag = BL.tag; p.statusWA = BL.statusWA; }
    if (BL.sumber === 'leads') { p.produk_id = BL.produk; p.status_followup = BL.status; }
    if (BL.sumber === 'manual') p.manual = BL.manual;
    API.call('wa.audience', p).then(function (r) {
      b.disabled = false; b.innerHTML = ic('i-users') + 'Muat penerima';
      if (!r.success) { U.toast(r.message, 'err'); return; }
      BL.aud = r.data; BL.pilih = {};
      r.data.rows.forEach(function (o) { if (o.valid && !o.ganda && !o.optOut) BL.pilih[o.hp] = 1; });
      isiAud(); prev(); estimasi();
    });
  }
  function daftarKirim(semuaTampil) {
    if (!BL.aud) return [];
    return BL.aud.rows.filter(function (o) { return o.valid && !o.ganda && !o.optOut && (!BL.hanyaWA || o.statusWA === 'Terdaftar') && (semuaTampil || BL.pilih[o.hp]); });
  }
  function ringkasAud() {
    var el = $('#bl-ringkas'); if (!el || !BL.aud) { if (el) el.innerHTML = ''; return; }
    var r = BL.aud.ringkas;
    el.innerHTML = '<div class="chips"><span class="pill">' + r.total + ' total</span><span class="pill pill-ok">' + r.valid + ' valid</span>' + (r.tidakValid ? '<span class="pill pill-err">' + r.tidakValid + ' tidak valid</span>' : '') + (r.ganda ? '<span class="pill pill-warn">' + r.ganda + ' ganda</span>' : '') +
      (r.optOut ? '<span class="pill pill-mute">' + r.optOut + ' opt-out</span>' : '') + '<span class="pill pill-info">' + r.terdaftarWA + ' terdeteksi WA</span><span class="pill pill-burnt"><b>' + daftarKirim().length + '</b>&nbsp;akan dikirimi</span></div>';
  }
  function isiAud() {
    var el = $('#bl-tabel'); if (!el) return;
    ringkasAud();
    if (!BL.aud) { el.innerHTML = '<p class="note">Atur filter lalu tekan <b>Muat penerima</b>.</p>'; return; }
    var rows = BL.aud.rows.slice(0, 300), kirim = daftarKirim(true);
    el.innerHTML = '<div class="tbl-wrap" style="max-height:360px;overflow:auto"><table class="tbl"><thead><tr><th><input type="checkbox" class="chk" data-all' + (kirim.length && kirim.every(function (r) { return BL.pilih[r.hp]; }) ? ' checked' : '') + ' aria-label="Pilih semua"></th><th>Nama</th><th>Nomor</th><th>Status</th></tr></thead><tbody>' + rows.map(function (o) {
      var bisa = o.valid && !o.ganda && !o.optOut && (!BL.hanyaWA || o.statusWA === 'Terdaftar');
      return '<tr style="' + (bisa ? '' : 'opacity:.5') + '"><td>' + (bisa ? '<input type="checkbox" class="chk" data-hp="' + esc(o.hp) + '"' + (BL.pilih[o.hp] ? ' checked' : '') + '>' : '') + '</td><td>' + esc(o.nama || '-') + '</td><td class="cell-wa">' + esc(o.hp) + '</td><td>' +
        (!o.valid ? '<span class="pill pill-err">tidak valid</span>' : o.ganda ? '<span class="pill pill-warn">ganda</span>' : o.optOut ? '<span class="pill pill-mute">opt-out</span>' : badgeWA(o.statusWA)) + '</td></tr>';
    }).join('') + '</tbody></table></div>' + (BL.aud.rows.length > 300 ? '<p class="hint" style="margin-top:6px">Menampilkan 300 dari ' + BL.aud.rows.length + ' baris (semua tetap dikirimi sesuai centang).</p>' : '');
    estimasi(); prev();
  }
  function deteksi() {
    if (!BL.aud) { U.toast('Muat penerima dulu.', 'err'); return; }
    var daftar = BL.aud.rows.filter(function (o) { return o.valid && !o.ganda && !o.statusWA; }).map(function (o) { return o.hp; });
    if (!daftar.length) { U.toast('Semua nomor valid sudah dicek.', 'info'); return; }
    var prog = $('#bl-prog'), i = 0, b = $('#bl-deteksi'); b.disabled = true;
    var jalan = function () {
      if (i >= daftar.length) { prog.textContent = '✓ ' + daftar.length + ' nomor dicek'; b.disabled = false; ringkasUlang(); isiAud(); A.usang('crm'); return; }
      var chunk = daftar.slice(i, i + 50);
      prog.innerHTML = '<span class="spin"></span>Mengecek ' + Math.min(i + 50, daftar.length) + '/' + daftar.length;
      API.call('wa.validate', { nomor: chunk }).then(function (r) {
        if (!r.success) { prog.textContent = ''; b.disabled = false; U.toast(r.message, 'err'); return; }
        BL.aud.rows.forEach(function (o) { if (r.data.hasil[o.hp]) o.statusWA = r.data.hasil[o.hp]; });
        i += 50; jalan();
      });
    };
    jalan();
  }
  function ringkasUlang() { var r = BL.aud.ringkas; r.terdaftarWA = BL.aud.rows.filter(function (o) { return o.statusWA === 'Terdaftar'; }).length; }
  function isiVars(t, o) {
    var brand = ((EK.Store.val('authcfg') || {}).brand) || '';
    var v = { nama: (o && o.nama) || 'Kak', brand: brand, produk: (o && o.vars && o.vars.produk) || '', profesi: (o && o.vars && o.vars.profesi) || '', link: location.href.split('#')[0].replace(/admin\.html.*$/, '') };
    return String(t || '').replace(/\{(\w+)\}/g, function (m, k) { return v[k] == null ? m : v[k]; });
  }
  function prev() { var p = $('#bl-prev'); if (!p) return; var o = daftarKirim()[0]; p.innerHTML = esc(isiVars(BL.pesan, o)).replace(/\*([^*\n]+)\*/g, '<b>$1</b>') + '<small>' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' ✓✓</small>'; }
  function rataJeda() { var m = String(BL.jeda).match(/^(\d+)(?:-(\d+))?$/); return m ? (m[2] ? (Number(m[1]) + Number(m[2])) / 2 : Number(m[1])) : 5; }
  function estimasi() {
    var e = $('#bl-est'); if (!e) return;
    var n = daftarKirim().length, batch = Math.ceil(n / BL.ukuran), menit = Math.ceil(n * rataJeda() / 60);
    e.innerHTML = n ? '<b>' + n + '</b> penerima → <b>' + batch + '</b> batch × ' + BL.ukuran + ' · jeda ' + esc(BL.jeda) + ' dtk · perkiraan ±' + menit + ' menit (1 batch per menit oleh server).' : 'Belum ada penerima dipilih.';
    var b = $('#bl-mulai'); if (b) { b.disabled = !n; $('span', b).textContent = n ? 'Mulai blast (' + n + ' nomor)' : 'Mulai blast'; }
  }
  function mulaiBlast() {
    var pen = daftarKirim();
    if (!pen.length) return;
    if (!/\S/.test(BL.pesan)) { U.toast('Isi pesan masih kosong.', 'err'); return; }
    if (!/^\d{1,3}(-\d{1,3})?$/.test(BL.jeda)) { U.toast('Jeda harus angka (5) atau rentang (3-8).', 'err'); return; }
    A.konfirmasi({ judul: 'Mulai blast ke ' + pen.length + ' nomor?', html: 'Dikirim bertahap <b>' + BL.ukuran + ' pesan per batch</b> dengan jeda ' + esc(BL.jeda) + ' detik. Anda bisa menghentikannya kapan saja.', ok: 'Mulai blast' }).then(function (y) {
      if (!y) return;
      A.tulis('wa.blastCreate', { judul: BL.judul || 'Blast ' + U.tgl(U.hariIni()), pesan: BL.pesan, ukuranBatch: BL.ukuran, jeda: BL.jeda, sumber: BL.sumber, sasaran: BL.sumber + (BL.segmen ? ':' + BL.segmen : ''),
        penerima: pen.map(function (o) { return { hp: o.hp, nama: o.nama, vars: o.vars || {} }; }) }).then(function (r) {
        if (!r.success) return;
        BL.aktif = r.data.blastId; BL.aud = null; BL.pilih = {}; isiAud();
        A.ambil('blast', { fresh: true }).then(function () { prosesBatch(); });
      });
    });
  }
  function prosesBatch() {
    if (!BL.aktif) return;
    var b = $('#ba-next'); if (b) { b.disabled = true; b.innerHTML = '<span class="spin"></span>Mengirim batch…'; }
    API.call('wa.blastProcess', { blastId: BL.aktif }).then(function (r) {
      if (!r.success) { U.toast(r.message, 'err'); BL.otomatis = false; }
      else if (r.data.blast) {
        var d = A.lokal('blast') || { rows: [] };
        d.rows = d.rows.map(function (x) { return x.id === r.data.blast.id ? r.data.blast : x; }); A.simpan('blast', d);
        if (r.data.blast.status !== 'Berjalan') BL.otomatis = false;
      }
      jadwalOto();
    });
  }
  function jadwalOto() {
    clearTimeout(BL.tOto);
    if (!BL.otomatis || A.aktif !== 'wa') return;
    var detik = Math.max(30, Math.round(BL.ukuran * rataJeda())), sisa = detik;
    var tick = function () {
      var el = $('#ba-hitung'); if (!BL.otomatis || A.aktif !== 'wa') return;
      if (el) el.textContent = 'batch berikutnya dalam ' + sisa + ' dtk';
      if (sisa-- <= 0) prosesBatch(); else BL.tOto = setTimeout(tick, 1000);
    };
    tick();
  }
  function isiRiwayat(d) {
    var el = $('#bl-riwayat'); if (!el || !d) return;
    var aktif = d.rows.filter(function (b) { return b.id === BL.aktif; })[0] || d.rows.filter(function (b) { return b.status === 'Berjalan'; })[0];
    var ba = $('#bl-aktif');
    if (aktif && ba) {
      BL.aktif = aktif.id;
      ba.innerHTML = '<div class="card" style="border-color:var(--leaf)"><div class="card-h"><div><span class="kick" style="color:var(--leaf)">Blast ' + (aktif.status === 'Berjalan' ? 'berjalan' : aktif.status.toLowerCase()) + '</span><h2>' + esc(aktif.judul) + '</h2><p>' + aktif.total + ' penerima · ' + esc(aktif.ukuran) + '/batch · jeda ' + esc(aktif.jeda) + ' dtk</p></div>' +
        (d.waAktif ? '' : '<span class="pill pill-err">WhatsApp nonaktif — blast tertahan</span>') + '</div>' +
        '<div class="prog"><i style="width:' + aktif.persen + '%"></i></div><div class="tb" style="margin-top:12px"><span class="pill pill-ok">' + aktif.terkirim + ' terkirim</span><span class="pill pill-err">' + aktif.gagal + ' gagal</span><span class="pill">' + aktif.sisa + ' sisa</span><b>' + aktif.persen + '%</b><span class="grow"></span><span class="basi" id="ba-hitung"></span></div>' +
        (aktif.status === 'Berjalan' ? '<div class="tb" style="margin-top:14px"><button class="btn btn-leaf btn-sm" type="button" id="ba-next">' + ic('i-play') + 'Kirim batch berikutnya sekarang</button><label class="switch"><input type="checkbox" id="ba-oto"' + (BL.otomatis ? ' checked' : '') + '><span class="track"></span>Otomatis</label><span class="grow"></span><button class="btn btn-danger btn-sm" type="button" id="ba-stop">' + ic('i-stop') + 'Hentikan</button></div>' :
          '<div class="tb" style="margin-top:14px"><button class="btn btn-ghost btn-sm" type="button" id="ba-tutup">Tutup ringkasan</button><a class="btn btn-cream btn-sm" href="#/wa?tab=antrean">Lihat antrean</a></div>') + '</div>';
      var n = $('#ba-next'); if (n) n.addEventListener('click', prosesBatch);
      var o = $('#ba-oto'); if (o) o.addEventListener('change', function () { BL.otomatis = o.checked; if (BL.otomatis) prosesBatch(); else clearTimeout(BL.tOto); });
      var s = $('#ba-stop'); if (s) s.addEventListener('click', function () { stopBlast(aktif.id); });
      var t = $('#ba-tutup'); if (t) t.addEventListener('click', function () { BL.aktif = ''; ba.innerHTML = ''; });
      if (BL.otomatis) jadwalOto();
    } else if (ba) ba.innerHTML = '';
    el.innerHTML = d.rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Judul</th><th class="hide-m">Sasaran</th><th>Progres</th><th>Status</th><th class="aksi"></th></tr></thead><tbody>' + d.rows.map(function (b) {
      var st = { Berjalan: 'pill-info', Selesai: 'pill-ok', Dihentikan: 'pill-mute' }[b.status] || '';
      return '<tr><td class="nama">' + A.waktu(b.tanggal) + '</td><td class="nama"><b>' + esc(b.judul) + '</b><small>' + esc(b.ukuran) + '/batch · jeda ' + esc(b.jeda) + '</small></td><td class="hide-m"><small>' + esc(b.sasaran) + '</small></td>' +
        '<td style="min-width:140px"><div class="prog" style="height:8px"><i style="width:' + b.persen + '%"></i></div><small>' + b.terkirim + '/' + b.total + ' terkirim' + (b.gagal ? ' · ' + b.gagal + ' gagal' : '') + '</small></td><td><span class="pill ' + st + '">' + esc(b.status) + '</span></td>' +
        '<td class="aksi">' + (b.status === 'Berjalan' ? '<button class="btn btn-cream btn-xs" type="button" data-pantau="' + esc(b.id) + '">Pantau</button> <button class="btn btn-danger btn-xs" type="button" data-stop="' + esc(b.id) + '">Hentikan</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : A.kosong('Belum ada blast', 'Blast pertama Anda akan muncul di sini.');
    $$('[data-pantau]', el).forEach(function (x) { x.addEventListener('click', function () { BL.aktif = x.dataset.pantau; isiRiwayat(A.lokal('blast')); window.scrollTo({ top: 0, behavior: 'smooth' }); }); });
    $$('[data-stop]', el).forEach(function (x) { x.addEventListener('click', function () { stopBlast(x.dataset.stop); }); });
  }
  function stopBlast(id) {
    A.konfirmasi({ judul: 'Hentikan blast?', pesan: 'Pesan yang belum terkirim akan dibatalkan.', ok: 'Hentikan', bahaya: true }).then(function (y) {
      if (!y) return;
      BL.otomatis = false; clearTimeout(BL.tOto);
      A.tulis('wa.blastStop', { blastId: id }).then(function (r) { if (r.success) A.ambil('blast', { fresh: true }); });
    });
  }

  // ---------------- Tab Antrean ----------------
  var AQ = { status: '', kanal: '' };
  function tabAntrean(el) {
    el.innerHTML = '<div class="kpis" id="aq-kpi"></div><div class="card"><div class="card-h"><div><span class="kick">AntrianNotif</span><h2>Antrean & Riwayat Pengiriman</h2><p>300 entri terbaru. Notifikasi dikirim di latar belakang agar aksi pengguna tetap instan.</p></div>' +
      '<div class="tb"><button class="btn btn-leaf btn-sm" type="button" id="aq-proses">' + ic('i-play') + 'Proses sekarang</button>' + (A.isSA() ? '<button class="btn btn-cream btn-sm" type="button" id="aq-ulang">' + ic('i-refresh') + 'Ulangi yang gagal</button>' : '') + '</div></div>' +
      '<div class="tb" style="margin-bottom:12px"><select class="select select-sm" id="aq-status" style="width:auto"><option value="">Semua status</option><option>Antri</option><option>Terkirim</option><option>Gagal</option><option>Batal</option></select>' +
      '<select class="select select-sm" id="aq-kanal" style="width:auto"><option value="">Semua kanal</option><option value="WA">WhatsApp</option><option value="EMAIL">Email</option></select><span class="grow"></span><span class="basi" id="aq-kuota"></span></div><div id="aq-tabel">' + A.skel(6) + '</div></div>';
    $('#aq-status').value = AQ.status; $('#aq-kanal').value = AQ.kanal;
    ['status', 'kanal'].forEach(function (k) { $('#aq-' + k).addEventListener('change', function (e) { AQ[k] = e.target.value; isiAQ(A.lokal('antrean')); }); });
    $('#aq-proses').addEventListener('click', function (e) {
      var b = e.currentTarget; b.disabled = true; b.innerHTML = '<span class="spin"></span>Memproses…';
      A.tulis('notif.processNow', {}).then(function () { b.disabled = false; b.innerHTML = ic('i-play') + 'Proses sekarang'; A.ambil('antrean', { fresh: true }); });
    });
    var u = $('#aq-ulang'); if (u) u.addEventListener('click', function () { A.tulis('notif.retry', {}).then(function (r) { if (r.success) A.ambil('antrean', { fresh: true }); }); });
    A.on('antrean', isiAQ); isiAQ(A.lokal('antrean'));
  }
  function isiAQ(d) {
    if (!d || !$('#aq-tabel')) return;
    var k = d.ringkas;
    $('#aq-kpi').innerHTML = [['Menunggu', k.Antri, 'i-clock'], ['Terkirim', k.Terkirim, 'i-check'], ['Gagal', k.Gagal, 'i-alert'], ['Dibatalkan', k.Batal, 'i-x']].map(function (x, i) {
      return '<div class="kpi"><div class="kpi-h"><span class="kpi-l">' + x[0] + '</span><span class="kpi-ic' + (i === 1 ? ' leaf' : '') + '">' + ic(x[2]) + '</span></div><div class="kpi-v">' + U.angka(x[1] || 0) + '</div><div class="kpi-s">dari 3.000 entri terakhir</div></div>';
    }).join('');
    $('#aq-kuota').textContent = 'Sisa kuota email hari ini: ' + (d.emailKuota == null ? '-' : d.emailKuota);
    var rows = d.rows.filter(function (r) { return (!AQ.status || r.status === AQ.status) && (!AQ.kanal || r.kanal === AQ.kanal); });
    var st = { Antri: 'pill-warn', Terkirim: 'pill-ok', Gagal: 'pill-err', Batal: 'pill-mute' };
    $('#aq-tabel').innerHTML = rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Kanal</th><th>Tujuan</th><th class="hide-m">Event</th><th class="hide-m">Pesan</th><th>Status</th></tr></thead><tbody>' + rows.map(function (r) {
      return '<tr><td class="nama">' + A.waktu(r.dikirim || r.dibuat) + '</td><td><span class="pill ' + (r.kanal === 'WA' ? 'pill-ok' : 'pill-info') + '">' + (r.kanal === 'WA' ? 'WA' : 'Email') + '</span></td>' +
        '<td class="nama"><b class="mono" style="font-size:.8rem">' + esc(r.tujuan) + '</b><small>' + esc(r.nama) + '</small></td><td class="hide-m"><small>' + esc(r.event === 'BLAST' ? 'Blast' : r.event) + '</small></td>' +
        '<td class="hide-m" style="max-width:300px"><small>' + esc(r.subjek ? r.subjek + ' — ' : '') + esc(r.pesan) + '</small></td><td><span class="pill ' + (st[r.status] || '') + '">' + esc(r.status) + '</span>' + (r.respon && r.status !== 'Terkirim' ? '<br><small title="' + esc(r.respon) + '">' + esc(String(r.respon).slice(0, 40)) + (r.percobaan ? ' · ' + r.percobaan + '×' : '') + '</small>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : A.kosong('Antrean kosong', 'Belum ada notifikasi dengan filter ini.');
  }

  // ---------------- Tab Konfigurasi (Superadmin) ----------------
  function tabConfig(el) {
    el.innerHTML = '<div id="cf">' + A.skel(6, 60) + '</div>';
    A.on('notif', isiConfig); isiConfig(A.lokal('notif'));
  }
  function isiConfig(c) {
    var el = $('#cf'); if (!el || !c) return;
    if (el.dataset.ok) return;
    el.dataset.ok = '1';
    var mx = JSON.parse(JSON.stringify(c.matriks));
    el.innerHTML = '<div class="g-2 rata"><div class="card"><div class="card-h"><div><span class="kick">Gateway Fonnte</span><h2>WhatsApp</h2><p>Token disimpan di Script Properties dan hanya ditampilkan tersamar.</p></div>' +
      '<label class="switch"><input type="checkbox" id="cf-wa"' + (c.waAktif ? ' checked' : '') + '><span class="track"></span><b id="cf-wa-l">' + (c.waAktif ? 'AKTIF' : 'NONAKTIF') + '</b></label></div><div class="fgrid">' +
      '<div class="field"><label class="label" for="cf-token">Token Fonnte</label><input class="input" type="password" id="cf-token" autocomplete="off" placeholder="' + (c.tokenAda ? esc(c.token) + ' (kosongkan bila tidak diubah)' : 'Tempel token dari fonnte.com → Device') + '"><span class="hint">' + (c.tokenAda ? '✓ Token tersimpan. ' : 'Belum ada token. ') + '<a href="#" id="cf-hapus-token"' + (c.tokenAda ? '' : ' hidden') + '>Hapus token</a></span></div>' +
      '<div class="tb"><button class="btn btn-cream btn-sm" type="button" id="cf-dev">' + ic('i-search') + 'Cek perangkat</button><input class="input input-sm" id="cf-tes-no" placeholder="Nomor tes (kosong = WA admin)" style="width:220px"><button class="btn btn-cream btn-sm" type="button" id="cf-tes-wa">' + ic('i-send') + 'Kirim tes</button></div><div id="cf-dev-info"></div>' +
      '<div class="field"><label class="label" for="cf-waadmin">Nomor WA admin (penerima notifikasi leads & tombol "Hubungi Admin")</label><input class="input" id="cf-waadmin" value="' + esc(c.waAdmin) + '" placeholder="628…"></div>' +
      '<div class="field"><span class="label">Ukuran batch blast bawaan</span><div class="seg" id="cf-batch">' + [10, 20, 50].map(function (n) { return '<button type="button" data-b="' + n + '" aria-pressed="' + (c.batchDefault === n) + '">' + n + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label class="label" for="cf-jeda">Jeda antarpesan blast (detik)</label><input class="input" id="cf-jeda" value="' + esc(c.jeda) + '" placeholder="5 atau 3-8"></div>' +
      '<label class="switch"><input type="checkbox" id="cf-deteksi"' + (c.deteksiOtomatis ? ' checked' : '') + '><span class="track"></span>Deteksi otomatis nomor kontak baru terdaftar WA (tiap ±10 menit)</label></div></div>' +
      '<div class="card"><div class="card-h"><div><span class="kick">MailApp (Gmail)</span><h2>Email</h2><p>Sisa kuota hari ini: <b>' + (c.emailKuota == null ? '-' : c.emailKuota) + '</b> (akun Gmail biasa ±100/hari).</p></div>' +
      '<label class="switch"><input type="checkbox" id="cf-em"' + (c.emailAktif ? ' checked' : '') + '><span class="track"></span><b id="cf-em-l">' + (c.emailAktif ? 'AKTIF' : 'NONAKTIF') + '</b></label></div><div class="fgrid">' +
      '<div class="field"><label class="label" for="cf-nama">Nama pengirim</label><input class="input" id="cf-nama" value="' + esc(c.namaPengirim) + '"></div>' +
      '<div class="field"><label class="label" for="cf-emadmin">Email admin (penerima notifikasi leads)</label><input class="input" type="email" id="cf-emadmin" value="' + esc(c.emailAdmin) + '"></div>' +
      '<div class="tb"><input class="input input-sm" id="cf-tes-em" placeholder="Email tes (kosong = email admin)" style="width:240px"><button class="btn btn-cream btn-sm" type="button" id="cf-tes-email">' + ic('i-mail') + 'Kirim email tes</button></div>' +
      '<div class="field"><label class="label" for="cf-url">URL landing page (untuk {link})</label><input class="input" id="cf-url" value="' + esc(c.appUrl) + '" placeholder="https://username.github.io/etalaseku/"></div>' +
      '<div class="note' + (c.trigger ? '' : ' warn') + '">' + ic(c.trigger ? 'i-check' : 'i-alert') + ' Trigger antrean tiap 1 menit: <b>' + (c.trigger ? 'terpasang' : 'belum terpasang — simpan konfigurasi atau jalankan pasangTrigger()') + '</b></div></div></div></div>' +
      '<div class="card"><div class="card-h"><div><span class="kick">Matriks notifikasi otomatis</span><h2>Kejadian × Kanal</h2><p>Atur notifikasi mana yang dikirim lewat WhatsApp dan/atau email, serta isi pesannya.</p></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kejadian</th><th>Penerima</th><th>WhatsApp</th><th>Email</th><th class="aksi"></th></tr></thead><tbody id="cf-mx"></tbody></table></div>' +
      '<div class="tb" style="margin-top:18px"><span class="grow"></span><button class="btn btn-primary btn-lg" type="button" id="cf-simpan">' + ic('i-check') + 'Simpan konfigurasi</button></div></div>';
    var batch = c.batchDefault, buka = {};
    var gambarMx = function () {
      $('#cf-mx').innerHTML = mx.map(function (m, i) {
        return '<tr><td class="nama"><b>' + esc(m.label) + '</b><small class="mono">' + esc(m.kode) + '</small></td><td><span class="pill">' + esc(m.penerima) + '</span></td>' +
          '<td><label class="switch"><input type="checkbox" data-mx="' + i + '" data-k="wa"' + (m.wa ? ' checked' : '') + '><span class="track"></span></label></td>' +
          '<td><label class="switch"><input type="checkbox" data-mx="' + i + '" data-k="email"' + (m.email ? ' checked' : '') + '><span class="track"></span></label></td>' +
          '<td class="aksi"><button class="btn btn-cream btn-xs" type="button" data-edit="' + i + '">' + ic('i-edit') + (buka[i] ? 'Tutup' : 'Ubah pesan') + '</button></td></tr>' +
          (buka[i] ? '<tr><td colspan="5" style="background:var(--cream-50)"><div class="fgrid c2"><div class="field full"><label class="label">Subjek email</label><input class="input input-sm" data-sub="' + i + '" value="' + esc(m.subjek) + '"></div>' +
            '<div class="field"><label class="label">Isi pesan</label><textarea class="textarea" data-psn="' + i + '" style="min-height:170px">' + esc(m.pesan) + '</textarea><div class="var-btns">' + m.vars.map(function (v) { return '<button type="button" data-ins="' + i + '">{' + v + '}</button>'; }).join('') + '</div></div>' +
            '<div class="field"><span class="label">Pratinjau</span><div class="wa-preview"><div class="wa-bubble" data-prev="' + i + '"></div></div><button class="btn btn-ghost btn-xs" type="button" data-reset="' + i + '" style="justify-self:start">↺ Kembalikan bawaan</button></div></div></td></tr>' : '');
      }).join('');
      mx.forEach(function (m, i) { var p = $('[data-prev="' + i + '"]'); if (p) p.innerHTML = esc(contohPesan(m.pesan)).replace(/\*([^*\n]+)\*/g, '<b>$1</b>'); });
    };
    var contohPesan = function (t) { var v = { nama: 'Budi Santoso', profesi: 'Freelancer', produk: 'Masterclass Ads & Funnel', harga: 'Rp 349.000', link_beli: 'https://contoh.com/bayar', brand: (EK.Store.val('authcfg') || {}).brand || 'EtalaseKu', link: c.appUrl || 'https://…', no_wa: '+6281234567890', email: 'budi@email.com', waktu: U.hariIni() + ' 10:00', id: 'LD-…' }; return String(t).replace(/\{(\w+)\}/g, function (m, k) { return v[k] == null ? m : v[k]; }); };
    gambarMx();
    var mxEl = $('#cf-mx');
    mxEl.addEventListener('change', function (e) { var t = e.target; if (t.dataset.mx !== undefined) mx[+t.dataset.mx][t.dataset.k] = t.checked; });
    mxEl.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.sub !== undefined) mx[+t.dataset.sub].subjek = t.value;
      if (t.dataset.psn !== undefined) { mx[+t.dataset.psn].pesan = t.value; $('[data-prev="' + t.dataset.psn + '"]').innerHTML = esc(contohPesan(t.value)).replace(/\*([^*\n]+)\*/g, '<b>$1</b>'); }
    });
    mxEl.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      if (t.dataset.edit !== undefined) { buka[t.dataset.edit] = !buka[t.dataset.edit]; gambarMx(); }
      if (t.dataset.reset !== undefined) { var m = mx[+t.dataset.reset]; m.pesan = m.pesanDefault; m.subjek = m.subjekDefault; gambarMx(); }
      if (t.dataset.ins !== undefined) { var ta = $('[data-psn="' + t.dataset.ins + '"]'), p = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, p) + t.textContent + ta.value.slice(p); ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus(); }
    });
    $('#cf-batch').addEventListener('click', function (e) { var b = e.target.closest('[data-b]'); if (!b) return; batch = +b.dataset.b; $$('#cf-batch button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); });
    $('#cf-wa').addEventListener('change', function (e) { $('#cf-wa-l').textContent = e.target.checked ? 'AKTIF' : 'NONAKTIF'; });
    $('#cf-em').addEventListener('change', function (e) { $('#cf-em-l').textContent = e.target.checked ? 'AKTIF' : 'NONAKTIF'; });
    $('#cf-hapus-token').addEventListener('click', function (e) {
      e.preventDefault();
      A.konfirmasi({ judul: 'Hapus token Fonnte?', pesan: 'Notifikasi & blast WhatsApp akan berhenti sampai token baru diisi.', ok: 'Hapus token', bahaya: true }).then(function (y) {
        if (y) A.tulis('notif.configSave', { token: '__HAPUS__', waAktif: false }).then(function (r) { if (r.success) { $('#cf').dataset.ok = ''; A.simpan('notif', r.data); } });
      });
    });
    $('#cf-dev').addEventListener('click', function () {
      var i = $('#cf-dev-info'); i.innerHTML = '<span class="basi"><span class="spin"></span>Menghubungi Fonnte…</span>';
      API.call('wa.device', {}).then(function (r) {
        i.innerHTML = r.success ? '<div class="info-grid"><div><span>Nomor perangkat</span><b class="mono">' + esc(r.data.device) + '</b></div><div><span>Status</span><b>' + (r.data.status === 'connect' ? '<span class="pill pill-ok">connect</span>' : '<span class="pill pill-err">' + esc(r.data.status || '-') + '</span>') + '</b></div><div><span>Paket</span><b>' + esc(r.data.paket) + '</b></div><div><span>Kuota</span><b>' + esc(r.data.kuota) + '</b></div>' + (r.data.expired ? '<div><span>Kedaluwarsa</span><b>' + esc(r.data.expired) + '</b></div>' : '') + '</div>' : '<p class="note err">' + esc(r.message) + '</p>';
      });
    });
    $('#cf-tes-wa').addEventListener('click', function () { A.tulis('wa.test', { nomor: $('#cf-tes-no').value.trim() }); });
    $('#cf-tes-email').addEventListener('click', function () { A.tulis('email.test', { email: $('#cf-tes-em').value.trim() }); });
    $('#cf-simpan').addEventListener('click', function () {
      var b = this; b.disabled = true; b.innerHTML = '<span class="spin"></span>Menyimpan…';
      var data = { waAktif: $('#cf-wa').checked, emailAktif: $('#cf-em').checked, batchDefault: batch, jeda: $('#cf-jeda').value.trim(), deteksiOtomatis: $('#cf-deteksi').checked,
        namaPengirim: $('#cf-nama').value, appUrl: $('#cf-url').value.trim(), waAdmin: $('#cf-waadmin').value.trim(), emailAdmin: $('#cf-emadmin').value.trim(), matriks: mx };
      var tok = $('#cf-token').value.trim(); if (tok) data.token = tok;
      A.tulis('notif.configSave', data).then(function (r) {
        b.disabled = false; b.innerHTML = ic('i-check') + 'Simpan konfigurasi';
        if (r.success) { $('#cf-token').value = ''; $('#cf').dataset.ok = ''; A.simpan('notif', r.data); A.usang('pengaturan'); A.ambil('sistem', { fresh: true, diam: true }); }
      });
    });
  }

  // =============================================================== CRM KONTAK
  var CR = { q: '', segmen: '', tag: '', statusWA: '', kpi: '', hal: 1, per: 50, pilih: {} };
  A.daftar('crm', {
    mount: function (el, act) {
      CR.hal = 1; CR.pilih = {};
      act.innerHTML = '<button class="btn btn-cream btn-sm" type="button" id="cr-sync">' + ic('i-refresh') + '<span>Sinkron sekarang</span></button><button class="btn btn-cream btn-sm" type="button" id="cr-import">' + ic('i-upload') + '<span>Import CSV</span></button>' +
        '<button class="btn btn-cream btn-sm" type="button" id="cr-dup">' + ic('i-copy') + '<span>Periksa duplikat</span></button>' + (A.isSA() ? '<button class="btn btn-cream btn-sm" type="button" id="cr-ekspor">' + ic('i-download') + '<span>Ekspor</span></button>' : '');
      el.innerHTML = '<div class="kpis kecil" id="cr-kpi">' + A.skel(1, 100) + '</div><div class="card"><div class="card-h"><div><span class="kick">Nama · Email · WhatsApp</span><h2>Daftar Kontak</h2><p id="cr-sub">Satu kontak per orang, disinkron dari Leads.</p></div></div>' +
        '<div class="chips" id="cr-seg" style="margin-bottom:12px"></div>' +
        '<div class="tb" style="margin-bottom:12px"><label class="search grow">' + ic('i-search') + '<input class="input input-sm" id="cr-q" placeholder="Cari nama, email, nomor…" value="' + esc(CR.q) + '"></label>' +
        '<select class="select select-sm" id="cr-tag" style="width:auto"><option value="">Semua tag</option></select><select class="select select-sm" id="cr-wa" style="width:auto"><option value="">Status WA: semua</option><option value="Terdaftar">Terdaftar WA</option><option value="Tidak Terdaftar">Bukan WA</option><option value="belum">Belum dicek</option></select></div>' +
        '<div class="bulk" id="cr-bulk" hidden></div><div id="cr-tabel" style="margin-top:10px">' + A.skel(8) + '</div></div>';
      $('#cr-q').addEventListener('input', U.debounce(function (e) { CR.q = e.target.value; CR.hal = 1; isiCRM(); }, 200));
      $('#cr-tag').addEventListener('change', function (e) { CR.tag = e.target.value; CR.hal = 1; isiCRM(); });
      $('#cr-wa').addEventListener('change', function (e) { CR.statusWA = e.target.value; CR.hal = 1; isiCRM(); });
      $('#cr-seg').addEventListener('click', function (e) { var b = e.target.closest('[data-seg]'); if (!b) return; CR.segmen = CR.segmen === b.dataset.seg ? '' : b.dataset.seg; CR.hal = 1; isiCRM(); });
      $('#cr-kpi').addEventListener('click', function (e) { var b = e.target.closest('[data-kpi]'); if (!b) return; CR.kpi = CR.kpi === b.dataset.kpi ? '' : b.dataset.kpi; CR.hal = 1; isiCRM(); });
      $('#cr-sync').addEventListener('click', function () { var b = this; b.disabled = true; A.tulis('crm.sync', {}).then(function () { b.disabled = false; A.ambil('crm', { fresh: true }); }); });
      $('#cr-import').addEventListener('click', modalImport);
      $('#cr-dup').addEventListener('click', modalDuplikat);
      var ek = $('#cr-ekspor'); if (ek) ek.addEventListener('click', function () {
        var rows = saringCRM(), kol = [['nama', 'Nama'], ['email', 'Email'], ['wa', 'WhatsApp'], ['segmen', 'Segmen'], ['tag', 'Tag'], ['statusWA', 'Status WA'], [function (r) { return r.optOut ? 'YA' : 'TIDAK'; }, 'Opt-out'], ['jumlahPesan', 'Jumlah Pesan'], ['terakhir', 'Terakhir Dihubungi'], ['catatan', 'Catatan']];
        A.unduh('kontak-crm-' + U.hariIni() + '.csv', A.csv(rows, kol), 'text/csv;charset=utf-8');
        A.tulis('export.catat', { jenis: 'crm', jumlah: rows.length, format: 'csv' }, { pesan: rows.length + ' kontak diekspor.' });
      });
      $('#cr-tabel').addEventListener('change', function (e) {
        var t = e.target;
        if (t.matches('[data-all]')) { halamanCRM().forEach(function (k) { if (t.checked) CR.pilih[k.id] = 1; else delete CR.pilih[k.id]; }); isiCRM(); }
        else if (t.matches('[data-pilih]')) { if (t.checked) CR.pilih[t.dataset.pilih] = 1; else delete CR.pilih[t.dataset.pilih]; t.closest('tr').classList.toggle('dipilih', t.checked); bulkCRM(); }
      });
      $('#cr-tabel').addEventListener('click', function (e) { var d = e.target.closest('[data-detail]'); if (d) bukaKontak(d.dataset.detail); });
      A.on('crm', isiCRM); isiCRM();
    },
    muat: function (fresh) { A.ambil('crm', { fresh: fresh }); }
  });
  function saringCRM() {
    var d = A.lokal('crm'); if (!d) return [];
    var q = CR.q.toLowerCase().trim();
    return d.rows.filter(function (k) {
      if (CR.segmen && k.segmen !== CR.segmen) return false;
      if (CR.tag && (',' + k.tag + ',').indexOf(',' + CR.tag + ',') === -1) return false;
      if (CR.statusWA && (CR.statusWA === 'belum' ? k.statusWA : k.statusWA !== CR.statusWA)) return false;
      if (CR.kpi === 'wa' && k.statusWA !== 'Terdaftar') return false;
      if (CR.kpi === 'email' && k.emailValid !== 'YA') return false;
      if (CR.kpi === 'belum' && (k.statusWA || !hpValid(k.wa))) return false;
      if (CR.kpi === 'opt' && !k.optOut) return false;
      if (CR.kpi === 'dup' && !k.duplikat) return false;
      if (q && (k.nama + ' ' + k.email + ' ' + k.wa + ' ' + k.tag + ' ' + k.catatan + ' ' + (k.info.profesi || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }
  function halamanCRM() { var r = saringCRM(); return r.slice((CR.hal - 1) * CR.per, CR.hal * CR.per); }
  function isiCRM() {
    if (A.aktif !== 'crm') return;
    var d = A.lokal('crm'); if (!d) return;
    var s = d.stats;
    $('#cr-kpi').innerHTML = [['', 'Total kontak', s.total, 'i-contact', s.baru7 + ' baru 7 hari terakhir'], ['wa', 'WA terverifikasi', s.terdaftarWA, 'i-wa', s.waValid + ' nomor valid'], ['email', 'Email valid', s.emailValid, 'i-mail', s.tidakBisa + ' tidak bisa dihubungi'],
      ['belum', 'Belum dicek WA', s.belumCek, 'i-search', 'Klik untuk menyaring'], ['opt', 'Opt-out', s.optOut, 'i-x', 'Tidak masuk blast'], ['dup', 'Duplikat', s.duplikat, 'i-copy', 'Nomor/email sama']].map(function (x) {
      return '<button class="kpi" type="button" data-kpi="' + x[0] + '" aria-pressed="' + (CR.kpi === x[0] && (x[0] || !CR.kpi)) + '"><div class="kpi-h"><span class="kpi-l">' + x[1] + '</span><span class="kpi-ic' + (x[0] === 'wa' ? ' leaf' : '') + '">' + ic(x[3]) + '</span></div><div class="kpi-v sm">' + U.angka(x[2]) + '</div><div class="kpi-s">' + x[4] + '</div></button>';
    }).join('');
    $('#cr-sub').textContent = 'Satu kontak per orang, disinkron dari Leads' + (d.syncTerakhir ? ' · sinkron terakhir ' + U.relatif(d.syncTerakhir) : '') + '.';
    $('#cr-seg').innerHTML = Object.keys(s.segmen).map(function (g) { return '<button class="chip-btn" type="button" data-seg="' + esc(g) + '" aria-pressed="' + (CR.segmen === g) + '">' + esc(g) + ' <em>' + s.segmen[g] + '</em></button>'; }).join('');
    var tagSel = $('#cr-tag'); tagSel.innerHTML = '<option value="">Semua tag</option>' + Object.keys(s.tag).map(function (t) { return '<option' + (CR.tag === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('');
    $('#cr-wa').value = CR.statusWA;
    var rows = saringCRM(), n = rows.length, hal = Math.min(CR.hal, Math.max(1, Math.ceil(n / CR.per))); CR.hal = hal;
    var tampil = rows.slice((hal - 1) * CR.per, hal * CR.per);
    $('#cr-tabel').innerHTML = n ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px"><input type="checkbox" class="chk" data-all' + (tampil.every(function (k) { return CR.pilih[k.id]; }) ? ' checked' : '') + ' aria-label="Pilih semua"></th><th>Kontak</th><th>WhatsApp</th><th class="hide-m">Tag</th><th class="hide-m">Terakhir dihubungi</th><th class="num hide-m">Pesan</th><th class="aksi"></th></tr></thead><tbody>' +
      tampil.map(function (k) {
        var masalah = !hpValid(k.wa) || k.emailValid === 'TIDAK' || k.duplikat;
        return '<tr' + (CR.pilih[k.id] ? ' class="dipilih"' : '') + '><td><input type="checkbox" class="chk" data-pilih="' + esc(k.id) + '"' + (CR.pilih[k.id] ? ' checked' : '') + '></td>' +
          '<td class="kontak"><div style="display:flex;gap:10px;align-items:center"><span class="avatar" style="width:36px;height:36px;font-size:.78rem;' + (masalah ? 'box-shadow:0 0 0 2px #F3DD9B' : '') + '">' + esc(U.inisial(k.nama)) + '</span><div class="nama"><b>' + esc(k.nama) + '</b><small>' + esc(k.email || 'tanpa email') + (k.email ? (k.emailValid === 'YA' ? ' ✓' : ' ⚠') : '') + '</small><small>' + esc(k.segmen) + (k.info.profesi ? ' · ' + esc(k.info.profesi) : '') + (k.optOut ? ' · <span style="color:var(--err)">opt-out</span>' : '') + '</small></div></div></td>' +
          '<td class="cell-wa" style="white-space:nowrap">' + (k.wa ? '<a href="' + esc(U.waLink(k.wa)) + '" target="_blank" rel="noopener" style="text-decoration:none">' + esc(k.wa) + '</a> ' + badgeWA(k.statusWA) : '<small>-</small>') + '</td>' +
          '<td class="hide-m">' + (k.tag ? k.tag.split(',').map(function (t) { return '<span class="pill pill-burnt" style="margin:1px">' + esc(t) + '</span>'; }).join('') : '<small>-</small>') + '</td>' +
          '<td class="hide-m"><small>' + esc(k.terakhir ? U.relatif(k.terakhir) : '-') + '</small></td><td class="num hide-m">' + k.jumlahPesan + '</td>' +
          '<td class="aksi"><button class="btn btn-cream btn-xs" type="button" data-detail="' + esc(k.id) + '">Detail</button></td></tr>';
      }).join('') + '</tbody></table></div>' + A.pager(n, hal, CR.per) : A.kosong('Tidak ada kontak yang cocok', d.rows.length ? 'Ubah filter atau kata kunci.' : 'Kontak muncul otomatis setelah ada leads, atau impor CSV.');
    $$('#cr-tabel [data-hal]').forEach(function (b) { b.addEventListener('click', function () { CR.hal = +b.dataset.hal; isiCRM(); }); });
    bulkCRM();
  }
  function bulkCRM() {
    var ids = Object.keys(CR.pilih), b = $('#cr-bulk'); if (!b) return;
    if (!ids.length) { b.hidden = true; return; }
    b.hidden = false;
    b.innerHTML = '<span><b>' + ids.length + '</b> kontak dipilih</span><button class="btn btn-ghost btn-sm" type="button" data-b="deteksi">' + ic('i-search') + 'Deteksi WA</button><button class="btn btn-ghost btn-sm" type="button" data-b="tag">' + ic('i-tag') + 'Beri tag</button>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-b="blast">' + ic('i-send') + 'Blast ke terpilih</button><button class="btn btn-ghost btn-sm" type="button" data-b="optout">Opt-out</button><button class="btn btn-ghost btn-sm" type="button" data-b="optin">Opt-in</button><button class="btn btn-ghost btn-sm" type="button" data-b="batal" style="margin-left:auto">Batal pilih</button>';
    b.onclick = function (e) {
      var t = e.target.closest('[data-b]'); if (!t) return;
      var d = A.lokal('crm'), set = {}; ids.forEach(function (i) { set[i] = 1; });
      var dipilih = d.rows.filter(function (k) { return set[k.id]; });
      var aksi = t.dataset.b;
      if (aksi === 'batal') { CR.pilih = {}; isiCRM(); return; }
      if (aksi === 'blast') { sessionStorage.setItem('ek_blast_penerima', JSON.stringify(dipilih.map(function (k) { return { hp: k.wa, nama: k.nama, statusWA: k.statusWA, optOut: k.optOut, vars: { produk: k.info.produkTerakhir || '', profesi: k.info.profesi || '' } }; }))); A.ke('wa', 'tab=blast&dari=crm'); return; }
      if (aksi === 'deteksi') {
        var nomor = dipilih.map(function (k) { return k.wa; }).filter(hpValid).slice(0, 50);
        if (!nomor.length) { U.toast('Tidak ada nomor valid.', 'err'); return; }
        A.tulis('wa.validate', { nomor: nomor }, { pesan: false }).then(function (r) { if (r.success) { U.toast(r.data.terdaftar + ' terdaftar WA, ' + r.data.tidak + ' tidak.'); A.ambil('crm', { fresh: true }); } });
        return;
      }
      var kirim = function (nilai) {
        var cad = JSON.stringify(d);
        d.rows.forEach(function (k) {
          if (!set[k.id]) return;
          if (aksi === 'tag') k.tag = (k.tag ? k.tag + ',' : '') + nilai;
          if (aksi === 'optout') k.optOut = true; if (aksi === 'optin') k.optOut = false;
        });
        A.simpan('crm', d); CR.pilih = {};
        A.tulis('crm.bulk', { ids: ids, aksi: aksi, nilai: nilai || '' }).then(function (r) { if (!r.success) A.simpan('crm', JSON.parse(cad)); else A.ambil('crm', { fresh: true, diam: true }); });
      };
      if (aksi === 'tag') {
        A.modal('<h3 style="font-size:1.3rem;font-weight:800;margin-bottom:12px">Beri tag ke ' + ids.length + ' kontak</h3><input class="input" id="tg-in" placeholder="Mis. webinar-okt" maxlength="30"><div class="tb" style="margin-top:14px;justify-content:flex-end"><button class="btn btn-ghost" data-mtutup type="button">Batal</button><button class="btn btn-primary" type="button" id="tg-ok">Terapkan</button></div>', function (inn, tutup) {
          var ok = function () { var v = $('#tg-in', inn).value.trim(); if (!v) return; tutup(); kirim(v); };
          $('#tg-ok', inn).addEventListener('click', ok); $('#tg-in', inn).addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); }); setTimeout(function () { $('#tg-in', inn).focus(); }, 30);
        });
      } else kirim('');
    };
  }
  function bukaKontak(id) {
    var d = A.lokal('crm'), k = d && d.rows.filter(function (x) { return x.id === id; })[0]; if (!k) return;
    var inn = A.drawer.buka({
      judul: k.nama, sub: esc(k.segmen) + (k.info.profesi ? ' · ' + esc(k.info.profesi) : '') + ' · sumber ' + esc(k.sumber), ikon: '<span class="avatar" style="width:48px;height:48px;border-radius:14px">' + esc(U.inisial(k.nama)) + '</span>', fokus: false,
      isi: '<div class="info-grid"><div><span>WhatsApp</span><b class="mono">' + esc(k.wa || '-') + ' ' + (k.wa ? badgeWA(k.statusWA) : '') + '</b></div><div><span>Email</span><b>' + esc(k.email || '-') + '</b></div><div><span>Jumlah pesan terkirim</span><b>' + k.jumlahPesan + '</b></div><div><span>Terakhir dihubungi</span><b>' + esc(k.terakhir || '-') + '</b></div>' +
        (k.info.produk ? '<div><span>Produk diminati</span><b>' + esc((k.info.produk || []).join(', ')) + '</b></div>' : '') + '</div>' +
        '<div class="tb">' + (k.wa ? '<a class="btn btn-leaf btn-sm" target="_blank" rel="noopener" href="' + esc(U.waLink(k.wa, 'Halo ' + k.nama + ', ')) + '">' + ic('i-wa') + 'Chat WA</a><button class="btn btn-cream btn-sm" type="button" id="kt-salin">' + ic('i-copy') + 'Salin nomor</button>' : '') + (k.email ? '<a class="btn btn-cream btn-sm" href="mailto:' + esc(k.email) + '">' + ic('i-mail') + 'Email</a>' : '') + '</div>' +
        '<div class="field"><label class="label" for="kt-tag">Tag (pisahkan dengan koma)</label><input class="input" id="kt-tag" value="' + esc(k.tag) + '"></div>' +
        '<div class="field"><label class="label" for="kt-cat">Catatan</label><textarea class="textarea" id="kt-cat" style="min-height:80px">' + esc(k.catatan) + '</textarea></div>' +
        '<label class="switch"><input type="checkbox" id="kt-opt"' + (k.optOut ? ' checked' : '') + '><span class="track"></span>Opt-out (tidak dikirimi blast)</label>' +
        '<div class="sect"><div class="sect-t">' + ic('i-clock') + 'Riwayat interaksi</div><div id="kt-tl"><span class="basi"><span class="spin"></span>Memuat…</span></div>' +
        '<div class="fgrid c2"><select class="select select-sm" id="kt-kanal"><option>Telepon</option><option>WA Manual</option><option>Email Manual</option><option>Kunjungan</option><option>Catatan</option></select><input class="input input-sm" id="kt-ring" placeholder="Ringkasan interaksi…"><button class="btn btn-cream btn-sm full" type="button" id="kt-catat">' + ic('i-plus') + 'Catat interaksi</button></div></div>',
      kaki: '<button class="btn btn-ghost" type="button" data-tt>Tutup</button><button class="btn btn-primary" type="button" id="kt-simpan">' + ic('i-check') + 'Simpan</button>'
    });
    $('[data-tt]', inn).addEventListener('click', function () { A.drawer.tutup(); });
    var s = $('#kt-salin', inn); if (s) s.addEventListener('click', function () { A.salin(k.wa); });
    var muatTL = function () {
      API.call('crm.detail', { id: id }).then(function (r) {
        var el = $('#kt-tl', inn); if (!el) return;
        if (!r.success) { el.innerHTML = '<p class="note err">' + esc(r.message) + '</p>'; return; }
        var tl = r.data.timeline;
        el.innerHTML = tl.length ? '<div class="tl">' + tl.slice(0, 30).map(function (t) {
          var c = t.jenis === 'lead' ? 'in' : t.status === 'Gagal' ? 'err' : t.status === 'Terkirim' ? 'ok' : '';
          return '<div class="' + c + '"><small>' + esc(t.waktu) + ' · ' + esc(t.kanal) + (t.status ? ' · ' + esc(t.status) : '') + (t.oleh ? ' · ' + esc(t.oleh) : '') + '</small>' + esc(t.ringkasan) + '</div>';
        }).join('') + '</div>' : '<p class="note">Belum ada interaksi.</p>';
      });
    };
    muatTL();
    $('#kt-catat', inn).addEventListener('click', function () {
      var ring = $('#kt-ring', inn).value.trim(); if (!ring) { $('#kt-ring', inn).focus(); return; }
      A.tulis('crm.interaksi', { id: id, kanal: $('#kt-kanal', inn).value, ringkasan: ring }).then(function (r) { if (r.success) { $('#kt-ring', inn).value = ''; muatTL(); A.usang('crm'); } });
    });
    $('#kt-simpan', inn).addEventListener('click', function () {
      var data = { id: id, tag: $('#kt-tag', inn).value, catatan: $('#kt-cat', inn).value, optOut: $('#kt-opt', inn).checked };
      var cad = JSON.stringify(d);
      d.rows.forEach(function (x) { if (x.id === id) { x.tag = data.tag.split(',').map(function (t) { return t.trim(); }).filter(Boolean).join(','); x.catatan = data.catatan; x.optOut = data.optOut; } });
      A.simpan('crm', d); A.drawer.tutup();
      A.tulis('crm.save', data).then(function (r) { if (!r.success) A.simpan('crm', JSON.parse(cad)); });
    });
  }
  function parseCSV(teks) {
    teks = teks.replace(/^﻿/, '');
    var baris1 = teks.split(/\r?\n/)[0] || '', delim = (baris1.match(/;/g) || []).length > (baris1.match(/,/g) || []).length ? ';' : ',';
    var rows = [], row = [], sel = '', kutip = false;
    for (var i = 0; i < teks.length; i++) {
      var c = teks[i];
      if (kutip) { if (c === '"') { if (teks[i + 1] === '"') { sel += '"'; i++; } else kutip = false; } else sel += c; }
      else if (c === '"') kutip = true;
      else if (c === delim) { row.push(sel); sel = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && teks[i + 1] === '\n') i++; row.push(sel); rows.push(row); row = []; sel = ''; }
      else sel += c;
    }
    if (sel || row.length) { row.push(sel); rows.push(row); }
    rows = rows.filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
    if (!rows.length) return [];
    var h = rows[0].map(function (x) { return String(x).trim().toLowerCase(); });
    return rows.slice(1).map(function (r) { var o = {}; h.forEach(function (k, j) { o[k] = String(r[j] == null ? '' : r[j]).trim(); }); return o; });
  }
  A.parseCSV = parseCSV;
  function modalImport() {
    A.modal('<h3 style="font-size:1.35rem;font-weight:800">Import kontak dari CSV</h3><p class="muted" style="margin:6px 0 14px">Kolom: <span class="mono-box">nama, email, wa, segmen, tag</span>. Nomor ganda dilewati.</p>' +
      '<div class="tb"><label class="btn btn-cream btn-sm" style="cursor:pointer">' + ic('i-upload') + 'Pilih berkas CSV<input type="file" accept=".csv,text/csv" id="im-file" hidden></label><button class="btn btn-ghost btn-sm" type="button" id="im-tpl">' + ic('i-download') + 'Unduh template</button></div>' +
      '<div id="im-prev" style="margin-top:14px"></div><div class="tb" style="margin-top:14px;justify-content:flex-end"><button class="btn btn-ghost" data-mtutup type="button">Batal</button><button class="btn btn-primary" type="button" id="im-go" disabled>Impor</button></div>', function (inn, tutup) {
      var data = [];
      $('#im-tpl', inn).addEventListener('click', function () { A.unduh('template-kontak.csv', '﻿nama,email,wa,segmen,tag\r\nBudi Santoso,budi@email.com,081234567890,Peserta Webinar,webinar-okt\r\n', 'text/csv'); });
      $('#im-file', inn).addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        var r = new FileReader(); r.onload = function () {
          data = parseCSV(r.result);
          $('#im-prev', inn).innerHTML = data.length ? '<p class="label">' + data.length + ' baris terbaca. Pratinjau:</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Email</th><th>WA</th><th>Tag</th></tr></thead><tbody>' + data.slice(0, 5).map(function (o) { return '<tr><td>' + esc(o.nama || o.name) + '</td><td>' + esc(o.email) + '</td><td class="cell-wa">' + esc(o.wa || o.whatsapp || o.no_wa) + '</td><td>' + esc(o.tag) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="note err">Berkas kosong atau format tidak dikenali.</p>';
          $('#im-go', inn).disabled = !data.length;
        };
        r.readAsText(f);
      });
      $('#im-go', inn).addEventListener('click', function () { tutup(); A.tulis('crm.import', { rows: data }).then(function (r) { if (r.success) A.ambil('crm', { fresh: true }); }); });
    });
  }
  function modalDuplikat() {
    var d = A.lokal('crm'); if (!d) return;
    var grup = {};
    d.rows.forEach(function (k) { [k.wa && 'wa:' + k.wa, k.email && 'em:' + k.email].filter(Boolean).forEach(function (key) { (grup[key] = grup[key] || []).push(k); }); });
    var list = Object.keys(grup).filter(function (k) { return grup[k].length > 1; });
    A.modal('<h3 style="font-size:1.35rem;font-weight:800">Periksa duplikat</h3><p class="muted" style="margin:6px 0 14px">' + (list.length ? list.length + ' grup kontak memiliki nomor/email yang sama. Kontak pertama menjadi kontak utama.' : 'Tidak ada duplikat. 🎉') + '</p>' +
      list.map(function (key, i) {
        return '<div class="card" style="padding:14px;margin-bottom:10px"><div class="tb"><b class="mono" style="font-size:.8rem">' + esc(key.slice(3)) + '</b><span class="grow"></span><button class="btn btn-primary btn-xs" type="button" data-gabung="' + i + '">Gabungkan</button></div>' +
          grup[key].map(function (k, j) { return '<div style="font-size:.84rem;margin-top:6px">' + (j === 0 ? '★ ' : '') + esc(k.nama) + ' <small class="muted">· ' + esc(k.segmen) + ' · ' + esc(k.id) + '</small></div>'; }).join('') + '</div>';
      }).join(''), function (inn, tutup) {
      $$('[data-gabung]', inn).forEach(function (b) {
        b.addEventListener('click', function () {
          var g = grup[list[+b.dataset.gabung]];
          tutup();
          A.tulis('crm.merge', { utama: g[0].id, gabung: g.slice(1).map(function (k) { return k.id; }) }).then(function (r) { if (r.success) A.ambil('crm', { fresh: true }); });
        });
      });
    });
  }
})(window.EKA);
