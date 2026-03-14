# FlowDock Logistics Demo - Proje Dokumantasyonu

## 1. Genel Bakis

Bu proje, kurumsal lojistik sevkiyat operasyonunu rol bazli ekranlarla yoneten bir React + TypeScript tek sayfa uygulamasidir.

Uygulama gercek bir backend'e bagli degildir. Tum veri akisi tarayici tarafinda calisan Zustand store uzerinden yurur ve baslangic verisi mock senaryolardan uretilir. Amac, sevkiyat yasam dongusunu talep acilisindan muhurlu cikisa kadar tek bir panelde gostermek ve surecin state-machine mantigiyla kontrol edildigini ispatlamaktir.

Bu nedenle urun, su an icin bir demo/prototip seviyesindedir:

- Rol bazli operasyon ekranlari vardir.
- Surec gecisleri kurallidir.
- Audit log, status history ve bildirim uretimi vardir.
- Veriler tarayicida kalici tutulur.
- Gercek kimlik dogrulama, API, veritabani ve sunucu tarafi yetkilendirme yoktur.

## 2. Urun Ne Yapiyor?

Uygulama bir sevkiyat kaydini asagidaki operasyon adimlarindan gecirir:

1. Talep olusturma
2. Tedarikcinin talebi incelemesi
3. Arac ve sofor bilgisinin girilmesi
4. Kontrol ekibinin onay/red karari
5. Rampa planlama
6. Arac gelis ve saha giris islemleri
7. Yukleme baslangici
8. Muhur ve cikis kapanisi
9. Gecmis, raporlama ve yonetim gorunumu

Temel farki, her rolun yalnizca kendi isiyle ilgili ekrani gormesidir. Boylece kullanicilar genis bir ERP yerine sadelestirilmis operasyon panelleriyle calisir.

## 3. Teknoloji Yigini

- `React 19`
- `TypeScript`
- `Vite`
- `React Router DOM`
- `Zustand` ve `persist` middleware
- `date-fns`
- `lucide-react`
- `clsx`

Uygulama giris noktasi `src/main.tsx` dosyasinda kuruludur ve ana router `src/app/App.tsx` icinde tanimlanir.

## 4. Uygulama Tipi ve Calisma Modeli

Bu proje klasik cok sayfali bir web sitesi degildir. Tarayici icinde calisan, route tabanli bir operasyon panelidir.

One cikan teknik ozellikler:

- Tum route'lar istemci tarafinda yonetilir.
- Yetki kontrolu `ProtectedPage` bileseni ile yapilir.
- Oturum bilgisi ve tum demo veri `localStorage` uzerinde saklanir.
- Store anahtari `flowdock-logistics-demo` ismidir.
- Sayfa yenilense bile veri ve oturum korunur.
- Sol menu'deki "Demo veriyi sifirla" butonu tum veri setini seed'e geri dondurur.

## 5. Roller

Sistemde 7 rol vardir:

| Rol anahtari | Is anlami | Ana ekran |
| --- | --- | --- |
| `requester` | Talep acan firma | `/talep-olustur` |
| `supplier` | Tedarik / lojistik | `/tedarik-atama` |
| `control` | Ana firma kontrol yetkilisi | `/arac-kontrol` |
| `ramp` | Rampa planlama | `/rampa-planlama` |
| `gate` | Kapi / saha operasyonu | `/kapi-operasyonu` |
| `loading` | Yukleme tamamlama | `/yukleme-tamamlama` |
| `admin` | Yonetici | `/dashboard` |

Rol tanimlari ve izin listeleri `src/domain/constants.ts` icinde tutulur.

## 6. Route Haritasi

Uygulamadaki ana ekranlar:

| Route | Amac | Erisim |
| --- | --- | --- |
| `/login` | Demo giris ekrani | Herkes |
| `/dashboard` | KPI ve operasyon ozeti | Tum roller |
| `/talep-olustur` | Yeni sevkiyat talebi | `requester`, `admin` |
| `/talepler` | Filtrelenebilir sevkiyat listesi | Tum roller |
| `/tedarik-atama` | Arac ve sofor atama | `supplier`, `admin` |
| `/arac-kontrol` | Onay / red kontrol ekrani | `control`, `admin` |
| `/rampa-planlama` | Rampa atama ekrani | `ramp`, `admin` |
| `/kapi-operasyonu` | Gelis, giris, rampaya alma, yukleme baslangici | `gate`, `admin` |
| `/yukleme-tamamlama` | Muhur ve kapanis | `loading`, `admin` |
| `/gecmis` | Tamamlanan / reddedilen / iptal edilen kayitlar | Tum roller |
| `/raporlar` | KPI ve performans raporlari | `admin` |
| `/yonetim` | Firma, kullanici, rampa, rol matrisi | `admin` |

