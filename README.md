# Elektraweb Medical — Otomatik Prosedür Planlama Modülü (Demo)

Elektraweb SPA modülünü kullanan sanatoryumlar (ilk hedef: Naftalan tesisleri) için önerilen **Medical** ek modülünün çalışan demosu.
Bu repo, Elektraweb'in Azerbaycan bayisi tarafından modülün **nasıl çalışması gerektiğini** göstermek için hazırlanmıştır.
Arayüz Elektraweb'in kendi renk ve ekran düzenini kullanır. Sol menüde yalnızca **Medical** başlığı vardır.

> Tüm misafir, personel ve lab değerleri **kurgusaldır**. Demo hiçbir sunucuya bağlanmaz; veriler yalnızca tarayıcı belleğinde tutulur. Sayfa yenilenince ilk duruma döner.

## Çalıştırma

- **Tarayıcıda:** `index.html` dosyasını açın. Kurulum gerekmez.
- **GitHub Pages:** Settings → Pages → Branch: `main` / root. Demo `https://<kullanıcı>.github.io/Elektraweb-Medical/` adresinde açılır.
- **Testler:** `npm test` (Node.js 18+, ek paket gerekmez)

## Çözülen sorun

Bugünkü akış:

1. Misafir check-in yapar; SPA tarafında isim ve oda numarası otomatik gelir.
2. Tıbbi tarafta önce standart laboratuvar analizi ve kardiyogram alınır.
3. Sistem doktor atar. Doktor sonuçları inceler, gerekirse ücretli ek test ve prosedür yazar (adet, ücretli/ücretsiz).
4. Resepsiyon doktorun reçetesini görür. Ücretli hizmetler için misafirden onay alır ve hepsini odaya kapatır.
5. **Planlama ekranı açılır. Bu adımı Elektraweb bugün otomatik yapamıyor.**

Demoda adım 3 **Misafir Girişi (Toplu Satış)** ekranında, adım 4–5 **Rezervasyon Planlama** ekranında yapılır.

Mevcut "Oto. Rezervasyon Oluşturucu" tek personel ve tek mekân seçtiriyor. Çakışma olunca yalnızca kırmızı ✕ gösteriyor, uygun bir saat önermiyor.
Medical modülü her seans için şu **üç koşulun aynı anda** sağlandığı en erken saati otomatik bulur:

| # | Kontrol | Açıklama |
|---|---------|----------|
| 1 | **Misafir boş mu?** | Misafirin başka prosedürü yok. İki prosedür arasında geçiş süresi bırakılır. |
| 2 | **Mekân boş mu?** | Bir prosedür birden çok odada yapılabilir (ör. 4 vanna kabini); boş olan seçilir. |
| 3 | **Personel boş mu?** | Hizmeti verebilen, vardiyada olan ve o anda boş bir görevli bulunur. Görevli aynı anda tek hizmet verir. |

## Ekranlar (sol menü → Medical)

