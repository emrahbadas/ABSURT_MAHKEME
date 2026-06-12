<div align="center">

# ⚖️ Absürt Mahkeme

**Arkadaşlarla absürt ve eğlenceli mini mahkeme oyun sahnesi!**

Kayıt gerektirmez · Türkçe odaklı · Mobil uyumlu · Yapay zeka destekli

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socket.io)](https://socket.io/)
[![pnpm](https://img.shields.io/badge/pnpm-8.7-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

</div>

---

## 🎭 Nedir Bu Oyun?

**Absürt Mahkeme**, Türkçe konuşan arkadaş gruplarının dakikalar içinde eğlenceli bir "mahkeme" kurmasını sağlayan mobil öncelikli bir web oyunudur. Kayıt gerekmez — sadece bir takma ad ve 6 karakterlik oda kodu yeterli.

Her turda iki gerçek oyuncu **davacı** ve **davalı** rollerini üstlenir. **Mübaşir, hâkim ve her iki avukat** yapay zeka tarafından canlandırılır; absürt, kısa ve tamamen filtrelenmiş Türkçe mizahla. Seyirciler jest ve jüri oyu kullanabilir. Sonunda bir "satirik karar" gelir ve herkes güler.

> _"Son baklavayı yiyen" gibi önemsiz bir anlaşmazlık, yapay zekanın elinde saçma bir mahkeme dramına dönüşür."_

---

## ✨ Özellikler

| Özellik | Açıklama |
|---|---|
| 🚀 **Sıfır kayıt** | Takma ad + 6 karakterlik oda kodu ile giriş |
| 🤖 **YZ rolleri** | Hâkim, avukatlar ve mübaşir tamamen YZ tarafından oynanır |
| ⚡ **Gerçek zamanlı** | Socket.IO ile sunucu yetkili oyun durumu |
| 🛡️ **İçerik güvenliği** | Tüm çıktılar güvenlik filtrelerinden geçirilir |
| 📱 **Mobil öncelikli** | Tailwind CSS ile her ekran boyutuna uygun |
| 🎭 **Jüri sistemi** | Seyirciler jest kullanabilir ve oy verebilir |
| ⏱️ **Otomatik zamanlayıcılar** | Tüm faz geçişleri sunucu tarafından yönetilir |

---

## 🏗️ Teknoloji Yığını

```
Frontend          →  Next.js 15 + React 19 + Tailwind CSS
Oyun Sunucusu     →  Node.js + Socket.IO (sunucu yetkili)
Veritabanı        →  Supabase (PostgreSQL) + Drizzle ORM
Önbellek          →  Redis (ioredis) — oda/oturum/faz durumu
YZ İstemcisi      →  OpenAI API (filtrelenmiş, Türkçe çıktı)
Doğrulama         →  Zod (istemci + sunucu)
Test              →  Vitest + Playwright + k6
Monorepo          →  pnpm workspaces
```

---

## 🗂️ Proje Yapısı

```
absurt-mahkeme/
├── apps/
│   ├── web/                  # Next.js 15 mobil istemci
│   └── game-server/          # Node.js Socket.IO oyun sunucusu
└── packages/
    ├── shared/               # Paylaşılan tipler ve olay şemaları
    ├── db/                   # Drizzle şeması ve migration araçları
    └── safety/               # Giriş/çıkış güvenlik filtreleri
```

---

## 🚀 Hızlı Başlangıç

### Ön Koşullar

- Node.js `>=18.18.0`
- pnpm `8.7.6`
- PostgreSQL (Supabase önerilir)
- Redis (Upstash veya Redis Cloud önerilir)

### Kurulum

```bash
# Bağımlılıkları yükle
pnpm install

# Ortam değişkenlerini ayarla
cp apps/game-server/.env.example apps/game-server/.env
cp apps/web/.env.example apps/web/.env

# Veritabanı şemasını oluştur
pnpm db:generate
pnpm db:migrate

# Örnek dava kartlarını yükle
pnpm db:seed

# Geliştirme sunucularını başlat
pnpm dev
```

### Kullanılabilir Scriptler

| Komut | Açıklama |
|---|---|
| `pnpm dev` | Tüm uygulamaları geliştirme modunda başlatır |
| `pnpm build` | Tüm uygulamaları derler |
| `pnpm typecheck` | TypeScript tip kontrolü çalıştırır |
| `pnpm db:generate` | Drizzle migration dosyaları oluşturur |
| `pnpm db:migrate` | Migration'ları veritabanına uygular |
| `pnpm db:seed` | Örnek dava kartlarını yükler |

---

## 🎮 Nasıl Oynanır?

1. **Oda oluştur** — Takma adını gir, yeni oda oluştur. 6 karakterlik kodu arkadaşlarınla paylaş.
2. **Katıl** — Herkes takma adı ve oda kodu ile bağlanır. İki kişi davacı/davalı seçilir.
3. **Dava kartı** — Absürt bir dava konusu açıklanır (örn. _"Battaniyeyi çalmakla suçlanıyorsun"_).
4. **Yargılama** — YZ mübaşir, hâkim ve avukatlar sırayla konuşur; davacı ve davalı savunma yapar.
5. **Jüri oylaması** — Seyirciler oylarını kullanır.
6. **Karar** — YZ hâkim satirik kararını açıklar. Herkes güler. 🎉

---

## 🏛️ Mimari

```
[Tarayıcı]
    │── REST (salt okunur) ──▶ [Next.js 15 Ön Yüz]
    │
    └── WebSocket (wss://) ──▶ [Node.js Socket.IO Oyun Sunucusu]
                                    │── [Redis]         ← aktif oda/oturum/faz
                                    │── [Supabase PG]   ← tamamlanan turlar/geçmiş
                                    └── [YZ + Güvenlik Filtresi]
```

**Temel prensipler:**
- Tüm oyun durumu, faz geçişleri ve zamanlayıcılar **sunucu yetkilidir**
- İstemci yalnızca durumu render eder ve kullanıcı niyetini gönderir
- YZ çıktıları her zaman güvenlik filtresinden geçer
- Gerçek kişilere veya yasadışı konulara asla değinilmez

---

## 🛡️ Güvenlik & İçerik Politikası

- Tüm kullanıcı girişleri ve YZ çıktıları filtrelenir
- Yasak kelimeler ve uygunsuz konular otomatik engellenir
- YZ yalnızca absürt, kurgusal senaryolar üretir
- Gerçek suçlar, kişiler veya hassas konular kesinlikle yasaktır

---

## 📄 Dokümantasyon

| Dosya | İçerik |
|---|---|
| [00_PROJECT_OVERVIEW.md](./00_PROJECT_OVERVIEW.md) | Proje tanımı, persona ve özellikler |
| [01_TECH_STACK.md](./01_TECH_STACK.md) | Teknoloji kararları ve bağımlılıklar |
| [02_ARCHITECTURE.md](./02_ARCHITECTURE.md) | Sistem mimarisi ve diyagramlar |
| [03_DATABASE_SCHEMA.md](./03_DATABASE_SCHEMA.md) | Veritabanı şeması |
| [04_ROLES_AND_PROMPTS.md](./04_ROLES_AND_PROMPTS.md) | YZ rol tanımları ve promptlar |
| [05_IMPLEMENTATION_PLAN.md](./05_IMPLEMENTATION_PLAN.md) | Uygulama planı |
| [06_FULL_SETUP_GUIDE.md](./06_FULL_SETUP_GUIDE.md) | Tam kurulum rehberi |

---

## 🤝 Katkıda Bulunma

1. Bu repoyu fork'la
2. Feature branch oluştur (`git checkout -b feature/yeni-ozellik`)
3. Değişikliklerini commit et (`git commit -m 'feat: yeni özellik ekle'`)
4. Branch'i push et (`git push origin feature/yeni-ozellik`)
5. Pull Request aç

---

<div align="center">

Türkçe · Mobil Öncelikli · Güvenli · Eğlenceli

</div>
