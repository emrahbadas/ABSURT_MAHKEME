# Oyun Sunucusunu Railway'e Deploy Etme

Deploy edilen şey **oyun sunucusu** (`apps/game-server`, Node + Socket.IO). Web/UI APK içine gömülü.
Repo kökündeki `railway.json` build/start komutlarını içerir (pnpm monorepo).

Sunucu in-memory çalışır; Redis/Postgres GEREKMEZ. Railway `PORT`'u otomatik verir, sunucu onu kullanır.
CORS varsayılan olarak Capacitor mobil origin'lerine zaten izinli.

---

## Yol 1 — GitHub ile (önerilen, repo zaten var)

1. **Tüm değişiklikleri commit + push et** (özellikle `pnpm-lock.yaml`, `railway.json`, `.nvmrc`):
   ```
   git add -A && git commit -m "Capacitor mobil + Railway deploy yapilandirmasi" && git push
   ```
2. https://railway.app → giriş yap → **New Project → Deploy from GitHub repo** → `emrahbadas/ABSURT_MAHKEME` seç.
3. Railway `railway.json`'u okur: `pnpm install` + `game-server build` → `game-server start`.
4. (İsteğe bağlı) **Variables**: `CORS_ORIGIN=*` ekle. (PORT otomatik.)
5. **Settings → Networking → Generate Domain** → public adres çıkar
   (örn. `https://absurt-mahkeme-production.up.railway.app`).
6. Test: tarayıcıda `<URL>/health` aç → yanıt gelmeli.

## Yol 2 — Railway CLI ile

```
railway login           # tarayıcıda giriş
railway init            # proje oluştur (isim ver)
railway up              # repo'yu yükler, railway.json ile build/deploy
railway domain          # public https adresi üretir
railway variables --set CORS_ORIGIN=*   # opsiyonel
```

---

## Deploy sonrası: APK'yı public sunucuya bağla
`apps/web/.env.local`:
```
NEXT_PUBLIC_GAME_SERVER_URL=https://absurt-mahkeme-production.up.railway.app
```
Sonra:
```
cd apps/web
pnpm mobile:sync
```
APK'yı yeniden derle (Android Studio). Artık telefonlar **her yerden** (mobil veri / farklı WiFi)
oynar; PC veya ortak ağ gerekmez.

> Not: Public sunucu HTTPS/WSS olduğu için `usesCleartextTraffic` gereksizdir (istersen kaldır).