| Ekran | Ne yapar |
|-------|----------|
| **Misafir Girişi (Toplu Satış)** | Elektraweb Toplu Satış düzeni. En üstte misafir tipi: **Inhouse** (check-in yapmış, oda no ile), **Münferit** (dışarıdan gelen; yeni misafir buradan açılır), **Üye**. Sol tarafta **Hizmetler / Ürünler / Lab** başlıkları açılınca **Ücretli** ve **Ücretsiz** ana grupları ve onların altındaki gruplar gelir. Doktor kartlardan ekler; satırın ücretli/ücretsiz olması seçtiği gruptan gelir. **Kaydet**: hizmetler reçeteye gider (ücreti plan kaydedilince adisyona yazılır); lab testleri doktor isteği olarak yeni lab formuna yazılır; paket ve ürünler adisyona yazılır (inhouse: odaya kapat). **Kaydet ve Ödeme Al**: ödeme tipi seçilerek kapatılır. |
| **Rezervasyon Planlama** | *Oto. Planlama*: doktor reçetesi (adet, ücretli/ücretsiz) → **Otomatik Planla** → öneri → **Kaydet**. Ücretli seanslar için MEDICAL adisyonu açılır (inhouse ise odaya kapatılır). Yerleştirilemeyen seanslar gerekçesiyle gösterilir. *Rezervasyon Takvimi*: Elektraweb Spa takvimi düzeninde, görevli veya mekân sütunlarıyla; hazırlık süreleri ve öğle arası görünür. |
| **Rezervasyon Listesi** | Kayıtlı tüm seanslar; filtrelenebilir (Ücretli / Ücretsiz sekmeleri). |
| **Ürün Satışları** | Toplu Satış düzeninde ürün kataloğu ve sepet. APTEK adisyonu açar. |
| **Lab Sonuçları** | *Lab Test Sonuçları*: referans dışı değerler pembe ve ↑/↓ ile işaretlenir. *Lab Test Formları*: Yeni / İşlemde / Tamamlandı / İptal; değer girişi anında kontrol edilir. |
| **Adisyon Listesi** | Hizmet, ürün ve paket adisyonları; detay ve iptal. |
| **Paket Satışları** | Paket satılınca içindeki hizmetler reçeteye ücretsiz seans olarak eklenir, sonra otomatik planlanır. |
| **Raporlar** | Hizmet bazında seans, personel iş yükü, mekân doluluk, gelir özeti. |
| **Tanımlar** | Üç katalog alanı: **Hizmet** (Grupları, Tanımları), **Ürün** (Grupları, Tanımları), **Lab Test** (Grupları, Tanımları). Her grubun bir **Ana Grubu** vardır: Ücretli veya Ücretsiz. Tanım girerken seçilen grup, kaydın Toplu Satış'ta nerede görüneceğini belirler (Hizmetler › Ücretli Hizmetler › Prosedurlar Ödənişli gibi). Bir hizmet birden fazla gruba bağlanabilir (ör. vanna hem ücretli hem ücretsiz). Ayrıca **Planlama Tanımları**: Paket, Mekanlar, Görevli, Shift, Hizmet-Görevli ve Hizmet-Mekan Eşleştirme, Üye, Planlama Parametreleri. Planlama tanımları değişince takvim yeniden hesaplanır. |

## Elektraweb alanlarıyla eşleştirme

Veri modeli Elektraweb'in mevcut tanım ekranlarıyla birebir uyumludur. Yeni alanlar ayrıca belirtilmiştir.

| Elektraweb ekranı / alanı | Modüldeki alan | Not |
|---|---|---|
| Hizmet Tanımı → Hizmet Adı, Fiyat | `procedures[].name`, `price` | |
| Hizmet Tanımı → Hizmet Süresi (dakika) | `procedures[].duration` | |
| Hizmet Tanımı → Masaj Öncesi Ön Hazırlık Süresi (dk) | `procedures[].prepBefore` | Oda ve görevli meşgul, misafir serbest |
| Hizmet Tanımı → Masaj Sonrası Ön Hazırlık Süresi (dk) | `procedures[].prepAfter` | Ör. vanna temizliği |
| Hizmet Tanımı → Spa Rezervasyonunda 2. Görevli Zorunlu | `procedures[].secondStaffRequired` | İki boş görevli bulunmadan seans verilmez |
| Hizmet Tanımı → Spa Aktif | `procedures[].active` | |
| Mekanlar ve Masaj Odaları | `rooms[]` | |
| Hizmet-Mekan Eşleştirme | `procedures[].rooms` | Bir hizmet birden çok mekânda yapılabilir |
| Görevli Tanımları | `staff[]` | |
| Hizmet-Görevli Eşleştirme | `staff[].skills` | |
| Shift Tanımları | `staff[].shift`, `staff[].daysOff` | |
| Ürün Tanımları | `products[]` | |
| CRM → Lab Testleri (Gruplar, Tanımlar, Formlar, Sonuçlar) | `data/lab-data.js` | |
| — | `after[{procedureId, minGap}]` | **Yeni:** sıra kuralı (ör. masaj, vannadan en az 30 dk sonra) |
| — | `notSameDayWith[]` | **Yeni:** aynı gün yapılmayacak hizmetler |
| — | `genderMatch` | **Yeni:** görevli cinsiyeti misafirle aynı (ör. hicamə) |
| — | `config.*` | **Yeni:** çalışma saatleri, öğle arası, geçiş süresi, günlük sınır |

