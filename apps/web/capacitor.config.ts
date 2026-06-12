import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.absurtmahkeme.app",
  appName: "Absurt Mahkeme",
  // Next.js statik export ciktisi; `pnpm build` ile uretilir.
  webDir: "out",
  android: {
    // LAN'daki HTTP/WS oyun sunucusuna (test icin) baglanabilmek adina cleartext izni.
    // Production'da deploy edilmis HTTPS sunucu kullanilirsa buna gerek kalmaz.
    allowMixedContent: true
  }
};

export default config;
