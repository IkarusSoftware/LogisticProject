# FlowDock Logistics Demo

Kurumsal lojistik sevkiyat operasyonunu rol bazli, state-machine mantiginda ve mock veriyle gosteren React + TypeScript demo uygulamasi.

## Bilgi mimarisi

Uygulama 5 ana katmanda kurgulandi:

1. Talep yonetimi
   Talep olusturma, talep listesi, iptal akisi
2. Tedarik ve arac atama
   Supplier kuyruğu, arac/sofor formu, red nedeni
3. Dogrulama ve planlama
   Arac kontrol, rampa atama, kapasite/cakisma kontrolu
4. Saha operasyonu
   Tesise gelis, saha girisi, rampaya alma, yukleme baslatma
5. Kapanis ve izlenebilirlik
   Muhur, cikis, tamamlanma, audit log, durum gecmisi, raporlar

## Roller ve ana akislar

- Talep olusturan firma
  Talep acar, sureci izler, kendi kayitlarini gorur, gerekirse iptal eder.
- Tedarik / lojistik
  Kendisine atanmis talepleri gorur, arac/sofor girer, uygun degilse red verir.
- Ana firma kontrol
  Tedarikcinin girdigi bilgileri dogrular, onaylar veya notla reddeder.
- Rampa planlama
  Onayli araclara rampa atar, cakisma kontrolu ile calisir.
- Kapi / saha
  Geldi, sahaya girdi, rampaya alindi, yukleme basladi gecislerini yonetir.
- Yukleme sonlandirma
  Muhur no kaydeder, cikis verir, sureci kapatir.
- Admin
  Tum kayitlari, tanimlari ve raporlari gorur.

## Durum makinesi

Ana sevkiyat statuleri:

`REQUEST_CREATED -> SENT_TO_SUPPLIER -> SUPPLIER_REVIEWING -> VEHICLE_ASSIGNED -> IN_CONTROL -> APPROVED -> RAMP_PLANNED -> ARRIVED -> ADMITTED -> AT_RAMP -> LOADING -> LOADED -> SEALED -> EXITED -> COMPLETED`

Yan dallar:

- `REJECTED`
- `CANCELLED`

Kurallar:

- Muhur numarasi olmadan kapanis yapilamaz.
- Rampa atanmadan `AT_RAMP` gecisi yapilamaz.
- Eksik arac/sofor bilgisiyle onaya gonderim olmaz.
- Her statü degisimi audit log ve status history yazar.

## Ekran matrisi

- `/login`
- `/dashboard`
- `/talep-olustur`
- `/talepler`
- `/tedarik-atama`
- `/arac-kontrol`
- `/rampa-planlama`
- `/kapi-operasyonu`
- `/yukleme-tamamlama`
- `/gecmis`
- `/raporlar`
- `/yonetim`

## Teknik mimari

- `src/domain`
  Entity tipleri, status metadata, selector ve workflow kurallari
- `src/data`
  Mock referans veriler, senaryolar ve seed uretimi
- `src/store`
  Zustand store, actionlar, validasyonlar, audit log ve notification uretimi
- `src/components`
  Tasarim sistemi, layout, tablo ve detay cekmecesi
- `src/pages`
  Rol bazli operasyon ekranlari

Bu yapi, ileride gercek backend baglantisi veya mobil uygulama icin domain/store katmaninin API client ile degistirilmesine uygun tutuldu.

## Calistirma

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Demo giris

- Demo sifresi: `demo123`
- Login ekraninda her rol icin tek tik demo kullanici karti bulunur.
