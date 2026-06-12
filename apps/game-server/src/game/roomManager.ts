type ParticipantRole = "davaci" | "davali" | "davaci_avukati" | "davali_avukati" | "spectator" | "jury";
type RoomPhase = "lobby" | "claim_summary" | "lawyer_assignment" | "roll_call_countdown" | "roll_call" | "court_preparing" | "opening" | "claim";

type RoomParticipant = {
  id: string;
  nickname: string;
  role: ParticipantRole;
  isActive: boolean;
};

export type AgentRole = "davaci_avukati" | "davali_avukati" | "judge" | "mubasir";
type MessageRole = ParticipantRole | "judge" | "mubasir";

type ChatMessage = {
  id: string;
  nickname: string;
  role: MessageRole;
  text: string;
  ts: number;
};

type AiConfig = {
  apiKey: string;
  model: string;
};

export type GameSettings = {
  spectatorsAllowed: boolean;
  turnOrder: boolean;
  answerTimeoutSec: number | null;
  rounds: number;
};

const defaultSettings: GameSettings = {
  spectatorsAllowed: true,
  turnOrder: true,
  answerTimeoutSec: 90,
  rounds: 3
};

export type SpeakerRole = AgentRole | "davaci" | "davali";

export type TrialBeat = {
  speaker: SpeakerRole;
  kind: "human" | "ai";
  intent: string;
  round: number;
};

export type TrialState = {
  totalRounds: number;
  round: number;
  index: number;
  activeActor?: "davaci" | "davali";
  turnEndsAt?: number;
  finished: boolean;
  beats: TrialBeat[];
};

// Senaryolu duruşma akışı: açılış + (rounds-1) tartışma turu + final/karar turu.
export function buildTrialBeats(rounds: number): TrialBeat[] {
  const beats: TrialBeat[] = [];
  beats.push({ speaker: "mubasir", kind: "ai", intent: "open", round: 1 });

  for (let r = 1; r < rounds; r += 1) {
    beats.push({ speaker: "davaci", kind: "human", intent: r === 1 ? "claim" : "argue", round: r });
    beats.push({ speaker: "davaci_avukati", kind: "ai", intent: "amplify_davaci", round: r });
    beats.push({ speaker: "davali", kind: "human", intent: r === 1 ? "defense" : "counter", round: r });
    beats.push({ speaker: "davali_avukati", kind: "ai", intent: "amplify_davali", round: r });
    beats.push({ speaker: "judge", kind: "ai", intent: "round_summary", round: r });
  }

  // Final / karar turu
  beats.push({ speaker: "davaci", kind: "human", intent: "final_davaci", round: rounds });
  beats.push({ speaker: "davali", kind: "human", intent: "final_davali", round: rounds });
  beats.push({ speaker: "judge", kind: "ai", intent: "verdict", round: rounds });
  beats.push({ speaker: "mubasir", kind: "ai", intent: "close", round: rounds });

  return beats;
}

export function initTrial(code: string): TrialState | null {
  const room = rooms.get(code);
  if (!room) {
    return null;
  }
  const beats = buildTrialBeats(room.settings.rounds);
  room.trial = { totalRounds: room.settings.rounds, round: 1, index: 0, finished: false, beats };
  return room.trial;
}

export function parseSettings(input: unknown): GameSettings {
  const raw = (input || {}) as Record<string, unknown>;
  const rounds = Number(raw.rounds);
  const timeoutValue = raw.answerTimeoutSec;
  const timeout =
    timeoutValue === null
      ? null
      : [60, 90].includes(Number(timeoutValue))
        ? Number(timeoutValue)
        : defaultSettings.answerTimeoutSec;

  return {
    spectatorsAllowed: raw.spectatorsAllowed !== false,
    turnOrder: raw.turnOrder !== false,
    answerTimeoutSec: timeout,
    rounds: [2, 3, 4, 5].includes(rounds) ? rounds : defaultSettings.rounds
  };
}

export type Room = {
  code: string;
  status: "waiting" | "active" | "closed";
  phase: RoomPhase;
  participants: RoomParticipant[];
  currentRoundNumber: number;
  claimSummary?: string;
  courtType?: string;
  phaseEndsAt?: number;
  messages: ChatMessage[];
  settings: GameSettings;
  trial?: TrialState;
  opening?: {
    davaciName: string;
    davaliName: string;
    davaciAvukatiName: string;
    davaliAvukatiName: string;
    bailiffAnnouncement: string;
  };
};

const MAX_MESSAGES = 200;

