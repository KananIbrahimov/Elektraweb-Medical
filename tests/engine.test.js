// Çalıştırma: npm test   (Node.js 18+, ek paket gerekmez)
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine');
const DEMO = require('../data/demo-data');

const m = E.util.toMin;
const clone = (x) => JSON.parse(JSON.stringify(x));

// Küçük, elle kontrol edilebilir test tesisi
function fixture(over = {}) {
  const base = {
    config: { dayStart: '08:00', dayEnd: '17:00', stepMinutes: 5, breaks: [{ start: '13:00', end: '14:00' }], guestBufferMinutes: 10, maxPerGuestPerDay: 5 },
    rooms: [{ id: 'V1' }, { id: 'V2' }, { id: 'V3' }, { id: 'V4' }, { id: 'M1' }, { id: 'P1' }],
    procedures: [
      { id: 'vanna', duration: 15, rooms: ['V1', 'V2', 'V3', 'V4'] },
      { id: 'masaj', duration: 20, rooms: ['M1'], after: [{ procedureId: 'vanna', minGap: 30 }] },
      { id: 'hicame', duration: 30, rooms: ['P1'], genderMatch: true, notSameDayWith: ['vanna'] }
    ],
    staff: [
      { id: 'a', gender: 'F', skills: ['vanna'] },
      { id: 'b', gender: 'M', skills: ['vanna'] },
      { id: 'c', gender: 'F', skills: ['vanna'] },
      { id: 'd', gender: 'M', skills: ['vanna'] },
      { id: 'mas', gender: 'F', skills: ['masaj'] },
      { id: 'drM', gender: 'M', skills: ['hicame'] },
      { id: 'drF', gender: 'F', skills: ['hicame'] }
    ],
    guests: [
      { id: 'x', gender: 'M', checkIn: '2026-10-12', checkOut: '2026-10-22' },
      { id: 'y', gender: 'F', checkIn: '2026-10-12', checkOut: '2026-10-22' },
      { id: 'z', gender: 'M', checkIn: '2026-10-12', checkOut: '2026-10-14' }
    ],
    bookings: []
  };
  return Object.assign(base, over);
}
const busy = (o) => Object.assign({ guestId: 'other', date: '2026-10-12' }, o, { start: m(o.start), end: m(o.end) });

test('Temel: tüm seanslar planlanır ve hiç çakışma olmaz', () => {
  const d = fixture();
  const r = E.plan(d, { guestId: 'x', items: [{ procedureId: 'vanna', count: 5 }, { procedureId: 'masaj', count: 3 }] });
  assert.equal(r.summary.planned, 8);
  assert.equal(r.unplaced.length, 0);
  assert.deepEqual(E.findConflicts(d, r.sessions), []);
});

test('Mekân havuzu: 3 kabina doluysa boş olan 4. kabina seçilir', () => {
  const d = fixture({
    bookings: [
      busy({ procedureId: 'vanna', roomId: 'V1', staffId: 'a', start: '08:00', end: '08:15' }),
      busy({ procedureId: 'vanna', roomId: 'V2', staffId: 'b', start: '08:00', end: '08:15' }),
      busy({ procedureId: 'vanna', roomId: 'V3', staffId: 'c', start: '08:00', end: '08:15' })
    ]
  });
  const s = E.plan(d, { guestId: 'x', items: [{ procedureId: 'vanna', count: 1 }] }).sessions[0];
  assert.equal(s.start, m('08:00'));
  assert.equal(s.roomId, 'V4');
  assert.equal(s.staffId, 'd');
});

test('Mekân dolu: 4 kabina da doluysa ilk boşalan saate kayar', () => {
  const d = fixture({
    bookings: ['V1', 'V2', 'V3', 'V4'].map((r, i) => busy({ procedureId: 'vanna', roomId: r, staffId: 'abcd'[i], start: '08:00', end: '08:30' }))
  });
  const s = E.plan(d, { guestId: 'x', items: [{ procedureId: 'vanna', count: 1 }] }).sessions[0];
  assert.equal(s.start, m('08:30'));
});

test('Personel: oda boş olsa da personel tek anda tek hizmet verir', () => {
  const d = fixture({
    staff: [{ id: 'a', skills: ['vanna'] }, { id: 'mas', skills: ['masaj'] }],
    bookings: [busy({ procedureId: 'vanna', roomId: 'V1', staffId: 'a', start: '08:00', end: '08:15' })]
  });
  const s = E.plan(d, { guestId: 'x', items: [{ procedureId: 'vanna', count: 1 }] }).sessions[0];
  assert.equal(s.start, m('08:15'), 'V2-V4 boş ama tek personel 08:15e kadar dolu');
  assert.notEqual(s.roomId, undefined);
});