## 7. Kullanici Akislari

### 7.1 Login

Login ekraninda iki yontem vardir:

- E-posta + sifre ile giris
- Rol karti uzerinden tek tik demo giris

Demo sifresi sabit olarak `demo123` degeridir.

Onemli not: Store baslangicta admin oturumu ile baslatildigi icin ilk acilista kullanici dogrudan dashboard'a dusebilir. `logout` yapilirse login ekrani gorunur.

### 7.2 Talep Olusturma

Talep olusturma ekrani asagidaki alanlari toplar:

- Lokasyon
- Arac tipi
- Talep tarihi
- Yukleme tarihi
- Saat
- Tedarikci firma
- Miktar bilgisi
- Urun/yuk bilgisi
- Notlar

Kaydetme sonrasi sistem:

- Yeni `ShipmentRequest` uretir
- Kaydi listeye ekler
- `REQUEST_CREATED` gecmis kaydi yazar
- Hemen ardindan `SENT_TO_SUPPLIER` durumuna gecirir
- Tedarikci rolune bildirim uretir

### 7.3 Tedarikci Atama

Tedarikci ekraninda bekleyen talepler listelenir. Kullanici:

- Talebi incelemeye alabilir
- Cekici/dorse plakasi girebilir
- Sofor adi, soyadi, telefonu girebilir
- Talebi reddedebilir

Bu adimda plaka ve telefon dogrulamasi yapilir. Gecerli veri girildiginde durum `VEHICLE_ASSIGNED` olur ve kontrol ekibine bildirim gonderilir.

### 7.4 Arac Kontrol

Kontrol rolu, talep baglamini ve tedarikci tarafindan girilen araci yan yana gorur.

Kararlar:

- Onay: `APPROVED`
- Red: `REJECTED`

Onay verildiginde rampa planlama ekibine bildirim gider.

### 7.5 Rampa Planlama

Onaylanan araclar icin rampa secilir.

Kurallar:

- Sadece aktif rampalar secilebilir.
- Ayni tarih, ayni saat ve ayni rampa icin cift atama engellenir.
- Atama sonrasi kayit `RAMP_PLANNED` olur.

### 7.6 Kapi ve Saha Operasyonu

Kapi ekrani dort hizli aksiyon sunar:

- `arrive` -> `ARRIVED`
- `admit` -> `ADMITTED`
- `takeToRamp` -> `AT_RAMP`
- `startLoading` -> `LOADING`

Bu gecisler siraya baglidir. Bir adim atlanamaz.

### 7.7 Yukleme Tamamlama

`LOADING` durumundaki araclar icin muhur numarasi girilir.

Bu aksiyon tek seferde asagidaki zinciri yurutur:

- `LOADED`
- `SEALED`
- `EXITED`
- `COMPLETED`

Muhur numarasi bos birakilirsa kapanis yapilamaz.

### 7.8 Gecmis

Gecmis ekrani yalnizca terminal duruma gelen kayitlari gosterir:

- `COMPLETED`
- `REJECTED`
- `CANCELLED`

Bu ekran ayrica CSV export ozelligi icerir.

### 7.9 Raporlar

Admin icin KPI ekrani saglar:

- Toplam talep
- Tamamlanan sevkiyat
- Reddedilen sevkiyat
- Ortalama onay suresi
- Ortalama saha gelis suresi
- Ortalama yukleme suresi
- Firma bazli performans
- Lokasyon yogunlugu
- Rampa kullanim sayilari

### 7.10 Yonetim

Admin ekraninda:

- Firma listesi
- Rampa listesi
- Kullanici listesi
- Rol matrisi

gosterilir ve bazi aktif/pasif toggle islemleri yapilabilir.

## 8. State Machine

Ana statu zinciri:

`REQUEST_CREATED -> SENT_TO_SUPPLIER -> SUPPLIER_REVIEWING -> VEHICLE_ASSIGNED -> IN_CONTROL -> APPROVED -> RAMP_PLANNED -> ARRIVED -> ADMITTED -> AT_RAMP -> LOADING -> LOADED -> SEALED -> EXITED -> COMPLETED`