const rooms = new Map<string, Room>();
// API anahtarlari odanin DISINDA tutulur ki server:roomState ile istemcilere asla sizmasin.
const aiConfigs = new Map<string, AiConfig>();
const lawyerFirstNames = ["Sakir", "Vecihi", "Mebrure", "Muzaffer", "Fikri", "Nermin", "Cevdet", "Perihan"];
const lawyerTitles = ["Muz Kabugu", "Itirazname", "Delil Avcisi", "Dosya Cambazi", "Tutanak Ustasi", "Kukuruklu Savunma", "Paragraf Pencesi", "Kahkaha Serhi"];

export function createRoom(code: string, settings?: GameSettings, owner?: RoomParticipant): Room {
  const room: Room = {
    code,
    status: "waiting",
    phase: "lobby",
    participants: owner ? [owner] : [],
    currentRoundNumber: 0,
    messages: [],
    settings: settings || { ...defaultSettings }
  };

  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function addParticipant(code: string, participant: RoomParticipant): Room | null {
  const room = rooms.get(code);
  if (!room) {
    return null;
  }

  room.participants.push(participant);
  return room;
}

export function removeParticipant(code: string, participantId: string): Room | null {
  const room = rooms.get(code);
  if (!room) {
    return null;
  }

  room.participants = room.participants.filter((participant) => participant.id !== participantId);

  if (room.participants.length === 0) {
    rooms.delete(code);
    aiConfigs.delete(code);
    return null;
  }

  return room;
}

export function setAiConfig(code: string, apiKey: string, model: string): void {
  const trimmedKey = (apiKey || "").trim();
  if (!trimmedKey) {
    return;
  }
  aiConfigs.set(code, { apiKey: trimmedKey, model: (model || "").trim() || "gpt-4o-mini" });
}

export function getAiConfig(code: string): AiConfig | undefined {
  return aiConfigs.get(code);
}

function agentDisplayName(role: AgentRole, room: Room): string {
  if (role === "davaci_avukati") {
    return room.opening?.davaciAvukatiName || "Davaci Vekili";
  }
  if (role === "davali_avukati") {
    return room.opening?.davaliAvukatiName || "Davali Vekili";
  }
  if (role === "judge") {
    return "Hakim";
  }
  return "Mubasir";
}

export function addAgentMessage(code: string, role: AgentRole, text: string): { room: Room; message: ChatMessage } | null {
  const room = rooms.get(code);
  if (!room) {
    return null;
  }

  const cleaned = text.trim().replace(/\s+/g, " ").slice(0, 240);
  if (cleaned.length === 0) {
    return null;
  }

  const message: ChatMessage = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    nickname: agentDisplayName(role, room),
    role,
    text: cleaned,
    ts: Date.now()
  };

  room.messages.push(message);
  if (room.messages.length > MAX_MESSAGES) {
    room.messages = room.messages.slice(-MAX_MESSAGES);
  }

  return { room, message };
}

function inferCourtType(summary: string): string {
  const normalized = summary.toLocaleLowerCase("tr-TR");

  if (/(ceza|hirsiz|darp|tehdit|hakaret|suc|polis|savci)/.test(normalized)) {
    return "Asliye Ceza Mahkemesi";
  }

  if (/(bosan|nafaka|velayet|aile|es|cocuk)/.test(normalized)) {
    return "Aile Mahkemesi";
  }

  if (/(kira|ev sahibi|tahliye|komsu|apartman)/.test(normalized)) {
    return "Sulh Hukuk Mahkemesi";
  }

  if (/(alisveris|tuketici|urun|iade|garanti|fatura)/.test(normalized)) {
    return "Tuketici Mahkemesi";
  }

  if (/(is|maas|mesai|patron|iscilik|tazminat)/.test(normalized)) {
    return "Is Mahkemesi";
  }

  return "Asliye Hukuk Mahkemesi";
}

function getParticipantName(room: Room, role: ParticipantRole, fallback: string): string {
  return room.participants.find((participant) => participant.role === role)?.nickname || fallback;
}

function makeStableIndex(seed: string, modulo: number): number {
  let total = 0;
  for (let index = 0; index < seed.length; index += 1) {
    total = (total * 31 + seed.charCodeAt(index)) % modulo;
  }

  return total;
}

function createLawyerName(roomCode: string, side: "davaci" | "davali"): string {
  const firstName = lawyerFirstNames[makeStableIndex(`${roomCode}:${side}:first`, lawyerFirstNames.length)];
  const title = lawyerTitles[makeStableIndex(`${roomCode}:${side}:title`, lawyerTitles.length)];
  return `Av. ${firstName} ${title}`;
}

