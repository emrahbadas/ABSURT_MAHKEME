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
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.corsOrigin
    }
  });

  registerGameSocketHandlers(io);

  return { app, io, httpServer, config };
}
