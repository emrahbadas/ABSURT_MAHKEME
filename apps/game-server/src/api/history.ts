import type { Request, Response } from "express";

export function historyHandler(request: Request, response: Response): void {
  const roomCode = request.params.roomCode;
  response.json({ roomCode, rounds: [] });
}
