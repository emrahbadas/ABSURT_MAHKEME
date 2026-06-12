import type { RoundPhase } from "./phase";

export interface PlayerStatement {
  participantId: string;
  phase: Extract<RoundPhase, "claim" | "defense" | "final_words">;
  text: string;
}
