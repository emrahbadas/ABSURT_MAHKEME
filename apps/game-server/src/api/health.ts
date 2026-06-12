import type { Request, Response } from "express";

export function healthHandler(_request: Request, response: Response): void {
  response.json({ status: "ok" });
}
