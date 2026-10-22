/**
 * admin-sistem.js — menu Superadmin: Pengaturan, Role & Akses Pengguna,
 * Keamanan & Performa, Migrasi Data, Log Aktivitas.
 * (Semua aksi juga dicek peran di server — menyembunyikan menu bukan keamanan.)
 */
(function (A) {
  'use strict';
  var U = A.U, esc = A.esc, $ = A.$, $$ = A.$$, ic = A.ic, API = EK.API, Store = EK.Store;

  // =============================================================== PENGATURAN
  var GRUP = [
    { j: 'Identitas brand', ikon: 'i-spark', k: [['NAMA_BRAND', 'Nama brand'], ['TAGLINE', 'Tagline kecil di bawah logo'], ['LOGO_URL', 'Logo', 'img']] },
    { j: 'Kontak admin', ikon: 'i-chat', k: [['WA_ADMIN', 'Nomor WhatsApp admin', 'tel'], ['EMAIL_ADMIN', 'Email admin', 'email'], ['ALAMAT', 'Alamat (footer)']] },
    { j: 'Bilah promo', ikon: 'i-bolt', k: [['PROMO_BAR_AKTIF', 'Tampilkan bilah promo', 'switch'], ['PROMO_BAR_LABEL', 'Label'], ['PROMO_BAR_TEKS', 'Teks promo', 'textarea']] },
    { j: 'Teks halaman', ikon: 'i-edit', k: [['HERO_BADGE', 'Lencana di atas judul hero'], ['SOSIAL_BUKTI', 'Teks bukti sosial (rating)'], ['FITUR1_JUDUL', 'Kartu 1 — judul'], ['FITUR1_TEKS', 'Kartu 1 — teks'], ['FITUR2_JUDUL', 'Kartu 2 — judul'], ['FITUR2_TEKS', 'Kartu 2 — teks'],
      ['FITUR3_JUDUL', 'Kartu 3 — judul'], ['FITUR3_TEKS', 'Kartu 3 — teks'], ['CTA_JUDUL', 'Banner ajakan — judul'], ['CTA_TEKS', 'Banner ajakan — teks', 'textarea'], ['FOOTER_DESKRIPSI', 'Deskripsi footer', 'textarea']] },
    { j: 'SEO & tautan', ikon: 'i-search', k: [['SEO_JUDUL', 'Judul halaman (tab & Open Graph)'], ['SEO_DESKRIPSI', 'Meta deskripsi', 'textarea'], ['APP_URL', 'URL landing page (untuk {link})', 'url']] },
    { j: 'Lainnya', ikon: 'i-gear', k: [['KELAS_UTAMA', 'Kelas yang tampil di landing', 'kelas'], ['CRM_SYNC_MENIT', 'Interval sinkron CRM otomatis (menit)', 'number']] },
    { j: 'Musik latar & animasi', ikon: 'i-music', k: [['BACKSOUND_AKTIF', 'Putar musik latar di landing page', 'switch'], ['BACKSOUND_URL', 'File musik', 'audio'], ['BACKSOUND_JUDUL', 'Judul lagu (opsional)'], ['BACKSOUND_VOLUME', 'Volume musik (5–100%)', 'number'],
      ['LEBAH_AKTIF', 'Animasi lebah mengikuti kursor (desktop)', 'switch']] }
  ];
  A.daftar('pengaturan', {
    mount: function (el, act) {
      act.innerHTML = '<button class="btn btn-primary btn-sm" type="button" id="pg-simpan">' + ic('i-check') + '<span>Simpan pengaturan</span></button>';
      el.innerHTML = '<div id="pg-form">' + A.skel(6, 60) + '</div>';
      $('#pg-simpan').addEventListener('click', simpanPengaturan);
      A.on('pengaturan', isiPengaturan); isiPengaturan(A.lokal('pengaturan'));
    },
    muat: function (fresh) { A.ambil('pengaturan', { fresh: fresh }); A.ambil('konten', { diam: true }); }
  });
  function isiPengaturan(p) {
    var el = $('#pg-form'); if (!el || !p || el.dataset.ok) return;
    el.dataset.ok = '1';
    var n = p.nilai, kelas = (A.lokal('konten') || {}).kelas || [];
    var field = function (d) {
      var k = d[0], v = n[k] == null ? '' : n[k], t = d[2], ket = (p.keterangan || {})[k];
      if (t === 'img') return '<div class="field full"><span class="label">' + esc(d[1]) + '</span>' + A.inputGambar(k, v, 'logo') + '</div>';
      if (t === 'audio') return '<div class="field full"><span class="label">' + esc(d[1]) + '</span>' + A.inputAudio(k, v) + '</div>';
      if (t === 'switch') return '<label class="switch full"><input type="checkbox" name="' + k + '"' + (v === 'YA' ? ' checked' : '') + '><span class="track"></span>' + esc(d[1]) + '</label>';
      if (t === 'textarea') return '<div class="field full"><label class="label" for="pg-' + k + '">' + esc(d[1]) + '</label><textarea class="textarea" id="pg-' + k + '" name="' + k + '" style="min-height:80px">' + esc(v) + '</textarea></div>';
      if (t === 'kelas') return '<div class="field"><label class="label" for="pg-' + k + '">' + esc(d[1]) + '</label><select class="select" id="pg-' + k + '" name="' + k + '"><option value="">(kelas pertama)</option>' + kelas.map(function (x) { return '<option value="' + esc(x.id) + '"' + (String(x.id) === v ? ' selected' : '') + '>' + esc(x.nama) + '</option>'; }).join('') + '</select></div>';
      return '<div class="field"><label class="label" for="pg-' + k + '">' + esc(d[1]) + '</label><input class="input" id="pg-' + k + '" name="' + k + '" type="' + (t || 'text') + '" value="' + esc(v) + '">' + (ket && !/^Kartu|^$/.test(ket) ? '<span class="hint">' + esc(ket) + '</span>' : '') + '</div>';
    };
    el.innerHTML = '<div class="g-2 rata">' + GRUP.map(function (g) { return '<div class="card"><div class="sect"><div class="sect-t">' + ic(g.ikon) + esc(g.j) + '</div><form class="fgrid c2" data-grup>' + g.k.map(field).join('') + '</form></div></div>'; }).join('') +
      '<div class="card"><div class="sect"><div class="sect-t">' + ic('i-chat') + 'Notifikasi & template pesan</div><p class="muted">Saklar WhatsApp/email untuk pembeli & admin, token Fonnte, serta template pesan dengan variabel <span class="mono-box">{nama}</span> <span class="mono-box">{produk}</span> diatur di menu WhatsApp & Notifikasi.</p><a class="btn btn-cream" href="#/wa?tab=config">' + ic('i-gear') + 'Buka konfigurasi notifikasi</a></div></div>' +
      '<div class="card"><div class="sect"><div class="sect-t">' + ic('i-db') + 'Data dummy</div><p class="muted">Data contoh (ID berawalan <span class="mono-box">DMY-</span>) beserta gambarnya di Drive. Hapus sebelum go-live; data asli tidak tersentuh.</p>' +
      '<div class="tb"><button class="btn btn-cream" type="button" id="pg-dmy-isi">' + ic('i-plus') + 'Isi data dummy</button><button class="btn btn-danger" type="button" id="pg-dmy-hapus">' + ic('i-trash') + 'Hapus data dummy</button></div></div></div></div>';
    A.pasangGambar(el); A.pasangAudio(el);
    var dummy = function (aksi) {
      A.konfirmasi(aksi === 'hapus' ? { judul: 'Hapus semua data dummy?', pesan: 'Hero, produk, hasil, testimoni, kelas, leads, dan kunjungan contoh akan dihapus; gambar contoh dipindah ke Sampah Drive.', ok: 'Hapus data dummy', bahaya: true } :
        { judul: 'Isi data dummy?', pesan: 'Menambahkan data contoh yang belum ada (tidak menimpa data Anda).', ok: 'Isi data dummy' }).then(function (y) {
        if (!y) return;
        U.toast('Memproses… (bisa sampai 30 detik saat mengunduh gambar contoh)', 'info', 8000);
        API.call('dummy.' + aksi, {}, { timeout: 120000 }).then(function (r) {
          U.toast(r.message || (r.success ? 'Selesai.' : 'Gagal.'), r.success ? 'ok' : 'err', 6000);
          if (r.success) { ['konten', 'leads', 'dash', 'crm', 'sistem'].forEach(function (k) { A.usang(k); }); Store.usang('konten'); A.ambil('konten', { fresh: true }); A.ambil('leads', { fresh: true, diam: true }); }
        });
      });
    };
    $('#pg-dmy-isi').addEventListener('click', function () { dummy('isi'); });
    $('#pg-dmy-hapus').addEventListener('click', function () { dummy('hapus'); });
  }
  function simpanPengaturan() {
    var p = A.lokal('pengaturan'); if (!p) return;
    var ubah = {};
    $$('#pg-form [data-grup]').forEach(function (f) {
      $$('[name]', f).forEach(function (x) {
        if (x.type === 'file') return;
        var v = x.type === 'checkbox' ? (x.checked ? 'YA' : 'TIDAK') : x.value.trim();
        if (String(p.nilai[x.name] == null ? '' : p.nilai[x.name]) !== v) ubah[x.name] = v;
      });
    });
    if (!Object.keys(ubah).length) { U.toast('Tidak ada perubahan.', 'info'); return; }
    var b = $('#pg-simpan'); b.disabled = true;
    A.tulis('pengaturan.simpan', { nilai: ubah }).then(function (r) {
      b.disabled = false;
      if (!r.success) return;
      p.nilai = r.data.nilai; A.simpan('pengaturan', p, true);
      Store.usang('konten');
      var cfg = Store.val('authcfg') || {}; cfg.brand = r.data.nilai.NAMA_BRAND; cfg.logo = r.data.nilai.LOGO_URL; Store.set('authcfg', cfg);
      $('#sb-brand').textContent = cfg.brand || 'EtalaseKu';
      A.usang('notif');
    });
  }

  // =============================================================== PENGGUNA & PERAN
  A.daftar('pengguna', {
    mount: function (el) {
      el.innerHTML = '<div class="g-2 kiri"><div class="card"><div class="card-h"><div><span class="kick">Tambah akses</span><h2>Pengguna Baru</h2><p>Pengguna masuk dengan akun Google yang emailnya terdaftar di sini.</p></div></div>' +
        '<form class="fgrid" id="pu-form"><div class="field"><label class="label" for="pu-email">Email Google <span class="req">*</span></label><input class="input" type="email" id="pu-email" name="email" required placeholder="nama@gmail.com"></div>' +
        '<div class="field"><label class="label" for="pu-nama">Nama</label><input class="input" id="pu-nama" name="nama"></div>' +
        '<div class="field"><label class="label" for="pu-role">Peran</label><select class="select" id="pu-role" name="role"><option value="admin">Admin — kelola konten, leads, CRM, export</option><option value="superadmin">Superadmin — akses penuh</option></select></div>' +
        '<button class="btn btn-primary" type="submit">' + ic('i-useradd') + 'Tambahkan pengguna</button></form>' +
        '<div class="note" style="margin-top:16px"><b>Matriks akses</b><br>Admin: konten, leads, statistik, export, WhatsApp & CRM.<br>Superadmin: semua + Pengaturan, Pengguna, Keamanan, Migrasi, Log.</div></div>' +
        '<div class="card"><div class="card-h"><div><span class="kick">Daftar akses</span><h2>Pengguna Dashboard</h2><p>Superadmin tidak bisa menurunkan atau menonaktifkan dirinya sendiri.</p></div></div><div id="pu-list">' + A.skel(4) + '</div></div></div>';
      $('#pu-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var o = A.nilaiForm(e.target);
        if (!U.emailValid(o.email)) { U.toast('Email tidak valid.', 'err'); return; }
        simpanPengguna({ email: o.email.trim().toLowerCase(), nama: o.nama, role: o.role, status: 'aktif' }, true).then(function (r) { if (r.success) e.target.reset(); });
      });
      $('#pu-list').addEventListener('change', function (e) {
        var t = e.target, tr = t.closest('[data-email]'); if (!tr) return;
        var u = cariPengguna(tr.dataset.email); if (!u) return;
        if (t.matches('[data-role]')) simpanPengguna(Object.assign({}, u, { role: t.value }));
        if (t.matches('[data-status]')) simpanPengguna(Object.assign({}, u, { status: t.checked ? 'aktif' : 'nonaktif' }));
      });
      $('#pu-list').addEventListener('click', function (e) {
        var b = e.target.closest('[data-hapus]'); if (!b) return;
        var email = b.closest('[data-email]').dataset.email;
        A.konfirmasi({ judul: 'Hapus akses ' + email + '?', pesan: 'Pengguna tidak bisa masuk dashboard lagi. Sesi aktifnya dicabut.', ok: 'Hapus akses', bahaya: true }).then(function (y) {
          if (!y) return;
          var d = A.lokal('pengguna'), cad = JSON.stringify(d);
          d.rows = d.rows.filter(function (u) { return u.email !== email; }); A.simpan('pengguna', d);
          A.tulis('pengguna.hapus', { email: email }).then(function (r) { if (!r.success) A.simpan('pengguna', JSON.parse(cad)); });
        });
      });
      A.on('pengguna', isiPengguna); isiPengguna(A.lokal('pengguna'));
    },
    muat: function (fresh) { A.ambil('pengguna', { fresh: fresh }); }
  });
  function cariPengguna(e) { var d = A.lokal('pengguna'); return d && d.rows.filter(function (u) { return u.email === e; })[0]; }
  function simpanPengguna(u, baru) {
    var d = A.lokal('pengguna') || { rows: [] }, cad = JSON.stringify(d);
    if (baru && d.rows.some(function (x) { return x.email === u.email; })) baru = false;
    if (baru) d.rows.push(Object.assign({ dibuat_pada: '', login_terakhir: '' }, u)); else d.rows = d.rows.map(function (x) { return x.email === u.email ? Object.assign({}, x, u) : x; });
    A.simpan('pengguna', d);
    return A.tulis('pengguna.simpan', u).then(function (r) { if (!r.success) A.simpan('pengguna', JSON.parse(cad)); return r; });
  }
  function isiPengguna(d) {
    var el = $('#pu-list'); if (!el || !d) return;
    el.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pengguna</th><th>Peran</th><th>Status</th><th class="hide-m">Login terakhir</th><th class="aksi"></th></tr></thead><tbody>' + d.rows.map(function (u) {
      var saya = A.me && u.email === A.me.email;
      return '<tr data-email="' + esc(u.email) + '"><td><div style="display:flex;gap:10px;align-items:center"><span class="avatar" style="width:36px;height:36px;font-size:.78rem">' + esc(U.inisial(u.nama || u.email)) + '</span><div class="nama"><b>' + esc(u.nama || '—') + (saya ? ' <span class="pill pill-ok">Anda</span>' : '') + '</b><small>' + esc(u.email) + '</small></div></div></td>' +
        '<td><select class="select select-sm" data-role style="width:auto"' + (saya ? ' disabled' : '') + '><option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>Admin</option><option value="superadmin"' + (u.role === 'superadmin' ? ' selected' : '') + '>Superadmin</option></select></td>' +
        '<td><label class="switch"><input type="checkbox" data-status' + (u.status === 'aktif' ? ' checked' : '') + (saya ? ' disabled' : '') + '><span class="track"></span>' + (u.status === 'aktif' ? 'Aktif' : 'Nonaktif') + '</label></td>' +
        '<td class="hide-m"><small>' + esc(u.login_terakhir ? U.relatif(u.login_terakhir) : 'belum pernah') + '</small></td>' +
        '<td class="aksi">' + (saya ? '' : '<button class="btn btn-danger btn-icon btn-sm" type="button" data-hapus aria-label="Hapus akses">' + ic('i-trash') + '</button>') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  // =============================================================== KEAMANAN & PERFORMA
  A.daftar('keamanan', {
    mount: function (el) {
      el.innerHTML = '<div id="km">' + A.skel(6, 60) + '</div>';
      A.on('keamanan', isiKeamanan); A.on('performa', isiPerforma);
      isiKeamanan(A.lokal('keamanan'));
    },
    muat: function (fresh) { A.ambil('keamanan', { fresh: fresh }); A.ambil('performa', { fresh: fresh, diam: true }); }
  });
  function isiKeamanan(k) {
    var el = $('#km'); if (!el || !k) return;
    if (el.dataset.ok && el.contains(document.activeElement)) return;
    el.dataset.ok = '1';
    var asal = location.origin;
    el.innerHTML = '<div class="g-2 rata">' +
      '<div class="card"><div class="sect"><div class="sect-t">' + ic('i-login') + 'Login Google (OAuth 2.0)</div>' +
      '<div class="field"><label class="label" for="km-cid">Google Client ID</label><input class="input mono" id="km-cid" value="' + esc(k.googleClientId) + '" placeholder="1234567890-xxxx.apps.googleusercontent.com" spellcheck="false"><span class="hint">Bukan rahasia (dipakai tombol Google di browser), tetap disimpan di Script Properties.</span></div>' +
      '<div class="tb"><button class="btn btn-primary btn-sm" type="button" id="km-cid-simpan">' + ic('i-check') + 'Simpan Client ID</button></div>' +
      '<details class="note"><summary style="cursor:pointer;font-weight:700">Cara membuat Client ID</summary><ol style="margin:8px 0 0;padding-left:18px;display:grid;gap:4px"><li>Buka console.cloud.google.com → pilih/buat proyek.</li><li>APIs & Services → OAuth consent screen → External → isi nama aplikasi & email.</li><li>Credentials → Create credentials → OAuth client ID → <b>Web application</b>.</li><li>Authorized JavaScript origins: <span class="mono-box">' + esc(asal) + '</span> (tanpa garis miring di akhir).</li><li>Salin Client ID ke kolom di atas.</li></ol></details></div></div>' +
      '<div class="card"><div class="sect"><div class="sect-t">' + ic('i-lock') + 'Akses darurat Superadmin</div>' +
      '<p class="muted">Jalur masuk cadangan bila login Google bermasalah. Tidak ditautkan dari mana pun: <span class="mono-box">admin.html#darurat</span>. Kredensial disimpan sebagai hash, tidak bisa dilihat ulang.</p>' +
      '<div class="info-grid"><div><span>Status</span><b>' + (k.darurat.ada ? '<span class="pill pill-ok">Terkonfigurasi</span>' : '<span class="pill pill-warn">Belum ada</span>') + '</b></div><div><span>Rotasi terakhir</span><b>' + esc(k.darurat.rotasiTerakhir || 'belum pernah (masih kredensial awal)') + '</b></div>' +
      (k.darurat.terkunciSampai ? '<div><span>Terkunci sampai</span><b style="color:var(--err)">' + esc(k.darurat.terkunciSampai) + '</b></div>' : '') + '<div><span>Masa sesi darurat</span><b>' + k.sesiDaruratJam + ' jam</b></div></div>' +
      '<form class="fgrid" id="km-dr" autocomplete="off"><div class="field"><label class="label" for="km-u">Nama pengguna baru</label><input class="input" id="km-u" name="username" autocomplete="off" spellcheck="false" placeholder="5–40 karakter"></div>' +
      '<div class="field"><label class="label" for="km-p">Kata sandi baru</label><input class="input" type="password" id="km-p" name="sandi" autocomplete="new-password"><span class="hint" id="km-kuat">Minimal 12 karakter, berisi huruf dan angka.</span></div>' +
      '<div class="field"><label class="label" for="km-p2">Ulangi kata sandi</label><input class="input" type="password" id="km-p2" name="konfirmasi" autocomplete="new-password"></div>' +
      '<button class="btn btn-primary" type="submit">' + ic('i-shield') + 'Ganti kredensial darurat</button></form></div></div>' +
      '<div class="card"><div class="sect"><div class="sect-t">' + ic('i-logout') + 'Sesi</div><p class="muted">Sesi login berlaku ' + k.sesiJam + ' jam (token HMAC, tanpa penyimpanan di server). Bila perangkat hilang, akhiri semua sesi akun Anda.</p>' +
      '<button class="btn btn-danger" type="button" id="km-out">' + ic('i-logout') + 'Keluar dari semua perangkat</button></div></div>' +
      '<div class="card"><div class="sect"><div class="sect-t">' + ic('i-bolt') + 'Performa (gas-scale-turbo)</div>' +
      '<label class="switch"><input type="checkbox" id="km-warm"' + (k.keepWarm ? ' checked' : '') + '><span class="track"></span>Keep-warm: panaskan cache tiap menit</label><p class="hint">Memakai ±10–20 menit kuota trigger per hari. Dimatikan pun, trigger tetap memproses antrean notifikasi.</p><div id="km-perf">' + A.skel(4, 26) + '</div></div></div>' +
      '<div class="card"><div class="sect"><div class="sect-t">' + ic('i-db') + 'Sumber data</div><div class="info-grid">' +
      '<div><span>Spreadsheet database</span><b>' + (k.spreadsheetUrl ? '<a href="' + esc(k.spreadsheetUrl) + '" target="_blank" rel="noopener">Buka ' + ic('i-ext') + '</a>' : '-') + '</b></div>' +
      '<div><span>Folder Drive</span><b>' + (k.folderUrl ? '<a href="' + esc(k.folderUrl) + '" target="_blank" rel="noopener">Buka ' + ic('i-ext') + '</a>' : '-') + '</b></div>' +
      '<div><span>Trigger aktif</span><b>' + esc((k.trigger || []).join(', ') || 'tidak ada') + '</b></div><div><span>Token Fonnte</span><b>' + (k.fonnte.ada ? esc(k.fonnte.samar) : 'belum diisi') + '</b></div><div><span>Versi backend</span><b>' + esc(k.versi) + '</b></div></div>' +
      '<p class="note warn" style="margin-top:12px">' + ic('i-alert') + ' Jangan bagikan spreadsheet database & jangan menambah editor proyek Apps Script sembarangan — editor bisa melihat Script Properties.</p></div></div></div>';
    $('#km-cid-simpan').addEventListener('click', function () {
      var v = $('#km-cid').value.trim();
      if (!/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(v)) { U.toast('Client ID harus berakhiran .apps.googleusercontent.com', 'err'); return; }
      A.tulis('rahasia.simpan', { kunci: 'GOOGLE_CLIENT_ID', nilai: v }).then(function (r) { if (r.success) { var c = Store.val('authcfg') || {}; c.googleClientId = v; Store.set('authcfg', c); el.dataset.ok = ''; A.ambil('keamanan', { fresh: true }); } });
    });
    var kuat = function () { var p = $('#km-p').value, h = $('#km-kuat'), ok = p.length >= 12 && /[A-Za-z]/.test(p) && /\d/.test(p); h.className = 'hint' + (p ? (ok ? ' ok' : ' err') : ''); h.textContent = !p ? 'Minimal 12 karakter, berisi huruf dan angka.' : ok ? '✓ Kata sandi cukup kuat' : 'Belum memenuhi syarat (≥12 karakter, huruf + angka).'; return ok; };
    $('#km-p').addEventListener('input', kuat);
    $('#km-dr').addEventListener('submit', function (e) {
      e.preventDefault();
      var o = A.nilaiForm(e.target);
      if (!/^[A-Za-z0-9._-]{5,40}$/.test(o.username)) { U.toast('Nama pengguna 5–40 karakter (huruf, angka, . _ -).', 'err'); return; }
      if (!kuat()) return;
      if (o.sandi !== o.konfirmasi) { U.toast('Konfirmasi kata sandi tidak sama.', 'err'); return; }
      A.konfirmasi({ judul: 'Ganti kredensial darurat?', pesan: 'Kredensial lama langsung tidak berlaku dan semua sesi darurat dicabut. Simpan kredensial baru di tempat aman.', ok: 'Ganti sekarang' }).then(function (y) {
        if (!y) return;
        A.tulis('darurat.rotasi', o).then(function (r) {
          e.target.reset();
          if (r.success && r.data.keluar) A.keluar('Kredensial darurat diganti. Masuk kembali dengan kredensial baru.', false);
          else if (r.success) { el.dataset.ok = ''; A.ambil('keamanan', { fresh: true }); }
        });
      });
    });
    $('#km-out').addEventListener('click', function () {
      A.konfirmasi({ judul: 'Keluar dari semua perangkat?', pesan: 'Semua sesi akun ini (termasuk perangkat ini) akan diakhiri.', ok: 'Keluar dari semua', bahaya: true }).then(function (y) {
        if (y) API.call('sesi.keluarSemua', {}).then(function () { A.keluar('Semua sesi telah diakhiri.', true); });
      });
    });
    $('#km-warm').addEventListener('change', function (e) { A.tulis('turbo.keepWarm', { aktif: e.target.checked }); });
    isiPerforma(A.lokal('performa'));
  }
  function isiPerforma(p) {
    var el = $('#km-perf'); if (!el || !p) return;
    var st = function (v) { return v === 'HANGAT' ? '<span class="pill pill-ok">HANGAT</span>' : '<span class="pill pill-mute">dingin</span>'; };
    var lg = EK.Perf.log, rata = lg.length ? Math.round(lg.reduce(function (s, e) { return s + e.total; }, 0) / lg.length) : 0;
    el.innerHTML = '<div class="sys-list">' + Object.keys(p.cache || {}).map(function (k) { return '<div><span>Cache ' + esc(k) + '</span><b>' + st(p.cache[k]) + '</b></div>'; }).join('') +
      '<div><span>Antrean notifikasi</span><b>' + esc(p.antreanNotif) + '</b></div><div><span>Pemanasan terakhir</span><b>' + esc(p.warmTerakhir ? U.relatif(p.warmTerakhir.at) + ' (' + p.warmTerakhir.scope + ')' : '-') + '</b></div>' +
      '<div><span>Ukuran Script Properties</span><b>' + esc(p.scriptPropertiesKB) + ' KB / 500 KB</b></div><div><span>Permintaan dari browser ini</span><b>' + lg.length + ' · rata-rata ' + rata + ' ms</b></div></div>' +
      '<p class="hint" style="margin-top:8px">Detail per aksi: buka Console browser lalu ketik <span class="mono-box">EK.Perf.summary()</span>.</p>';
  }

  // =============================================================== MIGRASI DATA
  var SHEET_MIG = [['Pengaturan', 1], ['Pengguna', 1], ['Kelas', 1], ['Kurikulum', 1], ['Produk', 1], ['Hero', 1], ['HasilKelas', 1], ['Testimoni', 1], ['Leads', 1], ['Kunjungan', 1], ['CRM_Kontak', 0], ['CRM_Interaksi', 0], ['LogAktivitas', 0]];
  var MG = { sumber: '', pilih: {}, timpa: false, hasil: null, csv: [] };
  SHEET_MIG.forEach(function (s) { MG.pilih[s[0]] = !!s[1]; });
  A.daftar('migrasi', {
    mount: function (el) {
      el.innerHTML = '<div class="g-2"><div class="card"><div class="card-h"><div><span class="kick">Spreadsheet app lama hanya DIBACA</span><h2>Import dari App Lama</h2><p>Kolom dicocokkan berdasarkan nama header (mendukung variasi seperti Name/Nama, WhatsApp/no_wa). Aman diulang: data yang sama tidak dobel.</p></div></div>' +
        '<div class="field"><label class="label" for="mg-src">URL atau ID spreadsheet app lama</label><input class="input" id="mg-src" value="' + esc(MG.sumber) + '" placeholder="https://docs.google.com/spreadsheets/d/…/edit"><span class="hint">Harus milik / bisa diakses akun Google pemilik Apps Script ini, agar ID file Drive lama tetap terbaca.</span></div>' +
        '<div class="field"><span class="label">Data yang diimpor</span><div class="chips" id="mg-sheets">' + SHEET_MIG.map(function (s) { return '<button class="chip-btn" type="button" data-s="' + s[0] + '" aria-pressed="' + !!MG.pilih[s[0]] + '">' + s[0] + '</button>'; }).join('') + '</div><span class="hint">Log aktivitas & data CRM bawaan dimatikan; nyalakan bila sumber adalah versi lama app ini.</span></div>' +
        '<label class="switch"><input type="checkbox" id="mg-timpa"' + (MG.timpa ? ' checked' : '') + '><span class="track"></span>Timpa konten yang sudah ada (produk/hero/kelas…) dengan versi app lama</label>' +
        '<div class="tb" style="margin-top:16px"><button class="btn btn-cream" type="button" id="mg-pindai">' + ic('i-search') + 'Pindai (dry-run)</button><button class="btn btn-primary" type="button" id="mg-jalan">' + ic('i-db') + 'Jalankan import</button></div>' +
        '<div id="mg-hasil" style="margin-top:18px"></div></div>' +
        '<div class="grid" style="align-content:start"><div class="card"><div class="sect"><div class="sect-t">' + ic('i-list') + 'Checklist pindah (cutover)</div><ol style="margin:0;padding-left:18px;display:grid;gap:6px;font-size:.88rem">' +
        '<li>Tempel URL spreadsheet lama → <b>Pindai</b> → periksa angka & peringatan.</li><li><b>Jalankan import</b>. Cek produk, gambar, leads, dan pengaturan.</li><li>Uji 1 transaksi checkout di landing page baru.</li><li>Tepat sebelum pindah: <b>jalankan import sekali lagi</b> (delta) untuk menangkap data terbaru.</li><li>Umumkan alamat baru (blast WA), arsipkan deployment lama.</li></ol>' +
        '<p class="note" style="margin-top:10px">Tidak ikut pindah: sesi login (pengguna cukup masuk ulang). Superadmin lama diimpor sebagai Admin; naikkan perannya manual bila perlu.</p></div></div>' +
        '<div class="card"><div class="sect"><div class="sect-t">' + ic('i-upload') + 'Import leads dari CSV</div><p class="muted">Untuk data dari luar (ekspor form/marketplace). Kolom dikenali: nama, profesi, whatsapp/no_wa, email, produk (ID atau nama), waktu, status, sumber.</p>' +
        '<div class="tb"><label class="btn btn-cream btn-sm" style="cursor:pointer">' + ic('i-upload') + 'Pilih CSV<input type="file" accept=".csv,text/csv" id="mg-csv" hidden></label><button class="btn btn-ghost btn-sm" type="button" id="mg-tpl">' + ic('i-download') + 'Template</button></div><div id="mg-csv-hasil" style="margin-top:10px"></div></div></div></div></div>';
      $('#mg-src').addEventListener('input', function (e) { MG.sumber = e.target.value.trim(); });
      $('#mg-sheets').addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (!b) return; MG.pilih[b.dataset.s] = !MG.pilih[b.dataset.s]; b.setAttribute('aria-pressed', String(MG.pilih[b.dataset.s])); });
      $('#mg-timpa').addEventListener('change', function (e) { MG.timpa = e.target.checked; });
      $('#mg-pindai').addEventListener('click', function () { jalankan(true); });
      $('#mg-jalan').addEventListener('click', function () {
        A.konfirmasi({ judul: 'Jalankan import sekarang?', html: 'Data dari app lama akan <b>ditambahkan</b> ke app ini' + (MG.timpa ? ' dan <b>menimpa</b> konten yang sama' : '') + '. Spreadsheet lama tidak diubah. Aman diulang.', ok: 'Jalankan import' }).then(function (y) { if (y) jalankan(false); });
      });
      $('#mg-tpl').addEventListener('click', function () { A.unduh('template-leads.csv', '﻿nama,profesi,whatsapp,email,produk,waktu,status,sumber\r\nBudi Santoso,Freelancer,081234567890,budi@email.com,Masterclass Ads & Funnel 2026,2026-10-01 10:00,Baru,marketplace\r\n', 'text/csv'); });
      $('#mg-csv').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        var r = new FileReader(); r.onload = function () { MG.csv = A.parseCSV(r.result); csvPratinjau(); }; r.readAsText(f); e.target.value = '';
      });
      if (MG.hasil) tampilHasil(MG.hasil);
    }
  });
  function jalankan(dry) {
    if (!MG.sumber) { U.toast('Tempel URL spreadsheet app lama dulu.', 'err'); $('#mg-src').focus(); return; }
    var sheets = Object.keys(MG.pilih).filter(function (k) { return MG.pilih[k]; });
    if (!sheets.length) { U.toast('Pilih minimal satu data.', 'err'); return; }
    var h = $('#mg-hasil'); h.innerHTML = '<span class="basi"><span class="spin"></span>' + (dry ? 'Memindai' : 'Mengimpor') + ' spreadsheet lama… (bisa beberapa puluh detik)</span>';
    $$('#mg-pindai, #mg-jalan').forEach(function (b) { b.disabled = true; });
    API.call(dry ? 'migrasi.pindai' : 'migrasi.jalankan', { sumber: MG.sumber, sheets: sheets, timpa: MG.timpa }, { timeout: 330000 }).then(function (r) {
      $$('#mg-pindai, #mg-jalan').forEach(function (b) { b.disabled = false; });
      if (!r.success) { h.innerHTML = '<p class="note err">' + esc(r.message) + '</p>'; return; }
      MG.hasil = r.data; tampilHasil(r.data);
      U.toast(r.message);
      if (!dry) { ['konten', 'leads', 'dash', 'crm', 'pengguna', 'pengaturan', 'sistem'].forEach(function (k) { A.usang(k); }); Store.usang('konten'); A.ambil('konten', { fresh: true, diam: true }); A.ambil('leads', { fresh: true, diam: true }); }
    });
  }
  function tampilHasil(d) {
    var h = $('#mg-hasil'); if (!h) return;
    var lap = d.laporan, keys = Object.keys(lap);
    h.innerHTML = '<div class="note' + (d.dryRun ? ' warn' : '') + '">' + ic(d.dryRun ? 'i-info' : 'i-check') + ' ' + (d.dryRun ? 'Hasil <b>pindai</b> — belum ada yang ditulis.' : '<b>Import selesai.</b>') + ' Sumber: <b>' + esc(d.sumber.nama) + '</b></div>' +
      '<div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Data</th><th class="hide-m">Sheet sumber</th><th class="num">Di app lama</th><th class="num">Ditambah</th><th class="num">Diperbarui</th><th class="num">Dilewati</th></tr></thead><tbody>' +
      keys.map(function (k) { var x = lap[k], p = d.pemetaan[k] || {}; return '<tr><td><b>' + esc(k) + '</b></td><td class="hide-m"><small>' + esc(p.sheetSumber || '') + '</small></td><td class="num">' + x.sumber + '</td><td class="num"><b style="color:var(--leaf)">' + x.ditambah + '</b></td><td class="num">' + x.diperbarui + '</td><td class="num">' + x.dilewati + '</td></tr>'; }).join('') +
      '</tbody></table></div>' +
      (d.tidakAda.length ? '<p class="hint" style="margin-top:8px">Tidak ditemukan di app lama: ' + d.tidakAda.map(esc).join(', ') + '</p>' : '') +
      (d.peringatan.length ? '<div class="note warn" style="margin-top:12px"><b>Peringatan</b><ul style="margin:6px 0 0;padding-left:18px">' + d.peringatan.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<details style="margin-top:12px"><summary class="label" style="cursor:pointer">Detail pemetaan kolom</summary><div class="tbl-wrap" style="margin-top:8px"><table class="tbl"><thead><tr><th>Data</th><th>Kolom dikenali</th><th>Kolom diabaikan</th></tr></thead><tbody>' +
      Object.keys(d.pemetaan).map(function (k) { var p = d.pemetaan[k]; return '<tr><td><b>' + esc(k) + '</b></td><td><small>' + esc(p.terpetakan.join(', ')) + '</small></td><td><small>' + esc(p.takDikenal.join(', ') || '-') + '</small></td></tr>'; }).join('') + '</tbody></table></div></details>';
  }
  function csvPratinjau() {
    var el = $('#mg-csv-hasil'); if (!el) return;
    if (!MG.csv.length) { el.innerHTML = '<p class="note err">CSV kosong atau tidak terbaca.</p>'; return; }
    el.innerHTML = '<span class="basi"><span class="spin"></span>Memeriksa ' + MG.csv.length + ' baris…</span>';
    API.call('migrasi.csv', { rows: MG.csv, dryRun: true }).then(function (r) {
      if (!r.success) { el.innerHTML = '<p class="note err">' + esc(r.message) + '</p>'; return; }
      el.innerHTML = '<div class="note">' + esc(r.message) + '</div>' + (r.data.ditambah ? '<button class="btn btn-primary btn-sm" type="button" id="mg-csv-go" style="margin-top:10px">' + ic('i-upload') + 'Impor ' + r.data.ditambah + ' leads</button>' : '');
      var b = $('#mg-csv-go'); if (b) b.addEventListener('click', function () {
        b.disabled = true;
        A.tulis('migrasi.csv', { rows: MG.csv, dryRun: false }).then(function (x) { if (x.success) { el.innerHTML = '<div class="note">' + esc(x.message) + '</div>'; A.usang('leads'); A.usang('crm'); A.ambil('leads', { fresh: true, diam: true }); } else b.disabled = false; });
      });
    });
  }

  // =============================================================== LOG AKTIVITAS
  var LG = { q: '', aksi: '' };
  A.daftar('log', {
    mount: function (el) {
      el.innerHTML = '<div class="card"><div class="card-h"><div><span class="kick">LogAktivitas</span><h2>Log Aktivitas</h2><p>Siapa mengubah apa dan kapan. Nilai rahasia tidak pernah dicatat.</p></div></div>' +
        '<div class="tb" style="margin-bottom:12px"><label class="search grow">' + ic('i-search') + '<input class="input input-sm" id="lg-q" placeholder="Cari pengguna, target, detail…"></label><select class="select select-sm" id="lg-aksi" style="width:auto"><option value="">Semua aksi</option></select></div><div id="lg-tabel">' + A.skel(8, 38) + '</div></div>';
      $('#lg-q').addEventListener('input', U.debounce(function (e) { LG.q = e.target.value.toLowerCase(); isiLog(A.lokal('log')); }, 200));
      $('#lg-aksi').addEventListener('change', function (e) { LG.aksi = e.target.value; isiLog(A.lokal('log')); });
      A.on('log', isiLog); isiLog(A.lokal('log'));
    },
    muat: function (fresh) { A.ambil('log', { fresh: fresh }); }
  });
  function isiLog(d) {
    var el = $('#lg-tabel'); if (!el || !d) return;
    var aksiSet = {}; d.rows.forEach(function (r) { aksiSet[r.aksi] = 1; });
    var sel = $('#lg-aksi'); if (sel.options.length <= 1) sel.innerHTML = '<option value="">Semua aksi</option>' + Object.keys(aksiSet).sort().map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('');
    var rows = d.rows.filter(function (r) { return (!LG.aksi || r.aksi === LG.aksi) && (!LG.q || (r.pengguna + ' ' + r.target + ' ' + r.detail + ' ' + r.aksi).toLowerCase().indexOf(LG.q) > -1); });
    var warna = function (a) { return /GAGAL|DITOLAK|hapus|LAMBAT/i.test(a) ? 'pill-err' : /LOGIN/.test(a) ? 'pill-info' : /simpan|update|rotasi|import|IMPORT/i.test(a) ? 'pill-warn' : 'pill-mute'; };
    el.innerHTML = rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th class="hide-m">Target</th><th class="hide-m">Detail</th></tr></thead><tbody>' + rows.slice(0, 400).map(function (r) {
      return '<tr><td class="nama">' + A.waktu(r.waktu) + '</td><td><small>' + esc(r.pengguna) + '</small></td><td><span class="pill ' + warna(r.aksi) + '">' + esc(r.aksi) + '</span></td><td class="hide-m"><small>' + esc(r.target) + '</small></td><td class="hide-m" style="max-width:360px"><small>' + esc(String(r.detail || '').slice(0, 160)) + '</small></td></tr>';
    }).join('') + '</tbody></table></div>' : A.kosong('Belum ada log', 'Aktivitas tercatat otomatis setiap ada perubahan.');
  }
})(window.EKA);
