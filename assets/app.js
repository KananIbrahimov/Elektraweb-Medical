/* Elektraweb Medical — demo arayüzü (bağımlılıksız). Veriler yalnızca tarayıcı belleğinde tutulur. */
(function () {
  'use strict';
  var E = window.MedicalEngine, U = E.util;

  // ---------- yardımcılar ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function deep(x) { return JSON.parse(JSON.stringify(x)); }
  function by(list) { var o = {}; list.forEach(function (x) { o[x.id] = x; }); return o; }
  function fmtD(d) { if (!d) return ''; var p = d.slice(0, 10).split('-'); return p[2] + '.' + p[1] + '.' + p[0] + (d.length > 10 ? d.slice(10) : ''); }
  function fmtN(v, dg) { if (v === '' || v == null || isNaN(v)) return ''; return Number(v).toLocaleString('tr-TR', { minimumFractionDigits: dg, maximumFractionDigits: dg }); }
  var DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  var DSH = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  var WEEK = [1, 2, 3, 4, 5, 6, 0];
  var GENDER = { M: 'Erkek', F: 'Kadın', '': 'Hepsi' };
  var GTYPE = { inhouse: 'Inhouse', munferit: 'Münferit', uye: 'Üye' };
  function roomLbl(g) { return g.room || GTYPE[g.type] || '—'; }
  function gLabel(g) { return roomLbl(g) + ' - ' + g.name; }
  function money(v) { return fmtN(v, 2) + ' AZN'; }
  var ICON = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/><path d="M13 20h7"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-5l-2 2M4 4v4h4M4 13a8 8 0 0 0 14 5l2-2M20 20v-4h-4"/>',
    clear: '<path d="M4 6h16l-6 7v5l-4 2v-7z"/><path d="M17 15l4 4M21 15l-4 4"/>',
    check: '<path d="M4 12l5 5L20 6"/>'
  };
  function svg(name) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[name] + '</svg>'; }

  // ---------- veri ----------
  var DEF = deep(window.MedicalDemoData), DEF_LAB = deep(window.MedicalLabData);
  var D, L, IX, A;   // A: adisyonlar
  var S = { guestId: 'g1', rx: {}, proposal: null, calDate: '2026-10-12', calMode: 'staff', calGuest: 'g1', sel: {}, tab: {}, filters: {}, seq: 1 };

  function index() {
    IX = { p: by(D.procedures), r: by(D.rooms), s: by(D.staff), g: by(D.guests), lg: by(L.groups), lt: by(L.tests), u: by(D.products), k: by(D.packages), m: by(D.members) };
  }
  function rebuild() {
    index();
    var had = D.bookings.some(function (b) { return !IX.g[b.guestId].background; });
    D.bookings = [];
    D.guests.filter(function (g) { return g.background; }).forEach(function (g) {
      var r = E.plan(D, { guestId: g.id, items: D.prescriptions[g.id] });
      r.sessions.forEach(function (s) { D.bookings.push(s); });
    });
    S.proposal = null;
    return had;
  }
  function loadDefaults() {
    D = deep(DEF); L = deep(DEF_LAB); D.bookings = []; A = []; S.adiNo = 80984100; S.planAdi = {};
    S.rx = {};
    D.guests.forEach(function (g) { S.rx[g.id] = deep(D.prescriptions[g.id] || []); });
    rebuild();
    newAdisyon('g1', 'APTEK', 'Ürün', [{ name: 'Ağ neft 100 ml korobka', qty: 2, price: 15 }, { name: 'Naftalan kremi 50 ml', qty: 1, price: 12 }], 'Odaya Kapat');
    newAdisyon('g2', 'APTEK', 'Ürün', [{ name: 'Naftalan sabunu', qty: 3, price: 6 }], 'Nakit');
  }
  function defsChanged() {
    var had = rebuild();
    toast('Kaydedildi. Takvim yeni tanımlarla yeniden hesaplandı' + (had ? '; onaylı misafir planları sıfırlandı.' : '.'));
  }
  function newId(prefix) { return prefix + 'x' + (S.seq++); }
  function staffName(id) { return id && IX.s[id] ? IX.s[id].name : ''; }
  function mainGuests() { return D.guests.filter(function (g) { return !g.background; }); }
  function guestBookings(gid) { return D.bookings.filter(function (b) { return b.guestId === gid; }); }
  function sortB(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start; }

  var TODAY = '2026-10-12';
  function newAdisyon(gid, dept, kind, lines, payment) {
    var ad = { no: String(S.adiNo++), date: TODAY, time: '10:' + String(10 + (S.adiNo % 50)).padStart(2, '0'), type: 'SOLD', dept: dept, kind: kind, guestId: gid, lines: lines, payment: payment, cancelled: false };
    A.push(ad); return ad;
  }
  function adTotal(ad) { return ad.lines.reduce(function (n, l) { return n + l.qty * l.price; }, 0); }
  function guestSelect(id, label) {
    return '<label class="fld" for="' + id + '"><span>' + esc(label || 'Misafir') + '</span><select id="' + id + '">' +
      mainGuests().map(function (x) { return '<option value="' + x.id + '"' + (x.id === S.guestId ? ' selected' : '') + '>' + esc(gLabel(x)) + ' (' + GTYPE[x.type || 'inhouse'] + ')</option>'; }).join('') + '</select></label>';
  }
  function payOptions(g) {
    return (g.type === 'inhouse' ? ['Odaya Kapat'] : []).concat(['Nakit', 'Kredi Kartı']);
  }
  var LINK_TABS = {
    planlama: [['planlama', 'Oto. Planlama'], ['takvim', 'Rezervasyon Takvimi']],
    takvim: [['planlama', 'Oto. Planlama'], ['takvim', 'Rezervasyon Takvimi']],
    'lab-sonuc': [['lab-sonuc', 'Lab Test Sonuçları'], ['lab-form', 'Lab Test Formları']],
    'lab-form': [['lab-sonuc', 'Lab Test Sonuçları'], ['lab-form', 'Lab Test Formları']]
  };
  function linkTabs(cur) {
    return '<nav class="tabs" style="margin-bottom:10px" aria-label="Bölümler">' + LINK_TABS[cur].map(function (t) {
      return '<a class="tab" href="#' + t[0] + '"' + (t[0] === cur ? ' aria-current="page" aria-selected="true"' : ' aria-selected="false"') + '>' + esc(t[1]) + '</a>';
    }).join('') + '</nav>';
  }

  var toastTimer;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3800);
  }

  // ---------- ortak parçalar ----------
  function pageHead(title) { return '<h1 class="page-title">' + esc(title) + '</h1>'; }

  function toolbar(id, buttons, total) {
    return '<div class="toolbar" id="tb-' + id + '">' + buttons.map(function (b, i) {
      return '<button type="button" class="tool' + (b.icon === 'trash' ? ' del' : '') + '" data-i="' + i + '" title="' + esc(b.title) + '" aria-label="' + esc(b.title) + '">' + svg(b.icon) + '</button>';
    }).join('') + (total != null ? '<span class="total">Toplam: <span class="num" id="total-' + id + '">' + total + '</span></span>' : '') + '</div>';
  }
  function bindToolbar(id, buttons) {
    $('tb-' + id).addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]'); if (b) buttons[+b.dataset.i].run();
    });
  }
  function tabs(id, list) {
    var cur = S.tab[id] || list[0];
    return '<div class="tabs" role="tablist" id="tabs-' + id + '">' + list.map(function (t) {
      return '<button type="button" role="tab" class="tab" aria-selected="' + (t === cur) + '" data-t="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('') + '</div>';
  }
  function bindTabs(id, rerender) {
    $('tabs-' + id).addEventListener('click', function (e) {
      var b = e.target.closest('[data-t]'); if (!b) return;
      S.tab[id] = b.dataset.t; rerender();
    });
  }

  // Elektraweb ızgarası: başlık + filtre satırı + seçilebilir satırlar
  function grid(o) {
    var f = S.filters[o.id] || (S.filters[o.id] = {});
    var head = '<tr>' + o.cols.map(function (c) { return '<th class="' + (c.cls || '') + '">' + esc(c.label) + '</th>'; }).join('') + '</tr>';
    var fr = '<tr class="filters">' + o.cols.map(function (c) {
      if (c.filter === false) return '<th></th>';
      var v = f[c.k] || '';
      if (c.options) return '<th><select data-k="' + c.k + '" id="f-' + o.id + '-' + c.k + '" aria-label="' + esc(c.label) + ' filtresi"><option value=""></option>' +
        c.options.map(function (op) { return '<option' + (op === v ? ' selected' : '') + '>' + esc(op) + '</option>'; }).join('') + '</select></th>';
      return '<th><input data-k="' + c.k + '" id="f-' + o.id + '-' + c.k + '" value="' + esc(v) + '" aria-label="' + esc(c.label) + ' filtresi"></th>';
    }).join('') + '</tr>';
    return '<div class="grid-wrap"><table class="grid" id="g-' + o.id + '"><thead>' + head + fr + '</thead><tbody></tbody></table></div>';
  }
  function cellText(c, r) { var v = c.text ? c.text(r) : r[c.k]; return v == null ? '' : String(v); }
  function paintGrid(o) {
    var f = S.filters[o.id] || {};
    var rows = o.rows.filter(function (r) {
      return o.cols.every(function (c) {
        var q = (f[c.k] || '').toLocaleLowerCase('tr');
        if (!q) return true;
        var t = cellText(c, r).toLocaleLowerCase('tr');
        return c.options ? t === q : t.indexOf(q) >= 0;
      });
    });
    var sel = S.sel[o.id];
    var body = rows.length ? rows.map(function (r) {
      var key = r[o.key || 'id'];
      var cls = (o.rowClass ? o.rowClass(r) : '') + (key === sel ? ' sel' : '');
      return '<tr data-key="' + esc(key) + '" class="' + cls + '">' + o.cols.map(function (c) {
        return '<td class="' + (c.cls || '') + '">' + (c.html ? c.html(r) : esc(cellText(c, r))) + '</td>';
      }).join('') + '</tr>';
    }).join('') : '<tr class="empty-row"><td colspan="' + o.cols.length + '">Gösterilecek kayıt yok</td></tr>';
    $('g-' + o.id).tBodies[0].innerHTML = body;
    var t = $('total-' + o.id); if (t) t.textContent = rows.length;
  }
  function bindGrid(o) {
    var tbl = $('g-' + o.id);
    tbl.tHead.addEventListener('input', function (e) {
      var k = e.target.dataset.k; if (!k) return;
      S.filters[o.id][k] = e.target.value; paintGrid(o);
    });
    tbl.tBodies[0].addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-key]'); if (!tr) return;
      if (e.target.closest('input,button,select')) return;
      S.sel[o.id] = tr.dataset.key;
      [].forEach.call(tbl.tBodies[0].rows, function (x) { x.classList.toggle('sel', x === tr); });
    });
    tbl.tBodies[0].addEventListener('dblclick', function (e) {
      var tr = e.target.closest('tr[data-key]'); if (!tr || !o.open) return;
      o.open(tr.dataset.key);
    });
    paintGrid(o);
  }
  function selected(id) { return S.sel[id]; }

  // ---------- modal form ----------
  var modal = { save: null };
  function field(f, v) {
    var id = 'm-' + f.k, lab = '<span>' + esc(f.label) + (f.req ? ' *' : '') + '</span>';
    if (f.type === 'toggle') return '<label class="tg"><input type="checkbox" id="' + id + '"' + (v ? ' checked' : '') + '>' + esc(f.label) + '</label>';
    if (f.type === 'select') return '<label class="fld" for="' + id + '">' + lab + '<select id="' + id + '">' +
      f.options.map(function (op) { return '<option value="' + esc(op.v) + '"' + (String(op.v) === String(v == null ? '' : v) ? ' selected' : '') + '>' + esc(op.t) + '</option>'; }).join('') + '</select></label>';
    if (f.type === 'checks') return '<div class="fld"><span>' + esc(f.label) + '</span><div class="checks" id="' + id + '">' +
      f.options.map(function (op) { return '<label><input type="checkbox" class="cb" value="' + esc(op.v) + '"' + ((v || []).indexOf(op.v) >= 0 ? ' checked' : '') + '>' + esc(op.t) + '</label>'; }).join('') + '</div></div>';
    if (f.type === 'textarea') return '<label class="fld" for="' + id + '">' + lab + '<textarea id="' + id + '" rows="3">' + esc(v) + '</textarea></label>';
    var type = f.type || 'text';
    return '<label class="fld" for="' + id + '">' + lab + '<input id="' + id + '" type="' + type + '"' + (type === 'number' ? ' step="' + (f.step || 1) + '" style="text-align:right"' : '') +
      (f.list ? ' list="' + id + '-dl"' : '') + ' value="' + esc(v == null ? '' : v) + '">' +
      (f.list ? '<datalist id="' + id + '-dl">' + f.list.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>' : '') + '</label>';
  }
  function readField(f) {
    var el = $('m-' + f.k);
    if (f.type === 'toggle') return el.checked;
    if (f.type === 'checks') return [].map.call(el.querySelectorAll('input:checked'), function (x) { return x.value; });
    if (f.type === 'number') return el.value === '' ? '' : Number(el.value);
    return el.value.trim();
  }
  function openForm(o) {
    $('modalTitle').textContent = o.title;
    $('modalSub').textContent = o.sub || '';
    var all = [];
    var html = o.rows.map(function (row) {
      row.forEach(function (f) { all.push(f); });
      var isT = row.every(function (f) { return f.type === 'toggle'; });
      return '<div class="' + (isT ? 'toggles' : 'frow') + '">' + row.map(function (f) { return field(f, o.values[f.k]); }).join('') + '</div>';
    }).join('') + (o.extra || '') + '<div class="err" id="modalErr" role="alert"></div>';
    $('modalBody').innerHTML = html;
    modal.save = function () {
      var vals = {};
      all.forEach(function (f) { vals[f.k] = readField(f); });
      var miss = all.filter(function (f) { return f.req && (vals[f.k] === '' || vals[f.k] == null); });
      if (miss.length) { $('modalErr').textContent = 'Zorunlu alanı doldurun: ' + miss.map(function (f) { return f.label; }).join(', '); return; }
      var err = o.save(vals);
      if (err) { $('modalErr').textContent = err; return; }
      closeModal();
    };
    $('modalBack').hidden = false;
    if (o.after) o.after();
    var first = $('modalBody').querySelector('input,select,textarea'); if (first) first.focus();
  }
  function openConfirm(title, text, yes) {
    openForm({ title: title, rows: [], values: {}, extra: '<p style="margin:4px 0;font-size:14px">' + esc(text) + '</p><p class="hint" style="margin:0">Onaylamak için ✓, vazgeçmek için ✕.</p>', save: function () { yes(); } });
  }
  function closeModal() { $('modalBack').hidden = true; modal.save = null; }
  $('modalOk').addEventListener('click', function () { if (modal.save) modal.save(); });
  $('modalX').addEventListener('click', closeModal);
  $('modalBack').addEventListener('click', function (e) { if (e.target === $('modalBack')) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('modalBack').hidden) closeModal(); });

  function requireSel(id, what) {
    var k = selected(id);
    if (!k) { toast('Önce listeden bir ' + what + ' seçin (satıra tıklayın).'); return null; }
    return k;
  }
  function stdTools(id, add, edit, del) {
    return [
      { icon: 'plus', title: 'Yeni kayıt', run: add },
      { icon: 'edit', title: 'Düzenle (satıra çift tıklama da açar)', run: function () { var k = requireSel(id, 'kayıt'); if (k) edit(k); } },
      { icon: 'trash', title: 'Sil', run: function () { var k = requireSel(id, 'kayıt'); if (k) del(k); } },
      { icon: 'clear', title: 'Filtreleri temizle', run: function () { S.filters[id] = {}; render(); } }
    ];
  }

  // =====================================================================
  // GÖRÜNÜMLER
  // =====================================================================
  var content = $('content');
  var VIEWS = {};

  // ---------- Oto. Planlama ----------
  VIEWS.planlama = function () {
    var g = IX.g[S.guestId];
    var rx = S.rx[g.id];
    var approved = guestBookings(g.id).sort(sortB);
    var locked = approved.length > 0;
    var form = L.forms.filter(function (f) { return f.guestId === g.id && f.status !== 'İptal Edildi'; })[0];
    var labHtml;
    if (form) {
      var out = labOut(form);
      labHtml = '<div class="note ' + (out ? 'warn' : 'ok') + '">Standart lab analizi: <span class="pill st-' + form.status.split(' ')[0] + '">' + esc(form.status) + '</span>' +
        (out ? ' · <b>' + out + ' değer sınır dışı</b>' : '') + (form.doctor ? ' · Doktor: ' + esc(form.doctor) : ' · Doktor atanmadı') +
        ' · <button type="button" class="link" id="openLab">Lab formunu aç</button></div>';
    } else labHtml = '<div class="note info">Bu misafir için lab formu yok.</div>';

    var used = rx.map(function (x) { return x.procedureId; });
    var addable = D.procedures.filter(function (p) { return p.active !== false && used.indexOf(p.id) < 0; });

    var left = '<section class="card" aria-labelledby="h-mis"><h3 id="h-mis">Misafir</h3>' +
      '<label class="fld" for="pGuest"><span>Konaklayan Misafir</span><select id="pGuest">' +
      mainGuests().map(function (x) { return '<option value="' + x.id + '"' + (x.id === g.id ? ' selected' : '') + '>' + esc(gLabel(x)) + '</option>'; }).join('') + '</select></label>' +
      '<div class="frow">' + ro('Misafir Tipi', GTYPE[g.type] || 'Inhouse') + ro('Oda', g.room || '—') + ro(g.type === 'inhouse' ? 'Giriş' : 'Tedavi Başlangıç', fmtD(g.checkIn)) + ro(g.type === 'inhouse' ? 'Çıkış' : 'Tedavi Bitiş', fmtD(g.treatEnd || g.checkOut)) + ro('Cinsiyet', GENDER[g.gender]) + '</div>' + labHtml +
      '<h3>Doktor Reçetesi</h3>' +
      '<div class="grid-wrap" style="max-height:none"><table class="grid"><thead><tr><th>Hizmet Adı</th><th class="r">Süre</th><th class="c">Miktar</th><th class="c">Ücret</th><th></th></tr></thead><tbody id="rxBody">' +
      (rx.length ? rx.map(function (it, i) {
        var p = IX.p[it.procedureId];
        return '<tr><td>' + esc(p.name) + (p.active === false ? ' <span class="pill st-İptal">pasif</span>' : '') + '</td><td class="r num">' + p.duration + ' dk</td>' +
          '<td class="c"><input type="number" min="0" max="30" value="' + it.count + '" data-i="' + i + '" id="rx-' + p.id + '" aria-label="' + esc(p.name) + ' miktar" style="width:56px;text-align:center"' + (locked ? ' disabled' : '') + '></td>' +
          '<td class="c"><button type="button" class="pill ' + (it.paid ? 'paid' : 'free') + '" data-paid="' + i + '"' + (locked ? ' disabled' : '') + ' title="Ücretli / ücretsiz değiştir">' + (it.paid ? 'Ücretli' : 'Ücretsiz') + '</button></td>' +
          '<td class="c"><button type="button" class="tool del" data-del="' + i + '" aria-label="Kaldır"' + (locked ? ' disabled' : '') + ' style="width:28px;height:24px">' + svg('trash') + '</button></td></tr>';
      }).join('') : '<tr class="empty-row"><td colspan="5">Reçetede hizmet yok</td></tr>') + '</tbody></table></div>' +
      '<div class="frow" style="grid-template-columns:minmax(0,1fr) auto;align-items:center"><label class="fld" for="addProc"><span>Hizmet Ara</span><select id="addProc"' + (locked || !addable.length ? ' disabled' : '') + '>' +
      (addable.length ? addable.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') : '<option>Tüm hizmetler ekli</option>') + '</select></label>' +
      '<button type="button" class="btn red" id="addRx"' + (locked || !addable.length ? ' disabled' : '') + '>Ekle</button></div>' +
      '<label class="fld" for="fromDate"><span>Planlamaya Başlama Tarihi</span><input type="date" id="fromDate" min="' + g.checkIn + '" max="' + g.checkOut + '" value="' + (S.fromDate && S.fromDate >= g.checkIn && S.fromDate <= g.checkOut ? S.fromDate : g.checkIn) + '"' + (locked ? ' disabled' : '') + '></label>' +
      '<div class="btns"><button type="button" class="btn" id="planBtn"' + (locked ? ' disabled' : '') + '>Otomatik Planla</button><button type="button" class="btn gray" id="resetRx"' + (locked ? ' disabled' : '') + '>Reçeteyi Geri Yükle</button></div>' +
      (locked ? '<div class="note info">Bu misafirin onaylı planı var. Yeniden planlamak için önce onaylı planı iptal edin.</div>' : '') +
      '</section>';

    var right = '<section class="card" style="padding:0;gap:0" aria-labelledby="h-oto"><h2 class="banner" id="h-oto">Oto. Rezervasyon Oluşturucu</h2><div style="padding:12px;display:grid;gap:10px">' +
      '<div class="frow">' + ro('Misafir Tipi', GTYPE[g.type] || 'Inhouse') + ro('Misafir', g.name) + ro('Oda No', g.room || '—') + '</div>' + resultHtml(approved, locked) + '</div></section>';

    content.innerHTML = pageHead('Rezervasyon Planlama') + linkTabs('planlama') + '<div class="cols">' + left + right + '</div>';

    $('pGuest').addEventListener('change', function (e) { S.guestId = e.target.value; S.calGuest = S.guestId; S.proposal = null; render(); });
    if ($('openLab')) $('openLab').addEventListener('click', function () { openLabForm(form.id); });
    $('rxBody').addEventListener('change', function (e) {
      var i = e.target.dataset.i; if (i == null) return;
      rx[i].count = Math.max(0, Math.min(30, parseInt(e.target.value, 10) || 0)); S.proposal = null; render();
    });
    $('rxBody').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.paid != null) rx[b.dataset.paid].paid = !rx[b.dataset.paid].paid;
      else if (b.dataset.del != null) rx.splice(+b.dataset.del, 1);
      else return;
      S.proposal = null; render();
    });
    $('addRx').addEventListener('click', function () { var id = $('addProc').value; if (!IX.p[id]) return; rx.push({ procedureId: id, count: 1, paid: true }); S.proposal = null; render(); });
    $('resetRx').addEventListener('click', function () { S.rx[g.id] = deep(D.prescriptions[g.id] || []); S.proposal = null; render(); });
    $('fromDate').addEventListener('change', function (e) { S.fromDate = e.target.value; S.proposal = null; render(); });
    $('planBtn').addEventListener('click', function () {
      S.proposal = E.plan(D, { guestId: g.id, fromDate: $('fromDate').value, items: rx });
      if (S.proposal.sessions.length) S.calDate = S.proposal.sessions[0].date;
      render();
    });
    if ($('saveBtn')) $('saveBtn').addEventListener('click', function () {
      S.proposal.sessions.forEach(function (s) { D.bookings.push(s); });
      var n = S.proposal.sessions.length;
      // Ücretli seanslar → MEDICAL adisyonu (inhouse: odaya kapatılır)
      var paid = {};
      S.proposal.sessions.filter(function (x) { return x.paid; }).forEach(function (x) { paid[x.procedureId] = (paid[x.procedureId] || 0) + 1; });
      var lines = Object.keys(paid).map(function (pid) { return { name: IX.p[pid].name, qty: paid[pid], price: IX.p[pid].price || 0 }; });
      var msg = n + ' seans kaydedildi.';
      if (lines.length) {
        var ad = newAdisyon(g.id, 'MEDICAL', 'Hizmet', lines, g.type === 'inhouse' ? 'Odaya Kapat' : 'Nakit');
        S.planAdi[g.id] = ad.no; msg += ' Ücretli seanslar için ' + ad.no + ' numaralı adisyon açıldı (' + money(adTotal(ad)) + ', ' + ad.payment + ').';
      }
      S.proposal = null; render(); toast(msg);
    });
    if ($('cancelBtn')) $('cancelBtn').addEventListener('click', function () { S.proposal = null; render(); });
    if ($('undoBtn')) $('undoBtn').addEventListener('click', function () {
      openConfirm('Onaylı Planı İptal Et', g.name + ' için onaylanmış ' + approved.length + ' seans silinecek.', function () {
        D.bookings = D.bookings.filter(function (b) { return b.guestId !== g.id; });
        var ad = A.filter(function (x) { return x.no === S.planAdi[g.id]; })[0];
        if (ad) { ad.cancelled = true; delete S.planAdi[g.id]; }
        render(); toast('Onaylı plan iptal edildi' + (ad ? '; ' + ad.no + ' numaralı adisyon iptal edildi.' : '.'));
      });
    });
  };
  function ro(label, val) { return '<div class="fld ro"><span>' + esc(label) + '</span><output>' + esc(val) + '</output></div>'; }

  function resultHtml(approved, locked) {
    var list, unplaced = [], head;
    if (locked) {
      list = approved;
      head = '<div class="note ok">Plan kaydedildi: ' + approved.length + ' seans takvime işlendi. Sonraki misafirler bu saatleri dolu görür.</div>';
    } else if (S.proposal) {
      list = S.proposal.sessions; unplaced = S.proposal.unplaced;
      var s = S.proposal.summary;
      head = '<div class="sum">İstenen<b class="num">' + s.requested + '</b> Planlanan<b class="num" style="color:#2e7d32">' + s.planned + '</b> Planlanamayan<b class="num" style="color:' + (s.unplaced ? '#c62828' : '#777') + '">' + s.unplaced + '</b> Ücretli seans<b class="num">' + list.filter(function (x) { return x.paid; }).length + '</b></div>';
      if (unplaced.length) {
        var byP = {};
        unplaced.forEach(function (u) { (byP[u.procedureId] = byP[u.procedureId] || []).push(u); });
        head += '<div class="note warn"><b>Yerleştirilemeyen seanslar</b><ul>' + Object.keys(byP).map(function (pid) {
          return '<li>' + esc(IX.p[pid].name) + ': ' + byP[pid].length + ' seans. ' + esc(E.REASONS[byP[pid][0].mainReason]) + '</li>';
        }).join('') + '</ul></div>';
      }
    } else {
      return '<div class="note info">Reçeteyi kontrol edip <b>Otomatik Planla</b>’ya basın. Motor her seans için misafirin, mekânın ve personelin aynı anda boş olduğu en erken saati bulur.</div>';
    }
    var rows = list.map(function (b) {
      var p = IX.p[b.procedureId];
      return '<tr><td class="c"><span class="st-ico ok" title="Uygun">✓</span></td><td>' + esc(p.name) + '</td><td class="c num">' + b.seq + '/' + b.total + '</td><td class="num">' + fmtD(b.date) + '</td><td>' + DAYS[U.weekday(b.date)] + '</td>' +
        '<td class="num">' + U.toHHMM(b.start) + '</td><td class="num">' + U.toHHMM(b.end) + '</td><td>' + esc(staffName(b.staffId)) + (b.staffId2 ? ' + ' + esc(staffName(b.staffId2)) : '') + '</td><td>' + esc(IX.r[b.roomId].name) + '</td>' +
        '<td class="c"><span class="pill ' + (b.paid ? 'paid' : 'free') + '">' + (b.paid ? 'Ücretli' : 'Ücretsiz') + '</span></td></tr>';
    }).join('') + unplaced.map(function (u) {
      return '<tr><td class="c"><span class="st-ico no" title="Planlanamadı">✕</span></td><td>' + esc(IX.p[u.procedureId].name) + '</td><td class="c num">' + u.seq + '/' + u.total + '</td><td colspan="7" style="color:#c62828">' + esc(E.REASONS[u.mainReason]) + '</td></tr>';
    }).join('');
    var table = '<div class="grid-wrap" style="max-height:calc(100vh - 380px)"><table class="grid"><thead><tr><th></th><th>İşlem</th><th class="c">Seans</th><th>Rez Tarih</th><th>Gün</th><th>Rez Saati</th><th>Res Bitiş</th><th>Personel</th><th>Yer</th><th class="c">Ücret</th></tr></thead><tbody>' +
      (rows || '<tr class="empty-row"><td colspan="10">Planlanacak seans yok</td></tr>') + '</tbody></table></div>';
    var btns = locked ? '<div class="btns end"><button type="button" class="btn cancel" id="undoBtn">Onaylı Planı İptal Et</button></div>'
      : '<div class="btns end"><button type="button" class="btn cancel" id="cancelBtn">İptal</button><button type="button" class="btn" id="saveBtn"' + (list.length ? '' : ' disabled') + '>Kaydet</button></div>';
    return head + table + btns;
  }

  // ---------- Rezervasyon Takvimi ----------
  VIEWS.takvim = function () {
    var cfg = D.config, START = U.toMin(cfg.dayStart), END = U.toMin(cfg.dayEnd), SLOT = 15, H = 30;
    var day = S.calDate;
    var events = D.bookings.filter(function (b) { return b.date === day; });
    var props = S.proposal ? S.proposal.sessions.filter(function (b) { return b.date === day; }) : [];
    var cols = S.calMode === 'staff'
      ? D.staff.filter(function (s) { return s.active !== false; }).map(function (s) { return { id: s.id, name: s.name, off: (s.daysOff || []).indexOf(U.weekday(day)) >= 0 }; })
      : D.rooms.filter(function (r) { return r.active !== false; }).map(function (r) { return { id: r.id, name: r.name }; });
    function inCol(b, c) { return S.calMode === 'staff' ? (b.staffId === c.id || b.staffId2 === c.id) : b.roomId === c.id; }

    var tools = '<div class="cal-tools">' +
      '<label class="fld" for="calDate"><span>Tarih</span><input type="date" id="calDate" value="' + day + '"></label>' +
      '<button type="button" class="ib" id="calPrev" aria-label="Önceki gün">←</button><button type="button" class="ib" id="calToday" aria-label="İlk güne dön">↻</button><button type="button" class="ib" id="calNext" aria-label="Sonraki gün">→</button>' +
      '<span class="grow"></span>' +
      '<label class="fld" for="calGuest"><span>Misafir Ara (vurgula)</span><select id="calGuest"><option value="">—</option>' +
      mainGuests().map(function (g) { return '<option value="' + g.id + '"' + (g.id === S.calGuest ? ' selected' : '') + '>' + esc(gLabel(g)) + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld" for="calMode"><span>Görünüm</span><select id="calMode"><option value="staff"' + (S.calMode === 'staff' ? ' selected' : '') + '>Görevli</option><option value="room"' + (S.calMode === 'room' ? ' selected' : '') + '>Mekân</option></select></label>' +
      '<span class="total" style="padding:0 8px">Toplam Seans: <b class="num">' + (events.length + props.length) + '</b></span></div>';

    var legend = '<div class="legend"><span><i style="background:var(--ev);border-top:3px solid var(--ev-line)"></i>Kayıtlı seans</span><span><i style="background:#d5e5f7;border-top:3px solid var(--navy)"></i>Seçili misafir</span><span><i style="background:#fff3e0;outline:1.5px dashed #ef6c00"></i>Önerilen (kaydedilmedi)</span><span><i style="outline:1px dashed #9aa3ae"></i>Hazırlık süresi</span><span><i style="background:repeating-linear-gradient(135deg,#f1f2f5 0 4px,#e6e8ec 4px 8px)"></i>Öğle arası</span></div>';

    var nSlots = (END - START) / SLOT;
    var html = '<div class="cal" style="--slot:' + H + 'px;grid-template-columns:70px repeat(' + cols.length + ', minmax(150px, 1fr))">';
    html += '<div class="ch corner tcol" style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:12px">' + fmtD(day) + '</div>';
    cols.forEach(function (c) {
      var n = events.filter(function (b) { return inCol(b, c); }).length + props.filter(function (b) { return inCol(b, c); }).length;
      html += '<div class="ch" title="' + esc(c.name) + '">(' + n + ') ' + esc(c.name) + (c.off ? ' · izinli' : '') + '</div>';
    });
    html += '<div class="tcol">';
    for (var i = 0; i < nSlots; i++) html += '<div class="tlab num">' + U.toHHMM(START + i * SLOT) + '</div>';
    html += '</div>';
    function y(m) { return (m - START) / SLOT * H; }
    var brk = (cfg.breaks || []).map(function (b) { return '<div class="brk" style="top:' + y(U.toMin(b.start)) + 'px;height:' + (y(U.toMin(b.end)) - y(U.toMin(b.start))) + 'px" title="' + esc(b.label || 'Mola') + '"></div>'; }).join('');
    cols.forEach(function (c) {
      html += '<div class="col"' + (c.off ? ' style="background:#f6f6f6"' : '') + '>';
      for (var i = 0; i < nSlots; i++) html += '<div class="cell' + ((i + 1) % 4 === 0 ? ' h' : '') + '"></div>';
      html += brk;
      function ev(b, cls) {
        var p = IX.p[b.procedureId], g = IX.g[b.guestId];
        var pb = p.prepBefore || 0, pa = p.prepAfter || 0, out = '';
        if (pb) out += '<div class="ev prep" style="top:' + y(b.start - pb) + 'px;height:' + (y(b.start) - y(b.start - pb)) + 'px" title="Öncesi hazırlık ' + pb + ' dk"></div>';
        if (pa) out += '<div class="ev prep" style="top:' + y(b.end) + 'px;height:' + (y(b.end + pa) - y(b.end)) + 'px" title="Sonrası hazırlık ' + pa + ' dk"></div>';
        var other = S.calMode === 'staff' ? IX.r[b.roomId].name : staffName(b.staffId) + (b.staffId2 ? ' + ' + staffName(b.staffId2) : '');
        var tip = U.toHHMM(b.start) + '–' + U.toHHMM(b.end) + ' · ' + p.name + ' · ' + g.room + '-' + g.name + ' · ' + other + (b.paid ? ' · Ücretli' : '');
        out += '<div class="ev ' + cls + '" style="top:' + y(b.start) + 'px;height:' + Math.max(18, y(b.end) - y(b.start)) + 'px" title="' + esc(tip) + '"><b>' + esc(g.room + '-' + g.name) + '</b> · ' + esc(p.name) + '</div>';
        return out;
      }
      events.forEach(function (b) { if (inCol(b, c)) html += ev(b, b.guestId === S.calGuest ? 'mine' : ''); });
      props.forEach(function (b) { if (inCol(b, c)) html += ev(b, 'new'); });
      html += '</div>';
    });
    html += '</div>';

    content.innerHTML = pageHead('Rezervasyon Planlama') + linkTabs('takvim') + tools + legend + '<div class="cal-wrap">' + html + '</div>';
    function go(d) { S.calDate = d; render(); }
    $('calDate').addEventListener('change', function (e) { if (e.target.value) go(e.target.value); });
    $('calPrev').addEventListener('click', function () { go(U.addDays(day, -1)); });
    $('calNext').addEventListener('click', function () { go(U.addDays(day, 1)); });
    $('calToday').addEventListener('click', function () { go('2026-10-12'); });
    $('calMode').addEventListener('change', function (e) { S.calMode = e.target.value; render(); });
    $('calGuest').addEventListener('change', function (e) { S.calGuest = e.target.value; render(); });
  };

  // ---------- Planlanan Seanslar Listesi ----------
  VIEWS.liste = function () {
    var t = S.tab.liste || 'Hepsi';
    var rows = D.bookings.slice().sort(sortB).map(function (b, i) {
      var g = IX.g[b.guestId], p = IX.p[b.procedureId];
      return { id: 'b' + i, date: fmtD(b.date), day: DAYS[U.weekday(b.date)], start: U.toHHMM(b.start), end: U.toHHMM(b.end), guest: g.name, room: roomLbl(g), type: GTYPE[g.type] || 'Inhouse', proc: p.name,
        seq: b.seq + '/' + b.total, staff: staffName(b.staffId), staff2: staffName(b.staffId2), place: IX.r[b.roomId].name, paid: b.paid ? 'Ücretli' : 'Ücretsiz' };
    }).filter(function (r) { return t === 'Hepsi' || r.paid === t; });
    var o = { id: 'liste', rows: rows, cols: [
      { k: 'date', label: 'Rez Tarih' }, { k: 'day', label: 'Gün' }, { k: 'start', label: 'Başlangıç' }, { k: 'end', label: 'Bitiş' }, { k: 'guest', label: 'Misafir Adı' }, { k: 'room', label: 'Oda' }, { k: 'type', label: 'Misafir Tipi', options: ['Inhouse', 'Münferit', 'Üye'] },
      { k: 'proc', label: 'Hizmet/Ürün' }, { k: 'seq', label: 'Seans', cls: 'c' }, { k: 'staff', label: 'Personel' }, { k: 'staff2', label: '2. Personel' }, { k: 'place', label: 'Yer' },
      { k: 'paid', label: 'Ücret', options: ['Ücretli', 'Ücretsiz'] }] };
    var tb = [{ icon: 'clear', title: 'Filtreleri temizle', run: function () { S.filters.liste = {}; render(); } }];
    content.innerHTML = pageHead('Rezervasyon Listesi') + toolbar('liste', tb, rows.length) + tabs('liste', ['Hepsi', 'Ücretli', 'Ücretsiz']) + grid(o);
    bindToolbar('liste', tb); bindTabs('liste', render); bindGrid(o);
  };

  // ---------- Hizmet Tanımları ----------
  function activeTab(id, list) {
    var t = S.tab[id] || 'Aktif';
    return list.filter(function (x) { return t === 'Hepsi' || (t === 'Aktif' ? x.active !== false : x.active === false); });
  }
  function yn(v) { return v ? '<input type="checkbox" class="cb" checked disabled aria-label="Evet">' : '<input type="checkbox" class="cb" disabled aria-label="Hayır">'; }

  VIEWS.hizmet = function () {
    var rows = activeTab('hizmet', D.procedures).map(function (p, i) { return p; });
    var o = { id: 'hizmet', rows: rows, open: editHizmet, cols: [
      { k: 'name', label: 'Hizmet Adı' },
      { k: 'price', label: 'Fiyat (AZN)', cls: 'r num', text: function (p) { return fmtN(p.price || 0, 2); } },
      { k: 'duration', label: 'Hizmet Süresi (dk)', cls: 'r num' },
      { k: 'prepBefore', label: 'Öncesi Hazırlık (dk)', cls: 'r num', text: function (p) { return p.prepBefore || ''; } },
      { k: 'prepAfter', label: 'Sonrası Hazırlık (dk)', cls: 'r num', text: function (p) { return p.prepAfter || ''; } },
      { k: 'second', label: '2. Görevli Zorunlu', cls: 'c', filter: false, html: function (p) { return yn(p.secondStaffRequired); } },
      { k: 'gender', label: 'Cinsiyet Eşleşmesi', cls: 'c', filter: false, html: function (p) { return yn(p.genderMatch); } },
      { k: 'after', label: 'Sıra Kuralı', text: function (p) { return (p.after || []).map(function (r) { return IX.p[r.procedureId] ? IX.p[r.procedureId].name + ' + ' + r.minGap + ' dk sonra' : ''; }).join(', '); } },
      { k: 'nsd', label: 'Aynı Gün Yapılmaz', text: function (p) { return (p.notSameDayWith || []).map(function (x) { return IX.p[x] ? IX.p[x].name : ''; }).join(', '); } },
      { k: 'rooms', label: 'Mekân', cls: 'r num', text: function (p) { return (p.rooms || []).length; } },
      { k: 'staff', label: 'Görevli', cls: 'r num', text: function (p) { return D.staff.filter(function (s) { return s.skills.indexOf(p.id) >= 0; }).length; } },
      { k: 'active', label: 'Aktif', cls: 'c', filter: false, html: function (p) { return yn(p.active !== false); } }] };
    var tb = stdTools('hizmet', function () { editHizmet(null); }, editHizmet, function (id) {
      var p = IX.p[id];
      openConfirm('Hizmet Sil', '“' + p.name + '” silinecek; reçetelerden ve eşleştirmelerden de kaldırılacak.', function () {
        D.procedures = D.procedures.filter(function (x) { return x.id !== id; });
        D.procedures.forEach(function (x) {
          x.after = (x.after || []).filter(function (r) { return r.procedureId !== id; });
          x.notSameDayWith = (x.notSameDayWith || []).filter(function (r) { return r !== id; });
        });
        D.staff.forEach(function (s) { s.skills = s.skills.filter(function (k) { return k !== id; }); });
        Object.keys(D.prescriptions).forEach(function (g) { D.prescriptions[g] = D.prescriptions[g].filter(function (it) { return it.procedureId !== id; }); });
        Object.keys(S.rx).forEach(function (g) { S.rx[g] = S.rx[g].filter(function (it) { return it.procedureId !== id; }); });
        S.sel.hizmet = null; defsChanged(); render();
      });
    });
    content.innerHTML = pageHead('Hizmet Tanımları') + toolbar('hizmet', tb, rows.length) + tabs('hizmet', ['Aktif', 'Pasif', 'Hepsi']) + grid(o) +
      '<p class="hint" style="margin:8px 0 0">Hizmet Süresi, Öncesi/Sonrası Hazırlık ve 2. Görevli Zorunlu alanları Elektraweb Hizmet Tanımı ekranındakilerle aynıdır. Sıra kuralı, aynı gün kuralı ve cinsiyet eşleşmesi planlama için önerilen yeni alanlardır.</p>';
    bindToolbar('hizmet', tb); bindTabs('hizmet', render); bindGrid(o);
  };
  function editHizmet(id) {
    var p = id ? IX.p[id] : { name: '', duration: 15, rooms: [], active: true };
    var others = D.procedures.filter(function (x) { return x.id !== id; });
    var after = (p.after || [])[0] || {};
    openForm({
      title: 'Hizmet Tanımı', sub: id ? '#' + id : 'Yeni kayıt',
      values: { name: p.name, price: p.price || 0, duration: p.duration, prepBefore: p.prepBefore || '', prepAfter: p.prepAfter || '', secondStaffRequired: !!p.secondStaffRequired, genderMatch: !!p.genderMatch, active: p.active !== false,
        afterProc: after.procedureId || '', afterGap: after.minGap || '', nsd: p.notSameDayWith || [] },
      rows: [
        [{ k: 'name', label: 'Hizmet Adı', req: true }, { k: 'price', label: 'Fiyat (AZN)', type: 'number', step: 'any' }, { k: 'duration', label: 'Hizmet Süresi (dakika)', type: 'number', req: true }],
        [{ k: 'prepBefore', label: 'Masaj Öncesi Ön Hazırlık Süresi (dk)', type: 'number' }, { k: 'prepAfter', label: 'Masaj Sonrası Ön Hazırlık Süresi (dk)', type: 'number' }],
        [{ k: 'active', label: 'Spa Aktif', type: 'toggle' }, { k: 'secondStaffRequired', label: 'Spa Rezervasyonunda 2.Görevli Zorunlu', type: 'toggle' }, { k: 'genderMatch', label: 'Görevli cinsiyeti misafirle aynı olsun', type: 'toggle' }],
        [{ k: 'afterProc', label: 'Sıra kuralı: şu hizmetten sonra yapılır', type: 'select', options: [{ v: '', t: '— Yok —' }].concat(others.map(function (x) { return { v: x.id, t: x.name }; })) },
          { k: 'afterGap', label: 'Aradaki en az süre (dk)', type: 'number' }],
        [{ k: 'nsd', label: 'Aynı gün yapılmayacak hizmetler', type: 'checks', options: others.map(function (x) { return { v: x.id, t: x.name }; }) }]
      ],
      save: function (v) {
        if (!(v.duration > 0)) return 'Hizmet süresi 0’dan büyük olmalı.';
        if (v.afterProc && !(v.afterGap >= 0)) return 'Sıra kuralı için bekleme süresini girin.';
        var t = id ? p : { id: newId('h'), rooms: [] };
        t.name = v.name; t.price = v.price || 0; t.duration = v.duration; t.prepBefore = v.prepBefore || 0; t.prepAfter = v.prepAfter || 0;
        t.secondStaffRequired = v.secondStaffRequired; t.genderMatch = v.genderMatch; t.active = v.active;
        t.after = v.afterProc ? [{ procedureId: v.afterProc, minGap: v.afterGap || 0 }] : [];
        t.notSameDayWith = v.nsd;
        if (!id) { D.procedures.push(t); S.sel.hizmet = t.id; }
        defsChanged(); render();
        if (!id) toast('Hizmet eklendi. Hizmet-Mekan ve Hizmet-Görevli Eşleştirme ekranlarından mekân ve görevli atayın.');
      }
    });
  }

  // ---------- Mekanlar ----------
  VIEWS.mekan = function () {
    var rows = activeTab('mekan', D.rooms);
    var groups = D.rooms.map(function (r) { return r.group; }).filter(function (g, i, a) { return a.indexOf(g) === i; });
    var o = { id: 'mekan', rows: rows, open: editMekan, cols: [
      { k: 'name', label: 'Yer Adı' }, { k: 'group', label: 'Grup', options: groups },
      { k: 'procs', label: 'Kullanan Hizmetler', text: function (r) { return D.procedures.filter(function (p) { return (p.rooms || []).indexOf(r.id) >= 0; }).map(function (p) { return p.name; }).join(', '); } },
      { k: 'active', label: 'Aktif', cls: 'c', filter: false, html: function (r) { return yn(r.active !== false); } }] };
    var tb = stdTools('mekan', function () { editMekan(null); }, editMekan, function (id) {
      openConfirm('Mekân Sil', '“' + IX.r[id].name + '” silinecek ve tüm hizmet eşleştirmelerinden kaldırılacak.', function () {
        D.rooms = D.rooms.filter(function (x) { return x.id !== id; });
        D.procedures.forEach(function (p) { p.rooms = (p.rooms || []).filter(function (r) { return r !== id; }); });
        S.sel.mekan = null; defsChanged(); render();
      });
    });
    content.innerHTML = pageHead('Mekanlar ve Masaj Odaları') + toolbar('mekan', tb, rows.length) + tabs('mekan', ['Aktif', 'Pasif', 'Hepsi']) + grid(o);
    bindToolbar('mekan', tb); bindTabs('mekan', render); bindGrid(o);
  };
  function editMekan(id) {
    var r = id ? IX.r[id] : { name: '', group: '', active: true };
    var groups = D.rooms.map(function (x) { return x.group; }).filter(function (g, i, a) { return g && a.indexOf(g) === i; });
    openForm({
      title: 'Mekan Tanımı', sub: id ? '#' + id : 'Yeni kayıt', values: { name: r.name, group: r.group, active: r.active !== false },
      rows: [[{ k: 'name', label: 'Yer Adı', req: true }, { k: 'group', label: 'Grup', req: true, list: groups }], [{ k: 'active', label: 'Aktif', type: 'toggle' }]],
      save: function (v) {
        var t = id ? r : { id: newId('r') };
        t.name = v.name; t.group = v.group; t.active = v.active;
        if (!id) { D.rooms.push(t); S.sel.mekan = t.id; }
        defsChanged(); render();
      }
    });
  }

  // ---------- Görevliler ----------
  VIEWS.gorevli = function () {
    var rows = activeTab('gorevli', D.staff);
    var o = { id: 'gorevli', rows: rows, open: editGorevli, cols: [
      { k: 'id', label: 'Id' }, { k: 'name', label: 'Ad' }, { k: 'gender', label: 'Cinsiyet', options: ['Erkek', 'Kadın'], text: function (s) { return GENDER[s.gender || '']; } },
      { k: 'skills', label: 'Hizmetler', text: function (s) { return s.skills.map(function (k) { return IX.p[k] ? IX.p[k].name : ''; }).join(', '); } },
      { k: 'shift', label: 'Shift', text: function (s) { return shiftText(s); } },
      { k: 'active', label: 'Aktif', cls: 'c', filter: false, html: function (s) { return yn(s.active !== false); } }] };
    var tb = stdTools('gorevli', function () { editGorevli(null); }, editGorevli, function (id) {
      openConfirm('Görevli Sil', '“' + IX.s[id].name + '” silinecek.', function () {
        D.staff = D.staff.filter(function (x) { return x.id !== id; }); S.sel.gorevli = null; defsChanged(); render();
      });
    });
    content.innerHTML = pageHead('Görevli Tanımları') + toolbar('gorevli', tb, rows.length) + tabs('gorevli', ['Aktif', 'Pasif', 'Hepsi']) + grid(o);
    bindToolbar('gorevli', tb); bindTabs('gorevli', render); bindGrid(o);
  };
  function editGorevli(id) {
    var s = id ? IX.s[id] : { name: '', gender: 'F', skills: [], active: true };
    openForm({
      title: 'Görevli Tanımı', sub: id ? '#' + id : 'Yeni kayıt', values: { name: s.name, gender: s.gender, active: s.active !== false },
      rows: [[{ k: 'name', label: 'Ad', req: true }, { k: 'gender', label: 'Cinsiyet', type: 'select', options: [{ v: 'F', t: 'Kadın' }, { v: 'M', t: 'Erkek' }] }], [{ k: 'active', label: 'Aktif', type: 'toggle' }]],
      save: function (v) {
        var t = id ? s : { id: newId('s'), skills: [] };
        t.name = v.name; t.gender = v.gender; t.active = v.active;
        if (!id) { D.staff.push(t); S.sel.gorevli = t.id; }
        defsChanged(); render();
        if (!id) toast('Görevli eklendi. Hizmet-Görevli Eşleştirme ekranından yapabildiği hizmetleri seçin.');
      }
    });
  }

  // ---------- Shift Tanımları ----------
  function shiftText(s) {
    var sh = s.shift || { start: D.config.dayStart, end: D.config.dayEnd };
    var off = (s.daysOff || []).map(function (d) { return DSH[d]; }).join(', ');
    return sh.start + '–' + sh.end + (off ? ' · izin: ' + off : '');
  }
  VIEWS.shift = function () {
    var rows = D.staff.filter(function (s) { return s.active !== false; });
    var o = { id: 'shift', rows: rows, open: editShift, cols: [
      { k: 'name', label: 'Görevli' },
      { k: 'start', label: 'Başlangıç', cls: 'num', text: function (s) { return (s.shift || {}).start || D.config.dayStart; } },
      { k: 'end', label: 'Bitiş', cls: 'num', text: function (s) { return (s.shift || {}).end || D.config.dayEnd; } },
      { k: 'work', label: 'Çalışma Günleri', text: function (s) { return WEEK.filter(function (d) { return (s.daysOff || []).indexOf(d) < 0; }).map(function (d) { return DSH[d]; }).join(' '); } },
      { k: 'off', label: 'İzinli Günler', text: function (s) { return (s.daysOff || []).map(function (d) { return DAYS[d]; }).join(', '); } }] };
    var tb = [{ icon: 'edit', title: 'Düzenle (satıra çift tıklama da açar)', run: function () { var k = requireSel('shift', 'görevli'); if (k) editShift(k); } },
      { icon: 'clear', title: 'Filtreleri temizle', run: function () { S.filters.shift = {}; render(); } }];
    content.innerHTML = pageHead('Shift Tanımları') + toolbar('shift', tb, rows.length) + grid(o) +
      '<p class="hint" style="margin:8px 0 0">Shift tanımı olmayan görevli, Planlama Parametrelerindeki çalışma saatleriyle çalışır.</p>';
    bindToolbar('shift', tb); bindGrid(o);
  };
  function editShift(id) {
    var s = IX.s[id], sh = s.shift || { start: D.config.dayStart, end: D.config.dayEnd };
    openForm({
      title: 'Shift Tanımı', sub: s.name,
      values: { start: sh.start, end: sh.end, work: WEEK.filter(function (d) { return (s.daysOff || []).indexOf(d) < 0; }).map(String) },
      rows: [[{ k: 'start', label: 'Başlangıç Saati', type: 'time', req: true }, { k: 'end', label: 'Bitiş Saati', type: 'time', req: true }],
        [{ k: 'work', label: 'Çalışma Günleri', type: 'checks', options: WEEK.map(function (d) { return { v: String(d), t: DAYS[d] }; }) }]],
      save: function (v) {
        if (U.toMin(v.end) <= U.toMin(v.start)) return 'Bitiş saati başlangıçtan sonra olmalı.';
        s.shift = { start: v.start, end: v.end };
        s.daysOff = WEEK.filter(function (d) { return v.work.indexOf(String(d)) < 0; });
        defsChanged(); render();
      }
    });
  }

  // ---------- Eşleştirme matrisleri ----------
  function matrixView(title, id, rowsDef, isOn, toggle, hint) {
    var procs = D.procedures.filter(function (p) { return p.active !== false; });
    var head = '<tr><th style="min-width:220px">' + (id === 'hg' ? 'Görevli' : 'Mekân') + '</th>' + procs.map(function (p) { return '<th class="v">' + esc(p.name) + '</th>'; }).join('') + '</tr>';
    var body = rowsDef.map(function (r) {
      if (r.group) return '<tr class="grp"><td colspan="' + (procs.length + 1) + '">' + esc(r.group) + '</td></tr>';
      return '<tr><td>' + esc(r.name) + '</td>' + procs.map(function (p) {
        return '<td class="c"><input type="checkbox" class="cb" data-r="' + r.id + '" data-p="' + p.id + '"' + (isOn(r.id, p) ? ' checked' : '') + ' aria-label="' + esc(r.name + ' – ' + p.name) + '"></td>';
      }).join('') + '</tr>';
    }).join('');
    content.innerHTML = pageHead(title) + '<p class="hint" style="margin:0 0 8px">' + esc(hint) + '</p><div class="grid-wrap"><table class="grid matrix" id="mx"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
    $('mx').addEventListener('change', function (e) {
      var c = e.target; if (!c.dataset.p) return;
      toggle(c.dataset.r, IX.p[c.dataset.p], c.checked); defsChanged();
    });
  }
  VIEWS['hizmet-gorevli'] = function () {
    matrixView('Hizmet-Görevli Eşleştirme', 'hg',
      D.staff.filter(function (s) { return s.active !== false; }).map(function (s) { return { id: s.id, name: s.name + ' (' + GENDER[s.gender] + ')' }; }),
      function (sid, p) { return IX.s[sid].skills.indexOf(p.id) >= 0; },
      function (sid, p, on) { var s = IX.s[sid]; s.skills = s.skills.filter(function (k) { return k !== p.id; }); if (on) s.skills.push(p.id); },
      'Görevlinin verebildiği hizmetleri işaretleyin. Planlama yalnızca işaretli görevlileri o hizmete atar.');
  };
  VIEWS['hizmet-mekan'] = function () {
    var rows = [], seen = {};
    D.rooms.filter(function (r) { return r.active !== false; }).forEach(function (r) {
      if (!seen[r.group]) { seen[r.group] = 1; rows.push({ group: r.group }); }
      rows.push({ id: r.id, name: r.name });
    });
    matrixView('Hizmet-Mekan Eşleştirme', 'hm', rows,
      function (rid, p) { return (p.rooms || []).indexOf(rid) >= 0; },
      function (rid, p, on) { p.rooms = (p.rooms || []).filter(function (x) { return x !== rid; }); if (on) p.rooms.push(rid); },
      'Hizmetin yapılabildiği mekânları işaretleyin. Bir hizmet birden çok mekânda yapılabiliyorsa planlama boş olanı seçer.');
  };

  // ---------- Planlama Parametreleri ----------
  VIEWS.parametre = function () {
    var c = D.config, b = (c.breaks || [])[0] || { start: '', end: '' };
    content.innerHTML = pageHead('Planlama Parametreleri') + '<section class="card" style="max-width:760px">' +
      '<div class="frow">' + pf('pDayStart', 'Günlük Başlangıç', 'time', c.dayStart) + pf('pDayEnd', 'Günlük Bitiş', 'time', c.dayEnd) +
      pf('pBrStart', 'Öğle Arası Başlangıç', 'time', b.start) + pf('pBrEnd', 'Öğle Arası Bitiş', 'time', b.end) + '</div>' +
      '<div class="frow">' + pf('pBuf', 'Misafir Geçiş Süresi (dk)', 'number', c.guestBufferMinutes) + pf('pMax', 'Misafir Günlük En Fazla Prosedür', 'number', c.maxPerGuestPerDay) +
      pf('pStep', 'Saat Arama Aralığı (dk)', 'number', c.stepMinutes) + '</div>' +
      '<label class="tg"><input type="checkbox" id="pCheckout"' + (c.planOnCheckoutDay ? ' checked' : '') + '>Çıkış gününe de prosedür planla</label>' +
      '<div class="err" id="pErr" role="alert"></div>' +
      '<div class="btns"><button type="button" class="btn" id="pSave">Kaydet</button><button type="button" class="btn cancel" id="pReset">Tüm Demo Verisini Sıfırla</button></div>' +
      '<p class="hint" style="margin:0">Sıfırlama; hizmet, mekân, görevli, eşleştirme, lab ve plan kayıtlarını ilk demo haline döndürür.</p></section>';
    $('pSave').addEventListener('click', function () {
      var v = { s: $('pDayStart').value, e: $('pDayEnd').value, bs: $('pBrStart').value, be: $('pBrEnd').value, buf: +$('pBuf').value, max: +$('pMax').value, step: +$('pStep').value };
      if (!v.s || !v.e || U.toMin(v.e) <= U.toMin(v.s)) { $('pErr').textContent = 'Günlük bitiş, başlangıçtan sonra olmalı.'; return; }
      if ((v.bs || v.be) && (!v.bs || !v.be || U.toMin(v.be) <= U.toMin(v.bs))) { $('pErr').textContent = 'Öğle arası başlangıç ve bitişini birlikte, doğru sırayla girin.'; return; }
      if (!(v.step >= 1 && v.step <= 60)) { $('pErr').textContent = 'Saat arama aralığı 1–60 dk olmalı.'; return; }
      if (!(v.max >= 1)) { $('pErr').textContent = 'Günlük en fazla prosedür en az 1 olmalı.'; return; }
      c.dayStart = v.s; c.dayEnd = v.e; c.breaks = v.bs ? [{ start: v.bs, end: v.be, label: 'Öğle arası' }] : [];
      c.guestBufferMinutes = Math.max(0, v.buf || 0); c.maxPerGuestPerDay = v.max; c.stepMinutes = v.step; c.planOnCheckoutDay = $('pCheckout').checked;
      defsChanged(); render();
    });
    $('pReset').addEventListener('click', function () {
      openConfirm('Demo Verisini Sıfırla', 'Yaptığınız tüm değişiklikler silinip ilk demo verisi yüklenecek.', function () { loadDefaults(); render(); toast('Demo verisi sıfırlandı.'); });
    });
  };
  function pf(id, label, type, val) { return '<label class="fld" for="' + id + '"><span>' + esc(label) + '</span><input id="' + id + '" type="' + type + '" value="' + esc(val) + '"' + (type === 'number' ? ' min="0" style="text-align:right"' : '') + '></label>'; }

  // ---------- LAB: yardımcılar ----------
  function labFlag(t, v) {
    if (v === '' || v == null || isNaN(v)) return '';
    if (v > t.max) return 'hi';
    if (v < t.min) return 'lo';
    return 'ok';
  }
  function labOut(f) {
    return f.lines.filter(function (l) { var t = IX.lt[l.testId]; return t && (labFlag(t, l.value) === 'hi' || labFlag(t, l.value) === 'lo'); }).length;
  }
  function flagHtml(fl) { return fl === 'hi' ? '<span class="flag hi">↑ Yüksek</span>' : fl === 'lo' ? '<span class="flag lo">↓ Düşük</span>' : fl === 'ok' ? 'Normal' : ''; }

  // ---------- Lab Test Grupları ----------
  VIEWS['lab-grup'] = function () {
    var o = { id: 'lab-grup', rows: L.groups, open: editLabGroup, cols: [
      { k: 'name', label: 'Ad' },
      { k: 'count', label: 'Test Sayısı', cls: 'r num', text: function (g) { return L.tests.filter(function (t) { return t.groupId === g.id; }).length; } },
      { k: 'standard', label: 'Girişte Standart', cls: 'c', filter: false, html: function (g) { return yn(g.standard); } },
      { k: 'gender', label: 'Cinsiyet', options: ['Hepsi', 'Erkek', 'Kadın'], text: function (g) { return GENDER[g.gender || '']; } }] };
    var tb = stdTools('lab-grup', function () { editLabGroup(null); }, editLabGroup, function (id) {
      var n = L.tests.filter(function (t) { return t.groupId === id; }).length;
      if (n) { toast('Bu grupta ' + n + ' test tanımı var. Önce testleri silin veya başka gruba taşıyın.'); return; }
      openConfirm('Grup Sil', '“' + IX.lg[id].name + '” silinecek.', function () { L.groups = L.groups.filter(function (g) { return g.id !== id; }); index(); S.sel['lab-grup'] = null; render(); });
    });
    content.innerHTML = pageHead('Lab Test Grupları') + toolbar('lab-grup', tb, L.groups.length) + grid(o) +
      '<p class="hint" style="margin:8px 0 0">“Girişte Standart” işaretli gruplar, check-in sonrası açılan standart lab formuna otomatik eklenir (cinsiyete göre).</p>';
    bindToolbar('lab-grup', tb); bindGrid(o);
  };
  function editLabGroup(id) {
    var g = id ? IX.lg[id] : { name: '', standard: false, gender: '' };
    openForm({ title: 'Lab Test Grubu', sub: id ? '#' + id : 'Yeni kayıt', values: { name: g.name, standard: !!g.standard, gender: g.gender || '' },
      rows: [[{ k: 'name', label: 'Ad', req: true }, { k: 'gender', label: 'Cinsiyet', type: 'select', options: [{ v: '', t: 'Hepsi' }, { v: 'M', t: 'Erkek' }, { v: 'F', t: 'Kadın' }] }],
        [{ k: 'standard', label: 'Girişte standart analiz', type: 'toggle' }]],
      save: function (v) {
        var t = id ? g : { id: newId('lg') };
        t.name = v.name; t.standard = v.standard; t.gender = v.gender;
        if (!id) L.groups.push(t);
        index(); render();
      } });
  }

  // ---------- Lab Test Tanımları ----------
  VIEWS['lab-tanim'] = function () {
    var o = { id: 'lab-tanim', rows: L.tests, open: editLabTest, cols: [
      { k: 'group', label: 'Grup Adı', text: function (t) { return IX.lg[t.groupId] ? IX.lg[t.groupId].name : ''; } },
      { k: 'name', label: 'Ad' }, { k: 'unit', label: 'Birim' },
      { k: 'min', label: 'Min Değer', cls: 'r num', text: function (t) { return fmtN(t.min, 2); } },
      { k: 'max', label: 'Max Değer', cls: 'r num', text: function (t) { return fmtN(t.max, 2); } },
      { k: 'gender', label: 'Cinsiyeti', options: ['Erkek', 'Kadın'], text: function (t) { return t.gender ? GENDER[t.gender] : ''; } },
      { k: 'price', label: 'Fiyat (AZN)', cls: 'r num', text: function (t) { return fmtN(t.price || 0, 2); } }] };
    var tb = stdTools('lab-tanim', function () { editLabTest(null); }, editLabTest, function (id) {
      openConfirm('Test Sil', '“' + IX.lt[id].name + '” silinecek; formlardaki sonuç satırları da kaldırılacak.', function () {
        L.tests = L.tests.filter(function (t) { return t.id !== id; });
        L.forms.forEach(function (f) { f.lines = f.lines.filter(function (l) { return l.testId !== id; }); });
        index(); S.sel['lab-tanim'] = null; render();
      });
    });
    content.innerHTML = pageHead('Lab Test Tanımları') + toolbar('lab-tanim', tb, L.tests.length) + grid(o);
    bindToolbar('lab-tanim', tb); bindGrid(o);
  };
  function editLabTest(id) {
    var t = id ? IX.lt[id] : { groupId: L.groups[0] && L.groups[0].id, name: '', unit: '', min: 0, max: 0, gender: '', price: 10 };
    openForm({ title: 'Lab Test Tanımları', sub: id ? '#' + id : 'Yeni kayıt', values: t,
      rows: [[{ k: 'groupId', label: 'Grup', type: 'select', options: L.groups.map(function (g) { return { v: g.id, t: g.name }; }) }, { k: 'name', label: 'Ad', req: true }],
        [{ k: 'min', label: 'Min', type: 'number', step: 'any', req: true }, { k: 'max', label: 'Max', type: 'number', step: 'any', req: true }, { k: 'unit', label: 'Birim' },
          { k: 'gender', label: 'Cinsiyet', type: 'select', options: [{ v: '', t: 'Hepsi' }, { v: 'M', t: 'Erkek' }, { v: 'F', t: 'Kadın' }] }, { k: 'price', label: 'Fiyat (AZN)', type: 'number', step: 'any' }]],
      save: function (v) {
        if (v.max < v.min) return 'Max değer, min değerden küçük olamaz.';
        var x = id ? t : { id: newId('t') };
        x.groupId = v.groupId; x.name = v.name; x.min = v.min; x.max = v.max; x.unit = v.unit; x.gender = v.gender; x.price = v.price || 0;
        if (!id) L.tests.push(x);
        index(); render();
      } });
  }

  // ---------- Lab Test Formları ----------
  VIEWS['lab-form'] = function () {
    var t = S.tab['lab-form'] || 'Hepsi';
    var rows = L.forms.filter(function (f) { return t === 'Hepsi' || f.status === t; });
    var o = { id: 'lab-form', rows: rows, open: openLabForm, rowClass: function (f) { return labOut(f) ? 'out' : ''; }, cols: [
      { k: 'date', label: 'Tarih', cls: 'num', text: function (f) { return fmtD(f.date); } },
      { k: 'created', label: 'Oluşturma Tarihi', cls: 'num', text: function (f) { return fmtD(f.created); } },
      { k: 'notes', label: 'Notlar' },
      { k: 'guest', label: 'Misafir', text: function (f) { var g = IX.g[f.guestId]; return g ? gLabel(g) : ''; } },
      { k: 'doctor', label: 'İsteyen Dr' },
      { k: 'out', label: 'Sınır Dışı', cls: 'r num', text: function (f) { return labOut(f) || ''; } },
      { k: 'status', label: 'Durum', options: L.statuses, html: function (f) { return '<span class="pill st-' + f.status.split(' ')[0] + '">' + esc(f.status) + '</span>'; }, text: function (f) { return f.status; } }] };
    var tb = stdTools('lab-form', function () { openLabForm(null); }, openLabForm, function (id) {
      openConfirm('Lab Formu Sil', 'Form ve içindeki tüm sonuçlar silinecek.', function () { L.forms = L.forms.filter(function (f) { return f.id !== id; }); S.sel['lab-form'] = null; render(); });
    });
    content.innerHTML = pageHead('Lab Sonuçları') + linkTabs('lab-form') + toolbar('lab-form', tb, rows.length) + tabs('lab-form', ['Hepsi'].concat(L.statuses)) + grid(o);
    bindToolbar('lab-form', tb); bindTabs('lab-form', render); bindGrid(o);
  };

  function openLabForm(id) {
    var f = id ? L.forms.filter(function (x) { return x.id === id; })[0] : { date: '2026-10-12', guestId: mainGuests()[0].id, doctor: '', status: 'Yeni', notes: '', lines: null };
    var lines = f.lines ? deep(f.lines) : null;
    var doctors = D.staff.filter(function (s) { return /^Dr\./.test(s.name); }).map(function (s) { return s.name; });
    function stdLines(gid) {
      var g = IX.g[gid];
      var grs = L.groups.filter(function (x) { return x.standard && (!x.gender || x.gender === g.gender); }).map(function (x) { return x.id; });
      return L.tests.filter(function (t) { return grs.indexOf(t.groupId) >= 0 && (!t.gender || t.gender === g.gender); }).map(function (t) { return { testId: t.id, value: '', note: '' }; });
    }
    if (!lines) lines = stdLines(f.guestId);

    function linesTable() {
      return '<div class="toolbar" style="padding:0"><label class="fld" for="lfGroup" style="min-width:240px"><span>Grup ekle</span><select id="lfGroup">' +
        L.groups.map(function (g) { return '<option value="' + g.id + '">' + esc(g.name) + '</option>'; }).join('') + '</select></label>' +
        '<button type="button" class="btn red sm" id="lfAdd">Ekle</button><span class="total">Toplam: <span class="num">' + lines.length + '</span></span></div>' +
        '<div class="grid-wrap" style="max-height:330px"><table class="grid"><thead><tr><th>Test</th><th class="r">Değer</th><th class="r">Min</th><th class="r">Max</th><th>Birim</th><th>Sonuç</th><th></th></tr></thead><tbody id="lfBody">' +
        lines.map(function (l, i) {
          var t = IX.lt[l.testId]; if (!t) return '';
          var fl = labFlag(t, l.value);
          return '<tr class="' + (fl === 'hi' || fl === 'lo' ? 'out' : '') + '" data-i="' + i + '"><td>' + esc(t.name) + '</td>' +
            '<td class="r"><input type="number" step="any" value="' + esc(l.value) + '" data-i="' + i + '" id="lfv-' + i + '" aria-label="' + esc(t.name) + ' değer" style="width:80px;text-align:right"></td>' +
            '<td class="r num">' + fmtN(t.min, 2) + '</td><td class="r num">' + fmtN(t.max, 2) + '</td><td>' + esc(t.unit) + '</td><td class="fl">' + flagHtml(fl) + '</td>' +
            '<td><button type="button" class="tool del" data-del="' + i + '" aria-label="Satırı sil" style="width:26px;height:22px">' + svg('trash') + '</button></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    function bindLines() {
      $('lfAdd').addEventListener('click', function () {
        var gid = $('lfGroup').value, g = IX.g[$('m-guestId').value];
        var have = lines.map(function (l) { return l.testId; });
        L.tests.filter(function (t) { return t.groupId === gid && (!t.gender || t.gender === g.gender) && have.indexOf(t.id) < 0; })
          .forEach(function (t) { lines.push({ testId: t.id, value: '', note: '' }); });
        repaint();
      });
      $('lfBody').addEventListener('input', function (e) {
        var i = e.target.dataset.i; if (i == null) return;
        lines[i].value = e.target.value === '' ? '' : Number(e.target.value);
        var t = IX.lt[lines[i].testId], fl = labFlag(t, lines[i].value), tr = e.target.closest('tr');
        tr.classList.toggle('out', fl === 'hi' || fl === 'lo'); tr.querySelector('.fl').innerHTML = flagHtml(fl);
      });
      $('lfBody').addEventListener('click', function (e) {
        var b = e.target.closest('button[data-del]'); if (!b) return; lines.splice(+b.dataset.del, 1); repaint();
      });
    }
    function repaint() { $('lfLines').innerHTML = linesTable(); bindLines(); }

    openForm({
      title: 'Lab Test', sub: id ? '#' + id : 'Yeni form',
      values: { date: f.date, status: f.status, guestId: f.guestId, doctor: f.doctor, notes: f.notes },
      rows: [[{ k: 'date', label: 'Tarih', type: 'date', req: true }, { k: 'status', label: 'Durum', type: 'select', options: L.statuses.map(function (s) { return { v: s, t: s }; }) }],
        [{ k: 'guestId', label: 'Misafir', type: 'select', options: mainGuests().map(function (g) { return { v: g.id, t: gLabel(g) }; }) }, { k: 'doctor', label: 'İsteyen Dr', list: doctors }],
        [{ k: 'notes', label: 'Notlar' }]],
      extra: '<div id="lfLines"></div>',
      after: function () {
        repaint();
        $('m-guestId').addEventListener('change', function (e) {
          if (lines.every(function (l) { return l.value === ''; })) { lines = stdLines(e.target.value); repaint(); }
        });
      },
      save: function (v) {
        var x = id ? f : { id: newId('f'), created: v.date + ' 09:00' };
        x.date = v.date; x.status = v.status; x.guestId = v.guestId; x.doctor = v.doctor; x.notes = v.notes; x.lines = lines;
        if (!id) L.forms.push(x);
        render(); toast('Lab formu kaydedildi.');
      }
    });
  }

  // ---------- Lab Test Sonuçları ----------
  VIEWS['lab-sonuc'] = function () {
    var t = S.tab['lab-sonuc'] || 'Hepsi';
    var rows = [];
    L.forms.forEach(function (f) {
      var g = IX.g[f.guestId];
      f.lines.forEach(function (l, i) {
        var tt = IX.lt[l.testId]; if (!tt) return;
        var fl = labFlag(tt, l.value);
        rows.push({ id: f.id + '-' + i, formId: f.id, date: fmtD(f.date), doctor: f.doctor, guest: g ? g.name : '', group: IX.lg[tt.groupId] ? IX.lg[tt.groupId].name : '', test: tt.name,
          min: fmtN(tt.min, 2), max: fmtN(tt.max, 2), unit: tt.unit, value: l.value === '' ? '' : String(l.value).replace('.', ','), fl: fl, status: f.status, note: l.note || '' });
      });
    });
    if (t === 'Sınır Dışı') rows = rows.filter(function (r) { return r.fl === 'hi' || r.fl === 'lo'; });
    if (t === 'Sonuç Bekleyen') rows = rows.filter(function (r) { return !r.fl; });
    var o = { id: 'lab-sonuc', rows: rows, open: function (k) { openLabForm(k.split('-')[0]); }, rowClass: function (r) { return r.fl === 'hi' || r.fl === 'lo' ? 'out' : ''; }, cols: [
      { k: 'date', label: 'Tarih', cls: 'num' }, { k: 'doctor', label: 'Dr' }, { k: 'guest', label: 'Misafir' }, { k: 'group', label: 'Grup' }, { k: 'test', label: 'Test' },
      { k: 'min', label: 'Min', cls: 'r num' }, { k: 'max', label: 'Max', cls: 'r num' }, { k: 'unit', label: 'Birim' }, { k: 'value', label: 'Değer', cls: 'r num' },
      { k: 'res', label: 'Sonuç', options: ['Yüksek', 'Düşük', 'Normal'], text: function (r) { return r.fl === 'hi' ? 'Yüksek' : r.fl === 'lo' ? 'Düşük' : r.fl === 'ok' ? 'Normal' : ''; }, html: function (r) { return flagHtml(r.fl); } },
      { k: 'status', label: 'Durum', options: L.statuses }, { k: 'note', label: 'Test Notu' }] };
    var tb = [{ icon: 'clear', title: 'Filtreleri temizle', run: function () { S.filters['lab-sonuc'] = {}; render(); } }];
    content.innerHTML = pageHead('Lab Sonuçları') + linkTabs('lab-sonuc') + toolbar('lab-sonuc', tb, rows.length) + tabs('lab-sonuc', ['Hepsi', 'Sınır Dışı', 'Sonuç Bekleyen']) + grid(o) +
      '<p class="hint" style="margin:8px 0 0">Pembe satırlar referans aralığı dışındaki değerlerdir. Satıra çift tıklayınca ilgili lab formu açılır.</p>';
    bindToolbar('lab-sonuc', tb); bindTabs('lab-sonuc', render); bindGrid(o);
  };

  // ---------- Misafir Girişi ----------
  function selectGuest(id, go) {
    S.guestId = id; S.calGuest = id; S.proposal = null; S.fromDate = null;
    toast(IX.g[id].name + ' seçildi.');
    if (go) location.hash = go; else render();
  }
  function createGuest(o) {
    var id = newId('g');
    var g = { id: id, type: o.type, name: o.name, gender: o.gender, phone: o.phone || '', room: '', checkIn: o.from, checkOut: U.addDays(o.to, 1), treatEnd: o.to, memberId: o.memberId };
    D.guests.push(g); D.prescriptions[id] = []; S.rx[id] = [];
    index();
    // Standart giriş analizi: "Girişte Standart" işaretli gruplar
    var grs = L.groups.filter(function (x) { return x.standard && (!x.gender || x.gender === g.gender); }).map(function (x) { return x.id; });
    L.forms.push({ id: newId('f'), date: o.from, created: o.from + ' 09:00', guestId: id, doctor: '', status: 'Yeni', notes: 'Standart giriş analizi',
      lines: L.tests.filter(function (t) { return grs.indexOf(t.groupId) >= 0 && (!t.gender || t.gender === g.gender); }).map(function (t) { return { testId: t.id, value: '', note: '' }; }) });
    return g;
  }
  function guestStatus(g) {
    var f = L.forms.filter(function (x) { return x.guestId === g.id && x.status !== 'İptal Edildi'; })[0];
    return { lab: f ? f.status : '—', out: f ? labOut(f) : 0, rx: (S.rx[g.id] || []).reduce(function (n, i) { return n + i.count; }, 0), plan: guestBookings(g.id).length };
  }

  VIEWS.giris = function () {
    var t = S.gType || 'inhouse';
    var T = S.ts || (S.ts = { cart: [], cat: 'hizmet', q: '', doctor: '', mn: '', nw: { name: '', gender: 'F', phone: '', from: TODAY, to: U.addDays(TODAY, 6) }, member: '', mFrom: TODAY, mTo: U.addDays(TODAY, 6) });
    var doctors = D.staff.filter(function (s) { return /^Dr\./.test(s.name) && s.active !== false; });
    if (!T.doctor && doctors[0]) T.doctor = doctors[0].name;

    // misafir çözümü
    var g = null;
    if (t === 'inhouse') {
      var ins = D.guests.filter(function (x) { return !x.background && (x.type || 'inhouse') === 'inhouse'; });
      g = IX.g[S.guestId] && (IX.g[S.guestId].type || 'inhouse') === 'inhouse' ? IX.g[S.guestId] : ins[0];
    } else if (t === 'munferit') {
      g = T.mn ? IX.g[T.mn] : null;
    } else {
      g = D.guests.filter(function (x) { return x.memberId === T.member && x.checkIn === T.mFrom; })[0] || null;
    }

    // katalog
    var cats = [
      { k: 'hizmet', t: 'Tüm Hizmetler', cls: 'c-blue' }, { k: 'urun', t: 'Tüm Ürünler', cls: 'c-orange' }, { k: 'paket', t: 'Tüm Paketler', cls: 'c-purple' },
      { k: 'lab', t: 'Laboratoriya Analizləri' }
    ];
    L.groups.forEach(function (lg) { cats.push({ k: 'lab:' + lg.id, t: 'Lab · ' + lg.name }); });
    D.products.map(function (p) { return p.group; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).forEach(function (gr) { cats.push({ k: 'urun:' + gr, t: gr }); });

    function catalog() {
      var items = [];
      D.procedures.filter(function (p) { return p.active !== false; }).forEach(function (p) { items.push({ kind: 'hizmet', id: p.id, name: p.name, min: p.duration, price: p.price || 0, cat: 'hizmet' }); });
      D.products.filter(function (p) { return p.active !== false; }).forEach(function (p) { items.push({ kind: 'urun', id: p.id, name: p.name, min: 0, price: p.price, cat: 'urun', sub: p.group }); });
      D.packages.filter(function (k) { return k.active !== false; }).forEach(function (k) { items.push({ kind: 'paket', id: k.id, name: k.name, min: 0, price: k.price, cat: 'paket', days: k.days }); });
      L.tests.forEach(function (lt) {
        if (g && lt.gender && lt.gender !== g.gender) return;
        items.push({ kind: 'lab', id: lt.id, name: 'LAB ' + lt.name, min: 0, price: lt.price || 0, cat: 'lab', sub: lt.groupId });
      });
      var q = T.q.toLocaleLowerCase('tr');
      return items.filter(function (it) {
        if (q) return it.name.toLocaleLowerCase('tr').indexOf(q) >= 0;
        if (T.cat === it.cat) return true;
        if (T.cat.indexOf('lab:') === 0) return it.kind === 'lab' && it.sub === T.cat.slice(4);
        if (T.cat.indexOf('urun:') === 0) return it.kind === 'urun' && it.sub === T.cat.slice(5);
        return false;
      });
    }
    function itemOf(c) {
      if (c.kind === 'hizmet') { var p = IX.p[c.id]; return p && { name: p.name, price: p.price || 0 }; }
      if (c.kind === 'urun') { var u = IX.u[c.id]; return u && { name: u.name, price: u.price }; }
      if (c.kind === 'paket') { var k = IX.k[c.id]; return k && { name: k.name, price: k.price }; }
      var lt = IX.lt[c.id]; return lt && { name: 'LAB ' + lt.name, price: lt.price || 0 };
    }
    var KIND = { hizmet: 'Hizmet', urun: 'Ürün', paket: 'Paket', lab: 'Lab' };
    T.cart = T.cart.filter(function (c) { return itemOf(c); });
    var total = T.cart.reduce(function (n, c) { return n + (c.paid ? c.qty * itemOf(c).price : 0); }, 0);

    var seg = '<div class="type-seg" role="tablist" aria-label="Misafir tipi">' + ['inhouse', 'munferit', 'uye'].map(function (k) {
      var sub = { inhouse: 'Otelde konaklayan misafir', munferit: 'Dışarıdan gelen, konaklamayan', uye: 'Üyelik kartı olan misafir' }[k];
      return '<button type="button" role="tab" class="ts" aria-selected="' + (k === t) + '" data-k="' + k + '"><b>' + GTYPE[k] + '</b><small>' + sub + '</small></button>';
    }).join('') + '</div>';

    var strip = '';
    if (g) {
      var st = guestStatus(g);
      strip = '<div class="gstrip"><b>' + esc(g.name) + '</b><span>' + GTYPE[g.type || 'inhouse'] + (g.room ? ' · Oda ' + esc(g.room) : '') + ' · ' + fmtD(g.checkIn) + ' – ' + fmtD(g.treatEnd || g.checkOut) + ' · ' + GENDER[g.gender] + '</span>' +
        '<span>Lab: ' + esc(st.lab) + (st.out ? ' <b style="color:#c62828">(' + st.out + ' sınır dışı)</b>' : '') + ' · Reçete: ' + st.rx + ' seans · Plan: ' + (st.plan ? st.plan + ' seans kayıtlı' : 'yapılmadı') + '</span>' +
        '<a class="btn sm" href="#planlama">Rezervasyon Planla</a></div>';
    }

    // sağ panel: misafir alanları
    var gf = '';
    if (t === 'inhouse') {
      gf = '<div class="fld ro"><span>Misafir Tipi</span><output>Otel Misafiri</output></div>' +
        '<label class="fld" for="tsGuest"><span>Konaklayan Misafir</span><select id="tsGuest">' + D.guests.filter(function (x) { return !x.background && (x.type || 'inhouse') === 'inhouse'; }).map(function (x) {
          return '<option value="' + x.id + '"' + (g && x.id === g.id ? ' selected' : '') + '>' + esc(gLabel(x)) + '</option>'; }).join('') + '</select></label>';
    } else if (t === 'munferit') {
      var mns = D.guests.filter(function (x) { return x.type === 'munferit'; });
      gf = '<label class="fld" for="tsMn"><span>Münferit Misafir</span><select id="tsMn"><option value="">+ Yeni münferit misafir</option>' +
        mns.map(function (x) { return '<option value="' + x.id + '"' + (x.id === T.mn ? ' selected' : '') + '>' + esc(x.name) + ' (' + fmtD(x.checkIn) + ')</option>'; }).join('') + '</select></label>';
      if (!T.mn) gf += pf('nwName', 'Ad Soyad *', 'text', T.nw.name) +
        '<div class="frow"><label class="fld" for="nwGender"><span>Cinsiyet *</span><select id="nwGender"><option value="F"' + (T.nw.gender === 'F' ? ' selected' : '') + '>Kadın</option><option value="M"' + (T.nw.gender === 'M' ? ' selected' : '') + '>Erkek</option></select></label>' + pf('nwPhone', 'Telefon', 'tel', T.nw.phone) + '</div>' +
        '<div class="frow">' + pf('nwFrom', 'Tedavi Başlangıç *', 'date', T.nw.from) + pf('nwTo', 'Tedavi Bitiş *', 'date', T.nw.to) + '</div>';
    } else {
      gf = '<label class="fld" for="tsMem"><span>Üye</span><select id="tsMem"><option value="">— Üye seçin —</option>' +
        D.members.filter(function (m) { return m.active !== false; }).map(function (m) { return '<option value="' + m.id + '"' + (m.id === T.member ? ' selected' : '') + '>' + esc(m.card + ' · ' + m.name) + '</option>'; }).join('') + '</select></label>' +
        '<div class="frow">' + pf('mFrom', 'Tedavi Başlangıç', 'date', T.mFrom) + pf('mTo', 'Tedavi Bitiş', 'date', T.mTo) + '</div>';
    }
    gf += '<div class="fld ro"><span>Gelir Departmanı</span><output>MEDICAL</output></div>' +
      '<label class="fld" for="tsDr"><span>İsteyen Doktor</span><select id="tsDr">' + doctors.map(function (d) { return '<option' + (d.name === T.doctor ? ' selected' : '') + '>' + esc(d.name) + '</option>'; }).join('') + '</select></label>';

    var tiles = catalog().map(function (it) {
      var inCart = T.cart.some(function (c) { return c.kind === it.kind && c.id === it.id; });
      return '<div class="etile"><b>' + esc(it.name) + '</b>' +
        '<span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>' + (it.kind === 'paket' ? it.days + ' gün' : it.min + 'min') + '</span>' +
        '<span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="10" rx="1"/><circle cx="12" cy="12" r="2"/></svg>' + fmtN(it.price, it.price % 1 ? 2 : 0) + ' AZN</span>' +
        '<button type="button" class="btn red" data-kind="' + it.kind + '" data-id="' + it.id + '">' + (inCart ? 'Ekle (+1)' : 'Ekle') + '</button></div>';
    }).join('') || '<p class="hint" style="grid-column:1/-1">Bu kategoride kayıt yok.</p>';

    var cartRows = T.cart.length ? T.cart.map(function (c, i) {
      var it = itemOf(c);
      return '<tr><td><span class="kind k-' + c.kind + '">' + KIND[c.kind] + '</span> ' + esc(it.name) + '</td>' +
        '<td class="c">' + (c.kind === 'lab' || c.kind === 'paket' ? '<span class="num">1</span>' : '<input type="number" min="1" max="30" value="' + c.qty + '" data-i="' + i + '" id="tq-' + i + '" aria-label="Miktar" style="width:44px;text-align:center">') + '</td>' +
        '<td class="c"><button type="button" class="pill ' + (c.paid ? 'paid' : 'free') + '" data-paid="' + i + '" title="Ücretli / ücretsiz">' + (c.paid ? 'Ücretli' : 'Ücretsiz') + '</button></td>' +
        '<td class="r num">' + fmtN(c.paid ? c.qty * it.price : 0, 2) + '</td>' +
        '<td><button type="button" class="tool del" data-del="' + i + '" aria-label="Kaldır" style="width:24px;height:22px">' + svg('trash') + '</button></td></tr>';
    }).join('') : '<tr class="empty-row"><td colspan="5">Ortadan hizmet, lab, paket veya ürün ekleyin</td></tr>';

    var right = '<div class="ts-right">' +
      '<section class="card"><div class="dt-title">#Planlama Başlangıcı#</div><div class="frow" style="grid-template-columns:minmax(0,1fr) auto;align-items:end">' +
      pf('tsFrom', 'Servis Günü', 'date', S.fromDate || (g ? g.checkIn : TODAY)) + '<button type="button" class="btn" id="tsFromReset" aria-label="Giriş tarihine dön" title="Giriş tarihine dön" style="padding:9px 16px">↻</button></div></section>' +
      '<section class="card"><div class="frow" style="grid-template-columns:minmax(0,1fr) auto;align-items:center"><label class="fld" for="tsQ"><span>Hizmet Ara</span><input id="tsQ" value="' + esc(T.q) + '"></label><button type="button" class="ico x" id="tsQx" aria-label="Aramayı temizle">✕</button></div></section>' +
      '<section class="card">' + gf + '</section>' +
      '<section class="card" style="padding:0;gap:0"><div class="grid-wrap" style="border:0;max-height:300px"><table class="grid"><thead><tr><th>Hizmet Adı</th><th class="c">Miktar</th><th class="c">Ücret</th><th class="r">Toplam (AZN)</th><th></th></tr></thead><tbody id="tsCart">' + cartRows + '</tbody></table></div>' +
      '<div class="sum" style="justify-content:space-between;padding:10px 12px;border-top:1px solid var(--line)"><b style="font-size:13px;margin:0">Toplam:</b><b class="num" style="margin:0">' + money(total) + '</b></div></section>' +
      '<div class="err" id="tsErr" role="alert"></div>' +
      '<div class="btns" style="display:grid;grid-template-columns:1fr 1fr"><button type="button" class="btn" id="tsSave"' + (T.cart.length ? '' : ' disabled') + '>Kaydet</button><button type="button" class="btn cancel" id="tsPay"' + (T.cart.length && total > 0 ? '' : ' disabled') + '>Kaydet ve Ödeme Al</button></div>' +
      '<p class="hint" style="margin:0">Hizmetler misafirin reçetesine eklenir, ücreti plan kaydedilince adisyona yazılır. Lab testleri yeni lab formuna, paket ve ürünler hemen adisyona yazılır.</p></div>';

    content.innerHTML = pageHead('Toplu Satış') + seg + strip + '<div class="toplu">' +
      '<div class="cat-list">' + cats.map(function (c) { return '<button type="button" class="cat ' + (c.cls || '') + '" data-c="' + esc(c.k) + '"' + (T.cat === c.k && !T.q ? ' aria-pressed="true"' : '') + '>' + esc(c.t) + '</button>'; }).join('') + '</div>' +
      '<div class="etiles">' + tiles + '</div>' + right + '</div>';

    // olaylar
    [].forEach.call(content.querySelectorAll('.ts'), function (b) { b.addEventListener('click', function () { S.gType = b.dataset.k; render(); }); });
    content.querySelector('.cat-list').addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) { T.cat = b.dataset.c; T.q = ''; render(); } });
    content.querySelector('.etiles').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-kind]'); if (!b) return;
      var ex = T.cart.filter(function (c) { return c.kind === b.dataset.kind && c.id === b.dataset.id; })[0];
      if (ex) { if (ex.kind === 'hizmet' || ex.kind === 'urun') ex.qty++; else toast('Bu kalem sepette zaten var.'); }
      else T.cart.push({ kind: b.dataset.kind, id: b.dataset.id, qty: 1, paid: true });
      render();
    });
    var tsQ = $('tsQ');
    tsQ.addEventListener('input', function () { T.q = tsQ.value; var pos = tsQ.selectionStart; render(); var n = $('tsQ'); n.focus(); n.setSelectionRange(pos, pos); });
    $('tsQx').addEventListener('click', function () { T.q = ''; render(); });
    $('tsCart').addEventListener('change', function (e) { var i = e.target.dataset.i; if (i == null) return; T.cart[i].qty = Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 1)); render(); });
    $('tsCart').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.paid != null) T.cart[b.dataset.paid].paid = !T.cart[b.dataset.paid].paid;
      else if (b.dataset.del != null) T.cart.splice(+b.dataset.del, 1);
      else return;
      render();
    });
    $('tsFrom').addEventListener('change', function (e) { S.fromDate = e.target.value; S.proposal = null; });
    $('tsFromReset').addEventListener('click', function () { S.fromDate = null; render(); });
    $('tsDr').addEventListener('change', function (e) { T.doctor = e.target.value; });
    if ($('tsGuest')) $('tsGuest').addEventListener('change', function (e) { S.guestId = e.target.value; S.calGuest = S.guestId; S.proposal = null; S.fromDate = null; render(); });
    if ($('tsMn')) $('tsMn').addEventListener('change', function (e) { T.mn = e.target.value; if (T.mn) { S.guestId = T.mn; S.calGuest = T.mn; } render(); });
    ['nwName', 'nwPhone', 'nwFrom', 'nwTo', 'nwGender'].forEach(function (id) {
      if ($(id)) $(id).addEventListener('change', function (e) { T.nw[{ nwName: 'name', nwPhone: 'phone', nwFrom: 'from', nwTo: 'to', nwGender: 'gender' }[id]] = e.target.value; if (id === 'nwGender') render(); });
    });
    if ($('tsMem')) $('tsMem').addEventListener('change', function (e) { T.member = e.target.value; render(); });
    if ($('mFrom')) $('mFrom').addEventListener('change', function (e) { T.mFrom = e.target.value; render(); });
    if ($('mTo')) $('mTo').addEventListener('change', function (e) { T.mTo = e.target.value; });

    function resolveGuest() {
      if (t === 'inhouse') return g;
      if (t === 'munferit') {
        if (T.mn) return IX.g[T.mn];
        var nw = { name: ($('nwName').value || '').trim(), gender: $('nwGender').value, phone: ($('nwPhone').value || '').trim(), from: $('nwFrom').value, to: $('nwTo').value };
        if (!nw.name) { $('tsErr').textContent = 'Münferit misafirin adını girin.'; return null; }
        if (!nw.from || !nw.to || nw.to < nw.from) { $('tsErr').textContent = 'Tedavi bitişi, başlangıçtan önce olamaz.'; return null; }
        var ng = createGuest({ type: 'munferit', name: nw.name, gender: nw.gender, phone: nw.phone, from: nw.from, to: nw.to });
        T.mn = ng.id; T.nw = { name: '', gender: 'F', phone: '', from: TODAY, to: U.addDays(TODAY, 6) };
        return ng;
      }
      if (!T.member) { $('tsErr').textContent = 'Üye seçin.'; return null; }
      var mf = $('mFrom').value, mt = $('mTo').value;
      if (!mf || !mt || mt < mf) { $('tsErr').textContent = 'Tedavi tarihlerini doğru girin.'; return null; }
      if (g) return g;
      var m = IX.m[T.member];
      return createGuest({ type: 'uye', name: m.name, gender: m.gender, phone: m.phone, from: mf, to: mt, memberId: m.id });
    }

    function save(payment) {
      var gg = resolveGuest(); if (!gg) return;
      var rx = S.rx[gg.id] || (S.rx[gg.id] = []);
      var med = [], apt = [], labTests = [], nH = 0;
      function addRx(pid, count, paid) {
        var ex = rx.filter(function (x) { return x.procedureId === pid && !!x.paid === !!paid; })[0];
        if (ex) ex.count += count; else rx.push({ procedureId: pid, count: count, paid: !!paid });
      }
      T.cart.forEach(function (c) {
        var it = itemOf(c), price = c.paid ? it.price : 0;
        if (c.kind === 'hizmet') { addRx(c.id, c.qty, c.paid); nH += c.qty; }
        else if (c.kind === 'paket') { IX.k[c.id].items.forEach(function (x) { addRx(x.procedureId, x.count, false); nH += x.count; }); med.push({ name: 'Paket: ' + it.name, qty: 1, price: price }); }
        else if (c.kind === 'lab') { labTests.push(c.id); med.push({ name: it.name, qty: 1, price: price }); }
        else apt.push({ name: it.name, qty: c.qty, price: price });
      });
      if (labTests.length) L.forms.push({ id: newId('f'), date: S.fromDate || gg.checkIn, created: TODAY + ' 10:00', guestId: gg.id, doctor: T.doctor, status: 'Yeni', notes: 'Doktor isteği',
        lines: labTests.map(function (id) { return { testId: id, value: '', note: '' }; }) });
      var pay = payment || (gg.type === 'inhouse' ? 'Odaya Kapat' : 'Ödeme Bekliyor');
      var ads = [];
      if (med.length) ads.push(newAdisyon(gg.id, 'MEDICAL', 'Toplu Satış', med, pay));
      if (apt.length) ads.push(newAdisyon(gg.id, 'APTEK', 'Toplu Satış', apt, pay));
      T.cart = []; S.guestId = gg.id; S.calGuest = gg.id; S.proposal = null;
      var locked = guestBookings(gg.id).length > 0;
      render();
      toast('Kaydedildi: ' + gg.name + '. ' + (nH ? nH + ' seans reçeteye eklendi' + (locked ? ' (kayıtlı plan var, yeniden planlamak için önce iptal edin)' : '') + '. ' : '') +
        (labTests.length ? labTests.length + ' lab testi forma yazıldı. ' : '') + (ads.length ? ads.map(function (a) { return a.no; }).join(', ') + ' adisyon (' + pay + ').' : ''));
    }
    $('tsSave').addEventListener('click', function () { save(); });
    $('tsPay').addEventListener('click', function () {
      var gg = g;
      var opts = (gg && gg.type === 'inhouse' ? ['Odaya Kapat'] : []).concat(['Nakit', 'Kredi Kartı']);
      openForm({ title: 'Ödeme Al', sub: 'Toplam ' + money(total), values: { pay: opts[0] },
        rows: [[{ k: 'pay', label: 'Ödeme Tipi', type: 'select', options: opts.map(function (o) { return { v: o, t: o }; }) }]],
        save: function (v) { save(v.pay); } });
    });
  };

  // ---------- Ürün Satışları ----------
  VIEWS.urun = function () {
    var g = IX.g[S.guestId];
    var prods = D.products.filter(function (p) { return p.active !== false; });
    var groups = prods.map(function (p) { return p.group; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
    var cg = S.prodGroup || '';
    var cart = S.cart || (S.cart = []);
    var pays = payOptions(g);
    if (pays.indexOf(S.pay) < 0) S.pay = pays[0];
    var total = cart.reduce(function (n, c) { return n + c.qty * IX.u[c.id].price; }, 0);

    var left = '<div class="cat-list"><button type="button" class="cat all" data-g=""' + (cg === '' ? ' aria-pressed="true"' : '') + '>Tüm Ürünler</button>' +
      groups.map(function (x) { return '<button type="button" class="cat" data-g="' + esc(x) + '"' + (cg === x ? ' aria-pressed="true"' : '') + '>' + esc(x) + '</button>'; }).join('') + '</div>';
    var tiles = '<div class="tiles">' + prods.filter(function (p) { return !cg || p.group === cg; }).map(function (p) {
      return '<div class="tile"><b>' + esc(p.name) + '</b><span class="hint" style="margin:0">' + esc(p.group) + '</span><span class="num">' + money(p.price) + '</span><button type="button" class="btn red" data-add="' + p.id + '">Ekle</button></div>';
    }).join('') + '</div>';
    var right = '<section class="card">' + guestSelect('usGuest') +
      '<label class="fld" for="usPay"><span>Ödeme</span><select id="usPay">' + pays.map(function (x) { return '<option' + (x === S.pay ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
      '<div class="fld ro"><span>Gelir Departmanı</span><output>APTEK</output></div>' +
      '<div class="grid-wrap" style="max-height:300px"><table class="grid"><thead><tr><th>Ürün Adı</th><th class="c">Miktar</th><th class="r">Toplam (AZN)</th><th></th></tr></thead><tbody id="cartBody">' +
      (cart.length ? cart.map(function (c, i) {
        var p = IX.u[c.id];
        return '<tr><td>' + esc(p.name) + '</td><td class="c"><input type="number" min="1" max="99" value="' + c.qty + '" data-i="' + i + '" id="cq-' + i + '" aria-label="Miktar" style="width:52px;text-align:center"></td><td class="r num">' + fmtN(c.qty * p.price, 2) + '</td>' +
          '<td><button type="button" class="tool del" data-del="' + i + '" aria-label="Kaldır" style="width:26px;height:22px">' + svg('trash') + '</button></td></tr>';
      }).join('') : '<tr class="empty-row"><td colspan="4">Sepet boş. Soldan ürün ekleyin.</td></tr>') + '</tbody></table></div>' +
      '<div class="sum" style="justify-content:space-between"><span>Toplam:</span><b class="num">' + money(total) + '</b></div>' +
      '<div class="btns end"><button type="button" class="btn gray" id="cartClear">Temizle</button><button type="button" class="btn" id="cartSave"' + (cart.length ? '' : ' disabled') + '>Kaydet</button></div></section>';

    content.innerHTML = pageHead('Ürün Satışları') + '<div class="shop">' + left + tiles + right + '</div>';
    content.querySelector('.cat-list').addEventListener('click', function (e) { var b = e.target.closest('[data-g]'); if (b) { S.prodGroup = b.dataset.g; render(); } });
    content.querySelector('.tiles').addEventListener('click', function (e) {
      var b = e.target.closest('[data-add]'); if (!b) return;
      var ex = cart.filter(function (c) { return c.id === b.dataset.add; })[0];
      if (ex) ex.qty++; else cart.push({ id: b.dataset.add, qty: 1 });
      render();
    });
    $('cartBody').addEventListener('change', function (e) { var i = e.target.dataset.i; if (i == null) return; cart[i].qty = Math.max(1, parseInt(e.target.value, 10) || 1); render(); });
    $('cartBody').addEventListener('click', function (e) { var b = e.target.closest('[data-del]'); if (b) { cart.splice(+b.dataset.del, 1); render(); } });
    $('usGuest').addEventListener('change', function (e) { S.guestId = e.target.value; S.calGuest = S.guestId; render(); });
    $('usPay').addEventListener('change', function (e) { S.pay = e.target.value; });
    $('cartClear').addEventListener('click', function () { S.cart = []; render(); });
    $('cartSave').addEventListener('click', function () {
      var ad = newAdisyon(g.id, 'APTEK', 'Ürün', cart.map(function (c) { var p = IX.u[c.id]; return { name: p.name, qty: c.qty, price: p.price }; }), S.pay);
      S.cart = []; render(); toast(ad.no + ' numaralı adisyon kaydedildi: ' + money(adTotal(ad)) + ' (' + ad.payment + ').');
    });
  };

  // ---------- Paket Satışları ----------
  VIEWS.paket = function () {
    var g = IX.g[S.guestId];
    var pays = payOptions(g);
    if (pays.indexOf(S.pay) < 0) S.pay = pays[0];
    var locked = guestBookings(g.id).length > 0;
    var cards = '<div class="tiles pk">' + D.packages.filter(function (k) { return k.active !== false; }).map(function (k) {
      return '<div class="tile"><b>' + esc(k.name) + '</b><span class="num">' + money(k.price) + ' · ' + k.days + ' gün</span><ul class="pk-items">' +
        k.items.map(function (it) { return IX.p[it.procedureId] ? '<li>' + esc(IX.p[it.procedureId].name) + ' <span class="num">× ' + it.count + '</span></li>' : ''; }).join('') +
        '</ul><button type="button" class="btn red" data-sell="' + k.id + '"' + (locked ? ' disabled' : '') + '>Sat</button></div>';
    }).join('') + '</div>';
    var sold = A.filter(function (a) { return a.kind === 'Paket'; });
    var o = { id: 'paket-sold', rows: sold.map(function (a) { return { id: a.no, no: a.no, date: fmtD(a.date), guest: IX.g[a.guestId] ? gLabel(IX.g[a.guestId]) : '', name: a.lines[0].name, pay: a.payment, total: fmtN(adTotal(a), 2), st: a.cancelled ? 'İptal' : 'Aktif' }; }),
      cols: [{ k: 'no', label: 'Adisyon No', cls: 'num' }, { k: 'date', label: 'Tarih', cls: 'num' }, { k: 'guest', label: 'Misafir' }, { k: 'name', label: 'Paket' }, { k: 'pay', label: 'Ödeme' }, { k: 'total', label: 'Tutar (AZN)', cls: 'r num' }, { k: 'st', label: 'Durum', options: ['Aktif', 'İptal'] }] };
    content.innerHTML = pageHead('Paket Satışları') + '<section class="card" style="margin-bottom:12px"><div class="frow">' + guestSelect('pkGuest') +
      '<label class="fld" for="pkPay"><span>Ödeme</span><select id="pkPay">' + pays.map(function (x) { return '<option' + (x === S.pay ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label></div>' +
      (locked ? '<div class="note info">Bu misafirin kayıtlı planı var. Paket eklemek için Rezervasyon Planlama ekranından önce planı iptal edin.</div>' : '<p class="hint" style="margin:0">Satılan paketin hizmetleri misafirin reçetesine ücretsiz seans olarak eklenir, ardından Rezervasyon Planlama ekranında otomatik planlanır.</p>') +
      '</section>' + cards + '<h3 class="sub-title">Satılan Paketler</h3>' + grid(o);
    bindGrid(o);
    $('pkGuest').addEventListener('change', function (e) { S.guestId = e.target.value; S.calGuest = S.guestId; render(); });
    $('pkPay').addEventListener('change', function (e) { S.pay = e.target.value; });
    content.querySelector('.tiles').addEventListener('click', function (e) {
      var b = e.target.closest('[data-sell]'); if (!b) return;
      var k = IX.k[b.dataset.sell], rx = S.rx[g.id];
      k.items.forEach(function (it) {
        var ex = rx.filter(function (x) { return x.procedureId === it.procedureId && !x.paid; })[0];
        if (ex) ex.count += it.count; else rx.push({ procedureId: it.procedureId, count: it.count, paid: false });
      });
      var ad = newAdisyon(g.id, 'MEDICAL', 'Paket', [{ name: 'Paket: ' + k.name, qty: 1, price: k.price }], S.pay);
      S.proposal = null; render();
      toast(k.name + ' satıldı (' + ad.no + '). Hizmetler reçeteye eklendi; Rezervasyon Planlama’dan planlayın.');
    });
  };

  // ---------- Adisyon Listesi ----------
  VIEWS.adisyon = function () {
    var t = S.tab.adisyon || 'Hepsi';
    var rows = A.filter(function (a) { return t === 'Hepsi' ? true : t === 'İptal Edilen Adisyonlar' ? a.cancelled : !a.cancelled; }).map(function (a) {
      var g = IX.g[a.guestId];
      return { id: a.no, no: a.no, date: fmtD(a.date), type: a.cancelled ? 'CANCELLED' : a.type, dept: a.dept, kind: a.kind, guest: g ? g.name : '', room: g ? roomLbl(g) : '', pay: a.payment, total: adTotal(a), cancelled: a.cancelled };
    }).reverse();
    var sum = rows.filter(function (r) { return !r.cancelled; }).reduce(function (n, r) { return n + r.total; }, 0);
    var o = { id: 'adisyon', rows: rows, open: openAdisyon, rowClass: function (r) { return r.cancelled ? 'muted-row' : ''; }, cols: [
      { k: 'no', label: 'Adisyon No', cls: 'num' }, { k: 'date', label: 'Adisyon Tarihi', cls: 'num' }, { k: 'type', label: 'Adisyon Türleri', options: ['SOLD', 'CANCELLED'] },
      { k: 'dept', label: 'Departman Adı', options: ['MEDICAL', 'APTEK'] }, { k: 'kind', label: 'İçerik', options: ['Hizmet', 'Ürün', 'Paket', 'Toplu Satış'] },
      { k: 'guest', label: 'Misafir Adı' }, { k: 'room', label: 'Oda' }, { k: 'pay', label: 'Ödeme', options: ['Odaya Kapat', 'Nakit', 'Kredi Kartı', 'Ödeme Bekliyor'] },
      { k: 'total', label: 'Adisyon Toplam', cls: 'r num', text: function (r) { return fmtN(r.total, 2); } }, { k: 'cur', label: 'Döviz', text: function () { return 'AZN'; }, filter: false }] };
    var tb = [{ icon: 'edit', title: 'Detay (satıra çift tıklama da açar)', run: function () { var k = requireSel('adisyon', 'adisyon'); if (k) openAdisyon(k); } },
      { icon: 'trash', title: 'Adisyonu iptal et', run: function () {
        var k = requireSel('adisyon', 'adisyon'); if (!k) return;
        var ad = A.filter(function (x) { return x.no === k; })[0];
        if (ad.cancelled) { toast('Bu adisyon zaten iptal edilmiş.'); return; }
        openConfirm('Adisyon İptali', ad.no + ' numaralı adisyon (' + money(adTotal(ad)) + ') iptal edilecek.', function () { ad.cancelled = true; render(); toast('Adisyon iptal edildi.'); });
      } },
      { icon: 'clear', title: 'Filtreleri temizle', run: function () { S.filters.adisyon = {}; render(); } }];
    content.innerHTML = pageHead('Adisyon Listesi') + toolbar('adisyon', tb, rows.length) + tabs('adisyon', ['Hepsi', 'Aktif Adisyonlar', 'İptal Edilen Adisyonlar']) + grid(o) +
      '<div class="sum" style="justify-content:flex-end">Aktif adisyon toplamı:<b class="num">' + money(sum) + '</b></div>';
    bindToolbar('adisyon', tb); bindTabs('adisyon', render); bindGrid(o);
  };
  function openAdisyon(no) {
    var ad = A.filter(function (x) { return x.no === no; })[0], g = IX.g[ad.guestId];
    openForm({ title: 'Adisyon', sub: '#' + ad.no + (ad.cancelled ? ' · İPTAL' : ''), values: {}, rows: [],
      extra: '<div class="frow">' + ro('Tarih', fmtD(ad.date) + ' ' + ad.time) + ro('Departman', ad.dept) + ro('Misafir', g ? gLabel(g) : '') + ro('Ödeme', ad.payment) + '</div>' +
        '<div class="grid-wrap"><table class="grid"><thead><tr><th>Hizmet / Ürün</th><th class="c">Miktar</th><th class="r">Birim Fiyat</th><th class="r">Toplam</th></tr></thead><tbody>' +
        ad.lines.map(function (l) { return '<tr><td>' + esc(l.name) + '</td><td class="c num">' + l.qty + '</td><td class="r num">' + fmtN(l.price, 2) + '</td><td class="r num">' + fmtN(l.qty * l.price, 2) + '</td></tr>'; }).join('') +
        '</tbody></table></div><div class="sum" style="justify-content:flex-end">Toplam:<b class="num">' + money(adTotal(ad)) + '</b></div>',
      save: function () {} });
  }

  // ---------- Raporlar ----------
  VIEWS.rapor = function () {
    var t = S.tab.rapor || 'Hizmet Bazında';
    var from = S.rFrom || '2026-10-12', to = S.rTo || '2026-10-21';
    var B = D.bookings.filter(function (b) { return b.date >= from && b.date <= to; });
    var cfg = D.config, dayMin = U.toMin(cfg.dayEnd) - U.toMin(cfg.dayStart) - (cfg.breaks || []).reduce(function (n, b) { return n + U.toMin(b.end) - U.toMin(b.start); }, 0);
    var days = []; for (var d = from; d <= to; d = U.addDays(d, 1)) days.push(d);
    function occ(b) { var p = IX.p[b.procedureId]; return b.end - b.start + (p.prepBefore || 0) + (p.prepAfter || 0); }
    function bar(pct) { pct = Math.max(0, Math.min(100, pct)); return '<div class="barc"><i style="width:' + pct.toFixed(1) + '%"></i><span class="num">%' + fmtN(pct, 1) + '</span></div>'; }
    var head, rows;
    if (t === 'Hizmet Bazında') {
      head = ['Hizmet', 'Seans', 'Ücretli', 'Ücretsiz', 'Toplam Süre (dk)', 'Ücretli Gelir (AZN)', 'Pay'];
      var tot = B.length || 1;
      rows = D.procedures.map(function (p) {
        var l = B.filter(function (b) { return b.procedureId === p.id; }), pd = l.filter(function (b) { return b.paid; }).length;
        return [esc(p.name), l.length, pd, l.length - pd, l.reduce(function (n, b) { return n + b.end - b.start; }, 0), fmtN(pd * (p.price || 0), 2), bar(l.length / tot * 100)];
      });
    } else if (t === 'Personel İş Yükü') {
      head = ['Görevli', 'Seans', 'Meşgul Süre (dk)', 'Çalışma Günü', 'Günlük Ort. (dk)', 'Doluluk'];
      rows = D.staff.filter(function (s) { return s.active !== false; }).map(function (s) {
        var l = B.filter(function (b) { return b.staffId === s.id || b.staffId2 === s.id; });
        var wd = days.filter(function (d) { return (s.daysOff || []).indexOf(U.weekday(d)) < 0; }).length;
        var sh = s.shift ? U.toMin(s.shift.end) - U.toMin(s.shift.start) : dayMin;
        var m = l.reduce(function (n, b) { return n + occ(b); }, 0);
        return [esc(s.name), l.length, m, wd, wd ? Math.round(m / wd) : 0, bar(wd ? m / (sh * wd) * 100 : 0)];
      });
    } else if (t === 'Mekân Doluluk') {
      head = ['Mekân', 'Grup', 'Seans', 'Meşgul Süre (dk)', 'Doluluk'];
      rows = D.rooms.filter(function (r) { return r.active !== false; }).map(function (r) {
        var l = B.filter(function (b) { return b.roomId === r.id; }), m = l.reduce(function (n, b) { return n + occ(b); }, 0);
        return [esc(r.name), esc(r.group), l.length, m, bar(m / (dayMin * days.length) * 100)];
      });
    } else {
      head = ['Departman', 'İçerik', 'Ödeme', 'Adisyon', 'Toplam (AZN)'];
      var map = {};
      A.filter(function (a) { return !a.cancelled && a.date >= from && a.date <= to; }).forEach(function (a) {
        var k = a.dept + '|' + a.kind + '|' + a.payment; map[k] = map[k] || { n: 0, t: 0 }; map[k].n++; map[k].t += adTotal(a);
      });
      var gt = 0;
      rows = Object.keys(map).sort().map(function (k) { var p = k.split('|'); gt += map[k].t; return [p[0], p[1], p[2], map[k].n, fmtN(map[k].t, 2)]; });
      rows.push(['<b>Genel Toplam</b>', '', '', '', '<b>' + fmtN(gt, 2) + '</b>']);
    }
    var tbl = '<div class="grid-wrap"><table class="grid"><thead><tr>' + head.map(function (h, i) { return '<th class="' + (i ? 'r' : '') + '">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      (rows.length ? rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td class="' + (i ? 'r num' : '') + '">' + c + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr class="empty-row"><td colspan="' + head.length + '">Bu tarih aralığında kayıt yok</td></tr>') + '</tbody></table></div>';
    content.innerHTML = pageHead('Raporlar') + '<div class="cal-tools" style="margin-bottom:10px">' + pf('rFrom', 'Başlangıç Tarihi', 'date', from) + pf('rTo', 'Bitiş Tarihi', 'date', to) +
      '<span class="hint">' + days.length + ' gün · ' + B.length + ' seans</span></div>' + tabs('rapor', ['Hizmet Bazında', 'Personel İş Yükü', 'Mekân Doluluk', 'Gelir Özeti']) + tbl +
      '<p class="hint" style="margin:8px 0 0">Doluluk; hazırlık süreleri dahil meşgul dakikanın, öğle arası düşülmüş çalışma süresine oranıdır.</p>';
    bindTabs('rapor', render);
    $('rFrom').addEventListener('change', function (e) { if (e.target.value) { S.rFrom = e.target.value; render(); } });
    $('rTo').addEventListener('change', function (e) { if (e.target.value) { S.rTo = e.target.value; render(); } });
  };

  // ---------- Ürün Tanımları ----------
  VIEWS['urun-tanim'] = function () {
    var rows = activeTab('urun-tanim', D.products);
    var o = { id: 'urun-tanim', rows: rows, open: editUrun, cols: [
      { k: 'id', label: 'Id' }, { k: 'group', label: 'Ürün Grubu Adı' }, { k: 'name', label: 'Ürün Adı' },
      { k: 'price', label: 'Fiyat', cls: 'r num', text: function (p) { return fmtN(p.price, 2); } }, { k: 'cur', label: 'Döviz', filter: false, text: function () { return 'AZN'; } },
      { k: 'income', label: 'Gelir Grubu' }, { k: 'active', label: 'Aktif', cls: 'c', filter: false, html: function (p) { return yn(p.active !== false); } }] };
    var tb = stdTools('urun-tanim', function () { editUrun(null); }, editUrun, function (id) {
      openConfirm('Ürün Sil', '“' + IX.u[id].name + '” silinecek.', function () { D.products = D.products.filter(function (x) { return x.id !== id; }); index(); S.cart = []; S.sel['urun-tanim'] = null; render(); });
    });
    content.innerHTML = pageHead('Ürün Tanımları') + toolbar('urun-tanim', tb, rows.length) + tabs('urun-tanim', ['Aktif', 'Pasif', 'Hepsi']) + grid(o);
    bindToolbar('urun-tanim', tb); bindTabs('urun-tanim', render); bindGrid(o);
  };
  function editUrun(id) {
    var p = id ? IX.u[id] : { group: '', name: '', price: 0, income: 'APTEK', active: true };
    var groups = D.products.map(function (x) { return x.group; }).filter(function (g, i, a) { return a.indexOf(g) === i; });
    openForm({ title: 'Ürün Tanımı', sub: id ? '#' + id : 'Yeni kayıt', values: p,
      rows: [[{ k: 'group', label: 'Ürün Grubu Adı', req: true, list: groups }, { k: 'name', label: 'Ürün Adı', req: true }],
        [{ k: 'price', label: 'Fiyat (AZN)', type: 'number', step: 'any', req: true }, { k: 'income', label: 'Gelir Grubu', req: true, list: ['APTEK', 'MEDICAL'] }], [{ k: 'active', label: 'Aktif', type: 'toggle' }]],
      save: function (v) {
        if (v.price < 0) return 'Fiyat negatif olamaz.';
        var x = id ? p : { id: newId('u') };
        x.group = v.group; x.name = v.name; x.price = v.price; x.income = v.income; x.active = v.active;
        if (!id) D.products.push(x);
        index(); render();
      } });
  }

  // ---------- Paket Tanımları ----------
  VIEWS['paket-tanim'] = function () {
    var rows = activeTab('paket-tanim', D.packages);
    var o = { id: 'paket-tanim', rows: rows, open: editPaket, cols: [
      { k: 'name', label: 'Paket Adı' }, { k: 'price', label: 'Fiyat (AZN)', cls: 'r num', text: function (k) { return fmtN(k.price, 2); } }, { k: 'days', label: 'Gün', cls: 'r num' },
      { k: 'items', label: 'İçerik', text: function (k) { return k.items.map(function (it) { return IX.p[it.procedureId] ? IX.p[it.procedureId].name + ' × ' + it.count : ''; }).join(', '); } },
      { k: 'active', label: 'Aktif', cls: 'c', filter: false, html: function (k) { return yn(k.active !== false); } }] };
    var tb = stdTools('paket-tanim', function () { editPaket(null); }, editPaket, function (id) {
      openConfirm('Paket Sil', '“' + IX.k[id].name + '” silinecek. Satılmış paketler etkilenmez.', function () { D.packages = D.packages.filter(function (x) { return x.id !== id; }); index(); S.sel['paket-tanim'] = null; render(); });
    });
    content.innerHTML = pageHead('Paket Tanımları') + toolbar('paket-tanim', tb, rows.length) + tabs('paket-tanim', ['Aktif', 'Pasif', 'Hepsi']) + grid(o);
    bindToolbar('paket-tanim', tb); bindTabs('paket-tanim', render); bindGrid(o);
  };
  function editPaket(id) {
    var k = id ? IX.k[id] : { name: '', price: 0, days: 7, items: [], active: true };
    var procs = D.procedures.filter(function (p) { return p.active !== false; });
    var vals = { name: k.name, price: k.price, days: k.days, active: k.active !== false };
    procs.forEach(function (p) { var it = k.items.filter(function (x) { return x.procedureId === p.id; })[0]; vals['c_' + p.id] = it ? it.count : ''; });
    var cnt = procs.map(function (p) { return { k: 'c_' + p.id, label: p.name + ' (seans)', type: 'number' }; });
    var rows = [[{ k: 'name', label: 'Paket Adı', req: true }, { k: 'price', label: 'Fiyat (AZN)', type: 'number', step: 'any', req: true }, { k: 'days', label: 'Gün', type: 'number', req: true }]];
    for (var i = 0; i < cnt.length; i += 3) rows.push(cnt.slice(i, i + 3));
    rows.push([{ k: 'active', label: 'Aktif', type: 'toggle' }]);
    openForm({ title: 'Paket Tanımı', sub: id ? '#' + id : 'Yeni kayıt', values: vals, rows: rows,
      save: function (v) {
        var items = procs.filter(function (p) { return v['c_' + p.id] > 0; }).map(function (p) { return { procedureId: p.id, count: v['c_' + p.id] }; });
        if (!items.length) return 'Pakete en az bir hizmet ekleyin.';
        var x = id ? k : { id: newId('k') };
        x.name = v.name; x.price = v.price; x.days = v.days; x.items = items; x.active = v.active;
        if (!id) D.packages.push(x);
        index(); render();
      } });
  }

  // ---------- Üye Tanımları ----------
  VIEWS.uye = function () {
    var rows = activeTab('uye', D.members);
    var o = { id: 'uye', rows: rows, open: editUye, cols: [
      { k: 'card', label: 'Kart No', cls: 'num' }, { k: 'name', label: 'Ad Soyad' }, { k: 'gender', label: 'Cinsiyet', options: ['Erkek', 'Kadın'], text: function (m) { return GENDER[m.gender]; } },
      { k: 'phone', label: 'Telefon' }, { k: 'active', label: 'Aktif', cls: 'c', filter: false, html: function (m) { return yn(m.active !== false); } }] };
    var tb = stdTools('uye', function () { editUye(null); }, editUye, function (id) {
      openConfirm('Üye Sil', '“' + IX.m[id].name + '” silinecek.', function () { D.members = D.members.filter(function (x) { return x.id !== id; }); index(); S.sel.uye = null; render(); });
    });
    content.innerHTML = pageHead('Üye Tanımları') + toolbar('uye', tb, rows.length) + tabs('uye', ['Aktif', 'Pasif', 'Hepsi']) + grid(o);
    bindToolbar('uye', tb); bindTabs('uye', render); bindGrid(o);
  };
  function editUye(id) {
    var m = id ? IX.m[id] : { card: 'ÜYE-' + (1000 + D.members.length + 1), name: '', gender: 'F', phone: '', active: true };
    openForm({ title: 'Üye Tanımı', sub: id ? '#' + id : 'Yeni kayıt', values: m,
      rows: [[{ k: 'card', label: 'Kart No', req: true }, { k: 'name', label: 'Ad Soyad', req: true }],
        [{ k: 'gender', label: 'Cinsiyet', type: 'select', options: [{ v: 'F', t: 'Kadın' }, { v: 'M', t: 'Erkek' }] }, { k: 'phone', label: 'Telefon' }], [{ k: 'active', label: 'Aktif', type: 'toggle' }]],
      save: function (v) {
        var x = id ? m : { id: newId('m') };
        x.card = v.card; x.name = v.name; x.gender = v.gender; x.phone = v.phone; x.active = v.active;
        if (!id) D.members.push(x);
        index(); render();
      } });
  }

  // ---------- yönlendirme ----------
  var MENU_OF = { takvim: 'planlama', 'lab-form': 'lab-sonuc' };
  function current() { var h = location.hash.replace('#', ''); return VIEWS[h] ? h : 'giris'; }
  function render() {
    var v = current();
    [].forEach.call(document.querySelectorAll('.menu a'), function (a) {
      var m = MENU_OF[v] || v;
      if (a.getAttribute('href') === '#' + m) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    VIEWS[v]();
  }
  window.addEventListener('hashchange', function () { $('app').classList.remove('menu-open'); content.scrollTop = 0; render(); });
  $('hamburger').addEventListener('click', function () { $('app').classList.toggle('menu-open'); });
  $('scrim').addEventListener('click', function () { $('app').classList.remove('menu-open'); });
  $('defsBtn').addEventListener('click', function () {
    var open = $('defsBtn').getAttribute('aria-expanded') === 'true';
    $('defsBtn').setAttribute('aria-expanded', String(!open)); $('defsList').hidden = open;
  });

  loadDefaults();
  render();
})();
