export type JuryVote = "davaci" | "davali" | "neutral";

export interface JuryBallot {
  participantId: string;
  vote: JuryVote;
}