## Planlama algoritması (`src/engine.js`)

1. Reçetedeki her hizmet, adedi kadar seansa açılır.
2. Sıra kuralı olan hizmetler, ön koşul hizmetinden **sonra** yerleştirilir. Sonra **en kıt kaynaklı** hizmetler önce gelir (mekân × görevli sayısı en az olan).
3. Her seans için başlangıç tarihinden çıkış gününe kadar günler, gün içinde de saatler sırayla denenir (varsayılan 5 dk aralık). Gün koşulları: günlük sınır, aynı prosedür günde 1 kez, aynı gün kuralı, görevli izni. Saat koşulları: öğle arası, misafir + geçiş süresi, sıra kuralı, mekân (hazırlık dahil), görevli (vardiya ve hazırlık dahil).
4. Uygun görevliler arasından o gün **iş yükü en az** olan seçilir.
5. Aynı hizmetin seansları ardışık günlere yayılır.
6. Yerleşemeyen seans için en sık karşılaşılan engel döndürülür (ör. "Prosedürün yapıldığı odaların hepsi dolu").

Motor deterministiktir: aynı girdi her zaman aynı planı üretir. Bağımlılığı yoktur; tarayıcıda ve Node.js'te çalışır. Elektraweb tarafında aynı mantık C#/SQL'e doğrudan taşınabilir.

```js
const plan = MedicalEngine.plan(data, {
  guestId: 'g1',
  fromDate: '2026-10-12',
  items: [{ procedureId: 'vanna', count: 8, paid: false }, { procedureId: 'ozon', count: 3, paid: true }]
});
// plan.sessions  → [{ date, start, end, roomId, staffId, staffId2?, paid, seq, total }]
// plan.unplaced  → [{ procedureId, seq, mainReason }]
```

## Test senaryoları (`tests/engine.test.js`, 19 test)

Mekân havuzu (boş olan 4. kabin seçilir) · tüm kabinler doluysa ilk boşalan saat · tek personelin aynı anda tek hizmet vermesi · misafirin kendi prosedürü + geçiş süresi · öğle arası · sıra kuralı (vanna → 30 dk → masaj) · aynı gün kuralı · cinsiyet eşleşmesi · ardışık günlere dağılım · konaklama süresinin yetmemesi · günlük sınır · personel izni · vardiya · hazırlık süreleri · 2. görevli zorunluluğu · pasif kayıtlar · 13 misafirlik tam demoda sıfır çakışma · deterministik sonuç.

## Dosya yapısı

```
index.html          Demo uygulaması (Elektraweb düzeni)
assets/style.css    Elektraweb arayüz stilleri
assets/app.js       Ekranlar
src/engine.js       Planlama motoru (bağımsız, test edilebilir)
data/demo-data.js   Tesis tanımları ve örnek misafirler (kurgusal)
data/lab-data.js    Lab grupları, testler, formlar (kurgusal)
tests/              Motor testleri
```

## Elektraweb'e entegrasyon önerisi

- Modül, **Toplu Satış → Kaydet** ile **Oto. Rezervasyon Oluşturucu** arasına girer. Doktor reçetesini okur, önerilen planı Spa rezervasyonu olarak yazar.
- Mevcut SPA modülünün değişmesi gerekmez. Hizmet, Mekan, Görevli, Eşleştirme ve Shift tabloları olduğu gibi okunur. Yeni kurallar ayrı tabloda tutulabilir.
- Sonraki adımlar: doktor atama ekranı, kardiyogram kaydı, öneri üzerinde sürükle-bırak düzeltme, ücretli hizmet için misafir onay kaydı.

## Lisans

MIT