Yan dallar:

- `REJECTED`
- `CANCELLED`

Gecis kurallari `src/domain/workflow.ts` ve store icindeki aksiyonlar tarafindan uygulanir.

Onemli kural ornekleri:

- Rampa atanmadan arac rampaya alinamaz.
- `LOADING` statusunde olmayan kayit kapanamaz.
- Muhur numarasi olmadan kapanis yapilamaz.
- Eksik plaka veya sofor bilgisiyle onaya gonderim yapilamaz.
- Her kritik degisiklik hem status history hem audit log yazar.

## 9. Veri Gorunurlugu

Kullanici hangi kayitlari gorur sorusu selector katmaninda cozulur:

- `admin`: tum talepler
- `requester`: kendi sirketinin talepleri
- `supplier`: kendi sirketine atanmis talepler
- diger roller: kendi sirketinin talep actigi kayitlar

Bu tasarim demo icin yeterlidir; cok sirketli ana firma senaryolarinda gorunurluk kurali daha gelismis hale getirilmelidir.

## 10. Veri Modeli

Ana domain nesneleri:

- `Company`
- `Role`
- `User`
- `Location`
- `Ramp`
- `ShipmentRequest`
- `VehicleAssignment`
- `RampAssignment`
- `GateOperation`
- `LoadingOperation`
- `AuditLog`
- `StatusHistory`
- `NotificationItem`

Bu yapi sayesinde sevkiyat kaydi ile operasyon izi birbirinden ayrilmistir:

- Ana is kaydi: `ShipmentRequest`
- Arac bilgisi: `VehicleAssignment`
- Saha hareketleri: `GateOperation`
- Yukleme kapanisi: `LoadingOperation`
- Izlenebilirlik: `AuditLog`, `StatusHistory`

## 11. Store ve Veri Akisi

Merkezi store `src/store/app-store.ts` dosyasinda yer alir.

Store sorumluluklari:

- Oturum yonetimi
- Demo veriyi baslatma ve sifirlama
- Tum is aksiyonlarini yurutme
- Bildirim uretimi
- Audit log uretimi
- Status history uretimi
- Firma/kullanici/rampa toggle islemleri

Mutasyonlar `withMutation` yardimci fonksiyonu uzerinden yurur. Bu yaklasim:

- Store verisinin `structuredClone` ile kopyalanmasini
- aktif kullanicinin dogrulanmasini
- hatalarin `OperationResult` olarak UI'a donmesini

saglar.

## 12. Selector Katmani

Selector katmani `src/domain/selectors.ts` icinde yer alir ve UI bilesenlerini store detayindan ayirir.

Baslica selector'lar:

- `getVisibleRequests`
- `getShipmentDetail`
- `getNotificationsForUser`
- `getDashboardMetrics`
- `getPipelineCounts`
- `getDelayedRequests`
- `getRampOccupancy`
- `getAverageDurations`
- `getCompanyPerformance`
- `getLocationIntensity`
- `getRampUsage`

Bu sayede sayfalar ham store uzerinde islem yapmak yerine hazir okunabilir veri ile calisir.

## 13. Mock Veri ve Seed Yapisi

Baslangic veri seti `src/data/seed.ts` uzerinden uretilir.

Seed kapsami:

- 4 sirket
- 7 rol
- 9 kullanici
- 3 lokasyon
- 6 rampa
- 14 senaryo tabanli sevkiyat kaydi
- ek bildirim kayitlari

Senaryolar uc ayri dosyada organize edilmistir:

- `src/data/scenarios-a.ts`
- `src/data/scenarios-b.ts`
- `src/data/scenarios-c.ts`

Bu yapi, farkli asamalarda bekleyen kayitlar olusturarak demo sirasinda her ekranin dolu gorunmesini saglar.

## 14. Arayuz Tasarimi

UI yaklasimi operasyon paneli odaklidir:

- Sol sabit sidebar
- Ust bilgi cubugu
- Kart tabanli duzen
- Yogun veri icin tablo gorunumu
- Sagdan acilan detay cekmecesi
- Buyuk aksiyon butonlari
- Acik zeminli kurumsal tema

Tasarim sistemi `src/components/ui.tsx` icinde basit primitive bilesenlerle kurulmustur.

Stil ozellikleri:

