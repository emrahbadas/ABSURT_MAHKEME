export type AiRole = "mubasir" | "lawyer_davaci" | "lawyer_davali" | "hakim";

export interface FilteredAiMessage {
  text: string;
  status: "ok" | "fallback";
  createdAt: string;
}
