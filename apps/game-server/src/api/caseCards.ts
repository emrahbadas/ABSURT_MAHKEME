import type { Request, Response } from "express";

const defaultCaseCards = [
  { id: "local-1", content: "Son cips kirintisi kimin?", emoji: "🍟" },
  { id: "local-2", content: "Kumanda mulkiyeti kime ait?", emoji: "📺" }
];

export function caseCardsHandler(_request: Request, response: Response): void {
  response.json(defaultCaseCards);
}
