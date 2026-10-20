/**
 * admin-konten.js — kelola konten landing page (CRUD optimistik)
 * Hero, Produk, Hasil Kelas, Testimoni, Kelas & Kurikulum, Video YouTube.
 */
(function (A) {
  'use strict';
  var U = A.U, esc = A.esc, $ = A.$, $$ = A.$$, ic = A.ic, Store = EK.Store;

  var TIPE_PRODUK = ['Video Course', 'E-Book', 'Template', 'Kelas Live', 'Konsultasi', 'Bundle'];
  var SKEMA = {
    hero: { label: 'Slide Hero', tambah: 'Tambah slide', urut: true, gambar: 'gambar_url', judul: 'judul', sub: function (r) { return r.subjudul; },
      badge: function (r) { return r.cta_teks ? 'CTA: ' + r.cta_teks : ''; },
      fields: [{ k: 'judul', l: 'Judul besar', req: 1, full: 1, max: 120, ph: 'Belajar & Kuasai Bisnis Digital dari Nol.' }, { k: 'subjudul', l: 'Deskripsi singkat', t: 'textarea', full: 1 },
        { k: 'gambar_url', l: 'Gambar sisi kanan', t: 'img', full: 1 }, { k: 'cta_teks', l: 'Teks tombol', ph: 'Daftar Sekarang', max: 40 }, { k: 'cta_link', l: 'Tujuan tombol', t: 'cta' }, { k: 'status', l: 'Tampilkan di landing', t: 'status', full: 1 }] },
    produk: { label: 'Produk', tambah: 'Tambah produk', urut: true, gambar: 'gambar_url', judul: 'nama', badge: function (r) { return r.tipe; },
      sub: function (r) { return U.rp(r.harga) + (r.harga_coret > r.harga ? '  ·  coret ' + U.rp(r.harga_coret) : '') + (r.link_beli ? '  ·  link bayar ✓' : '  ·  ke WA admin'); },
      fields: [{ k: 'nama', l: 'Nama produk', req: 1, full: 1, max: 120 }, { k: 'tipe', l: 'Tipe', t: 'list', opsi: TIPE_PRODUK }, { k: 'harga', l: 'Harga (Rp)', t: 'number', req: 1 },
        { k: 'harga_coret', l: 'Harga coret (Rp)', t: 'number', hint: 'Kosongkan bila tidak ada diskon' }, { k: 'link_beli', l: 'Link pembayaran', t: 'url', ph: 'https://…', hint: 'Kosong = pembeli diarahkan ke WhatsApp admin' },
        { k: 'deskripsi', l: 'Deskripsi', t: 'textarea', full: 1 }, { k: 'gambar_url', l: 'Gambar produk', t: 'img', full: 1 }, { k: 'status', l: 'Tampilkan di landing', t: 'status', full: 1 }] },
    hasil: { label: 'Hasil Kelas', tambah: 'Tambah hasil', gambar: 'gambar_url', judul: 'judul', badge: function (r) { return U.tgl(r.tanggal); }, sub: function (r) { return r.nama_member + ' — ' + (r.ringkasan || ''); },
      fields: [{ k: 'judul', l: 'Judul hasil', req: 1, full: 1, ph: 'Omzet peluncuran Rp 48,5 juta' }, { k: 'nama_member', l: 'Nama member', req: 1 }, { k: 'tanggal', l: 'Tanggal', t: 'date' },
        { k: 'ringkasan', l: 'Ringkasan / kutipan', t: 'textarea', full: 1 }, { k: 'gambar_url', l: 'Gambar bukti', t: 'img', full: 1 }, { k: 'status', l: 'Tampilkan di landing', t: 'status', full: 1 }] },
    testimoni: { label: 'Testimoni', tambah: 'Tambah testimoni', gambar: 'avatar_url', judul: 'nama', avatar: true, badge: function (r) { return '★ ' + (r.rating || 5); }, sub: function (r) { return (r.peran ? r.peran + ' — ' : '') + r.isi; },
      fields: [{ k: 'nama', l: 'Nama', req: 1 }, { k: 'peran', l: 'Peran / profesi' }, { k: 'rating', l: 'Rating', t: 'rating', full: 1 }, { k: 'isi', l: 'Isi testimoni', t: 'textarea', req: 1, full: 1 },
        { k: 'avatar_url', l: 'Foto (opsional)', t: 'img', full: 1 }, { k: 'status', l: 'Tampilkan di landing', t: 'status', full: 1 }] },
    kelas: { label: 'Kelas', fields: [{ k: 'nama', l: 'Nama kelas', req: 1, full: 1 }, { k: 'durasi', l: 'Durasi', ph: '8+ jam video HD' }, { k: 'level', l: 'Tingkatan', ph: 'Pemula → Mahir' }, { k: 'deskripsi', l: 'Deskripsi kelas', t: 'textarea', full: 1 }] },
    kurikulum: { label: 'Modul', fields: [{ k: 'judul', l: 'Judul modul', req: 1, full: 1 }, { k: 'topik', l: 'Topik (satu per baris)', t: 'textarea', full: 1, hint: 'Setiap baris tampil sebagai poin di akordeon landing page.' }] }
  };

  function konten() { return A.lokal('konten'); }
  function baris(jenis) { var k = konten(); return k ? (k[jenis] || []) : null; }
  function simpanLokal(jenis, rows) { var k = konten() || {}; k[jenis] = rows; A.simpan('konten', k); Store.usang('konten'); }
  function urutkan(jenis, rows) {
    if (jenis === 'hasil') return rows.slice().sort(function (a, b) { return String(b.tanggal).localeCompare(String(a.tanggal)); });
    if (SKEMA[jenis].urut || jenis === 'kurikulum') return rows.slice().sort(function (a, b) { return (Number(a.urutan) || 999) - (Number(b.urutan) || 999); });
    return rows;
  }

  // ---------------- Form generik ----------------
  function htmlField(f, r) {
    var v = r[f.k] === undefined || r[f.k] === null ? '' : r[f.k], id = 'f-' + f.k, req = f.req ? ' <span class="req">*</span>' : '', cls = 'field' + (f.full ? ' full' : '');
    var hint = f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '';
    switch (f.t) {
      case 'textarea': return '<div class="' + cls + '"><label class="label" for="' + id + '">' + esc(f.l) + req + '</label><textarea class="textarea" id="' + id + '" name="' + f.k + '"' + (f.req ? ' required' : '') + '>' + esc(v) + '</textarea>' + hint + '</div>';
      case 'number': return '<div class="' + cls + '"><label class="label" for="' + id + '">' + esc(f.l) + req + '</label><input class="input" type="number" inputmode="numeric" min="0" step="1000" id="' + id + '" name="' + f.k + '" value="' + esc(v) + '"' + (f.req ? ' required' : '') + '>' + hint + '</div>';
      case 'date': return '<div class="' + cls + '"><label class="label" for="' + id + '">' + esc(f.l) + '</label><input class="input" type="date" id="' + id + '" name="' + f.k + '" value="' + esc(String(v).slice(0, 10)) + '">' + hint + '</div>';
      case 'url': return '<div class="' + cls + '"><label class="label" for="' + id + '">' + esc(f.l) + '</label><input class="input" type="url" id="' + id + '" name="' + f.k + '" value="' + esc(v) + '" placeholder="' + esc(f.ph || '') + '">' + hint + '</div>';
      case 'img': return '<div class="' + cls + '"><span class="label">' + esc(f.l) + '</span>' + A.inputGambar(f.k, v, f.k === 'avatar_url' ? 'avatar' : 'konten') + '</div>';
      case 'status': return '<div class="' + cls + '"><label class="switch"><input type="checkbox" name="status" data-status ' + (String(v || 'aktif') !== 'nonaktif' ? 'checked' : '') + '><span class="track"></span>' + esc(f.l) + '</label></div>';
      case 'rating': return '<div class="' + cls + '"><span class="label">' + esc(f.l) + '</span><input type="hidden" name="rating" value="' + (Number(v) || 5) + '"><div class="rating-in" data-rating>' + [1, 2, 3, 4, 5].map(function (i) { return '<button type="button" data-r="' + i + '" class="' + (i <= (Number(v) || 5) ? 'on' : '') + '" aria-label="' + i + ' bintang"><svg viewBox="0 0 24 24"><use href="#i-star"/></svg></button>'; }).join('') + '</div></div>';
      case 'list': return '<div class="' + cls + '"><label class="label" for="' + id + '">' + esc(f.l) + '</label><input class="input" id="' + id + '" name="' + f.k + '" list="dl-' + f.k + '" value="' + esc(v) + '"><datalist id="dl-' + f.k + '">' + f.opsi.map(function (o) { return '<option value="' + esc(o) + '">'; }).join('') + '</datalist></div>';
      case 'cta':
        var prod = (baris('produk') || []);
        return '<div class="' + cls + '"><label class="label" for="' + id + '">' + esc(f.l) + '</label><input class="input" id="' + id + '" name="' + f.k + '" value="' + esc(v) + '" placeholder="#produk">' +
          '<select class="select select-sm" data-cta-pilih style="margin-top:6px"><option value="">Pilih cepat…</option><option value="#produk">Gulir ke etalase produk</option><option value="#kurikulum">Gulir ke kurikulum</option><option value="#video-profil">Gulir ke video</option>' +
          prod.map(function (p) { return '<option value="#beli:' + esc(p.id) + '">Buka checkout: ' + esc(p.nama) + '</option>'; }).join('') + '</select></div>';
      default: return '<div class="' + cls + '"><label class="label" for="' + id + '">' + esc(f.l) + req + '</label><input class="input" id="' + id + '" name="' + f.k + '" value="' + esc(v) + '"' + (f.max ? ' maxlength="' + f.max + '"' : '') + ' placeholder="' + esc(f.ph || '') + '"' + (f.req ? ' required' : '') + '>' + hint + '</div>';
    }
  }
  function bacaForm(form, skema) {
    var o = {}, err = [];
    skema.fields.forEach(function (f) {
      if (f.t === 'status') { o.status = $('[data-status]', form).checked ? 'aktif' : 'nonaktif'; return; }
      var el = form.querySelector('[name="' + f.k + '"]'); if (!el) return;
      var v = String(el.value || '').trim();
      if (f.req && !v) err.push(f.l + ' wajib diisi.');
      if (f.t === 'number') v = v === '' ? (f.req ? '' : 0) : Number(v);
      if ((f.t === 'url' || f.t === 'img') && v && !/^https?:\/\//i.test(v)) err.push(f.l + ' harus diawali https://');
      if (f.t === 'rating') v = Number(v) || 5;
      o[f.k] = v;
    });
    if (o.harga_coret && o.harga && o.harga_coret <= o.harga) o.harga_coret = 0;
    return { o: o, err: err };
  }
  function pasangForm(inn) {
    A.pasangGambar(inn);
    var r = $('[data-rating]', inn);
    if (r) r.addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (!b) return; var n = +b.dataset.r; $('[name=rating]', inn).value = n; $$('button', r).forEach(function (x) { x.classList.toggle('on', +x.dataset.r <= n); }); });
    var c = $('[data-cta-pilih]', inn);
    if (c) c.addEventListener('change', function () { if (c.value) { $('[name=cta_link]', inn).value = c.value; c.value = ''; } });
  }

  /** Buka laci form tambah/ubah. ekstra: field tetap (mis. kelas_id) */
  function bukaForm(jenis, row, ekstra, setelah) {
    var sk = SKEMA[jenis], baru = !row;
    row = row || {};
    A.drawer.buka({
      judul: (baru ? 'Tambah ' : 'Ubah ') + sk.label, sub: baru ? 'Isi kolom bertanda * lalu simpan.' : 'ID: <span class="mono">' + esc(row.id) + '</span>',
      isi: '<form class="fgrid c2" id="kf" novalidate>' + sk.fields.map(function (f) { return htmlField(f, row); }).join('') + '</form><div class="note err" id="kf-err" hidden></div>',
      kaki: '<button class="btn btn-ghost" type="button" data-batal>Batal</button><button class="btn btn-primary" type="button" id="kf-simpan">' + ic('i-check') + (baru ? 'Tambahkan' : 'Simpan perubahan') + '</button>',
      onMount: function (inn) {
        pasangForm(inn);
        $('[data-batal]', inn).addEventListener('click', function () { A.drawer.tutup(); });
        var kirim = function () {
          var b = bacaForm($('#kf', inn), sk);
          if (b.err.length) { var e = $('#kf-err', inn); e.innerHTML = b.err.map(esc).join('<br>'); e.hidden = false; return; }
          var data = Object.assign({}, b.o, ekstra || {});
          if (!baru) data.id = row.id;
          A.drawer.tutup();
          simpanOptimis(jenis, data, baru, setelah);
        };
        $('#kf-simpan', inn).addEventListener('click', kirim);
        $('#kf', inn).addEventListener('submit', function (e) { e.preventDefault(); kirim(); });
      }
    });
  }
  A.bukaFormKonten = bukaForm;

  /** Simpan dengan UI optimistik: tampil seketika, diganti data server, dikembalikan bila gagal */
  function simpanOptimis(jenis, data, baru, setelah) {
    var rows = (baris(jenis) || []).slice(), cadangan = JSON.stringify(rows), tmpId = 'tmp-' + Date.now();
    if (baru) rows.push(Object.assign({ id: tmpId, _simpan: 1, urutan: rows.length + 1 }, data));
    else rows = rows.map(function (r) { return String(r.id) === String(data.id) ? Object.assign({}, r, data, { _simpan: 1 }) : r; });
    simpanLokal(jenis, rows);
    var kirim = Object.assign({}, data); delete kirim._simpan;
    return A.tulis('konten.simpan', { jenis: jenis, row: kirim }).then(function (r) {
      var kini = baris(jenis) || [];
      if (r.success) {
        kini = kini.map(function (x) { return String(x.id) === String(baru ? tmpId : data.id) ? r.data.row : x; });
        simpanLokal(jenis, kini);
        A.usang('dash');
        if (setelah) setelah(r.data.row);
      } else simpanLokal(jenis, JSON.parse(cadangan));
      return r;
    });
  }
  function hapusOptimis(jenis, row) {
    return A.konfirmasi({ judul: 'Hapus ' + SKEMA[jenis].label.toLowerCase() + '?', html: '<b>' + esc(row[SKEMA[jenis].judul || 'judul'] || row.judul || row.nama) + '</b> akan dihapus permanen.' + (jenis === 'kelas' ? ' Semua modul kurikulum kelas ini ikut terhapus.' : ''), ok: 'Hapus', bahaya: true }).then(function (y) {
      if (!y) return;
      var rows = baris(jenis) || [], cadangan = JSON.stringify(rows), cadK = JSON.stringify(baris('kurikulum') || []);
      simpanLokal(jenis, rows.filter(function (r) { return String(r.id) !== String(row.id); }));
      if (jenis === 'kelas') simpanLokal('kurikulum', (baris('kurikulum') || []).filter(function (m) { return String(m.kelas_id) !== String(row.id); }));
      A.tulis('konten.hapus', { jenis: jenis, id: row.id }).then(function (r) {
        if (!r.success) { simpanLokal(jenis, JSON.parse(cadangan)); if (jenis === 'kelas') simpanLokal('kurikulum', JSON.parse(cadK)); }
      });
    });
  }
  function geser(jenis, id, arah, saring) {
    var semua = urutkan(jenis, baris(jenis) || []), list = saring ? semua.filter(saring) : semua;
    var i = list.findIndex(function (r) { return String(r.id) === String(id); }), j = i + arah;
    if (i < 0 || j < 0 || j >= list.length) return;
    var t = list[i]; list[i] = list[j]; list[j] = t;
    var urutBaru = {}; list.forEach(function (r, k) { urutBaru[r.id] = k + 1; });
    var cadangan = JSON.stringify(baris(jenis));
    simpanLokal(jenis, (baris(jenis) || []).map(function (r) { return urutBaru[r.id] ? Object.assign({}, r, { urutan: urutBaru[r.id] }, jenis === 'kurikulum' ? { modul_ke: urutBaru[r.id] } : {}) : r; }));
    clearTimeout(geser.t);
    geser.t = setTimeout(function () {
      A.tulis('konten.urut', { jenis: jenis, ids: list.map(function (r) { return r.id; }) }, { pesan: 'Urutan disimpan.' }).then(function (r) { if (!r.success) simpanLokal(jenis, JSON.parse(cadangan)); });
    }, 500);
  }
  function ubahStatus(jenis, row, aktif) {
    simpanOptimis(jenis, { id: row.id, status: aktif ? 'aktif' : 'nonaktif' }, false);
  }

  // ---------------- Halaman daftar generik ----------------
  function kartuKonten(jenis, r, i, n) {
    var sk = SKEMA[jenis], g = r[sk.gambar], nonaktif = r.status === 'nonaktif';
    var gambar = sk.avatar ? '<div class="kcard-img" style="aspect-ratio:auto;padding:22px;display:grid;place-items:center;background:var(--cream-card)"><span class="avatar" style="width:72px;height:72px;font-size:1.3rem">' + (g ? '<img src="' + esc(g) + '" alt="" referrerpolicy="no-referrer">' : esc(U.inisial(r.nama))) + '</span></div>' :
      '<div class="kcard-img">' + (g ? '<img src="' + esc(g) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '<div class="ph">' + ic('i-img') + '</div>') + (sk.badge && sk.badge(r) ? '<span class="badge">' + esc(sk.badge(r)) + '</span>' : '') + (sk.urut ? '<span class="urut">#' + (i + 1) + '</span>' : '') + '</div>';
    return '<article class="kcard' + (nonaktif ? ' nonaktif' : '') + (r._simpan ? ' menyimpan' : '') + '" data-id="' + esc(r.id) + '">' + gambar +
      '<div class="kcard-b">' + (sk.avatar && sk.badge ? '<span class="stars" style="font-size:.8rem;color:var(--honey-600);font-weight:800">' + esc(sk.badge(r)) + '</span>' : '') + '<h4>' + esc(r[sk.judul]) + '</h4><p>' + esc(sk.sub ? sk.sub(r) : '') + '</p>' + (r._simpan ? '<span class="basi"><span class="spin"></span>menyimpan…</span>' : '') + '</div>' +
      '<div class="kcard-f"><label class="switch" title="Tampilkan di landing"><input type="checkbox" data-aktif ' + (nonaktif ? '' : 'checked') + '><span class="track"></span>' + (nonaktif ? 'Nonaktif' : 'Aktif') + '</label>' +
      (sk.urut ? '<button class="btn btn-ghost btn-icon btn-sm" type="button" data-geser="-1" title="Naikkan" aria-label="Naikkan"' + (i === 0 ? ' disabled' : '') + '>' + ic('i-up') + '</button><button class="btn btn-ghost btn-icon btn-sm" type="button" data-geser="1" title="Turunkan" aria-label="Turunkan"' + (i === n - 1 ? ' disabled' : '') + '>' + ic('i-down') + '</button>' : '') +
      '<button class="btn btn-cream btn-icon btn-sm" type="button" data-ubah title="Ubah" aria-label="Ubah">' + ic('i-edit') + '</button><button class="btn btn-danger btn-icon btn-sm" type="button" data-hapus title="Hapus" aria-label="Hapus">' + ic('i-trash') + '</button></div></article>';
  }
  function daftarGenerik(jenis, wadah, opsi) {
    opsi = opsi || {};
    var q = '';
    var isi = function () {
      if (!wadah.isConnected) return;
      var rows = baris(jenis);
      if (!rows) { wadah.innerHTML = '<div class="kgrid">' + [1, 2, 3].map(function () { return '<div class="kcard"><div class="kcard-img skel"></div><div class="kcard-b"><div class="skel" style="height:18px"></div></div></div>'; }).join('') + '</div>'; return; }
      var list = urutkan(jenis, rows), n = list.length;
      var tampil = q ? list.filter(function (r) { return JSON.stringify(r).toLowerCase().indexOf(q) > -1; }) : list;
      var aktif = list.filter(function (r) { return r.status !== 'nonaktif'; }).length;
      $('[data-ringkas]', wadah.parentNode) && ($('[data-ringkas]', wadah.parentNode).innerHTML = '<span class="pill pill-ok">' + aktif + ' tampil</span> <span class="pill pill-mute">' + (n - aktif) + ' nonaktif</span>');
      wadah.innerHTML = tampil.length ? '<div class="kgrid">' + tampil.map(function (r) { return kartuKonten(jenis, r, list.indexOf(r), n); }).join('') + '</div>' :
        A.kosong(q ? 'Tidak ada yang cocok' : 'Belum ada ' + SKEMA[jenis].label.toLowerCase(), q ? '' : 'Tambahkan item pertama — langsung tampil di landing page.', '<br><button class="btn btn-primary btn-sm" type="button" data-tambah>' + ic('i-plus') + SKEMA[jenis].tambah + '</button>');
    };
    wadah.addEventListener('click', function (e) {
      if (e.target.closest('[data-tambah]')) { bukaForm(jenis); return; }
      var kartu = e.target.closest('[data-id]'); if (!kartu) return;
      var row = (baris(jenis) || []).filter(function (r) { return String(r.id) === kartu.dataset.id; })[0]; if (!row) return;
      if (String(row.id).indexOf('tmp-') === 0) { U.toast('Tunggu sebentar, masih menyimpan…', 'info'); return; }
      if (e.target.closest('[data-ubah]')) bukaForm(jenis, row);
      else if (e.target.closest('[data-hapus]')) hapusOptimis(jenis, row);
      else if (e.target.closest('[data-geser]')) geser(jenis, row.id, +e.target.closest('[data-geser]').dataset.geser);
    });
    wadah.addEventListener('change', function (e) {
      if (!e.target.matches('[data-aktif]')) return;
      var kartu = e.target.closest('[data-id]'), row = (baris(jenis) || []).filter(function (r) { return String(r.id) === kartu.dataset.id; })[0];
      if (row) ubahStatus(jenis, row, e.target.checked);
    });
    A.on('konten', isi);
    isi();
    return { cari: function (v) { q = String(v || '').toLowerCase().trim(); isi(); }, isi: isi };
  }

  function halamanKonten(jenis, ket) {
    return {
      mount: function (el, act) {
        act.innerHTML = '<button class="btn btn-primary btn-sm" type="button" id="k-tambah">' + ic('i-plus') + '<span>' + SKEMA[jenis].tambah + '</span></button>';
        el.innerHTML = '<div class="card"><div class="card-h"><div><h2>' + esc(SKEMA[jenis].label) + ' <span data-ringkas></span></h2><p>' + ket + '</p></div>' +
          '<label class="search" style="min-width:220px">' + ic('i-search') + '<input class="input input-sm" id="k-q" placeholder="Cari…"></label></div><div id="k-list"></div></div>';
        var g = daftarGenerik(jenis, $('#k-list'));
        $('#k-q').addEventListener('input', U.debounce(function (e) { g.cari(e.target.value); }, 150));
        $('#k-tambah').addEventListener('click', function () { bukaForm(jenis); });
      },
      muat: function (fresh) { A.ambil('konten', { fresh: fresh }); }
    };
  }
  A.daftar('hero', halamanKonten('hero', 'Slide berganti otomatis tiap ±5 detik di landing page, sesuai urutan. Gunakan tombol ▲▼ untuk mengurutkan.'));
  A.daftar('produk', halamanKonten('produk', 'Kartu etalase produk. Tombol "Beli" membuka formulir leads, lalu pembeli diarahkan ke link pembayaran.'));

  // ---------------- Hasil Karya & Testimoni (tab) ----------------
  var tabHT = 'hasil';
  A.daftar('hasil', {
    mount: function (el, act) {
      var q = A.query(); if (q.get('tab')) tabHT = q.get('tab');
      el.innerHTML = '<div class="card"><div class="tabs" role="tablist"><button role="tab" data-t="hasil">' + ic('i-award') + 'Hasil Kelas</button><button role="tab" data-t="testimoni">' + ic('i-star') + 'Testimoni</button></div>' +
        '<div class="card-h" style="margin-top:18px"><div><h2 id="ht-judul"></h2><p id="ht-ket"></p></div><span data-ringkas></span></div><div id="ht-list"></div></div>';
      var render = function () {
        $$('.tabs [data-t]', el).forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.t === tabHT)); });
        $('#ht-judul').textContent = SKEMA[tabHT].label;
        $('#ht-ket').textContent = tabHT === 'hasil' ? 'Bukti hasil member — tampil sebagai grid kartu, terbaru di depan.' : 'Ulasan member dengan rating bintang 1–5.';
        act.innerHTML = '<button class="btn btn-primary btn-sm" type="button" id="ht-tambah">' + ic('i-plus') + '<span>' + SKEMA[tabHT].tambah + '</span></button>';
        $('#ht-tambah').addEventListener('click', function () { bukaForm(tabHT); });
        var lama = $('#ht-list'), baru = lama.cloneNode(false); lama.parentNode.replaceChild(baru, lama);
        A.subs.konten = [];
        daftarGenerik(tabHT, baru);
      };
      $('.tabs', el).addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) { tabHT = b.dataset.t; render(); } });
      render();
    },
    muat: function (fresh) { A.ambil('konten', { fresh: fresh }); }
  });

  // ---------------- Kelas & Kurikulum ----------------
  var KL = { pilih: '' };
  A.daftar('kelas', {
    mount: function (el, act) {
      act.innerHTML = '<button class="btn btn-cream btn-sm" type="button" id="kl-baru">' + ic('i-plus') + '<span>Kelas baru</span></button>';
      el.innerHTML = '<div class="card" id="kl-pilih-wrap" hidden><div class="tb"><span class="label">Kelas:</span><div class="chips" id="kl-chips"></div></div></div>' +
        '<div class="g-2 kiri"><div class="card"><div class="card-h"><div><span class="kick">Informasi kelas</span><h2 id="kl-nama">Kelas</h2><p>Ditampilkan di bagian "Penjelasan Kelas" landing page.</p></div></div><div id="kl-form">' + A.skel(4) + '</div></div>' +
        '<div class="card"><div class="card-h"><div><span class="kick">Akordeon kurikulum</span><h2>Modul Kurikulum</h2><p>Urutan modul = urutan di landing page.</p></div><button class="btn btn-primary btn-sm" type="button" id="kl-tambah-mod">' + ic('i-plus') + 'Tambah modul</button></div><div id="kl-mod">' + A.skel(4, 60) + '</div></div></div>';
      $('#kl-baru').addEventListener('click', function () { bukaForm('kelas', null, null, function (row) { KL.pilih = row.id; isiKelas(); }); });
      $('#kl-tambah-mod').addEventListener('click', function () { if (!KL.pilih) { U.toast('Buat kelas terlebih dahulu.', 'err'); return; } bukaForm('kurikulum', null, { kelas_id: KL.pilih }); });
      $('#kl-chips').addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) { KL.pilih = b.dataset.k; isiKelas(); } });
      $('#kl-mod').addEventListener('click', function (e) {
        var row = e.target.closest('[data-mid]'); if (!row) return;
        var m = (baris('kurikulum') || []).filter(function (x) { return String(x.id) === row.dataset.mid; })[0]; if (!m) return;
        var saring = function (x) { return String(x.kelas_id) === String(KL.pilih); };
        if (e.target.closest('[data-ubah]')) bukaForm('kurikulum', m, { kelas_id: m.kelas_id });
        else if (e.target.closest('[data-hapus]')) hapusOptimis('kurikulum', m);
        else if (e.target.closest('[data-geser]')) geser('kurikulum', m.id, +e.target.closest('[data-geser]').dataset.geser, saring);
      });
      A.on('konten', isiKelas); A.on('pengaturan', isiKelas);
      isiKelas();
    },
    muat: function (fresh) { A.ambil('konten', { fresh: fresh }); if (A.isSA()) A.ambil('pengaturan', { diam: true }); }
  });
  function isiKelas() {
    if (A.aktif !== 'kelas') return;
    var kelas = baris('kelas');
    if (!kelas) return;
    if (!kelas.length) {
      $('#kl-form').innerHTML = A.kosong('Belum ada kelas', 'Buat kelas pertama untuk mengisi bagian kurikulum di landing page.', '<br><button class="btn btn-primary btn-sm" type="button" onclick="EKA.bukaFormKonten(\'kelas\')">' + ic('i-plus') + 'Buat kelas</button>');
      $('#kl-mod').innerHTML = ''; $('#kl-pilih-wrap').hidden = true; return;
    }
    if (!kelas.some(function (k) { return String(k.id) === String(KL.pilih); })) KL.pilih = String(kelas[0].id);
    var utama = ((A.lokal('pengaturan') || {}).nilai || {}).KELAS_UTAMA || '';
    $('#kl-pilih-wrap').hidden = kelas.length < 2 && !A.isSA();
    $('#kl-chips').innerHTML = kelas.map(function (k) { return '<button class="chip-btn" type="button" data-k="' + esc(k.id) + '" aria-pressed="' + (String(k.id) === KL.pilih) + '">' + esc(k.nama) + (String(k.id) === utama || (!utama && k === kelas[0]) ? ' <em>· tampil di landing</em>' : '') + '</button>'; }).join('');
    var k = kelas.filter(function (x) { return String(x.id) === KL.pilih; })[0];
    $('#kl-nama').textContent = k.nama;
    var form = $('#kl-form');
    if (form.dataset.id !== String(k.id) || !$('#klf', form)) {
      form.dataset.id = k.id;
      form.innerHTML = '<form class="fgrid c2" id="klf">' + SKEMA.kelas.fields.map(function (f) { return htmlField(f, k); }).join('') + '</form>' +
        '<div class="tb" style="margin-top:16px"><button class="btn btn-danger btn-sm" type="button" id="klf-hapus">' + ic('i-trash') + 'Hapus kelas</button>' +
        (A.isSA() && kelas.length > 1 ? '<button class="btn btn-ghost btn-sm" type="button" id="klf-utama">Tampilkan kelas ini di landing</button>' : '') + '<span class="grow"></span><button class="btn btn-primary btn-sm" type="button" id="klf-simpan">' + ic('i-check') + 'Simpan</button></div>';
      $('#klf-simpan').addEventListener('click', function () {
        var b = bacaForm($('#klf'), SKEMA.kelas); if (b.err.length) { U.toast(b.err[0], 'err'); return; }
        simpanOptimis('kelas', Object.assign({ id: k.id }, b.o), false);
      });
      $('#klf-hapus').addEventListener('click', function () { hapusOptimis('kelas', k); });
      var u = $('#klf-utama'); if (u) u.addEventListener('click', function () { A.tulis('pengaturan.simpan', { nilai: { KELAS_UTAMA: k.id } }).then(function (r) { if (r.success) { var p = A.lokal('pengaturan') || {}; p.nilai = r.data.nilai; A.simpan('pengaturan', p); Store.usang('konten'); } }); });
    }
    var mods = urutkan('kurikulum', (baris('kurikulum') || []).filter(function (m) { return String(m.kelas_id) === String(k.id); }));
    $('#kl-mod').innerHTML = mods.length ? mods.map(function (m, i) {
      var topik = String(m.topik || '').split(/\r?\n/).filter(Boolean);
      return '<div class="mod-row' + (m._simpan ? ' menyimpan' : '') + '" data-mid="' + esc(m.id) + '"><span class="mod-no">' + String(m.modul_ke || i + 1).padStart(2, '0') + '</span><div class="t"><b>' + esc(m.judul) + '</b><small>' + topik.length + ' topik · ' + esc(topik.slice(0, 2).join(' · ')) + '</small></div>' +
        '<button class="btn btn-ghost btn-icon btn-sm" type="button" data-geser="-1" aria-label="Naikkan"' + (i === 0 ? ' disabled' : '') + '>' + ic('i-up') + '</button><button class="btn btn-ghost btn-icon btn-sm" type="button" data-geser="1" aria-label="Turunkan"' + (i === mods.length - 1 ? ' disabled' : '') + '>' + ic('i-down') + '</button>' +
        '<button class="btn btn-cream btn-icon btn-sm" type="button" data-ubah aria-label="Ubah">' + ic('i-edit') + '</button><button class="btn btn-danger btn-icon btn-sm" type="button" data-hapus aria-label="Hapus">' + ic('i-trash') + '</button></div>';
    }).join('') : A.kosong('Belum ada modul', 'Tambah modul pertama untuk kelas ini.');
  }

  // ---------------- Video YouTube ----------------
  var VD = { pilih: '' };
  A.daftar('video', {
    mount: function (el) {
      el.innerHTML = '<div class="g-2"><div class="card"><div class="card-h"><div><span class="kick">Video profil</span><h2>Pengaturan Video YouTube</h2><p>Diputar otomatis tanpa suara saat bagian video terlihat di layar (aturan peramban).</p></div></div><div id="vd-form">' + A.skel(4) + '</div></div>' +
        '<div class="card"><div class="card-h"><div><span class="kick">Pratinjau</span><h2>Tampilan di Landing</h2></div></div><div id="vd-prev"></div><p class="note" style="margin-top:14px">' + ic('i-info') + ' Autoplay hanya diizinkan peramban bila video dimulai tanpa suara. Pengunjung bisa menyalakan suara lewat tombol di pojok video.</p></div></div>';
      A.on('konten', isiVideo); isiVideo();
    },
    muat: function (fresh) { A.ambil('konten', { fresh: fresh }); }
  });
  function isiVideo() {
    if (A.aktif !== 'video') return;
    var kelas = baris('kelas'); if (!kelas) return;
    var f = $('#vd-form');
    if (!kelas.length) { f.innerHTML = A.kosong('Belum ada kelas', 'Video melekat pada kelas. Buat kelas dulu di menu Kelas & Kurikulum.', '<br><a class="btn btn-primary btn-sm" href="#/kelas">Buka Kelas & Kurikulum</a>'); return; }
    if (!kelas.some(function (k) { return String(k.id) === VD.pilih; })) VD.pilih = String(kelas[0].id);
    var k = kelas.filter(function (x) { return String(x.id) === VD.pilih; })[0];
    if ($('#vdf') && f.dataset.id === String(k.id)) { pratinjau($('#vdf [name=video_youtube_url]').value); return; }
    f.dataset.id = k.id;
    f.innerHTML = '<form id="vdf" class="fgrid">' + (kelas.length > 1 ? '<div class="field"><label class="label" for="vd-k">Kelas</label><select class="select" id="vd-k">' + kelas.map(function (x) { return '<option value="' + esc(x.id) + '"' + (String(x.id) === VD.pilih ? ' selected' : '') + '>' + esc(x.nama) + '</option>'; }).join('') + '</select></div>' : '') +
      '<div class="field"><label class="label" for="vd-url">URL video YouTube</label><input class="input" id="vd-url" name="video_youtube_url" value="' + esc(k.video_youtube_url) + '" placeholder="https://www.youtube.com/watch?v=…"><span class="hint" id="vd-hint">Format didukung: youtube.com/watch?v=…, youtu.be/…, /shorts/…</span></div>' +
      '<label class="switch"><input type="checkbox" name="video_autoplay"' + (k.video_autoplay !== 'TIDAK' ? ' checked' : '') + '><span class="track"></span>Putar otomatis saat terlihat</label>' +
      '<label class="switch"><input type="checkbox" name="video_muted"' + (k.video_muted !== 'TIDAK' ? ' checked' : '') + '><span class="track"></span>Mulai tanpa suara (wajib untuk autoplay)</label>' +
      '<div class="tb"><span class="grow"></span><button class="btn btn-primary" type="button" id="vd-simpan">' + ic('i-check') + 'Simpan video</button></div></form>';
    var sel = $('#vd-k'); if (sel) sel.addEventListener('change', function () { VD.pilih = sel.value; f.dataset.id = ''; isiVideo(); });
    var url = $('#vd-url');
    url.addEventListener('input', U.debounce(function () { pratinjau(url.value); }, 300));
    $('#vd-simpan').addEventListener('click', function () {
      var v = url.value.trim();
      if (v && !U.ytId(v)) { U.toast('URL YouTube tidak dikenali.', 'err'); return; }
      var ap = $('[name=video_autoplay]', f).checked, mu = $('[name=video_muted]', f).checked;
      if (ap && !mu) U.toast('Catatan: peramban akan tetap memulai video tanpa suara untuk autoplay.', 'info', 6000);
      simpanOptimis('kelas', { id: k.id, video_youtube_url: v, video_autoplay: ap ? 'YA' : 'TIDAK', video_muted: mu ? 'YA' : 'TIDAK' }, false);
    });
    pratinjau(k.video_youtube_url);
  }
  function pratinjau(u) {
    var id = U.ytId(u), p = $('#vd-prev'); if (!p) return;
    var h = $('#vd-hint');
    if (h) { h.className = 'hint' + (u && !id ? ' err' : id ? ' ok' : ''); h.textContent = u && !id ? 'URL tidak dikenali sebagai video YouTube.' : id ? '✓ ID video: ' + id : 'Format didukung: youtube.com/watch?v=…, youtu.be/…, /shorts/…'; }
    if (p.dataset.id === id) return;
    p.dataset.id = id;
    p.innerHTML = id ? '<div style="position:relative;aspect-ratio:16/9;border-radius:18px;overflow:hidden;border:4px solid #fff;box-shadow:var(--sh-2);background:#000"><iframe src="https://www.youtube-nocookie.com/embed/' + id + '?mute=1&rel=0&modestbranding=1" title="Pratinjau video" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>' :
      A.kosong('Belum ada video', 'Bagian video disembunyikan dari landing page sampai URL diisi.');
  }
})(window.EKA);
