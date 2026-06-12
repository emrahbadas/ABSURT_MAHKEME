# Absürt Mahkeme — Android APK (Capacitor)

Web uygulaması Next.js **statik export** ile paketlenir ve Capacitor ile Android APK'ya dönüşür.
UI APK içine gömülüdür; çalışma anında yalnızca **oyun sunucusu** (Socket.IO, port 3100) gereklidir.

## Ön koşullar (bir kez)
- **Android Studio** kur: https://developer.android.com/studio
  (Android SDK + uyumlu JDK'yı birlikte getirir. Sistemdeki Java 24 komut satırı gradle ile sorun çıkarabilir; bu yüzden Android Studio'nun kendi JDK'sını kullan.)
- İlk açılışta Android Studio SDK'yı indirsin.

## 1) Oyun sunucusu adresini ayarla (ÖNEMLİ)
APK içindeki UI, sunucuya **derleme anında gömülen** adresten bağlanır. İki yol var:

### A) Gerçek kullanım — ASIL YOL (önerilen)
Oyun sunucusunu internette bir yere deploy et (Render / Railway / Fly.io / VPS) → herkese açık
bir `https://...` adresin olur. APK'yı bununla derle:
```
NEXT_PUBLIC_GAME_SERVER_URL=https://senin-oyun-sunucun.com
```
Bu durumda telefonlar **farklı ağlardan / mobil veriden** bağlanır; PC'ye veya ortak WiFi'ye
gerek YOKTUR. (HTTPS/WSS olduğu için `usesCleartextTraffic` da gereksiz, kaldırılabilir.)

### B) Hızlı yerel test — yalnızca geçici
Henüz deploy etmediysen, sunucu senin PC'nde çalışır ve ona **sadece aynı WiFi'deki** cihazlar
ulaşır (bu yüzden PC + ortak WiFi gerekir; bu sadece test içindir):
- Windows'ta IP: `ipconfig` → "IPv4 Address" (örn. `192.168.1.20`)
- `apps/web/.env.local`:
  ```
  NEXT_PUBLIC_GAME_SERVER_URL=http://192.168.1.20:3100
  ```
  (Telefon + PC aynı WiFi; Windows Güvenlik Duvarı 3100'e izin vermeli.)

> Özet: **A** = her yerden oynanır, PC gerekmez (gerçek ürün). **B** = sadece evde, aynı WiFi'de hızlı deneme.

## 2) Sunucuları çalıştır
Projenin kökünde:
```
pnpm dev
```
(Oyun sunucusu tüm ağ arayüzlerinde 3100'ü dinler; CORS artık Capacitor origin'lerine izinli.)

## 3) Web'i derle + Capacitor'a senkronla
```
cd apps/web
pnpm mobile:sync     # next build (out/) + cap sync android
```

## 4) APK üret
**Kolay yol (Android Studio):**
```
pnpm mobile:open     # Android Studio'da android/ projesini açar
```
Android Studio'da: cihazını USB ile bağla (USB hata ayıklama açık) → **Run ▶**, ya da
menüden **Build > Build App Bundle(s) / APK(s) > Build APK(s)**.

**Komut satırı (SDK kuruluysa):**
```
pnpm mobile:apk
```
Üretilen APK: `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`
Bu dosyayı telefona atıp kurabilirsin (bilinmeyen kaynak izni gerekebilir).

## Notlar
- Görsel/akış değişince tekrar `pnpm mobile:sync` çalıştır, sonra Android Studio'da yeniden Run/Build.
- OpenAI API key: oyuncu uygulama içinde girer (web ile aynı), sunucuya yalnızca oda kuran kişiden gider.
- Uygulama kimliği: `com.absurtmahkeme.app`, ad: "Absurt Mahkeme" (capacitor.config.ts).
