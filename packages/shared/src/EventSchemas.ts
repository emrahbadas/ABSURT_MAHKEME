import type { AiRole, FilteredAiMessage, ParticipantRole, Room, RoundPhase, Verdict } from "./types";

export interface ClientCreateRoom {
  nickname: string;
}

export interface ClientJoinRoom {
  nickname: string;
  roomCode: string;
}

export interface ClientRejoinRoom {
  nickname: string;
  roomCode: string;
  sessionToken: string;
}

export interface ClientSubmitStatement {
  sessionToken: string;
  phase: Extract<RoundPhase, "claim" | "defense">;
  text: string;
  roomCode: string;
}

export interface ClientSubmitClaimSummary {
  roomCode: string;
  text: string;
}

export interface ClientSubmitFinalWords {
  sessionToken: string;
  text: string;
  roomCode: string;
}

export interface ClientSelectRole {
  sessionToken: string;
  role: Extract<ParticipantRole, "davaci" | "davali">;
  roomCode: string;
}

export interface ServerRoomState {
  room: Room;
  phase: RoundPhase;
}

export interface ServerAiMessageCreated {
  role: AiRole;
  message: FilteredAiMessage;
}

export interface ServerVerdictCreated {
  verdict: Verdict;
}

export interface ServerError {
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}