function assignLawyers(room: Room): void {
  const davaciName = getParticipantName(room, "davaci", "Davaci");
  const davaliName = getParticipantName(room, "davali", "Davali");
  const davaciAvukatiName = createLawyerName(room.code, "davaci");
  const davaliAvukatiName = createLawyerName(room.code, "davali");
  const courtType = room.courtType || "Asliye Hukuk Mahkemesi";

  room.opening = {
    davaciName,
    davaliName,
    davaciAvukatiName,
    davaliAvukatiName,
    bailiffAnnouncement:
      `Mubasir: ${courtType} dosyasi icin taraflar salona davet olunur. ` +
      `Davaci ${davaciName}, davaci vekili ${davaciAvukatiName}; ` +
      `davali ${davaliName}, davali vekili ${davaliAvukatiName}.`
  };
}

export function submitClaimSummary(code: string, participantId: string, text: string): { ok: boolean; room?: Room; message?: string } {
  const room = rooms.get(code);
  if (!room) {
    return { ok: false, message: "Oda bulunamadi." };
  }

  if (room.phase !== "claim_summary") {
    return { ok: false, message: "Iddia ozeti su anda alinamaz." };
  }

  const participant = room.participants.find((current) => current.id === participantId);
  if (!participant || participant.role !== "davaci") {
    return { ok: false, message: "Ilk iddiayi yalnizca davaci sunabilir." };
  }

  const summary = text.trim().replace(/\s+/g, " ").slice(0, 600);
  if (summary.length < 20) {
    return { ok: false, message: "Iddia ozeti en az 20 karakter olmali." };
  }

  room.claimSummary = summary;
  room.courtType = inferCourtType(summary);
  assignLawyers(room);
  room.phase = "lawyer_assignment";
  room.status = "active";
  room.phaseEndsAt = Date.now() + 4000;

  return { ok: true, room };
}

export function setRoomPhase(code: string, phase: RoomPhase, durationMs?: number): Room | null {
  const room = rooms.get(code);
  if (!room) {
    return null;
  }

  room.phase = phase;
  room.phaseEndsAt = durationMs ? Date.now() + durationMs : undefined;
  if (phase === "claim" && room.currentRoundNumber === 0) {
    room.currentRoundNumber = 1;
  }

  return room;
}

export function hasNickname(code: string, nickname: string): boolean {
  const room = rooms.get(code);
  if (!room) {
    return false;
  }

  return room.participants.some((participant) => participant.nickname.toLocaleLowerCase("tr-TR") === nickname.toLocaleLowerCase("tr-TR"));
}

export function selectRole(code: string, participantId: string, role: Extract<ParticipantRole, "davaci" | "davali">): { ok: boolean; room?: Room; message?: string } {
  const room = rooms.get(code);
  if (!room) {
    return { ok: false, message: "Oda bulunamadi." };
  }

  if (room.phase !== "lobby") {
    return { ok: false, message: "Rol secimi yalnizca lobide yapilabilir." };
  }

  const target = room.participants.find((participant) => participant.id === participantId);
  if (!target) {
    return { ok: false, message: "Katilimci bulunamadi." };
  }

  const takenByAnother = room.participants.some((participant) => participant.role === role && participant.id !== participantId);
  if (takenByAnother) {
    return { ok: false, message: "Rol kapildi, tekrar deneyin." };
  }

  target.role = role;

  const hasDavaci = room.participants.some((participant) => participant.role === "davaci");
  const hasDavali = room.participants.some((participant) => participant.role === "davali");
  if (hasDavaci && hasDavali) {
    room.phase = room.claimSummary ? room.phase : "claim_summary";
    room.status = "active";
  }

  return { ok: true, room };
}

export function addChatMessage(
  code: string,
  participantId: string,
  text: string
): { ok: boolean; room?: Room; message?: ChatMessage; error?: string } {
  const room = rooms.get(code);
  if (!room) {
    return { ok: false, error: "Oda bulunamadi." };
  }

  if (room.phase !== "claim") {
    return { ok: false, error: "Mesajlar yalnizca durusma sirasinda gonderilebilir." };
  }

  const participant = room.participants.find((current) => current.id === participantId);
  if (!participant) {
    return { ok: false, error: "Katilimci bulunamadi." };
  }

  const cleaned = text.trim().replace(/\s+/g, " ").slice(0, 240);
  if (cleaned.length === 0) {
    return { ok: false, error: "Mesaj bos olamaz." };
  }

  const message: ChatMessage = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    nickname: participant.nickname,
    role: participant.role,
    text: cleaned,
    ts: Date.now()
  };

  room.messages.push(message);
  if (room.messages.length > MAX_MESSAGES) {
    room.messages = room.messages.slice(-MAX_MESSAGES);
  }

  return { ok: true, room, message };
}
