import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { getConfig } from "./config";
import { healthHandler } from "./api/health";
import { configHandler } from "./api/config";
import { caseCardsHandler } from "./api/caseCards";
import { historyHandler } from "./api/history";
import { registerGameSocketHandlers } from "./game/events";

export async function bootstrapServer() {
  const config = getConfig();
  const app = express();

  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);
  app.get("/api/config", configHandler);
  app.get("/api/case-cards", caseCardsHandler);
  app.get("/api/rooms/:roomCode/history", historyHandler);

  const httpServer = http.createServer(app);
  // Web (localhost:3000) + Capacitor mobil uygulama origin'lerine izin ver.
  // CORS_ORIGIN="*" verilirse tum origin'ler kabul edilir (test icin).
  const corsOrigin =
    config.corsOrigin === "*"
      ? "*"
      : Array.from(
          new Set([
            ...config.corsOrigin.split(",").map((value) => value.trim()).filter(Boolean),
            "http://localhost:3000",
            "http://localhost",
            "https://localhost",
            "capacitor://localhost"
          ])
        );

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigin
    }
  });

  registerGameSocketHandlers(io);

  return { app, io, httpServer, config };
}
