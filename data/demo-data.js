/*
 * DEMO VERİSİ — tamamen kurgusaldır.
 * Gerçek misafir, personel veya sağlık bilgisi içermez.
 * Kurallar ve kaynaklar tek yerden değiştirilebilir; gerçek tesis verisi geldiğinde
 * yalnızca bu dosya güncellenir, motor (src/engine.js) değişmez.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MedicalDemoData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var config = {
    facility: 'Demo Sanatoryum — Naftalan',
    dayStart: '08:00',
    dayEnd: '17:00',
    stepMinutes: 5,
    breaks: [{ start: '13:00', end: '14:00', label: 'Öğle arası' }],
    guestBufferMinutes: 10,      // misafirin iki prosedürü arasındaki geçiş süresi
    maxPerGuestPerDay: 5,        // misafir başına günlük en fazla prosedür
    planOnCheckoutDay: false     // çıkış günü prosedür planlanmaz
  };

  // Elektraweb: Tanımlar → Mekanlar ve Masaj Odaları
  var rooms = [
    { id: 'V1', name: 'Naftalan vanna kabina 1', group: 'Naftalan vanna', active: true },
    { id: 'V2', name: 'Naftalan vanna kabina 2', group: 'Naftalan vanna', active: true },
    { id: 'V3', name: 'Naftalan vanna kabina 3', group: 'Naftalan vanna', active: true },
    { id: 'V4', name: 'Naftalan vanna kabina 4', group: 'Naftalan vanna', active: true },
    { id: 'L1', name: 'Palçıq otağı 1', group: 'Palçıq', active: true },
    { id: 'L2', name: 'Palçıq otağı 2', group: 'Palçıq', active: true },
    { id: 'M1', name: 'Massaj yer 1', group: 'Massaj', active: true },
    { id: 'M2', name: 'Massaj yer 2', group: 'Massaj', active: true },
    { id: 'M3', name: 'Massaj yer 3', group: 'Massaj', active: true },
    { id: 'E1', name: 'Elektroforez kabina 1', group: 'Elektroforez', active: true },
    { id: 'E2', name: 'Elektroforez kabina 2', group: 'Elektroforez', active: true },
    { id: 'E3', name: 'Elektroforez kabina 3', group: 'Elektroforez', active: true },
    { id: 'A1', name: 'Amplipuls kabina 1', group: 'Amplipuls', active: true },
    { id: 'A2', name: 'Amplipuls kabina 2', group: 'Amplipuls', active: true },
    { id: 'F1', name: 'Fonoforez kabina 1', group: 'Fonoforez', active: true },
    { id: 'F2', name: 'Fonoforez kabina 2', group: 'Fonoforez', active: true },
    { id: 'I1', name: 'İngalyasiya otağı 1', group: 'İngalyasiya', active: true },
    { id: 'I2', name: 'İngalyasiya otağı 2', group: 'İngalyasiya', active: true },
    { id: 'P1', name: 'Prosedur otağı', group: 'Prosedur', active: true },
    { id: 'H1', name: 'Hicama otaq 1', group: 'Hicamə', active: true },
    { id: 'D1', name: 'Terapevt otağı', group: 'Həkim otaqları', active: true },
    { id: 'D2', name: 'Kardioloq otağı', group: 'Həkim otaqları', active: true }
  ];

  // Elektraweb: Tanımlar → Hizmet Grupları (paid: ücretli grup mu)
  var serviceGroups = [
    { id: 'hg1', name: 'Ödənişsiz Müayinələr', paid: false },
    { id: 'hg2', name: 'Ödənişli Müayinələr', paid: true },
    { id: 'hg3', name: 'Prosedurlar Ödənişsiz', paid: false },
    { id: 'hg4', name: 'Prosedurlar Ödənişli', paid: true }
  ];

  // Elektraweb: Tanımlar → Hizmet Tanımları  (+ Hizmet-Mekan Eşleştirme = rooms)
  //   price         → Fiyat (AZN)
  //   duration      → Hizmet Süresi (dakika)
  //   prepBefore    → Masaj Öncesi Ön Hazırlık Süresi (dk)
  //   prepAfter     → Masaj Sonrası Ön Hazırlık Süresi (dk)
  //   secondStaffRequired → Spa Rezervasyonunda 2. Görevli Zorunlu
  //   after / notSameDayWith / genderMatch / perDay → YENİ alanlar (Elektraweb'de yok)
  var procedures = [
    { id: 'vanna', groups: ['hg3', 'hg4'], price: 25, name: 'Naftalan vannası', duration: 15, prepAfter: 10, rooms: ['V1', 'V2', 'V3', 'V4'] },
    { id: 'palciq', groups: ['hg3'], price: 20, name: 'Palçıq aplikasiyası', duration: 20, prepAfter: 10, secondStaffRequired: true, rooms: ['L1', 'L2'], notSameDayWith: ['vanna'] },
    { id: 'masaj', groups: ['hg3', 'hg4'], price: 30, name: 'Massaj', duration: 20, prepBefore: 5, rooms: ['M1', 'M2', 'M3'], after: [{ procedureId: 'vanna', minGap: 30 }] },
    { id: 'elektroforez', groups: ['hg3'], price: 15, name: 'Elektroforez', duration: 15, rooms: ['E1', 'E2', 'E3', 'A1', 'A2'] },
    { id: 'amplipuls', groups: ['hg4'], price: 15, name: 'Amplipuls', duration: 15, rooms: ['A1', 'A2'] },
    { id: 'fonoforez', groups: ['hg3'], price: 15, name: 'Fonoforez', duration: 15, rooms: ['F1', 'F2'] },
    { id: 'ingalyasiya', groups: ['hg3', 'hg4'], price: 10, name: 'İngalyasiya', duration: 12, rooms: ['I1', 'I2'] },
    { id: 'ozon', groups: ['hg4'], price: 40, name: 'Ozonterapiya', duration: 20, prepBefore: 5, rooms: ['P1'] },
    { id: 'terapevt', groups: ['hg1'], price: 0, name: 'Terapevt Müayinəsi', duration: 10, rooms: ['D1'] },
    { id: 'kardioloq', groups: ['hg1', 'hg2'], price: 20, name: 'Kardioloq Qəbulu', duration: 10, rooms: ['D2'] },
    { id: 'hicame', groups: ['hg4'], price: 35, name: 'Hicamə', duration: 30, prepAfter: 10, rooms: ['H1'], genderMatch: true, notSameDayWith: ['vanna'] }
  ];

  // Elektraweb: Tanımlar → Görevli Tanımları  (+ Hizmet-Görevli Eşleştirme = skills, Shift Tanımları = shift/daysOff)
  // daysOff: 0 = Pazar … 6 = Cumartesi
  var staff = [
    { id: 's1', name: 'Aysel Q.', gender: 'F', skills: ['vanna', 'palciq'], active: true },
    { id: 's2', name: 'Lalə R.', gender: 'F', skills: ['vanna', 'palciq'], active: true },
    { id: 's3', name: 'Ramin T.', gender: 'M', skills: ['vanna', 'palciq'], active: true },
    { id: 's4', name: 'Gülnar H.', gender: 'F', skills: ['masaj'], active: true },
    { id: 's11', name: 'Samir V.', gender: 'M', skills: ['masaj'], shift: { start: '12:00', end: '17:00' }, active: true },
    { id: 's5', name: 'Elvin S.', gender: 'M', skills: ['masaj'], daysOff: [0], active: true },
    { id: 's6', name: 'Nərmin A.', gender: 'F', skills: ['elektroforez', 'amplipuls', 'fonoforez', 'ingalyasiya'], active: true },
    { id: 's7', name: 'Tural B.', gender: 'M', skills: ['elektroforez', 'amplipuls', 'fonoforez'], active: true },
    { id: 's8', name: 'Səbinə K.', gender: 'F', skills: ['ingalyasiya'], active: true },
    { id: 's9', name: 'Dr. Fərid M.', gender: 'M', skills: ['ozon', 'hicame', 'terapevt', 'kardioloq'], active: true },
    { id: 's10', name: 'Dr. Könül İ.', gender: 'F', skills: ['ozon', 'hicame', 'terapevt'], shift: { start: '08:00', end: '13:00' }, active: true }
  ];

  var guests = [
    { id: 'g1', type: 'inhouse', name: 'Murad Əliyev', room: '204', gender: 'M', checkIn: '2026-10-12', checkOut: '2026-10-22' },
    { id: 'g2', type: 'inhouse', name: 'Leyla Həsənova', room: '118', gender: 'F', checkIn: '2026-10-12', checkOut: '2026-10-22' },
    { id: 'g3', type: 'inhouse', name: 'Orxan Quliyev', room: '305', gender: 'M', checkIn: '2026-10-12', checkOut: '2026-10-22' },
    { id: 'g4', type: 'inhouse', name: 'Sevinc Məmmədova', room: '221', gender: 'F', checkIn: '2026-10-13', checkOut: '2026-10-20' },
    { id: 'g5', type: 'inhouse', name: 'Kamran Rzayev', room: '112', gender: 'M', checkIn: '2026-10-12', checkOut: '2026-10-15' },
    // Arka plan misafirleri: takvimin dolu olduğunu göstermek için önceden planlanır
    { id: 'b1', name: 'Rəna Kərimova', room: '101', gender: 'F', checkIn: '2026-10-12', checkOut: '2026-10-22', background: true },
    { id: 'b2', name: 'Fuad Nəsirov', room: '102', gender: 'M', checkIn: '2026-10-12', checkOut: '2026-10-22', background: true },
    { id: 'b3', name: 'Günel Abbasova', room: '103', gender: 'F', checkIn: '2026-10-12', checkOut: '2026-10-22', background: true },
    { id: 'b4', name: 'Vüqar Hüseynov', room: '104', gender: 'M', checkIn: '2026-10-12', checkOut: '2026-10-22', background: true },
    { id: 'b5', name: 'Aytən Babayeva', room: '105', gender: 'F', checkIn: '2026-10-12', checkOut: '2026-10-22', background: true },
    { id: 'b6', name: 'Elşən Cəfərov', room: '106', gender: 'M', checkIn: '2026-10-12', checkOut: '2026-10-22', background: true },
    { id: 'b7', name: 'Nigar Səmədova', room: '107', gender: 'F', checkIn: '2026-10-12', checkOut: '2026-10-22', background: true },
    { id: 'b8', name: 'Rauf İsmayılov', room: '108', gender: 'M', checkIn: '2026-10-12', checkOut: '2026-10-22', background: true }
  ];

  // Doktorun yazdığı reçeteler (paid: ücretli mi)
  var prescriptions = {
    g1: [
      { procedureId: 'vanna', count: 8, paid: false },
      { procedureId: 'masaj', count: 6, paid: false },
      { procedureId: 'elektroforez', count: 5, paid: false },
      { procedureId: 'ingalyasiya', count: 5, paid: true },
      { procedureId: 'amplipuls', count: 3, paid: true },
      { procedureId: 'ozon', count: 3, paid: true }
    ],
    g2: [
      { procedureId: 'vanna', count: 8, paid: false },
      { procedureId: 'masaj', count: 6, paid: false },
      { procedureId: 'fonoforez', count: 5, paid: false },
      { procedureId: 'hicame', count: 1, paid: true }
    ],
    g3: [
      { procedureId: 'vanna', count: 6, paid: false },
      { procedureId: 'palciq', count: 4, paid: false },
      { procedureId: 'elektroforez', count: 5, paid: false },
      { procedureId: 'masaj', count: 5, paid: true }
    ],
    g4: [
      { procedureId: 'vanna', count: 6, paid: false },
      { procedureId: 'masaj', count: 6, paid: false },
      { procedureId: 'ingalyasiya', count: 4, paid: false }
    ],
    g5: [
      { procedureId: 'vanna', count: 5, paid: false },
      { procedureId: 'masaj', count: 3, paid: false }
    ],
    b1: [{ procedureId: 'vanna', count: 8 }, { procedureId: 'masaj', count: 6 }, { procedureId: 'elektroforez', count: 5 }],
    b2: [{ procedureId: 'vanna', count: 8 }, { procedureId: 'masaj', count: 6 }, { procedureId: 'ingalyasiya', count: 5 }],
    b3: [{ procedureId: 'vanna', count: 8 }, { procedureId: 'masaj', count: 6 }, { procedureId: 'fonoforez', count: 5 }],
    b4: [{ procedureId: 'vanna', count: 8 }, { procedureId: 'masaj', count: 6 }, { procedureId: 'elektroforez', count: 5 }],
    b5: [{ procedureId: 'vanna', count: 8 }, { procedureId: 'masaj', count: 6 }, { procedureId: 'ozon', count: 3 }],
    b6: [{ procedureId: 'vanna', count: 8 }, { procedureId: 'masaj', count: 6 }, { procedureId: 'ingalyasiya', count: 5 }],
    b7: [{ procedureId: 'vanna', count: 8 }, { procedureId: 'masaj', count: 6 }, { procedureId: 'elektroforez', count: 5 }],
    b8: [{ procedureId: 'vanna', count: 8 }, { procedureId: 'masaj', count: 6 }, { procedureId: 'fonoforez', count: 5 }]
  };


  // Elektraweb: Ürün Grupları
  var productGroups = [
    { id: 'ug1', name: 'Yağ', paid: true },
    { id: 'ug2', name: 'Krem', paid: true },
    { id: 'ug3', name: 'Naftalan Məhsulları', paid: true },
    { id: 'ug4', name: 'Diş Pastası', paid: true },
    { id: 'ug5', name: 'Plastır', paid: true },
    { id: 'ug6', name: 'Dərman Vasitələri', paid: true },
    { id: 'ug7', name: 'Ödənişsiz Nümunələr', paid: false }
  ];

  // Elektraweb: Ürün Tanımları (Ürün Grubu, Hizmet Adı, Fiyat, Gelir Grubu)
  var products = [
    { id: 'u1', groupId: 'ug1', name: 'Ağ neft 100 ml korobka', price: 15, income: 'APTEK', active: true },
    { id: 'u2', groupId: 'ug1', name: 'Naftalan yağı 250 ml', price: 28, income: 'APTEK', active: true },
    { id: 'u3', groupId: 'ug2', name: 'Naftalan kremi 50 ml', price: 12, income: 'APTEK', active: true },
    { id: 'u4', groupId: 'ug2', name: 'Naftalan balzamı 30 ml', price: 9, income: 'APTEK', active: true },
    { id: 'u5', groupId: 'ug3', name: 'Naftalan sabunu', price: 6, income: 'APTEK', active: true },
    { id: 'u6', groupId: 'ug3', name: 'Naftalan şampunu 200 ml', price: 14, income: 'APTEK', active: true },
    { id: 'u7', groupId: 'ug4', name: 'Naftalanlı diş pastası', price: 5, income: 'APTEK', active: true },
    { id: 'u8', groupId: 'ug5', name: 'Naftalan plastırı', price: 4, income: 'APTEK', active: true },
    { id: 'u9', groupId: 'ug6', name: 'Fastumgel', price: 4, income: 'APTEK', active: true },
    { id: 'u10', groupId: 'ug6', name: 'Festal', price: 1.6, income: 'APTEK', active: true },
    { id: 'u11', groupId: 'ug7', name: 'Naftalan kremi nümunə 10 ml', price: 3, income: 'APTEK', active: true },
    { id: 'u12', groupId: 'ug7', name: 'Naftalan sabunu nümunə', price: 2, income: 'APTEK', active: true }
  ];

  // Paket Tanımları: satıldığında reçeteye eklenen hizmetler (paket içi = ücretsiz seans)
  var packages = [
    { id: 'k1', name: 'Naftalan Standart (10 gün)', price: 450, days: 10, items: [{ procedureId: 'vanna', count: 8 }, { procedureId: 'masaj', count: 6 }, { procedureId: 'elektroforez', count: 5 }], active: true },
    { id: 'k2', name: 'Naftalan Light (7 gün)', price: 300, days: 7, items: [{ procedureId: 'vanna', count: 6 }, { procedureId: 'masaj', count: 4 }], active: true },
    { id: 'k3', name: 'Oynaq Proqramı (10 gün)', price: 520, days: 10, items: [{ procedureId: 'vanna', count: 6 }, { procedureId: 'palciq', count: 4 }, { procedureId: 'fonoforez', count: 5 }, { procedureId: 'masaj', count: 5 }], active: true }
  ];

  // Üyeler (kurgusal)
  var members = [
    { id: 'm1', card: 'ÜYE-1001', name: 'Tural Nəbiyev', gender: 'M', phone: '+994 50 000 00 01', active: true },
    { id: 'm2', card: 'ÜYE-1002', name: 'Aynur Qasımova', gender: 'F', phone: '+994 50 000 00 02', active: true },
    { id: 'm3', card: 'ÜYE-1003', name: 'Səməd Əhmədov', gender: 'M', phone: '+994 50 000 00 03', active: true }
  ];

  return {
    config: config,
    serviceGroups: serviceGroups,
    productGroups: productGroups,
    products: products,
    packages: packages,
    members: members,
    rooms: rooms,
    procedures: procedures,
    staff: staff,
    guests: guests,
    prescriptions: prescriptions,
    bookings: []
  };
});
