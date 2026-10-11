/*
 * LAB DEMO VERİSİ — referans aralıkları örnek amaçlıdır, sonuç değerleri kurgusaldır.
 * Elektraweb: CRM Listeleri → Lab Testleri (Gruplar, Tanımlar, Formlar, Sonuçlar)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MedicalLabData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Lab Test Grupları
  var groups = [
    { id: 'lg1', name: 'Qanın Ümumi Analizi', standard: true },
    { id: 'lg2', name: 'Qanın Biokimyəvi Analizi Kişi', standard: true, gender: 'M' },
    { id: 'lg3', name: 'Qanın Biokimyəvi Analizi Qadın', standard: true, gender: 'F' },
    { id: 'lg4', name: 'Lipidspektri' },
    { id: 'lg5', name: 'Hormonlar' },
    { id: 'lg6', name: 'Sidiyin Ümumi Analizi' },
    { id: 'lg7', name: 'Revmatik Testlər' },
    { id: 'lg8', name: 'İnfeksiyalar' }
  ];

  // Lab Test Tanımları: [grup, ad, birim, min, max, cinsiyet]
  var raw = [
    ['lg1', 'RBC - Eritrosit', '10^6 / uL', 3.5, 5.5],
    ['lg1', 'WBC - Leykositlər', '10^3 / uL', 4, 10],
    ['lg1', 'PLT - Trombositlər', '10^3 / uL', 100, 300],
    ['lg1', 'HGB - Hemoqlobin', 'g/dL', 11, 16],
    ['lg1', 'HCT - Hematokrit', '%', 37, 54],
    ['lg1', 'MCV - Eritrositlərin orta həcmi', 'fL', 80, 100],
    ['lg1', 'MCH - Eritrositdə hemoqlobin', 'pg', 27, 34],
    ['lg1', 'LİM% - Limfositlərin miqdarı', '%', 20, 40],
    ['lg1', 'GRA% - Neytrofillərin miqdarı', '%', 50, 70],
    ['lg1', 'EÇS - Eritrositlərin çökmə sürəti', 'mm/saat', 2, 15],
    ['lg2', 'GLU (Qlükoza)', 'mg/dl', 74, 120, 'M'],
    ['lg2', 'ALT', 'U/L', 0, 40, 'M'],
    ['lg2', 'AST', 'U/L', 0, 38, 'M'],
    ['lg2', 'CREA (Kreatinin)', 'mg/dl', 0.7, 1.2, 'M'],
    ['lg2', 'UREA (Sidik cövhəri)', 'mg/dl', 15, 45, 'M'],
    ['lg2', 'Total Xolesterol', 'mg/dl', 0, 200, 'M'],
    ['lg3', 'GLU (Qlükoza)', 'mg/dl', 75, 120, 'F'],
    ['lg3', 'ALT', 'U/L', 0, 32, 'F'],
    ['lg3', 'AST', 'U/L', 0, 32, 'F'],
    ['lg3', 'CREA (Kreatinin)', 'mg/dl', 0.6, 1.1, 'F'],
    ['lg3', 'UREA (Sidik cövhəri)', 'mg/dl', 15, 45, 'F'],
    ['lg3', 'Total Xolesterol', 'mg/dl', 0, 200, 'F'],
    ['lg4', 'Triqliseridlər', 'mg/dl', 0, 150],
    ['lg4', 'HDL Xolesterin', 'mg/dl', 40, 60],
    ['lg4', 'LDL Xolesterin', 'mg/dl', 0, 130],
    ['lg5', 'TSH (Tireostimullaşdırıcı hormon)', 'uIU/ml', 0.23, 3.4],
    ['lg5', 'FT4 (Sərbəst Tiroksin 4)', 'NG/DL', 0.7, 1.8],
    ['lg5', 'Vitamin D', 'ng/ml', 30, 100],
    ['lg6', 'Sidiyin xüsusi çəkisi', '', 1.005, 1.03],
    ['lg6', 'pH', '', 5, 7],
    ['lg7', 'RF (Revmatoid faktor)', 'IU/ml', 0, 14],
    ['lg7', 'CRP (C-reaktiv zülal)', 'mg/L', 0, 5],
    ['lg8', 'HBsAg', 'S/CO', 0, 1],
    ['lg8', 'Anti-HCV', 'S/CO', 0, 1]
  ];
  var tests = raw.map(function (r, i) {
    return { id: 't' + (i + 1), groupId: r[0], name: r[1], unit: r[2], min: r[3], max: r[4], gender: r[5] || '' };
  });

  // Kurgusal sonuç değerleri: aralık içinde, birkaç tanesi bilerek sınır dışı
  function val(t, k) {
    var span = t.max - t.min;
    var f = ((k * 37 + t.id.length * 11 + parseInt(t.id.slice(1), 10) * 7) % 80 + 10) / 100;
    var v = t.min + span * f;
    return Math.round(v * 100) / 100;
  }
  var outOfRange = { g1: { 't11': 138, 't16': 236 }, g2: { 't4': 10.2, 't19': 41 }, g3: { 't12': 52 }, g4: {}, g5: { 't1': 5.9 } };

  var guestInfo = [
    { id: 'g1', gender: 'M', date: '2026-10-12', status: 'Tamamlandı', doctor: 'Dr. Fərid M.' },
    { id: 'g2', gender: 'F', date: '2026-10-12', status: 'Tamamlandı', doctor: 'Dr. Könül İ.' },
    { id: 'g3', gender: 'M', date: '2026-10-12', status: 'Tamamlandı', doctor: 'Dr. Fərid M.' },
    { id: 'g4', gender: 'F', date: '2026-10-13', status: 'İşlemde', doctor: '' },
    { id: 'g5', gender: 'M', date: '2026-10-12', status: 'Yeni', doctor: '' }
  ];

  var forms = guestInfo.map(function (g, k) {
    var std = groups.filter(function (x) { return x.standard && (!x.gender || x.gender === g.gender); }).map(function (x) { return x.id; });
    var lines = tests.filter(function (t) { return std.indexOf(t.groupId) >= 0; }).map(function (t) {
      var v = '';
      if (g.status !== 'Yeni') v = outOfRange[g.id][t.id] != null ? outOfRange[g.id][t.id] : val(t, k + 1);
      if (g.status === 'İşlemde' && t.groupId !== 'lg1') v = '';
      return { testId: t.id, value: v, note: '' };
    });
    return { id: 'f' + (k + 1), date: g.date, created: g.date + ' 08:' + (10 + k * 7), guestId: g.id, doctor: g.doctor, status: g.status, notes: 'Standart giriş analizi', lines: lines };
  });

  return { groups: groups, tests: tests, forms: forms, statuses: ['Yeni', 'İşlemde', 'Tamamlandı', 'İptal Edildi'] };
});