test('Misafir: kendi başka prosedürü + 10 dk geçiş süresi bloklanır', () => {
  const d = fixture({
    bookings: [busy({ guestId: 'x', procedureId: 'hicame', roomId: 'P1', staffId: 'drM', start: '08:00', end: '08:30', date: '2026-10-12' })],
    procedures: fixture().procedures.map((p) => (p.id === 'hicame' ? Object.assign({}, p, { notSameDayWith: [] }) : p))
  });
  const s = E.plan(d, { guestId: 'x', items: [{ procedureId: 'vanna', count: 1 }] }).sessions[0];
  assert.equal(s.start, m('08:40'));
});

test('Öğle arası: hiçbir seans 13:00–14:00 ile kesişmez', () => {
  const d = fixture({ staff: [{ id: 'a', skills: ['vanna'] }], rooms: [{ id: 'V1' }] });
  d.procedures[0].rooms = ['V1'];
  // 08:00–13:00 arası dolu → seans 14:00'e kaymalı
  d.bookings = [busy({ procedureId: 'vanna', roomId: 'V1', staffId: 'a', start: '08:00', end: '12:50' })];
  const s = E.plan(d, { guestId: 'x', items: [{ procedureId: 'vanna', count: 1 }] }).sessions[0];
  assert.equal(s.date, '2026-10-12');
  assert.equal(s.start, m('14:00'));
});

test('Sıra kuralı: masaj, aynı günkü vannadan en az 30 dk sonra başlar', () => {
  const d = fixture();
  const r = E.plan(d, { guestId: 'x', items: [{ procedureId: 'masaj', count: 3 }, { procedureId: 'vanna', count: 3 }] });
  for (const mas of r.sessions.filter((s) => s.procedureId === 'masaj')) {
    const v = r.sessions.find((s) => s.procedureId === 'vanna' && s.date === mas.date);
    assert.ok(v, 'aynı gün vanna var');
    assert.ok(mas.start >= v.end + 30, `masaj ${mas.start} ≥ vanna bitişi ${v.end} + 30`);
  }
});

test('Aynı gün kuralı: hicamə, vanna olan günlere konmaz', () => {
  const d = fixture();
  const r = E.plan(d, { guestId: 'x', items: [{ procedureId: 'vanna', count: 3 }, { procedureId: 'hicame', count: 1 }] });
  const vDays = r.sessions.filter((s) => s.procedureId === 'vanna').map((s) => s.date);
  const h = r.sessions.find((s) => s.procedureId === 'hicame');
  assert.ok(h);
  assert.ok(!vDays.includes(h.date));
});

test('Cinsiyet eşleşmesi: erkek misafire erkek, kadın misafire kadın personel', () => {
  const d = fixture();
  assert.equal(E.plan(d, { guestId: 'x', items: [{ procedureId: 'hicame', count: 1 }] }).sessions[0].staffId, 'drM');
  assert.equal(E.plan(d, { guestId: 'y', items: [{ procedureId: 'hicame', count: 1 }] }).sessions[0].staffId, 'drF');
});

