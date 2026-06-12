import type { Server as SocketIOServer, Socket } from "socket.io";
import {
  addAgentMessage,
  addChatMessage,
  addParticipant,
  createRoom,
  getAiConfig,
  getRoom,
  hasNickname,
  parseSettings,
  removeParticipant,
  selectRole,
  setAiConfig,
  setRoomPhase,
  submitClaimSummary
} from "./roomManager";
import type { AgentRole } from "./roomManager";
import { generateReply } from "./aiClient";
import { disposeTrial, isActorsTurn, isTrialActive, onHumanTurnDone, startTrial } from "./trialOrchestrator";

type ParticipantRole = "davaci" | "davali" | "davaci_avukati" | "davali_avukati" | "spectator" | "jury";
type OpeningPhase = "lawyer_assignment" | "roll_call_countdown" | "roll_call" | "court_preparing" | "claim";

type RoomParticipant = {
  id: string;
  nickname: string;
  role: ParticipantRole;
  isActive: boolean;
};

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_PARTICIPANTS = 8;
const openingPhaseDurationsMs: Record<Exclude<OpeningPhase, "claim">, number> = {
  lawyer_assignment: 4000,
  roll_call_countdown: 8000,
  roll_call: 8000,
  court_preparing: 6000
};

const openingTimers = new Map<string, NodeJS.Timeout>();
const aiTurnCounters = new Map<string, number>();

const agentPersona: Record<AgentRole, string> = {
  davaci_avukati:
    "Sen davaci vekilisin (avukat). Davacinin tarafini komik, dramatik ve abartili bir dille savunursun. Turkce, kisa ve teatral konus.",
  davali_avukati:
    "Sen davali vekilisin (avukat). Davalinin tarafini komik, dramatik ve abartili savunur, karsi tarafa itiraz edersin. Turkce, kisa ve teatral konus.",
  judge:
    "Sen absurt ama otoriter bir hakimsin. Durusmayi yonetir, komik sorular sorar veya sessizlik istersin. Turkce ve kisa konus.",
  mubasir: "Sen mubasirsin. Kisa, teatral anonslar yaparsin. Turkce konus."
};

const roleTextMap: Record<string, string> = {
  davaci: "Davaci",
  davali: "Davali",
  davaci_avukati: "Davaci Vekili",
  davali_avukati: "Davali Vekili",
  judge: "Hakim",
  mubasir: "Mubasir",
  spectator: "Izleyici",
  jury: "Juri"
};

function roleText(role: string): string {
  return roleTextMap[role] || "Katilimci";
}

async function triggerAiResponse(
  io: SocketIOServer,
  socket: Socket,
  roomCode: string,
  humanRole: string
): Promise<void> {
  if (humanRole !== "davaci" && humanRole !== "davali") {
    return;
  }

  const config = getAiConfig(roomCode);
  if (!config) {
    return;
  }

  const room = getRoom(roomCode);
  if (!room || room.phase !== "claim") {
    return;
  }

  const turn = (aiTurnCounters.get(roomCode) || 0) + 1;
  aiTurnCounters.set(roomCode, turn);

  const opposingLawyer: AgentRole = humanRole === "davaci" ? "davali_avukati" : "davaci_avukati";
  const agent: AgentRole = turn % 3 === 0 ? "judge" : opposingLawyer;

  const transcript = room.messages
    .slice(-8)
    .map((message) => `${message.nickname} (${roleText(message.role)}): ${message.text}`)
    .join("\n");

  const prompt =
    `Mahkeme turu: ${room.courtType || "Asliye Hukuk Mahkemesi"}\n` +
    `Dava ozeti: ${room.claimSummary || "-"}\n\n` +
    `Son konusmalar:\n${transcript}\n\n` +
    `Simdi ${roleText(agent)} olarak SADECE 1-2 kisa cumlelik repligini yaz. ` +
    `Rol disina cikma, aciklama ekleme, tirnak kullanma.`;

  try {
    const text = await generateReply({
      apiKey: config.apiKey,
      model: config.model,
      system: agentPersona[agent],
      prompt
    });

    const added = addAgentMessage(roomCode, agent, text);
    if (added) {
      io.of("/game").to(roomCode).emit("server:chatMessage", { message: added.message });
    }
  } catch (error) {
    socket.emit("server:error", { code: "AI_FAILED", message: `AI yanit veremedi: ${(error as Error).message}` });
  }
}

function generateRoomCode(): string {
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function makeParticipant(socket: Socket, nickname: string): RoomParticipant {
  return {
    id: socket.id,
    nickname,
    role: "spectator",
    isActive: true
  };
}

function getSafeNickname(nickname: string): string {
  return nickname.trim().slice(0, 18);
}

function emitRoomState(io: SocketIOServer, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) {
    return;
  }

  io.of("/game").to(roomCode).emit("server:roomState", { room, phase: room.phase });
}

