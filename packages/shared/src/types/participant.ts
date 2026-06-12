export type ParticipantRole = "davaci" | "davali" | "davaci_avukati" | "davali_avukati" | "spectator" | "jury";

export interface RoomParticipant {
  id: string;
  nickname: string;
  role: ParticipantRole;
  isActive: boolean;
}
