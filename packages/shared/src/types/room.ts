import type { RoundPhase } from "./phase";
import type { RoomParticipant } from "./participant";

export interface Room {
  code: string;
  status: "waiting" | "active" | "closed";
  phase: RoundPhase;
  participants: RoomParticipant[];
  currentRoundNumber: number;
  claimSummary?: string;
  courtType?: string;
  phaseEndsAt?: number;
  opening?: {
    davaciName: string;
    davaliName: string;
    davaciAvukatiName: string;
    davaliAvukatiName: string;
    bailiffAnnouncement: string;
  };
}
