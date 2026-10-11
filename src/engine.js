/*
 * Elektraweb Medical – Otomatik Prosedür Planlama Motoru
 * ------------------------------------------------------
 * Bağımlılıksız, tarayıcıda ve Node.js'te çalışır.
 *
 * Her seans için üç koşulun AYNI ANDA sağlandığı en erken zamanı arar:
 *   1) Misafir boş mu?      (başka prosedürü yok, araya tampon süre bırakılır)
 *   2) Mekân boş mu?        (prosedürün yapılabildiği oda havuzundan biri boş)
 *   3) Personel boş mu?     (o hizmeti verebilen, vardiyada olan biri boş)
 * Ek kurallar: öğle arası, günlük limit, sıra kuralı (ör. vanna → 30 dk → masaj),
 * aynı gün yapılmayacak prosedürler, cinsiyet eşleşmesi, hazırlık süreleri, 2. görevli zorunluluğu.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MedicalEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULTS = {
    dayStart: '08:00',
    dayEnd: '17:00',
    stepMinutes: 5,
    breaks: [],
    guestBufferMinutes: 10,
    maxPerGuestPerDay: 5,
    planOnCheckoutDay: false
  };

  // Planlanamama nedenleri (arayüzde gösterilir)
  var REASONS = {
    stay: 'Konaklama süresi yetmedi (çıkış tarihine kadar uygun gün kalmadı)',
    guest: 'Misafir bu saatlerde başka bir prosedürde',
    room: 'Prosedürün yapıldığı odaların hepsi dolu',
    staff: 'Bu hizmeti verebilen personelin hepsi dolu',
    order: 'Sıra kuralı sağlanamadı (ör. vannadan sonra bekleme süresi)',
    guestDayLimit: 'Misafirin günlük prosedür sınırı doldu',
    perDay: 'Bu prosedür günde bir kez yapılabilir',
    sameDay: 'Aynı gün yapılamayan bir prosedürle çakışıyor',
    noStaff: 'Bu prosedürü yapabilen aktif personel tanımlı değil',
    noRoom: 'Bu prosedür için aktif mekân tanımlı değil (Hizmet-Mekan Eşleştirme)',
    inactive: 'Hizmet pasif durumda',
    dayOff: 'Bu prosedürü yapabilen personel o gün izinli'
  };

  // ---------- yardımcılar ----------
  function toMin(s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1]); }
  function toHHMM(m) { var h = Math.floor(m / 60), mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; }
  function addDays(d, n) { var t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  function weekday(d) { return new Date(d + 'T00:00:00Z').getUTCDay(); } // 0 = Pazar
  function overlaps(a1, a2, b1, b2) { return a1 < b2 && b1 < a2; }
  function indexBy(list) { var o = {}; (list || []).forEach(function (x) { o[x.id] = x; }); return o; }
  function maxDate(a, b) { return a > b ? a : b; }

  function makeContext(data) {
    var cfg = {};
    Object.keys(DEFAULTS).forEach(function (k) { cfg[k] = DEFAULTS[k]; });
    Object.keys(data.config || {}).forEach(function (k) { cfg[k] = data.config[k]; });
    return {
      cfg: cfg,
      procs: indexBy(data.procedures),
      rooms: indexBy(data.rooms),
      staff: (data.staff || []).filter(function (s) { return s.active !== false; }),
      guests: indexBy(data.guests),
      dayStart: toMin(cfg.dayStart),
      dayEnd: toMin(cfg.dayEnd),
      breaks: (cfg.breaks || []).map(function (b) { return { start: toMin(b.start), end: toMin(b.end) }; })
    };
  }

  // Elektraweb: "Masaj Öncesi / Sonrası Ön Hazırlık Süresi (dk)".
  // Hazırlık süresinde misafir serbesttir; oda ve personel ise meşguldür.
  function prepOf(ctx, procedureId) {
    var p = ctx.procs[procedureId] || {};
    return { before: p.prepBefore || 0, after: p.prepAfter || 0 };
  }
  function busyRange(ctx, b) {
    var pr = prepOf(ctx, b.procedureId);
    return [b.start - pr.before, b.end + pr.after];
  }
  function staffOf(b) { return b.staffId2 ? [b.staffId, b.staffId2] : [b.staffId]; }

  function staffCanDo(s, p, guest) {
    if ((s.skills || []).indexOf(p.id) < 0) return false;
    if (p.genderMatch && guest && guest.gender && s.gender !== guest.gender) return false;
    return true;
  }

  // Sıra kuralı: p, aynı gün b'den sonra mı gelmeli / b, p'den sonra mı gelmeli?
  function orderOk(ctx, p, start, end, b) {
    var i, r;
    var pAfter = p.after || [];
    for (i = 0; i < pAfter.length; i++) {
      r = pAfter[i];
      if (b.procedureId === r.procedureId && start < b.end + (r.minGap || 0)) return false;
    }
    var bp = ctx.procs[b.procedureId];
    var bAfter = (bp && bp.after) || [];
    for (i = 0; i < bAfter.length; i++) {
      r = bAfter[i];
      if (r.procedureId === p.id && b.start < end + (r.minGap || 0)) return false;
    }
    return true;
  }

  // Ön koşulu olan prosedürler (after) ön koşullarından SONRA yerleştirilir,
  // sonra en kıt kaynaklı olanlar önce gelir.
  function orderItems(ctx, items, guest) {
    var list = items.filter(function (i) { return i.count > 0 && ctx.procs[i.procedureId]; });
    function depth(pid, seen) {
      seen = seen || {};
      if (seen[pid]) return 0;
      seen[pid] = true;
      var p = ctx.procs[pid];
      var d = 0;
      (p.after || []).forEach(function (r) { d = Math.max(d, 1 + depth(r.procedureId, seen)); });
      return d;
    }
    function scarcity(pid) {
      var p = ctx.procs[pid];
      var st = ctx.staff.filter(function (s) { return staffCanDo(s, p, guest); }).length;
      return (p.rooms || []).length * st;
    }
    return list.slice().sort(function (a, b) {
      return depth(a.procedureId) - depth(b.procedureId) ||
        scarcity(a.procedureId) - scarcity(b.procedureId) ||
        b.count - a.count ||
        (a.procedureId < b.procedureId ? -1 : 1);
    });
  }

  function inBreak(ctx, start, end) {
    for (var i = 0; i < ctx.breaks.length; i++) if (overlaps(start, end, ctx.breaks[i].start, ctx.breaks[i].end)) return true;
    return false;
  }

  // Tek bir gün için en erken uygun saati bul
  function findOnDate(ctx, bookings, guest, p, date) {
    var cfg = ctx.cfg;
    var dayB = bookings.filter(function (b) { return b.date === date; });
    var guestB = dayB.filter(function (b) { return b.guestId === guest.id; });

    if (guestB.length >= cfg.maxPerGuestPerDay) return { reason: 'guestDayLimit' };
    var perDay = p.perDay || 1;
    if (guestB.filter(function (b) { return b.procedureId === p.id; }).length >= perDay) return { reason: 'perDay' };
    for (var i = 0; i < guestB.length; i++) {
      var other = ctx.procs[guestB[i].procedureId] || {};
      if ((p.notSameDayWith || []).indexOf(guestB[i].procedureId) >= 0 ||
          (other.notSameDayWith || []).indexOf(p.id) >= 0) return { reason: 'sameDay' };
    }

    var roomPool = (p.rooms || []).filter(function (rid) { return ctx.rooms[rid] && ctx.rooms[rid].active !== false; });
    if (!roomPool.length) return { reason: 'noRoom' };
    var wd = weekday(date);
    var staffPool = ctx.staff.filter(function (s) { return staffCanDo(s, p, guest); });
    if (!staffPool.length) return { reason: 'noStaff' };
    var working = staffPool.filter(function (s) { return (s.daysOff || []).indexOf(wd) < 0; });
    if (!working.length) return { reason: 'dayOff' };

    var buf = cfg.guestBufferMinutes;
    var pb = p.prepBefore || 0, pa = p.prepAfter || 0;
    var need = p.secondStaffRequired ? 2 : 1;   // Elektraweb: "Spa Rezervasyonunda 2. Görevli Zorunlu"
    var counts = {};
    for (var t = ctx.dayStart + pb; t + p.duration + pa <= ctx.dayEnd; t += cfg.stepMinutes) {
      var end = t + p.duration;
      var oS = t - pb, oE = end + pa;           // oda/personel meşguliyeti (hazırlık dahil)
      if (inBreak(ctx, oS, oE)) continue;

      var why = null;
      // 1) Misafir boş mu? (tampon süre dahil)
      for (var g = 0; g < guestB.length; g++) {
        if (overlaps(t - buf, end + buf, guestB[g].start, guestB[g].end)) { why = 'guest'; break; }
        if (!orderOk(ctx, p, t, end, guestB[g])) { why = 'order'; break; }
      }
      // 2) Mekân boş mu? (hazırlık süreleri dahil)
      var room = null;
      if (!why) {
        for (var r = 0; r < roomPool.length; r++) {
          var rid = roomPool[r];
          var busy = dayB.some(function (b) {
            var br = busyRange(ctx, b);
            return b.roomId === rid && overlaps(oS, oE, br[0], br[1]);
          });
          if (!busy) { room = rid; break; }
        }
        if (!room) why = 'room';
      }
      // 3) Personel boş mu? (vardiya + tek anda tek hizmet)
      var people = null;
      if (!why) {
        var free = working.filter(function (s) {
          var ss = s.shift ? toMin(s.shift.start) : ctx.dayStart;
          var se = s.shift ? toMin(s.shift.end) : ctx.dayEnd;
          if (oS < ss || oE > se) return false;
          return !dayB.some(function (b) {
            var br = busyRange(ctx, b);
            return staffOf(b).indexOf(s.id) >= 0 && overlaps(oS, oE, br[0], br[1]);
          });
        });
        if (free.length < need) why = 'staff';
        else {
          // Yükü en az olan personeli seç (iş yükü dengesi)
          free.sort(function (a, b) {
            var la = load(dayB, a.id), lb = load(dayB, b.id);
            return la - lb || (a.id < b.id ? -1 : 1);
          });
          people = free.slice(0, need);
        }
      }
      if (!why) {
        var slot = { date: date, start: t, end: end, roomId: room, staffId: people[0].id };
        if (need > 1) slot.staffId2 = people[1].id;
        return { slot: slot };
      }
      counts[why] = (counts[why] || 0) + 1;
    }
    var top = null;
    Object.keys(counts).forEach(function (k) { if (!top || counts[k] > counts[top]) top = k; });
    return { reason: top || 'guest' };
  }

  function load(dayB, staffId) {
    var m = 0;
    dayB.forEach(function (b) { if (staffOf(b).indexOf(staffId) >= 0) m += b.end - b.start; });
    return m;
  }

  /**
   * Misafirin reçetesini planlar.
   * @param data    { config, procedures, rooms, staff, guests, bookings }
   * @param request { guestId, fromDate?, items: [{ procedureId, count, paid }] }
   * @returns { sessions, unplaced, summary }
   */
  function plan(data, request) {
    var ctx = makeContext(data);
    var guest = ctx.guests[request.guestId];
    if (!guest) throw new Error('Misafir bulunamadı: ' + request.guestId);

    var bookings = (data.bookings || []).slice();
    var firstDate = maxDate(request.fromDate || guest.checkIn, guest.checkIn);
    var lastDate = ctx.cfg.planOnCheckoutDay ? guest.checkOut : addDays(guest.checkOut, -1);

    var sessions = [], unplaced = [];
    var items = orderItems(ctx, request.items || [], guest);

    items.forEach(function (item) {
      var p = ctx.procs[item.procedureId];
      var day = firstDate;
      for (var seq = 1; seq <= item.count; seq++) {
        var reasons = {}, found = null;
        if (p.active === false) {
          unplaced.push({ guestId: guest.id, procedureId: p.id, seq: seq, total: item.count, paid: !!item.paid, reasons: { inactive: 1 }, mainReason: 'inactive' });
          continue;
        }
        for (var d = day; d <= lastDate; d = addDays(d, 1)) {
          var res = findOnDate(ctx, bookings, guest, p, d);
          if (res.slot) { found = res.slot; break; }
          reasons[res.reason] = (reasons[res.reason] || 0) + 1;
        }
        if (found) {
          var s = {
            guestId: guest.id, procedureId: p.id, seq: seq, total: item.count,
            paid: !!item.paid, date: found.date, start: found.start, end: found.end,
            roomId: found.roomId, staffId: found.staffId
          };
          if (found.staffId2) s.staffId2 = found.staffId2;
          sessions.push(s);
          bookings.push(s);
          day = addDays(found.date, p.everyNDays || 1);
        } else {
          // Denenecek gün kalmadıysa neden: konaklama süresi
          if (!Object.keys(reasons).length) reasons.stay = 1;
          unplaced.push({ guestId: guest.id, procedureId: p.id, seq: seq, total: item.count, paid: !!item.paid, reasons: reasons, mainReason: mainReason(reasons) });
        }
      }
    });

    sessions.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start; });
    var requested = items.reduce(function (n, i) { return n + i.count; }, 0);
    return {
      guestId: guest.id,
      firstDate: firstDate,
      lastDate: lastDate,
      sessions: sessions,
      unplaced: unplaced,
      summary: { requested: requested, planned: sessions.length, unplaced: unplaced.length }
    };
  }

  function mainReason(reasons) {
    var top = null;
    Object.keys(reasons).forEach(function (k) {
      if (reasons[k] > 0 && (!top || reasons[k] > reasons[top])) top = k;
    });
    return top || 'stay';
  }

  /**
   * Bir rezervasyon listesindeki çakışmaları bulur (test ve doğrulama için).
   * Oda ve personel (hazırlık süreleri dahil) ile misafir çift kayıtlarını döndürür.
   */
  function findConflicts(data, bookings) {
    var ctx = makeContext(data);
    var out = [];
    for (var i = 0; i < bookings.length; i++) {
      for (var j = i + 1; j < bookings.length; j++) {
        var a = bookings[i], b = bookings[j];
        if (a.date !== b.date) continue;
        var ra = busyRange(ctx, a), rb = busyRange(ctx, b);
        if (a.roomId === b.roomId && overlaps(ra[0], ra[1], rb[0], rb[1]))
          out.push({ type: 'room', a: a, b: b });
        var shared = staffOf(a).some(function (x) { return staffOf(b).indexOf(x) >= 0; });
        if (shared && overlaps(ra[0], ra[1], rb[0], rb[1]))
          out.push({ type: 'staff', a: a, b: b });
        if (a.guestId === b.guestId && overlaps(a.start, a.end, b.start, b.end))
          out.push({ type: 'guest', a: a, b: b });
      }
    }
    return out;
  }

  return {
    plan: plan,
    findConflicts: findConflicts,
    REASONS: REASONS,
    DEFAULTS: DEFAULTS,
    util: { toMin: toMin, toHHMM: toHHMM, addDays: addDays, weekday: weekday, overlaps: overlaps }
  };
});