function scheduleOpeningPhase(io: SocketIOServer, roomCode: string, currentPhase: Exclude<OpeningPhase, "claim">): void {
  const existingTimer = openingTimers.get(roomCode);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    openingTimers.delete(roomCode);

    const nextPhaseByCurrent: Record<Exclude<OpeningPhase, "claim">, OpeningPhase> = {
      lawyer_assignment: "roll_call_countdown",
      roll_call_countdown: "roll_call",
      roll_call: "court_preparing",
      court_preparing: "claim"
    };
    const nextPhase = nextPhaseByCurrent[currentPhase];
    const duration = nextPhase === "claim" ? undefined : openingPhaseDurationsMs[nextPhase];
    const room = setRoomPhase(roomCode, nextPhase, duration);
    if (!room) {
      return;
    }

    io.of("/game").to(roomCode).emit("server:phaseChanged", {
      phase: room.phase,
      triggeredBy: "system"
    });
    emitRoomState(io, roomCode);

    if (nextPhase !== "claim") {
      scheduleOpeningPhase(io, roomCode, nextPhase);
    } else if (room.settings.turnOrder) {
      // Sirayla konusma acik: senaryolu durusma motorunu baslat.
      startTrial(io, roomCode);
    }
  }, openingPhaseDurationsMs[currentPhase]);

  openingTimers.set(roomCode, timer);
}

