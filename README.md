# FlowDock Logistics Demo

Kurumsal lojistik sevkiyat operasyonunu rol bazlı, state-machine mantığında yöneten React + TypeScript + .NET 9 demo uygulaması.

---

## Hızlı Kurulum

### Gereksinimler

| Araç | Sürüm | İndirme |
|------|-------|---------|
| Node.js | 20+ | https://nodejs.org |
| .NET SDK | 9.0 | https://dot.net/download |
| Docker Desktop | Herhangi | https://www.docker.com/products/docker-desktop |
| Git | Herhangi | https://git-scm.com |

---

### 1. Repoyu klonla

```bash
git clone https://github.com/IkarusSoftware/LogisticProject.git
cd LogisticProject
```

---

### 2. Frontend

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat (http://localhost:4173)
npm run dev
```

> Frontend tek başına da çalışır — backend olmadan otomatik olarak yerel demo verisine (Zustand) döner.

---

### 3. Backend (opsiyonel — API modu için)

Backend'i çalıştırmak API modunu aktif eder: gerçek PostgreSQL verisi, JWT auth, audit log dosyaları.

#### 3a. PostgreSQL'i Docker ile başlat

```bash
cd backend
docker compose up -d
```

Bu komut `flowdock-postgres` adında bir container oluşturur:
- **Host:** `localhost:5432`
- **Veritabanı:** `flowdock`
- **Kullanıcı:** `flowdock`
- **Şifre:** `flowdock_dev_2024`

#### 3b. API'yi başlat

```bash
cd backend/FlowDock.Api
dotnet run
```

API `http://localhost:5155` adresinde çalışır. İlk çalıştırmada migration ve seed verisi otomatik uygulanır.

> **Not:** `dotnet run` ilk seferde birkaç dakika sürebilir (paket indirme).

#### 3c. Bağlantıyı doğrula

Tarayıcıda şunu aç:

```
http://localhost:5155/health
```

`Healthy` yanıtı alıyorsan her şey yolunda.

---

### 4. Uygulamayı aç

```
http://localhost:4173
```

Login ekranında her rol için **tek tıkla giriş** kartları bulunur. Manuel giriş için demo şifresi `demo123`.

---

## Demo Roller

| Rol | Kullanıcı | Erişim |
|-----|-----------|--------|
| Sistem Yöneticisi | Kerem Başaran | Tam erişim — kullanıcılar, ayarlar, audit log |
| Vardiya Amiri | Eda Yılmaz | Tüm süreçler, raporlar, yönetim |
| Tedarikçi (Mars) | Mert Demir | Araç & sürücü atama |
| Tedarikçi (Mevlana) | Elif Şahin | Araç & sürücü atama |
| Tedarikçi (Horoz) | Bora Kaya | Araç & sürücü atama |
| Sevkiyat Operasyon | Selin Çelik | Araç kontrol, rampa planlama |
| Dış Güvenlik | Cem Sarı | Kapı operasyonu |

---

## Proje Yapısı

```
LogisticProject/
├── src/                        # Frontend (React + TypeScript)
│   ├── app/                    # Router ve uygulama kabuğu
│   ├── components/             # Tasarım sistemi, DataTable, layout
│   ├── data/                   # Demo seed verisi
│   ├── domain/                 # Entity tipleri, state machine, selector'lar
│   ├── pages/                  # Rol bazlı ekranlar
│   ├── services/               # API client (api.ts, types.ts)
│   ├── store/                  # Zustand store (fallback + API sync)
│   └── styles/                 # CSS design system (global.css)
│
├── backend/                    # Backend (.NET 9 Web API)
│   ├── docker-compose.yml      # PostgreSQL container
│   └── FlowDock.Api/
│       ├── Controllers/        # REST endpoint'leri
│       ├── Services/           # İş mantığı
│       ├── Models/             # Entity'ler ve DTO'lar
│       ├── Data/               # EF Core context, migration, seed
│       └── appsettings.json    # Bağlantı ve JWT ayarları
│
├── package.json                # Frontend bağımlılıkları
└── vite.config.ts              # Vite yapılandırması (proxy: /api → :5155)
```

---

## Teknik Stack

### Frontend
| | |
|-|-|
| Framework | React 19 + TypeScript |
| State | Zustand (persist middleware) |
| Routing | React Router v7 |
| Tablo | TanStack Table v8 |
| Grafikler | Recharts v3 |
| İkonlar | Lucide React |
| Build | Vite 8 |
| CSS | Custom design system (IBM Plex Sans + Manrope) |

### Backend
| | |
|-|-|
| Runtime | .NET 9 |
| Web | ASP.NET Core Web API |
| ORM | Entity Framework Core 9 |
| Veritabanı | PostgreSQL 16 |
| Auth | JWT Bearer |
| Audit | JSON Lines dosya logger |

---

## Mimari

### Çevrimdışı / Online mod

Frontend hem backend'le hem de backend olmadan çalışır:

- **Backend yoksa:** Zustand store'daki demo seed verisi kullanılır, tüm işlemler local'de gerçekleşir.
- **Backend varsa:** JWT token alınır, `loadFromApi()` ile referans verisi Zustand'a yüklenir, tüm mutasyonlar REST API üzerinden yapılır.

### State machine

Sevkiyat durumları 21 adımlı bir state machine ile yönetilir:

```
REQUEST_CREATED → SENT_TO_SUPPLIER → SUPPLIER_REVIEWING → VEHICLE_ASSIGNED
→ IN_CONTROL → APPROVED → RAMP_PLANNED → ARRIVED → ADMITTED → AT_RAMP
→ LOADING → LOADED → SEALED → EXITED → COMPLETED
```

Terminal dallar: `REJECTED`, `CANCELLED`, `VEHICLE_CANCELLED`

Her geçiş audit log ve status history kaydı oluşturur.

---

## Sık Karşılaşılan Sorunlar

**`npm run dev` sonrası beyaz ekran**
```bash
# Node.js sürümünü kontrol et (20+ gerekli)
node -v
```

**Backend başlamıyor — port hatası**
```bash
# 5155 portunu kullanan process'i bul ve durdur
# Windows:
netstat -ano | findstr :5155
```

**PostgreSQL bağlantı hatası**
```bash
# Container çalışıyor mu kontrol et
docker ps

# Çalışmıyorsa yeniden başlat
cd backend
docker compose up -d
```

**`dotnet: command not found`**
- .NET 9 SDK'yı https://dot.net/download adresinden kur, terminali yeniden aç.

**Login sonrası demo roller görünmüyor**
- Backend çalışıyorsa `loadFromApi()` Zustand'ı API verisiyle yazar — bu normaldir, kartlar yine de görünür.
- Görünmüyorsa sayfayı yenile (F5).

---

## Ekran Listesi

| URL | Açıklama | Roller |
|-----|----------|--------|
| `/login` | Giriş | Hepsi |
| `/dashboard` | Operasyon özeti | Admin, Vardiya Amiri |
| `/talep-olustur` | Yeni sevkiyat talebi | Talep oluşturan |
| `/talepler` | Talep listesi | Hepsi |
| `/tedarik-atama` | Araç & sürücü atama | Tedarikçi |
| `/arac-kontrol` | Araç doğrulama | Kontrol |
| `/rampa-planlama` | Rampa atama | Rampa |
| `/kapi-operasyonu` | Saha & kapı | Güvenlik |
| `/yukleme-tamamlama` | Yükleme kapatma | Yükleme |
| `/gecmis` | Tamamlanan işlemler | Hepsi |
| `/raporlar` | KPI & grafikler | Admin, Vardiya Amiri |
| `/yonetim` | Firma & rampa yönetimi | Admin |
| `/kullanici-yonetim` | Kullanıcı CRUD | Süper Admin |
| `/aktivite-log` | Audit log | Süper Admin |
| `/ayarlar` | Sistem ayarları | Süper Admin |
