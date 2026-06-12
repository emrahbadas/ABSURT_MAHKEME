import type { Request, Response } from "express";
import { getConfig } from "../config";

export function configHandler(_request: Request, response: Response): void {
  const config = getConfig();
  response.json({
    nodeEnv: config.nodeEnv,
    socketNamespace: "/game"
  });
}