- Font: `IBM Plex Sans` ve `Manrope`
- Acik renkli arka plan ve cam efekti kartlar
- Duruma gore renklenen badge/chip sistemi
- Mobil ve masaustu icin responsive grid yapilari

## 15. Bildirim ve Izlenebilirlik

Her onemli islem sonrasinda sistem iki iz birakir:

1. `statusHistory`
2. `auditLogs`

Ayrica rol ve sirket hedefli bildirimler uretilir. Kullanici ust barda yalnizca kendi rolune ve sirketine uygun bildirimleri gorur.

Bu, proje icin onemli bir deger uretir cunku ekran sadece mevcut durumu degil, o duruma nasil gelindigini de gosterebilir.

## 16. Gercek Sisteme Gecis Icin Uygunluk

Mevcut mimari, backend entegrasyonuna gecis icin kismen hazirdir.

Avantajlar:

- Domain modelleri belirgin
- Selector ve UI ayrimi yapilmis
- Is akisi merkezi store icinde toplanmis
- Route ve rol ayrimi net

Geciste degistirilmesi gerekenler:

- Mock seed yerine API veri kaynagi
- Demo login yerine gercek auth
- Client-side yetki yerine sunucu tarafi yetki kontrolu
- Local persistence yerine kalici veri katmani
- Manuel status mutasyonu yerine backend is akisi servisleri

## 17. Mevcut Sinirlamalar ve Dikkat Edilecek Noktalar

Kodun mevcut davranisina gore asagidaki sinirlamalar vardir:

1. Uygulama gercek backend'e bagli degildir.
2. Sifre sabit ve demo amaclidir.
3. Ilk acilista admin oturumu hazir gelir.
4. `toggleUserActive` ve `toggleCompanyStatus` islemleri cogu is akisinda gercekten zorlayici bir kural uretmez; daha cok demo gorunumudur.
5. Rampa cakisma kontrolu sure bazli degil, yalnizca ayni tarih ve ayni saat eslesmesine bakar.
6. Yukleme kapanisi tek aksiyonda birden fazla statuyu otomatik gecirir; gercek operasyonda bu adimlar ayri ekranlara bolunebilir.
7. "Gunluk toplam talep" metrigi takvim bazli bugunu hesaplamaktan ziyade veri setindeki ilk kaydin tarihini esas alir.
8. Talep formunda `requestDate` alani UI'da alinmasina ragmen kayit olusturulurken store tarafinda fiilen `new Date()` kullanilir.
9. Yonetim ekranindaki aktif/pasif degerleri, erisim kontrolunu tam olarak etkilemez.

## 18. Dosya Bazli Mimari Ozeti

| Katman | Dosya/klasor | Sorumluluk |
| --- | --- | --- |
| Giris | `src/main.tsx` | React bootstrap |
| Router | `src/app/App.tsx` | Route ve rol korumasi |
| Domain | `src/domain/*` | Tipler, sabitler, selector, workflow |
| Veri | `src/data/*` | Mock referans veri ve senaryolar |
| State | `src/store/app-store.ts` | Uygulama is mantigi |
| UI | `src/components/*` | Ortak bilesenler, layout, tablo/detay |
| Sayfalar | `src/pages/*` | Rol bazli ekranlar |
| Stil | `src/styles/global.css` | Global gorunum sistemi |

## 19. Calistirma

Yerel gelistirme icin:

```bash
npm install
npm run dev
```

Production build icin:

```bash
npm run build
```

## 20. Sonuc

Bu proje, lojistik sevkiyat surecini uctan uca anlatan, ekranlar arasi gecisleri kontrollu bir is akisi mantigina baglayan guclu bir demo uygulamasidir.

En guclu yonleri:

- Rol bazli sade ekranlar
- Izlenebilir state-machine yaklasimi
- Tek store uzerinde toplanmis is mantigi
- Demo ve sunum icin dolu seed veri seti

En zayif yonleri:

- Gercek backend ve guvenlik katmani yok
- Bazi yonetim aksiyonlari dekoratif seviyede
- Bazi KPI ve is kurallari demo sadeligi nedeniyle basitlestirilmis

Kisacasi bu proje, gercek bir kurumsal lojistik urununun frontend prototipi ve is akisi demonstrasyonu olarak basarili; ancak uretim ortami icin backend, auth, yetki ve operasyon kurallarinin daha sert sekilde yeniden ele alinmasi gerekir.
