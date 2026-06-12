import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Capacitor icin statik export: UI APK icine paketlenir, calisma aninda yalnizca
  // oyun sunucusu (Socket.IO) gereklidir.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true
};

export default nextConfig;