test('Dağıtım: aynı prosedür günde bir kez, ardışık günlere yayılır', () => {
  const d = fixture();
  const days = E.plan(d, { guestId: 'x', items: [{ procedureId: 'vanna', count: 5 }] }).sessions.map((s) => s.date);
  assert.deepEqual(days, ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']);
});

test('Konaklama süresi: çıkış gününe kadar sığmayan seanslar gerekçeyle döner', () => {
  const d = fixture();
  const r = E.plan(d, { guestId: 'z', items: [{ procedureId: 'vanna', count: 4 }] });
  assert.equal(r.summary.planned, 2); // 12 ve 13 Ekim; 14 Ekim çıkış günü
  assert.equal(r.unplaced.length, 2);
  assert.equal(r.unplaced[0].mainReason, 'stay');
});

test('Günlük sınır: misafire günde en fazla N prosedür', () => {
  const d = fixture({ config: Object.assign({}, fixture().config, { maxPerGuestPerDay: 1 }) });
  const r = E.plan(d, { guestId: 'x', items: [{ procedureId: 'vanna', count: 2 }, { procedureId: 'hicame', count: 2 }] });
  const perDay = {};
  r.sessions.forEach((s) => (perDay[s.date] = (perDay[s.date] || 0) + 1));
  assert.ok(Object.values(perDay).every((n) => n <= 1));
});

test('Personel izni: izinli günde o personele iş verilmez', () => {
  const d = fixture({ staff: [{ id: 'a', skills: ['vanna'], daysOff: [1] }] }); // 2026-10-12 Pazartesi
  const s = E.plan(d, { guestId: 'x', items: [{ procedureId: 'vanna', count: 1 }] }).sessions[0];
  assert.equal(s.date, '2026-10-13');
});

test('Vardiya: vardiyası 13:00de biten personel öğleden sonra planlanmaz', () => {
  const d = fixture();
  const r = E.plan(Object.assign(d, { staff: [{ id: 'k', skills: ['vanna'], shift: { start: '08:00', end: '09:00' } }] }),
    { guestId: 'x', items: [{ procedureId: 'vanna', count: 1 }] });
  assert.ok(r.sessions[0].end <= m('09:00'));
});

test('Tam demo: 13 misafir sırayla planlanır, tek bir çakışma bile oluşmaz', () => {
  const d = clone(DEMO);
  for (const g of d.guests) {
    const r = E.plan(d, { guestId: g.id, items: d.prescriptions[g.id] });
    d.bookings.push(...r.sessions);
  }
  assert.ok(d.bookings.length > 150);
  assert.deepEqual(E.findConflicts(d, d.bookings), []);
  // öğle arası ve çalışma saatleri dışında seans yok
  for (const b of d.bookings) {
    assert.ok(b.start >= m('08:00') && b.end <= m('17:00'));
    assert.ok(!(b.start < m('14:00') && b.end > m('13:00')));
  }
});

test('Deterministik: aynı girdi her zaman aynı planı üretir', () => {
  const a = E.plan(clone(DEMO), { guestId: 'g1', items: DEMO.prescriptions.g1 });
  const b = E.plan(clone(DEMO), { guestId: 'g1', items: DEMO.prescriptions.g1 });
  assert.deepEqual(a, b);
});

test('Hazırlık süresi: sonrası hazırlık bitmeden aynı oda/personel kullanılmaz', () => {
  const d = fixture({ staff: [{ id: 'a', skills: ['vanna'] }], rooms: [{ id: 'V1' }] });
  d.procedures[0] = { id: 'vanna', duration: 15, prepAfter: 10, rooms: ['V1'] };
  d.bookings = [busy({ procedureId: 'vanna', roomId: 'V1', staffId: 'a', start: '08:00', end: '08:15' })];
  const s = E.plan(d, { guestId: 'x', items: [{ procedureId: 'vanna', count: 1 }] }).sessions[0];
  assert.equal(s.start, m('08:25'));
});

test('2. görevli zorunlu: iki boş personel bulunmadan seans verilmez', () => {
  const d = fixture({ staff: [{ id: 'a', skills: ['vanna'] }, { id: 'b', skills: ['vanna'] }] });
  d.procedures[0] = { id: 'vanna', duration: 15, secondStaffRequired: true, rooms: ['V1', 'V2'] };
  d.bookings = [busy({ procedureId: 'vanna', roomId: 'V1', staffId: 'a', start: '08:00', end: '08:15' })];
  const s = E.plan(d, { guestId: 'x', items: [{ procedureId: 'vanna', count: 1 }] }).sessions[0];
  assert.equal(s.start, m('08:15'), 'V2 boş, b boş ama a dolu → 08:15');
  assert.deepEqual([s.staffId, s.staffId2].sort(), ['a', 'b']);
});

test('Pasif kayıtlar: pasif mekân ve personel kullanılmaz, pasif hizmet planlanmaz', () => {
  const d = fixture();
  d.rooms = d.rooms.map((r) => (['V1', 'V2', 'V3'].includes(r.id) ? Object.assign({}, r, { active: false }) : r));
  d.staff = d.staff.map((s) => (s.id === 'a' ? Object.assign({}, s, { active: false }) : s));
  const s = E.plan(d, { guestId: 'x', items: [{ procedureId: 'vanna', count: 1 }] }).sessions[0];
  assert.equal(s.roomId, 'V4');
  assert.notEqual(s.staffId, 'a');
  d.procedures[0].active = false;
  const r = E.plan(d, { guestId: 'x', items: [{ procedureId: 'vanna', count: 2 }] });
  assert.equal(r.unplaced.length, 2);
  assert.equal(r.unplaced[0].mainReason, 'inactive');
});