function registerClientHandlers(io: SocketIOServer, socket: Socket): void {
  socket.on("client:createRoom", (payload: { nickname?: string; apiKey?: string; model?: string; settings?: unknown }, ack?: (response: { ok: boolean; roomCode?: string; message?: string }) => void) => {
    const nickname = getSafeNickname(payload.nickname || "");

    if (nickname.length < 2) {
      ack?.({ ok: false, message: "Lutfen 2-18 karakterlik uygun bir rumuz girin." });
      socket.emit("server:error", { code: "INVALID_NICKNAME", message: "Lutfen 2-18 karakterlik uygun bir rumuz girin." });
      return;
    }

    let roomCode = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateRoomCode();
      if (!getRoom(candidate)) {
        roomCode = candidate;
        break;
      }
    }

    if (!roomCode) {
      ack?.({ ok: false, message: "Oda olusturulamadi, lutfen tekrar deneyin." });
      socket.emit("server:error", { code: "ROOM_CREATE_FAILED", message: "Oda olusturulamadi, lutfen tekrar deneyin." });
      return;
    }

    const room = createRoom(roomCode, parseSettings(payload.settings));
    setAiConfig(roomCode, payload.apiKey || "", payload.model || "");
    io.of("/game").to(roomCode).emit("server:roomState", { room, phase: room.phase });
    ack?.({ ok: true, roomCode });
  });

  socket.on("client:joinRoom", (payload: { nickname?: string; roomCode?: string }, ack?: (response: { ok: boolean; roomCode?: string; message?: string }) => void) => {
    const nickname = getSafeNickname(payload.nickname || "");
    const roomCode = (payload.roomCode || "").toUpperCase().trim();

    if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
      ack?.({ ok: false, message: "Oda kodu gecersiz." });
      socket.emit("server:error", { code: "INVALID_ROOM_CODE", message: "Oda kodu gecersiz." });
      return;
    }

    if (nickname.length < 2) {
      ack?.({ ok: false, message: "Lutfen 2-18 karakterlik uygun bir rumuz girin." });
      socket.emit("server:error", { code: "INVALID_NICKNAME", message: "Lutfen 2-18 karakterlik uygun bir rumuz girin." });
      return;
    }

    const room = getRoom(roomCode);
    if (!room) {
      ack?.({ ok: false, message: "Oda bulunamadi." });
      socket.emit("server:error", { code: "ROOM_NOT_FOUND", message: "Oda bulunamadi." });
      return;
    }

    if (hasNickname(roomCode, nickname)) {
      ack?.({ ok: false, message: "Bu rumuz kullaniliyor." });
      socket.emit("server:error", { code: "DUPLICATE_NICKNAME", message: "Bu rumuz kullaniliyor." });
      return;
    }

    if (room.participants.length >= MAX_PARTICIPANTS) {
      ack?.({ ok: false, message: "Oda dolu." });
      socket.emit("server:error", { code: "ROOM_FULL", message: "Oda dolu." });
      return;
    }

    // Seyirci kapaliysa oda yalnizca iki tarafa (davaci + davali) acik.
    if (!room.settings.spectatorsAllowed && room.participants.length >= 2) {
      ack?.({ ok: false, message: "Bu odaya seyirci alinmiyor; sadece davaci ve davali katilabilir." });
      socket.emit("server:error", { code: "SPECTATORS_DISABLED", message: "Bu odaya seyirci alinmiyor." });
      return;
    }

    const participant = makeParticipant(socket, nickname);
    const updatedRoom = addParticipant(roomCode, participant);
    if (!updatedRoom) {
      ack?.({ ok: false, message: "Oda bulunamadi." });
      socket.emit("server:error", { code: "ROOM_NOT_FOUND", message: "Oda bulunamadi." });
      return;
    }

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.nickname = nickname;

    io.of("/game").to(roomCode).emit("server:roomState", { room: updatedRoom, phase: updatedRoom.phase });
    ack?.({ ok: true, roomCode });
  });

  socket.on(
    "client:selectRole",
    (
      payload: { roomCode?: string; role?: "davaci" | "davali" },
      ack?: (response: { ok: boolean; message?: string }) => void
    ) => {
      const roomCode = (payload.roomCode || "").toUpperCase().trim();
      const role = payload.role;

      if (!roomCode || !role) {
        ack?.({ ok: false, message: "Gecersiz rol secimi." });
        socket.emit("server:error", { code: "INVALID_ROLE_SELECTION", message: "Gecersiz rol secimi." });
        return;
      }

      const existingRoom = getRoom(roomCode);
      const previousPhase = existingRoom?.phase;

      const result = selectRole(roomCode, socket.id, role);
      if (!result.ok || !result.room) {
        ack?.({ ok: false, message: result.message || "Rol secimi basarisiz." });
        socket.emit("server:error", { code: "ROLE_SELECTION_FAILED", message: result.message || "Rol secimi basarisiz." });
        return;
      }

      io.of("/game").to(roomCode).emit("server:roomState", { room: result.room, phase: result.room.phase });
      if (previousPhase && previousPhase !== result.room.phase) {
        io.of("/game").to(roomCode).emit("server:phaseChanged", {
          phase: result.room.phase,
          triggeredBy: socket.data.nickname || "system"
        });
      }
      ack?.({ ok: true });
    }
  );

  socket.on(
    "client:submitClaimSummary",
    (
      payload: { roomCode?: string; text?: string },
      ack?: (response: { ok: boolean; message?: string }) => void
    ) => {
      const roomCode = (payload.roomCode || "").toUpperCase().trim();
      const result = submitClaimSummary(roomCode, socket.id, payload.text || "");

      if (!result.ok || !result.room) {
        ack?.({ ok: false, message: result.message || "Iddia ozeti kaydedilemedi." });
        socket.emit("server:error", { code: "CLAIM_SUMMARY_FAILED", message: result.message || "Iddia ozeti kaydedilemedi." });
        return;
      }

      io.of("/game").to(roomCode).emit("server:roomState", { room: result.room, phase: result.room.phase });
      io.of("/game").to(roomCode).emit("server:phaseChanged", {
        phase: result.room.phase,
        triggeredBy: socket.data.nickname || "davaci"
      });
      scheduleOpeningPhase(io, roomCode, "lawyer_assignment");
      ack?.({ ok: true });
    }
  );

  socket.on(
    "client:sendMessage",
    (
      payload: { roomCode?: string; text?: string },
      ack?: (response: { ok: boolean; message?: string }) => void
    ) => {
      const roomCode = (payload.roomCode || "").toUpperCase().trim();
      const room = getRoom(roomCode);
      const turnMode = Boolean(room?.settings.turnOrder);
      const trialActive = isTrialActive(roomCode);

      const postMessage = () => {
        const result = addChatMessage(roomCode, socket.id, payload.text || "");
        if (!result.ok || !result.message) {
          ack?.({ ok: false, message: result.error || "Mesaj gonderilemedi." });
          socket.emit("server:error", { code: "MESSAGE_FAILED", message: result.error || "Mesaj gonderilemedi." });
          return null;
        }
        io.of("/game").to(roomCode).emit("server:chatMessage", { message: result.message });
        ack?.({ ok: true });
        return result.message;
      };

      // Senaryolu mod: yalnizca sirasi gelen taraf konusur; izleyiciler yan sohbet eder.
      if (turnMode && trialActive) {
        const role = room?.participants.find((participant) => participant.id === socket.id)?.role;
        if (role === "davaci" || role === "davali") {
          if (!isActorsTurn(roomCode, role)) {
            ack?.({ ok: false, message: "Sira sizde degil, lutfen bekleyin." });
            socket.emit("server:error", { code: "NOT_YOUR_TURN", message: "Sira sizde degil, lutfen bekleyin." });
            return;
          }
          if (postMessage()) {
            onHumanTurnDone(io, roomCode);
          }
          return;
        }

        // Izleyici/juri: sahneyi etkilemeyen yan sohbet.
        postMessage();
        return;
      }

      // Serbest mod (sirayla kapali): reaktif AI cevabi.
      const message = postMessage();
      if (message && !turnMode) {
        void triggerAiResponse(io, socket, roomCode, message.role);
      }
    }
  );

  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode as string | undefined;
    if (!roomCode) {
      return;
    }

    const updatedRoom = removeParticipant(roomCode, socket.id);
    if (!updatedRoom) {
      const existingTimer = openingTimers.get(roomCode);
      if (existingTimer) {
        clearTimeout(existingTimer);
        openingTimers.delete(roomCode);
      }
      aiTurnCounters.delete(roomCode);
      disposeTrial(roomCode);
      return;
    }

    io.of("/game").to(roomCode).emit("server:roomState", { room: updatedRoom, phase: updatedRoom.phase });
  });
}

export function registerGameSocketHandlers(io: SocketIOServer): void {
  io.of("/game").on("connection", (socket) => {
    registerClientHandlers(io, socket);
  });
}
