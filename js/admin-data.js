/**
 * admin-data.js — Dashboard Overview, Data Leads, Statistik & Kunjungan, Export Data
 */
(function (A) {
  'use strict';
  var U = A.U, esc = A.esc, $ = A.$, $$ = A.$$, ic = A.ic, Store = EK.Store;
  var STATUS = ['Baru', 'Dihubungi', 'Closing', 'Batal'];

  function paramRentang(hari) { return hari === 30 ? {} : { dari: U.hariIni(-(hari - 1)), sampai: U.hariIni() }; }
  function lblHari(s) { return U.tgl(s, { day: '2-digit', month: 'short', year: undefined }); }

  // =============================================================== DASHBOARD
  var D = { hari: Number(Store.val('dashHari')) || 30 };
  A.daftar('dashboard', {
    mount: function (el, act) {
      act.innerHTML = '<div class="seg" role="group" aria-label="Rentang">' + [7, 30, 90].map(function (h) { return '<button type="button" data-h="' + h + '" aria-pressed="' + (h === D.hari) + '">' + h + ' hari</button>'; }).join('') + '</div>';
      act.addEventListener('click', function (e) { var b = e.target.closest('[data-h]'); if (!b) return; D.hari = +b.dataset.h; Store.set('dashHari', D.hari); $$('[data-h]', act).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); pasang(); A.halaman.dashboard.muat(false); });
      el.innerHTML = '<div class="kpis" id="d-kpi">' + [1, 2, 3, 4].map(function () { return '<div class="kpi"><div class="skel" style="height:14px;width:60%"></div><div class="skel" style="height:34px;width:50%"></div><div class="skel" style="height:12px;width:70%"></div></div>'; }).join('') + '</div>' +
        '<div class="g-2"><div class="card"><div class="card-h"><div><span class="kick">Kecepatan akuisisi</span><h2>Tren Leads Harian</h2><p id="d-chart-sub">Jumlah formulir checkout yang masuk per hari.</p></div><span class="basi" id="d-basi"></span></div><div id="d-chart">' + A.skel(1, 220) + '</div><div class="chart-legend" id="d-legend"></div></div>' +
        '<div class="card"><div class="card-h"><div><span class="kick">Distribusi minat</span><h2>Produk Paling Diminati</h2><p>Pangsa leads per produk pada rentang ini.</p></div></div><div id="d-top">' + A.skel(3, 40) + '</div><div id="d-insight" style="margin-top:18px"></div></div></div>' +
        '<div class="g-2"><div class="card"><div class="card-h"><div><span class="kick">Database pembeli</span><h2>Leads Terbaru</h2><p>Klik baris untuk melihat detail & follow-up.</p></div><a class="btn btn-cream btn-sm" href="#/leads">Semua leads ' + ic('i-ext') + '</a></div><div id="d-terbaru">' + A.skel(4) + '</div></div>' +
        '<div class="card"><div class="card-h"><div><span class="kick">Backend</span><h2>Status Sistem</h2><p>Google Apps Script, Sheets, Drive & gateway.</p></div></div><div id="d-sys">' + A.skel(5, 30) + '</div></div></div>';
      pasang();
      A.on('sistem', isiSys); isiSys(A.lokal('sistem'));
    },
    muat: function (fresh) { A.ambil('dash', { p: paramRentang(D.hari), fresh: fresh }); A.ambil('sistem', { fresh: fresh, diam: true }); }
  });
  function pasang() { var k = A.kunciData('dash', paramRentang(D.hari)); A.on(k, isiDash); isiDash(A.lokal(k)); }
  function isiDash(d) {
    if (!d || A.aktif !== 'dashboard') return;
    var k = d.kpi;
    var kartu = function (lbl, ikon, nilai, delta, sub, leaf, kecil) {
      return '<div class="kpi"><div class="kpi-h"><span class="kpi-l">' + lbl + '</span><span class="kpi-ic' + (leaf ? ' leaf' : '') + '">' + ic(ikon) + '</span></div><div class="kpi-v' + (kecil ? ' sm' : '') + '">' + nilai + (delta || '') + '</div><div class="kpi-s">' + sub + '</div></div>';
    };
    $('#d-kpi').innerHTML =
      kartu('Total kunjungan', 'i-eye', U.angka(k.kunjungan), A.delta(k.kunjunganDelta), '±' + U.angka(k.kunjunganRata) + ' pengunjung/hari · vs ' + d.rentang.hari + ' hari sebelumnya') +
      kartu('Leads masuk', 'i-useradd', U.angka(k.leads), A.delta(k.leadsDelta), U.angka(k.leadsRata) + ' leads/hari · total semua ' + U.angka(k.totalLeadsSemua)) +
      kartu('Konversi kunjungan → leads', 'i-trend', String(k.konversi).replace('.', ',') + '%', A.delta(k.konversiDelta, ' poin'), 'Leads ÷ kunjungan pada rentang ini', true) +
      kartu('Estimasi omzet closing', 'i-money', U.rp(k.omset), A.delta(k.omsetDelta), U.angka(k.closing) + ' leads berstatus Closing', false, true);
    A.grafikGaris($('#d-chart'), { label: d.seri.hari, nilai: d.seri.leads, satuan: 'leads', aria: 'Leads per hari', labelPendek: lblHari, labelTip: function (t) { return U.tgl(t, { weekday: 'long', day: 'numeric', month: 'long' }); } });
    var puncak = Math.max.apply(null, d.seri.leads), iP = d.seri.leads.indexOf(puncak);
    $('#d-legend').innerHTML = '<span><i></i>Leads per hari</span><span>Rata-rata <b>' + String(k.leadsRata).replace('.', ',') + '</b>/hari</span>' + (puncak ? '<span>Puncak <b>' + puncak + '</b> pada ' + esc(U.tgl(d.seri.hari[iP], { day: 'numeric', month: 'short' })) + '</span>' : '');
    $('#d-chart-sub').textContent = 'Formulir checkout per hari · ' + U.tgl(d.rentang.dari) + ' – ' + U.tgl(d.rentang.sampai);
    A.grafikBatang($('#d-top'), d.produkTop.slice(0, 6).map(function (p) {
      return { label: p.nama, nilai: p.leads, kanan: p.leads + ' leads (' + p.persen + '%)', kiriBawah: 'Harga ' + U.rp(p.harga) + (p.tipe ? ' · ' + esc(p.tipe) : ''), kananBawah: 'Closing ' + p.konversi + '%', tip: p.closing + ' closing' };
    }), { kosong: 'Belum ada leads pada rentang ini' });
    var t = d.produkTop[0];
    $('#d-insight').innerHTML = t ? '<div class="insight">' + ic('i-spark') + '<div><b>' + esc(t.nama) + '</b> paling diminati: ' + t.persen + '% dari seluruh leads, dengan tingkat closing ' + t.konversi + '%.' + (d.notif.gagal ? ' <b style="color:var(--err)">' + d.notif.gagal + ' notifikasi gagal</b> perlu dicek di menu WhatsApp & Notifikasi.' : '') + '</div></div>' : '';
    var rows = d.terbaru || [];
    $('#d-terbaru').innerHTML = rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Nama</th><th class="hide-m">Produk</th><th>Status</th><th class="hide-m">Notif</th></tr></thead><tbody>' + rows.map(function (l) {
      return '<tr data-klik="' + esc(l.id) + '"><td class="nama waktu">' + A.waktu(l.waktu) + '</td><td class="nama"><b>' + esc(l.nama) + '</b><small>' + esc(l.profesi) + '</small></td><td class="hide-m">' + esc(l.produk_nama) + '</td><td>' + A.pilStatus(l.status_followup) + '</td><td class="hide-m">' + A.ntf(l) + '</td></tr>';
    }).join('') + '</tbody></table></div>' : A.kosong('Belum ada leads', 'Leads muncul di sini begitu pengunjung mengisi formulir checkout.');
    $$('#d-terbaru [data-klik]').forEach(function (tr) { tr.addEventListener('click', function () { A.bukaLead(tr.dataset.klik, rows); }); });
  }
  function isiSys(s) {
    var el = $('#d-sys'); if (!el || !s) return;
    var baris = function (l, v) { return '<div><span>' + l + '</span><b>' + v + '</b></div>'; };
    var p = function (ok, ya, tidak) { return '<span class="pill ' + (ok ? 'pill-ok' : 'pill-warn') + '"><span class="dot"></span>' + (ok ? ya : tidak) + '</span>'; };
    var tickOk = (s.trigger || []).indexOf('tickMenit') > -1;
    el.innerHTML = '<div class="sys-list">' +
      baris('Database Google Sheets', p(s.sheets && s.sheets.ok, 'Terhubung', 'Bermasalah')) +
      baris('LockService (anti-bentrok)', p(true, 'Aktif', '')) +
      baris('Gateway WhatsApp (Fonnte)', !s.wa.tokenAda ? '<span class="pill pill-mute">Belum diatur</span>' : p(s.wa.status === 'connect', 'Online' + (s.wa.kuota !== '' ? ' · kuota ' + esc(s.wa.kuota) : ''), esc(s.wa.status || 'Terputus'))) +
      baris('Notifikasi WA / Email', (s.waAktif ? 'WA aktif' : 'WA mati') + ' · ' + (s.emailAktif ? 'Email aktif' : 'Email mati')) +
      baris('Sisa kuota email hari ini', s.emailKuota == null ? '-' : U.angka(s.emailKuota)) +
      baris('Trigger antrean (1 menit)', p(tickOk, 'Berjalan', 'Belum terpasang')) +
      baris('Keep-warm server', p(s.keepWarm, 'Aktif', 'Dimatikan')) +
      baris('Folder gambar Drive', s.drive && s.drive.ok ? esc(s.drive.nama) : '<span class="pill pill-warn">Tidak ditemukan</span>') +
      baris('Cache terakhir dipanaskan', s.warm ? esc(U.relatif(s.warm.at)) : '-') +
      '</div>' + (A.isSA() ? '<a class="btn btn-cream btn-sm btn-block" style="margin-top:16px" href="#/keamanan">' + ic('i-gear') + ' Keamanan & Performa</a>' : '');
  }

  // =============================================================== LEADS
  var L = { q: '', produk: '', status: '', notif: '', dari: '', sampai: '', hal: 1, per: 25, pilih: {}, semua: false };
  function dataLeads() { return A.lokal(A.kunciData('leads', L.semua ? { semua: true } : {})); }
  function saring(rows) {
    var q = L.q.toLowerCase().trim();
    return rows.filter(function (l) {
      var tg = String(l.waktu).slice(0, 10);
      if (L.produk && String(l.produk_id) !== L.produk) return false;
      if (L.status && l.status_followup !== L.status) return false;
      if (L.dari && tg < L.dari) return false;
      if (L.sampai && tg > L.sampai) return false;
      if (L.notif === 'gagal' && !/^gagal/.test(l.status_notif_wa + '') && !/^gagal/.test(l.status_notif_email + '')) return false;
      if (L.notif === 'antri' && !/^antri/.test(l.status_notif_wa + '') && !/^antri/.test(l.status_notif_email + '')) return false;
      if (L.notif === 'ok' && !(/^terkirim/.test(l.status_notif_wa + '') || /^terkirim/.test(l.status_notif_email + ''))) return false;
      if (q && (l.nama + ' ' + l.email + ' ' + l.no_wa + ' ' + l.profesi + ' ' + l.produk_nama + ' ' + l.catatan).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }
  A.saringLeads = function () { var d = dataLeads(); return d ? saring(d.rows) : []; };
  A.daftar('leads', {
    mount: function (el, act) {
      L.hal = 1; L.pilih = {};
      var qp = A.query(); if (qp.get('status')) L.status = qp.get('status');
      act.innerHTML = '<button class="btn btn-cream btn-sm" id="l-csv" type="button">' + ic('i-download') + '<span>Unduh CSV (sesuai filter)</span></button>';
      el.innerHTML = '<div class="card"><div class="card-h"><div><span class="kick">Database pembeli real-time</span><h2>Daftar Leads Pembeli <span class="pill pill-burnt" id="l-total" style="vertical-align:4px">…</span></h2><p>Tersimpan otomatis dari formulir checkout landing page.</p></div>' +
        '<div class="seg" id="l-rentang"><button type="button" data-r="180" aria-pressed="' + !L.semua + '">180 hari</button><button type="button" data-r="semua" aria-pressed="' + L.semua + '">Semua waktu</button></div></div>' +
        '<div class="tb" style="margin-bottom:12px"><label class="search grow">' + ic('i-search') + '<input class="input input-sm" id="l-q" placeholder="Cari nama, email, nomor WA, catatan…" value="' + esc(L.q) + '"></label>' +
        '<select class="select select-sm" id="l-produk" aria-label="Produk"><option value="">Semua produk</option></select>' +
        '<select class="select select-sm" id="l-status" aria-label="Status follow-up"><option value="">Semua status</option>' + STATUS.map(function (s) { return '<option' + (L.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
        '<select class="select select-sm" id="l-notif" aria-label="Notifikasi"><option value="">Notifikasi: semua</option><option value="ok">Terkirim</option><option value="antri">Masih antre</option><option value="gagal">Ada yang gagal</option></select>' +
        '<input class="input input-sm" type="date" id="l-dari" value="' + esc(L.dari) + '" aria-label="Dari tanggal" style="width:auto"><input class="input input-sm" type="date" id="l-sampai" value="' + esc(L.sampai) + '" aria-label="Sampai tanggal" style="width:auto">' +
        '<button class="btn btn-ghost btn-sm" type="button" id="l-reset">Reset</button></div>' +
        '<div class="bulk" id="l-bulk" hidden></div><div id="l-tabel" style="margin-top:10px">' + A.skel(6) + '</div></div>';
      var ulang = function () { L.hal = 1; isiLeads(); };
      $('#l-q').addEventListener('input', U.debounce(function (e) { L.q = e.target.value; ulang(); }, 200));
      ['produk', 'status', 'notif', 'dari', 'sampai'].forEach(function (k) { $('#l-' + k).addEventListener('change', function (e) { L[k] = e.target.value; ulang(); }); });
      $('#l-notif').value = L.notif;
      $('#l-reset').addEventListener('click', function () { L.q = L.produk = L.status = L.notif = L.dari = L.sampai = ''; A.ke('leads'); A.halaman.leads.mount(el, act); A.halaman.leads.muat(false); });
      $('#l-rentang').addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (!b) return; L.semua = b.dataset.r === 'semua'; $$('#l-rentang button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); pasangL(); A.halaman.leads.muat(false); });
      $('#l-csv').addEventListener('click', function () {
        var rows = A.saringLeads();
        A.unduh('leads-' + U.hariIni() + '.csv', A.csv(rows, KOLOM_LEADS), 'text/csv;charset=utf-8');
        A.tulis('export.catat', { jenis: 'leads', jumlah: rows.length, format: 'csv', filter: ringkasFilter() }, { pesan: rows.length + ' leads diunduh (CSV).' });
      });
      $('#l-tabel').addEventListener('click', klikTabel);
      $('#l-tabel').addEventListener('change', ubahTabel);
      pasangL();
      A.on('konten', isiProdukOpsi); isiProdukOpsi(A.lokal('konten'));
    },
    muat: function (fresh) { A.ambil('leads', { p: L.semua ? { semua: true } : {}, fresh: fresh }); A.ambil('konten', { diam: true }); }
  });
  function pasangL() { A.on(A.kunciData('leads', L.semua ? { semua: true } : {}), isiLeads); isiLeads(); }
  function ringkasFilter() { return ['q', 'produk', 'status', 'notif', 'dari', 'sampai'].filter(function (k) { return L[k]; }).map(function (k) { return k + '=' + L[k]; }).join('; '); }
  var KOLOM_LEADS = [['id', 'ID'], ['waktu', 'Waktu'], ['nama', 'Nama'], ['profesi', 'Profesi'], ['no_wa', 'No WhatsApp'], ['email', 'Email'], ['produk_nama', 'Produk'], ['produk_id', 'ID Produk'],
    ['status_followup', 'Status Follow-up'], ['status_notif_wa', 'Notif WA'], ['status_notif_email', 'Notif Email'], ['sumber', 'Sumber'], ['catatan', 'Catatan']];
  A.KOLOM_LEADS = KOLOM_LEADS;
  function isiProdukOpsi(k) {
    var s = $('#l-produk'); if (!s || !k) return;
    s.innerHTML = '<option value="">Semua produk</option>' + (k.produk || []).map(function (p) { return '<option value="' + esc(p.id) + '"' + (L.produk === String(p.id) ? ' selected' : '') + '>' + esc(p.nama) + '</option>'; }).join('');
  }
  function isiLeads() {
    if (A.aktif !== 'leads') return;
    var d = dataLeads(), el = $('#l-tabel');
    if (!d) { el.innerHTML = A.skel(6); return; }
    var rows = saring(d.rows), n = rows.length;
    $('#l-total').textContent = U.angka(d.rows.length) + ' leads';
    var hal = Math.min(L.hal, Math.max(1, Math.ceil(n / L.per))), awal = (hal - 1) * L.per, tampil = rows.slice(awal, awal + L.per);
    L.hal = hal;
    var semuaDipilih = tampil.length && tampil.every(function (l) { return L.pilih[l.id]; });
    el.innerHTML = n ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px"><input type="checkbox" class="chk" data-all' + (semuaDipilih ? ' checked' : '') + ' aria-label="Pilih semua di halaman ini"></th><th>Waktu</th><th>Nama & profesi</th><th>WhatsApp & email</th><th class="hide-m">Produk</th><th>Status</th><th class="hide-m">Notif</th><th class="aksi">Aksi</th></tr></thead><tbody>' +
      tampil.map(barisLead).join('') + '</tbody></table></div>' + A.pager(n, hal, L.per) :
      A.kosong('Tidak ada leads yang cocok', 'Ubah kata kunci atau filter.' + (L.semua ? '' : ' Data yang ditampilkan: 180 hari terakhir.'));
    $$('[data-hal]', el).forEach(function (b) { b.addEventListener('click', function () { L.hal = +b.dataset.hal; isiLeads(); $('#l-tabel').scrollIntoView({ block: 'start', behavior: 'smooth' }); }); });
    isiBulk();
  }
  function barisLead(l) {
    var wa = U.waLink(l.no_wa, 'Halo ' + l.nama + ', terima kasih sudah mendaftar ' + l.produk_nama + '. ');
    return '<tr data-id="' + esc(l.id) + '"' + (L.pilih[l.id] ? ' class="dipilih"' : '') + '><td><input type="checkbox" class="chk" data-pilih="' + esc(l.id) + '"' + (L.pilih[l.id] ? ' checked' : '') + ' aria-label="Pilih ' + esc(l.nama) + '"></td>' +
      '<td class="nama waktu">' + A.waktu(l.waktu) + '</td><td class="nama" style="min-width:150px"><b>' + esc(l.nama) + '</b><small>' + esc(l.profesi) + '</small></td>' +
      '<td class="kontak"><span class="cell-wa">' + esc(U.waFormat(l.no_wa)) + '</span>' + (l.StatusWA ? ' <span class="wa-badge ' + (l.StatusWA === 'Terdaftar' ? 'ya' : 'tidak') + '">' + (l.StatusWA === 'Terdaftar' ? '✓ WA' : '✕') + '</span>' : '') + '<small>' + esc(l.email) + '</small></td>' +
      '<td class="hide-m" style="min-width:140px"><small style="font-weight:700;color:var(--burnt-800);font-size:.8rem">' + esc(l.produk_nama) + '</small></td>' +
      '<td><select class="select sel-status" data-status="' + esc(l.id) + '" aria-label="Status follow-up ' + esc(l.nama) + '">' + STATUS.map(function (s) { return '<option' + (s === l.status_followup ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td>' +
      '<td class="hide-m">' + A.ntf(l) + '</td><td class="aksi">' + (wa ? '<a class="btn btn-leaf btn-icon btn-sm" href="' + esc(wa) + '" target="_blank" rel="noopener" title="Chat WhatsApp" aria-label="Chat WhatsApp">' + ic('i-wa') + '</a> ' : '') +
      '<button class="btn btn-cream btn-icon btn-sm" type="button" data-detail="' + esc(l.id) + '" title="Detail" aria-label="Detail">' + ic('i-eye') + '</button></td></tr>';
  }
  function warnaStatus(sel) { var c = { Baru: '#E3ECFF', Dihubungi: '#FFF1CC', Closing: '#E3F1E4', Batal: '#FFE8DC' }[sel.value]; sel.style.backgroundColor = c; }
  function klikTabel(e) {
    var d = e.target.closest('[data-detail]'); if (d) { A.bukaLead(d.dataset.detail); return; }
  }
  function ubahTabel(e) {
    var t = e.target;
    if (t.matches('[data-all]')) {
      var dd = dataLeads(), rows = saring(dd.rows), tampil = rows.slice((L.hal - 1) * L.per, L.hal * L.per);
      tampil.forEach(function (l) { if (t.checked) L.pilih[l.id] = 1; else delete L.pilih[l.id]; });
      isiLeads(); return;
    }
    if (t.matches('[data-pilih]')) { if (t.checked) L.pilih[t.dataset.pilih] = 1; else delete L.pilih[t.dataset.pilih]; t.closest('tr').classList.toggle('dipilih', t.checked); isiBulk(); return; }
    if (t.matches('[data-status]')) { ubahStatus([t.dataset.status], t.value); }
  }
  /** Optimistic: ubah lokal dulu, sinkron ke server, kembalikan bila gagal */
  function ubahStatus(ids, status, catatan) {
    var keys = [A.kunciData('leads', {}), A.kunciData('leads', { semua: true })], cadangan = {};
    keys.forEach(function (k) {
      var d = A.lokal(k); if (!d) return;
      cadangan[k] = JSON.stringify(d);
      d.rows.forEach(function (l) { if (ids.indexOf(String(l.id)) > -1) { l.status_followup = status; if (catatan !== undefined) l.catatan = catatan; } });
      A.simpan(k, d);
    });
    var data = ids.length === 1 ? { id: ids[0], status_followup: status } : { ids: ids, status_followup: status };
    if (catatan !== undefined) data.catatan = catatan;
    return A.tulis('leads.update', data, { pesan: ids.length > 1 ? ids.length + ' leads → ' + status : 'Status diperbarui: ' + status }).then(function (r) {
      if (!r.success) Object.keys(cadangan).forEach(function (k) { A.simpan(k, JSON.parse(cadangan[k])); });
      else { A.usang(A.kunciData('dash', {})); A.usang('crm'); }
      return r;
    });
  }
  function isiBulk() {
    var ids = Object.keys(L.pilih), b = $('#l-bulk'); if (!b) return;
    $$('#l-tabel .sel-status').forEach(warnaStatus);
    if (!ids.length) { b.hidden = true; return; }
    b.hidden = false;
    b.innerHTML = '<span><b>' + ids.length + '</b> leads dipilih</span><select class="select select-sm" id="bk-status" style="width:auto;background-color:#fff;color:var(--cocoa)"><option value="">Ubah status…</option>' + STATUS.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select>' +
      '<button class="btn btn-ghost btn-sm" type="button" id="bk-blast">' + ic('i-send') + 'Kirim ke Blast WA</button><button class="btn btn-ghost btn-sm" type="button" id="bk-hapus">' + ic('i-trash') + 'Hapus</button><button class="btn btn-ghost btn-sm" type="button" id="bk-batal" style="margin-left:auto">Batal pilih</button>';
    $('#bk-status').addEventListener('change', function (e) { if (e.target.value) ubahStatus(ids, e.target.value).then(function () { L.pilih = {}; isiLeads(); }); });
    $('#bk-batal').addEventListener('click', function () { L.pilih = {}; isiLeads(); });
    $('#bk-blast').addEventListener('click', function () {
      var d = dataLeads(), set = {}; ids.forEach(function (i) { set[i] = 1; });
      var pen = d.rows.filter(function (l) { return set[l.id]; }).map(function (l) { return { hp: l.no_wa, nama: l.nama, vars: { produk: l.produk_nama, profesi: l.profesi } }; });
      sessionStorage.setItem('ek_blast_penerima', JSON.stringify(pen)); A.ke('wa', 'tab=blast&dari=leads');
    });
    $('#bk-hapus').addEventListener('click', function () {
      A.konfirmasi({ judul: 'Hapus ' + ids.length + ' leads?', pesan: 'Data akan dihapus permanen dari sheet Leads. Tindakan ini tercatat di log aktivitas.', ok: 'Hapus permanen', bahaya: true }).then(function (y) {
        if (!y) return;
        A.tulis('leads.hapus', { ids: ids }).then(function (r) {
          if (!r.success) return;
          [A.kunciData('leads', {}), A.kunciData('leads', { semua: true })].forEach(function (k) { var d = A.lokal(k); if (d) { d.rows = d.rows.filter(function (l) { return ids.indexOf(String(l.id)) === -1; }); d.total -= r.data.dihapus; A.simpan(k, d); } });
          L.pilih = {}; isiLeads(); A.usang(A.kunciData('dash', {})); A.usang('crm');
        });
      });
    });
  }

  /** Laci detail leads (dipakai juga dari dashboard) */
  A.bukaLead = function (id, cadangan) {
    var d = dataLeads() || A.lokal('leads'), l = null;
    (d ? d.rows : []).concat(cadangan || []).forEach(function (x) { if (!l && String(x.id) === String(id)) l = x; });
    if (!l) { U.toast('Leads tidak ditemukan di data lokal. Segarkan halaman.', 'err'); return; }
    var produk = ((A.lokal('konten') || {}).produk || []).filter(function (p) { return String(p.id) === String(l.produk_id); })[0];
    var tpl = 'Halo ' + l.nama + ' 👋\nTerima kasih sudah mendaftar *' + l.produk_nama + '*' + (produk ? ' (' + U.rp(produk.harga) + ')' : '') + '.\n' + (produk && produk.link_beli ? 'Lanjutkan pembayaran di: ' + produk.link_beli + '\n' : '') + 'Ada yang bisa kami bantu?';
    A.drawer.buka({
      judul: l.nama, sub: esc(l.profesi) + ' · masuk ' + esc(U.relatif(l.waktu)), ikon: '<span class="avatar" style="width:48px;height:48px;border-radius:14px">' + esc(U.inisial(l.nama)) + '</span>',
      isi: '<div class="info-grid"><div><span>WhatsApp</span><b class="mono">' + esc(U.waFormat(l.no_wa)) + '</b></div><div><span>Email</span><b>' + esc(l.email) + '</b></div><div><span>Produk</span><b style="color:var(--burnt)">' + esc(l.produk_nama) + '</b></div>' +
        (produk ? '<div><span>Harga</span><b>' + U.rp(produk.harga) + '</b></div>' : '') + '<div><span>Sumber</span><b>' + esc(l.sumber || '-') + '</b></div><div><span>Waktu</span><b>' + esc(l.waktu) + '</b></div><div><span>Notifikasi</span><b>' + A.ntf(l) + '</b></div><div><span>ID</span><b class="mono">' + esc(l.id) + '</b></div></div>' +
        '<div class="field"><label class="label" for="ld-st">Status follow-up</label><div class="seg" id="ld-st">' + STATUS.map(function (s) { return '<button type="button" data-s="' + s + '" aria-pressed="' + (s === l.status_followup) + '">' + s + '</button>'; }).join('') + '</div></div>' +
        '<div class="field"><label class="label" for="ld-cat">Catatan internal</label><textarea class="textarea" id="ld-cat" placeholder="Mis. sudah ditelepon, minta invoice…" style="min-height:90px">' + esc(l.catatan) + '</textarea></div>' +
        '<div class="field"><span class="label">Template follow-up WhatsApp</span><div class="wa-preview"><div class="wa-bubble" id="ld-tpl">' + esc(tpl) + '</div></div></div>' +
        '<details><summary class="label" style="cursor:pointer">Ubah data kontak</summary><div class="fgrid c2" style="margin-top:12px" id="ld-edit">' +
        '<div class="field"><label class="label">Nama</label><input class="input input-sm" name="nama" value="' + esc(l.nama) + '"></div><div class="field"><label class="label">Profesi</label><input class="input input-sm" name="profesi" value="' + esc(l.profesi) + '"></div>' +
        '<div class="field"><label class="label">No. WA</label><input class="input input-sm" name="no_wa" value="' + esc(l.no_wa) + '"></div><div class="field"><label class="label">Email</label><input class="input input-sm" name="email" value="' + esc(l.email) + '"></div></div></details>',
      kaki: '<button class="btn btn-danger btn-sm kiri" type="button" id="ld-hapus">' + ic('i-trash') + 'Hapus</button>' +
        '<a class="btn btn-cream btn-sm" href="mailto:' + esc(l.email) + '">' + ic('i-mail') + 'Email</a>' +
        '<a class="btn btn-leaf btn-sm" target="_blank" rel="noopener" href="' + esc(U.waLink(l.no_wa, tpl)) + '">' + ic('i-wa') + 'Kirim WA</a><button class="btn btn-primary btn-sm" type="button" id="ld-simpan">' + ic('i-check') + 'Simpan</button>',
      onMount: function (inn) {
        var status = l.status_followup;
        $('#ld-st', inn).addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (!b) return; status = b.dataset.s; $$('#ld-st button', inn).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); });
        $('#ld-simpan', inn).addEventListener('click', function () {
          var cat = $('#ld-cat', inn).value, ed = A.nilaiForm($('#ld-edit', inn)), ubahKontak = {};
          ['nama', 'profesi', 'email'].forEach(function (k) { if (ed[k].trim() !== String(l[k])) ubahKontak[k] = ed[k].trim(); });
          if (U.wa62(ed.no_wa) !== String(l.no_wa)) ubahKontak.no_wa = ed.no_wa;
          var tugas = [];
          if (status !== l.status_followup || cat !== String(l.catatan || '')) tugas.push(ubahStatus([String(l.id)], status, cat));
          if (Object.keys(ubahKontak).length) tugas.push(A.tulis('leads.update', Object.assign({ id: l.id }, ubahKontak)).then(function (r) { if (r.success) A.ambil('leads', { fresh: true, diam: true }); return r; }));
          if (!tugas.length) { A.drawer.tutup(); return; }
          A.drawer.tutup();
          Promise.all(tugas).then(function () { if (A.aktif === 'dashboard') A.ambil('dash', { fresh: true, diam: true }); });
        });
        $('#ld-hapus', inn).addEventListener('click', function () {
          A.konfirmasi({ judul: 'Hapus leads ' + l.nama + '?', pesan: 'Data dihapus permanen dari sheet Leads.', ok: 'Hapus', bahaya: true }).then(function (y) {
            if (!y) return;
            A.tulis('leads.hapus', { ids: [l.id] }).then(function (r) {
              if (!r.success) return;
              [A.kunciData('leads', {}), A.kunciData('leads', { semua: true })].forEach(function (k) { var dd = A.lokal(k); if (dd) { dd.rows = dd.rows.filter(function (x) { return String(x.id) !== String(l.id); }); A.simpan(k, dd); } });
              A.drawer.tutup(); A.usang(A.kunciData('dash', {}));
            });
          });
        });
      }
    });
  };

  // =============================================================== STATISTIK
  var ST = { dari: U.hariIni(-29), sampai: U.hariIni(), tabel: false };
  function paramST() { return ST.dari === U.hariIni(-29) && ST.sampai === U.hariIni() ? {} : { dari: ST.dari, sampai: ST.sampai }; }
  A.daftar('statistik', {
    mount: function (el, act) {
      act.innerHTML = '<div class="seg" id="st-pre">' + [['7', '7 hari'], ['30', '30 hari'], ['90', '90 hari'], ['bln', 'Bulan ini']].map(function (p) { return '<button type="button" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>' +
        '<input class="input input-sm" type="date" id="st-dari" value="' + ST.dari + '" style="width:auto" aria-label="Dari"><input class="input input-sm" type="date" id="st-sampai" value="' + ST.sampai + '" style="width:auto" aria-label="Sampai">';
      el.innerHTML = '<div class="kpis" id="st-kpi">' + A.skel(1, 110) + '</div>' +
        '<div class="g-2 rata"><div class="card"><div class="card-h"><div><span class="kick">Lalu lintas</span><h2>Kunjungan Harian</h2><p>Dicatat sekali per sesi pengunjung.</p></div></div><div id="st-kunj">' + A.skel(1, 200) + '</div></div>' +
        '<div class="card"><div class="card-h"><div><span class="kick">Akuisisi</span><h2>Leads Harian</h2><p>Formulir checkout yang tersimpan.</p></div></div><div id="st-leads">' + A.skel(1, 200) + '</div></div></div>' +
        '<div class="g-2 rata"><div class="card"><div class="card-h"><div><span class="kick">Asal pengunjung</span><h2>Sumber Kunjungan</h2><p>Dari utm_source / perujuk (referrer).</p></div></div><div id="st-sumber"></div></div>' +
        '<div class="card"><div class="card-h"><div><span class="kick">Asal pembeli</span><h2>Sumber Leads</h2><p>Kanal yang menghasilkan formulir.</p></div></div><div id="st-sumberl"></div></div></div>' +
        '<div class="g-2"><div class="card"><div class="card-h"><div><span class="kick">Performa katalog</span><h2>Produk & Konversi</h2></div></div><div id="st-produk"></div></div>' +
        '<div class="card"><div class="card-h"><div><span class="kick">Pipeline</span><h2>Status Follow-up</h2></div></div><div id="st-status"></div></div></div>' +
        '<div class="card"><div class="card-h"><div><span class="kick">Tampilan tabel</span><h2>Data Harian</h2><p>Angka per hari untuk dicek atau disalin.</p></div><button class="btn btn-cream btn-sm" type="button" id="st-tbl-btn">' + (ST.tabel ? 'Sembunyikan' : 'Tampilkan') + ' tabel</button></div><div id="st-tbl"' + (ST.tabel ? '' : ' hidden') + '></div></div>';
      var ganti = function () { pasangST(); A.halaman.statistik.muat(false); };
      $('#st-pre', act).addEventListener('click', function (e) {
        var b = e.target.closest('[data-p]'); if (!b) return;
        var p = b.dataset.p; ST.sampai = U.hariIni();
        ST.dari = p === 'bln' ? U.hariIni().slice(0, 8) + '01' : U.hariIni(-(Number(p) - 1));
        $('#st-dari').value = ST.dari; $('#st-sampai').value = ST.sampai; ganti();
      });
      $('#st-dari').addEventListener('change', function (e) { ST.dari = e.target.value || ST.dari; ganti(); });
      $('#st-sampai').addEventListener('change', function (e) { ST.sampai = e.target.value || ST.sampai; ganti(); });
      $('#st-tbl-btn').addEventListener('click', function (e) { ST.tabel = !ST.tabel; $('#st-tbl').hidden = !ST.tabel; e.target.textContent = (ST.tabel ? 'Sembunyikan' : 'Tampilkan') + ' tabel'; });
      pasangST();
    },
    muat: function (fresh) { A.ambil('dash', { p: paramST(), fresh: fresh }); }
  });
  function pasangST() { var k = A.kunciData('dash', paramST()); A.on(k, isiST); isiST(A.lokal(k)); }
  function isiST(d) {
    if (!d || A.aktif !== 'statistik') return;
    var k = d.kpi;
    var kartu = function (l, v, dl, s) { return '<div class="kpi"><span class="kpi-l">' + l + '</span><div class="kpi-v">' + v + (dl || '') + '</div><div class="kpi-s">' + s + '</div></div>'; };
    $('#st-kpi').innerHTML = kartu('Kunjungan', U.angka(k.kunjungan), A.delta(k.kunjunganDelta), '±' + U.angka(k.kunjunganRata) + '/hari') + kartu('Leads', U.angka(k.leads), A.delta(k.leadsDelta), U.angka(k.leadsRata) + '/hari') +
      kartu('Konversi', String(k.konversi).replace('.', ',') + '%', A.delta(k.konversiDelta, ' poin'), 'kunjungan → leads') + kartu('Closing', U.angka(k.closing), '', U.rp(k.omset) + ' estimasi omzet');
    var lp = function (t) { return U.tgl(t, { weekday: 'long', day: 'numeric', month: 'long' }); };
    A.grafikGaris($('#st-kunj'), { label: d.seri.hari, nilai: d.seri.kunjungan, satuan: 'kunjungan', warna: 'leaf', labelPendek: lblHari, labelTip: lp, aria: 'Kunjungan per hari', tinggi: 210 });
    A.grafikGaris($('#st-leads'), { label: d.seri.hari, nilai: d.seri.leads, satuan: 'leads', labelPendek: lblHari, labelTip: lp, aria: 'Leads per hari', tinggi: 210 });
    var ke = function (m, total) { return Object.keys(m).map(function (x) { return { label: x, nilai: m[x], kanan: U.angka(m[x]) + ' (' + (total ? Math.round(m[x] / total * 100) : 0) + '%)' }; }).sort(function (a, b) { return b.nilai - a.nilai; }).slice(0, 8); };
    A.grafikBatang($('#st-sumber'), ke(d.sumberKunjungan, k.kunjungan), { warna: 'leaf', kosong: 'Belum ada kunjungan tercatat' });
    A.grafikBatang($('#st-sumberl'), ke(d.sumberLeads, k.leads), { kosong: 'Belum ada leads' });
    $('#st-produk').innerHTML = d.produkTop.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Produk</th><th class="num">Leads</th><th class="num">Pangsa</th><th class="num">Closing</th><th class="num">Konversi</th><th class="num hide-m">Omzet</th></tr></thead><tbody>' + d.produkTop.map(function (p) {
      return '<tr><td class="nama"><b>' + esc(p.nama) + '</b><small>' + U.rp(p.harga) + '</small></td><td class="num">' + p.leads + '</td><td class="num">' + p.persen + '%</td><td class="num">' + p.closing + '</td><td class="num"><b>' + p.konversi + '%</b></td><td class="num hide-m">' + U.rp(p.closing * p.harga) + '</td></tr>';
    }).join('') + '</tbody></table></div>' : A.kosong('Belum ada leads pada rentang ini');
    var tot = STATUS.reduce(function (s, x) { return s + (d.status[x] || 0); }, 0);
    $('#st-status').innerHTML = '<div class="bars">' + STATUS.map(function (s) {
      var n = d.status[s] || 0, warna = { Baru: '', Dihubungi: 'honey', Closing: 'leaf', Batal: '' }[s];
      return '<div class="bar-row"><div class="bh">' + A.pilStatus(s) + '<span>' + n + ' (' + (tot ? Math.round(n / tot * 100) : 0) + '%)</span></div><div class="bar-track"><div class="bar-fill ' + warna + '" style="width:' + (tot ? Math.max(1.5, n / tot * 100) : 1.5) + '%;' + (s === 'Batal' ? 'background:#C2410C' : s === 'Baru' ? 'background:#1D4ED8' : '') + '"></div></div></div>';
    }).join('') + '</div><p class="note" style="margin-top:16px">Klik status di menu <a href="#/leads">Data Leads</a> untuk memperbarui pipeline.</p>';
    $('#st-tbl').innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th class="num">Kunjungan</th><th class="num">Leads</th><th class="num">Konversi</th></tr></thead><tbody>' + d.seri.hari.map(function (h, i) {
      var v = d.seri.kunjungan[i], l = d.seri.leads[i];
      return '<tr><td>' + esc(U.tgl(h, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })) + '</td><td class="num">' + v + '</td><td class="num">' + l + '</td><td class="num">' + (v ? (l / v * 100).toFixed(1).replace('.', ',') + '%' : '-') + '</td></tr>';
    }).reverse().join('') + '</tbody></table></div>';
  }

  // =============================================================== EXPORT
  var EX = { jenis: 'leads', format: 'xlsx', dari: '', sampai: '', status: '', produk: '' };
  var DATASET = {
    leads: { label: 'Leads pembeli', ikon: 'i-users', ket: 'Sesuai filter tanggal, status, dan produk di bawah.' },
    produk: { label: 'Katalog produk', ikon: 'i-box', ket: 'Semua produk (aktif & nonaktif).' },
    hero: { label: 'Slide hero', ikon: 'i-slides', ket: 'Judul, CTA, gambar, urutan.' },
    hasil: { label: 'Hasil kelas', ikon: 'i-award', ket: 'Bukti hasil member.' },
    testimoni: { label: 'Testimoni', ikon: 'i-star', ket: 'Ulasan member & rating.' },
    kurikulum: { label: 'Kurikulum', ikon: 'i-book', ket: 'Modul per kelas.' },
    kunjungan: { label: 'Statistik harian', ikon: 'i-chart', ket: 'Kunjungan & leads per hari (30 hari).' },
    crm: { label: 'Kontak CRM', ikon: 'i-contact', ket: 'Nama, email, WA, segmen, tag (Superadmin).', sa: true }
  };
  function barisEkspor(j) {
    var k = A.lokal('konten') || {};
    if (j === 'leads') {
      var d = A.lokal(A.kunciData('leads', { semua: true })) || A.lokal('leads');
      var rows = d ? d.rows : [];
      return { rows: rows.filter(function (l) { var tg = String(l.waktu).slice(0, 10); return (!EX.dari || tg >= EX.dari) && (!EX.sampai || tg <= EX.sampai) && (!EX.status || l.status_followup === EX.status) && (!EX.produk || String(l.produk_id) === EX.produk); }), kolom: KOLOM_LEADS, siap: !!d };
    }
    if (j === 'kunjungan') { var ds = A.lokal('dash'); return { siap: !!ds, kolom: [['tanggal', 'Tanggal'], ['kunjungan', 'Kunjungan'], ['leads', 'Leads']], rows: ds ? ds.seri.hari.map(function (h, i) { return { tanggal: h, kunjungan: ds.seri.kunjungan[i], leads: ds.seri.leads[i] }; }) : [] }; }
    if (j === 'crm') { var c = A.lokal('crm'); return { siap: !!c, rows: c ? c.rows : [], kolom: [['id', 'ID'], ['nama', 'Nama'], ['email', 'Email'], ['wa', 'WhatsApp'], ['segmen', 'Segmen'], ['tag', 'Tag'], ['statusWA', 'Status WA'], [function (r) { return r.optOut ? 'YA' : 'TIDAK'; }, 'Opt-out'], ['jumlahPesan', 'Jumlah Pesan'], ['terakhir', 'Terakhir Dihubungi'], ['catatan', 'Catatan']] }; }
    var rowsK = k[j] || [];
    var kol = rowsK[0] ? Object.keys(rowsK[0]).map(function (x) { return [x, x]; }) : [];
    return { rows: rowsK, kolom: kol, siap: !!A.lokal('konten') };
  }
  A.daftar('export', {
    mount: function (el) {
      el.innerHTML = '<div class="g-2 kiri"><div class="card"><div class="card-h"><div><span class="kick">Langkah 1</span><h2>Pilih Data</h2></div></div><div class="grid" style="gap:10px" id="ex-jenis"></div></div>' +
        '<div class="card"><div class="card-h"><div><span class="kick">Langkah 2</span><h2>Filter & Format</h2><p id="ex-ket"></p></div></div><div id="ex-filter"></div>' +
        '<div class="tb" style="margin-top:16px"><div class="seg" id="ex-fmt"><button type="button" data-f="xlsx">Excel (.xlsx)</button><button type="button" data-f="csv">CSV</button></div><span class="grow"></span><span class="pill pill-burnt" id="ex-n">…</span><button class="btn btn-primary" type="button" id="ex-go">' + ic('i-download') + '<span>Unduh</span></button></div>' +
        '<div style="margin-top:16px" id="ex-prev"></div></div></div>';
      $('#ex-jenis').innerHTML = Object.keys(DATASET).filter(function (k) { return !DATASET[k].sa || A.isSA(); }).map(function (k) {
        var d = DATASET[k];
        return '<button class="kpi" type="button" data-j="' + k + '" aria-pressed="' + (EX.jenis === k) + '" style="flex-direction:row;align-items:center;padding:14px 16px"><span class="kpi-ic">' + ic(d.ikon) + '</span><span style="display:grid"><b>' + esc(d.label) + '</b><small class="muted">' + esc(d.ket) + '</small></span></button>';
      }).join('');
      $('#ex-jenis').addEventListener('click', function (e) { var b = e.target.closest('[data-j]'); if (!b) return; EX.jenis = b.dataset.j; $$('#ex-jenis [data-j]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); isiEx(); });
      $('#ex-fmt').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (!b) return; EX.format = b.dataset.f; isiEx(); });
      $('#ex-go').addEventListener('click', unduhEx);
      ['leads', 'konten', 'crm', 'dash'].forEach(function (k) { A.on(k, isiEx); });
      A.on(A.kunciData('leads', { semua: true }), isiEx);
      isiEx();
    },
    muat: function (fresh) { A.ambil('leads', { p: { semua: true }, fresh: fresh, diam: true }); A.ambil('konten', { fresh: fresh, diam: true }); A.ambil('dash', { diam: true }); if (A.isSA()) A.ambil('crm', { diam: true }); }
  });
  function isiEx() {
    if (A.aktif !== 'export') return;
    $$('#ex-fmt button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.f === EX.format)); });
    $('#ex-ket').textContent = DATASET[EX.jenis].ket;
    var f = $('#ex-filter');
    if (EX.jenis === 'leads') {
      if (!$('#ex-dari')) {
        var k = A.lokal('konten') || {};
        f.innerHTML = '<div class="fgrid c2"><div class="field"><label class="label" for="ex-dari">Dari tanggal</label><input class="input input-sm" type="date" id="ex-dari" value="' + EX.dari + '"></div><div class="field"><label class="label" for="ex-sampai">Sampai tanggal</label><input class="input input-sm" type="date" id="ex-sampai" value="' + EX.sampai + '"></div>' +
          '<div class="field"><label class="label" for="ex-status">Status</label><select class="select select-sm" id="ex-status"><option value="">Semua status</option>' + STATUS.map(function (s) { return '<option' + (EX.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
          '<div class="field"><label class="label" for="ex-produk">Produk</label><select class="select select-sm" id="ex-produk"><option value="">Semua produk</option>' + (k.produk || []).map(function (p) { return '<option value="' + esc(p.id) + '"' + (EX.produk === String(p.id) ? ' selected' : '') + '>' + esc(p.nama) + '</option>'; }).join('') + '</select></div></div>';
        ['dari', 'sampai', 'status', 'produk'].forEach(function (x) { $('#ex-' + x).addEventListener('change', function (e) { EX[x] = e.target.value; isiEx(); }); });
      }
    } else f.innerHTML = '';
    var b = barisEkspor(EX.jenis);
    $('#ex-n').textContent = b.siap ? U.angka(b.rows.length) + ' baris' : 'memuat…';
    $('#ex-go').disabled = !b.siap || !b.rows.length;
    $('#ex-prev').innerHTML = b.rows.length ? '<p class="label" style="margin-bottom:8px">Pratinjau 5 baris pertama</p><div class="tbl-wrap"><table class="tbl"><thead><tr>' + b.kolom.slice(0, 6).map(function (c) { return '<th>' + esc(c[1]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      b.rows.slice(0, 5).map(function (r) { return '<tr>' + b.kolom.slice(0, 6).map(function (c) { var v = typeof c[0] === 'function' ? c[0](r) : r[c[0]]; return '<td><small>' + esc(String(v == null ? '' : v).slice(0, 60)) + '</small></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : (b.siap ? A.kosong('Tidak ada data untuk diekspor') : A.skel(3));
  }
  function unduhEx() {
    var b = barisEkspor(EX.jenis), nama = EX.jenis + '-' + U.hariIni(), btn = $('#ex-go');
    var catat = function () { A.tulis('export.catat', { jenis: EX.jenis, jumlah: b.rows.length, format: EX.format, filter: EX.jenis === 'leads' ? [EX.dari, EX.sampai, EX.status, EX.produk].filter(Boolean).join(' ') : '' }, { pesan: b.rows.length + ' baris diunduh.' }); };
    if (EX.format === 'csv') { A.unduh(nama + '.csv', A.csv(b.rows, b.kolom), 'text/csv;charset=utf-8'); catat(); return; }
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span><span>Menyiapkan…</span>';
    A.xlsx(b.rows, b.kolom, nama + '.xlsx', DATASET[EX.jenis].label).then(catat, function (e) { U.toast(e.message + ' — mengunduh CSV sebagai gantinya.', 'err'); A.unduh(nama + '.csv', A.csv(b.rows, b.kolom), 'text/csv;charset=utf-8'); catat(); })
      .then(function () { btn.disabled = false; btn.innerHTML = ic('i-download') + '<span>Unduh</span>'; });
  }
})(window.EKA);
