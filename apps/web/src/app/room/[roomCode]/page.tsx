"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

type ParticipantRole = "davaci" | "davali" | "davaci_avukati" | "davali_avukati" | "spectator" | "jury";
type RoomPhase = "lobby" | "claim_summary" | "lawyer_assignment" | "roll_call_countdown" | "roll_call" | "court_preparing" | "opening" | "claim";

type RoomParticipant = {
  id: string;
  nickname: string;
  role: ParticipantRole;
  isActive: boolean;
};

type OpeningInfo = {
  davaciName: string;
  davaliName: string;
  davaciAvukatiName: string;
  davaliAvukatiName: string;
  bailiffAnnouncement: string;
};

type MessageRole = ParticipantRole | "judge" | "mubasir";

type ChatMessage = {
  id: string;
  nickname: string;
  role: MessageRole;
  text: string;
  ts: number;
};

type GameSettings = {
  spectatorsAllowed: boolean;
  turnOrder: boolean;
  answerTimeoutSec: number | null;
  rounds: number;
};

type TrialState = {
  totalRounds: number;
  round: number;
  index: number;
  activeActor?: "davaci" | "davali";
  turnEndsAt?: number;
  finished: boolean;
};

type RoomStatePayload = {
  room: {
    code: string;
    phase: RoomPhase;
    participants: RoomParticipant[];
    claimSummary?: string;
    courtType?: string;
    phaseEndsAt?: number;
    opening?: OpeningInfo;
    messages?: ChatMessage[];
    settings?: GameSettings;
    trial?: TrialState;
  };
};

// Sahnedeki karakterlere gore sabit baloncuk konumlari (poster gorseli baz alinarak).
// Resim degisince sadece bu yuzde degerlerini guncellemek yeterli.
type BubbleSlot = "judge" | "mubasir" | "davaci_avukati" | "davali_avukati" | "davaci" | "davali";

type BubbleAnchor = {
  style: CSSProperties;
  tail: "left" | "center" | "right";
};

const bubbleAnchors: Record<BubbleSlot, BubbleAnchor> = {
  // Hakim: ortada kursude
  judge: { style: { top: "1%", left: "50%", transform: "translateX(-50%)" }, tail: "center" },
  // Davaci vekili: soldaki cubbeli avukat
  davaci_avukati: { style: { top: "15%", left: "20%" }, tail: "center" },
  // Davali vekili: en sagdaki cubbeli avukat
  davali_avukati: { style: { top: "19%", right: "2%" }, tail: "center" },
  // Mubasir: en soldaki polis memuru
  mubasir: { style: { top: "19%", left: "1%" }, tail: "center" },
  // Davaci: kirmizi ceketli kadin
  davaci: { style: { top: "33%", left: "9%" }, tail: "center" },
  // Davali: tavuk kostumlu adam
  davali: { style: { top: "31%", left: "70%" }, tail: "center" }
};

// Her slot bir sahne seridine ait. Serit basina ayni anda tek baloncuk gosterilir
// (en son konusan), boylece ayni tarafta ust uste binme olmaz.
type BubbleLane = "left" | "center" | "right";
const laneOfSlot: Record<BubbleSlot, BubbleLane> = {
  judge: "center",
  davaci_avukati: "left",
  mubasir: "left",
  davaci: "left",
  davali_avukati: "right",
  davali: "right"
};

const BUBBLE_TTL_MS = 7000;

function bubbleSlotForRole(role: MessageRole): BubbleSlot | null {
  if (role === "judge") {
    return "judge";
  }
  if (role === "mubasir") {
    return "mubasir";
  }
  if (role === "davaci" || role === "davali" || role === "davaci_avukati" || role === "davali_avukati") {
    return role;
  }
  return null;
}

const phaseLabels: Record<RoomPhase, string> = {
  lobby: "Lobi",
  claim_summary: "Iddia ozeti",
  lawyer_assignment: "Vekil atamasi",
  roll_call_countdown: "Yoklama hazirligi",
  roll_call: "Mubasir anonsu",
  court_preparing: "Salon hazirlaniyor",
  opening: "Acilis",
  claim: "Durusma basladi"
};

export default function RoomPage() {
  const params = useParams<{ roomCode: string }>();
  const socketRef = useRef<Socket | null>(null);
  const [nickname, setNickname] = useState("Misafir");
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [phase, setPhase] = useState<RoomPhase>("lobby");
  const [claimSummary, setClaimSummary] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [courtType, setCourtType] = useState("");
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | undefined>();
  const [opening, setOpening] = useState<OpeningInfo | undefined>();
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [error, setError] = useState("");
  const [roleActionLoading, setRoleActionLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [settings, setSettings] = useState<GameSettings | undefined>();
  const [trial, setTrial] = useState<TrialState | undefined>();
  const [typingRole, setTypingRole] = useState<string | null>(null);
  const [turnRemaining, setTurnRemaining] = useState<number | null>(null);
  const [laneShownUntil, setLaneShownUntil] = useState<Record<string, number>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const roomCode = (params?.roomCode || "----").toUpperCase();

  const currentParticipant = useMemo(
    () => participants.find((participant) => participant.nickname === nickname),
    [participants, nickname]
  );
  const davaci = participants.find((participant) => participant.role === "davaci");
  const davali = participants.find((participant) => participant.role === "davali");

  const laneLatest = useMemo(() => {
    const result: Record<BubbleLane, { slot: BubbleSlot; message: ChatMessage } | undefined> = {
      left: undefined,
      center: undefined,
      right: undefined
    };
    for (const message of messages) {
      const slot = bubbleSlotForRole(message.role);
      if (slot) {
        result[laneOfSlot[slot]] = { slot, message };
      }
    }
    return result;
  }, [messages]);

  useEffect(() => {
    const nickFromQuery = new URLSearchParams(window.location.search).get("nickname");
    const safeNickname = nickFromQuery || "Misafir";
    setNickname(safeNickname);

    const gameServerUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL || "http://localhost:3100";
    const socket = io(`${gameServerUrl}/game`, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.emit("client:joinRoom", { nickname: safeNickname, roomCode });

    socket.on("server:roomState", (payload: RoomStatePayload) => {
      if (payload.room.code === roomCode) {
        setParticipants(payload.room.participants);
        setPhase(payload.room.phase || "lobby");
        setClaimSummary(payload.room.claimSummary || "");
        setCourtType(payload.room.courtType || "");
        setPhaseEndsAt(payload.room.phaseEndsAt);
        setOpening(payload.room.opening);
        if (Array.isArray(payload.room.messages)) {
          setMessages(payload.room.messages);
        }
        setSettings(payload.room.settings);
        setTrial(payload.room.trial);
      }
    });

    socket.on("server:chatMessage", (payload: { message: ChatMessage }) => {
      if (!payload?.message) {
        return;
      }
      setTypingRole(null);
      const slot = bubbleSlotForRole(payload.message.role);
      if (slot) {
        const lane = laneOfSlot[slot];
        setLaneShownUntil((current) => ({ ...current, [lane]: Date.now() + BUBBLE_TTL_MS }));
      }
      setMessages((current) => {
        if (current.some((item) => item.id === payload.message.id)) {
          return current;
        }
        return [...current, payload.message];
      });
    });

    socket.on("server:agentTyping", (payload: { role?: string }) => {
      setTypingRole(payload?.role || null);
    });

    socket.on("server:error", (payload: { message?: string }) => {
      setError(payload.message || "Oda baglantisinda hata olustu.");
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [roomCode]);

  useEffect(() => {
    if (!phaseEndsAt) {
      setRemainingSeconds(0);
      return;
    }

    const targetTime = phaseEndsAt;
    function updateRemainingTime() {
      setRemainingSeconds(Math.max(0, Math.ceil((targetTime - Date.now()) / 1000)));
    }

    updateRemainingTime();
    const intervalId = window.setInterval(updateRemainingTime, 250);
    return () => window.clearInterval(intervalId);
  }, [phaseEndsAt]);

  useEffect(() => {
    const log = chatLogRef.current;
    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 600);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const endsAt = trial?.turnEndsAt;
    if (!endsAt) {
      setTurnRemaining(null);
      return;
    }
    const update = () => setTurnRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    update();
    const intervalId = window.setInterval(update, 250);
    return () => window.clearInterval(intervalId);
  }, [trial?.turnEndsAt]);

  function selectRole(role: "davaci" | "davali") {
    if (!socketRef.current) {
      setError("Sunucu baglantisi hazir degil.");
      return;
    }

    setRoleActionLoading(true);
    setError("");

    socketRef.current.emit("client:selectRole", { roomCode, role }, (response: { ok: boolean; message?: string }) => {
      setRoleActionLoading(false);
      if (!response.ok) {
        setError(response.message || "Rol secimi basarisiz.");
      }
    });
  }

  function submitSummary() {
    if (!socketRef.current || summaryLoading) {
      return;
    }

    setSummaryLoading(true);
    setError("");
    socketRef.current.emit("client:submitClaimSummary", { roomCode, text: draftSummary }, (response: { ok: boolean; message?: string }) => {
      setSummaryLoading(false);
      if (!response.ok) {
        setError(response.message || "Iddia ozeti kaydedilemedi.");
      }
    });
  }

  function sendMessage() {
    const text = draftMessage.trim();
    if (!socketRef.current || text.length === 0) {
      return;
    }

    socketRef.current.emit("client:sendMessage", { roomCode, text }, (response: { ok: boolean; message?: string }) => {
      if (!response.ok) {
        setError(response.message || "Mesaj gonderilemedi.");
        return;
      }
      setError("");
    });
    setDraftMessage("");
  }

  function roleLabel(role: MessageRole): string {
    if (role === "judge") {
      return "Hakim";
    }
    if (role === "mubasir") {
      return "Mubasir";
    }
    if (role === "davaci") {
      return "Davaci";
    }
    if (role === "davali") {
      return "Davali";
    }
    if (role === "davaci_avukati") {
      return "Davaci Avukati";
    }
    if (role === "davali_avukati") {
      return "Davali Avukati";
    }
    if (role === "jury") {
      return "Juri";
    }
    return "Izleyici";
  }

  function renderPhasePanel() {
    if (phase === "claim_summary") {
      const isDavaci = currentParticipant?.role === "davaci";

      return (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-bold">Iddia Ozeti</h2>
          <p className="mt-2 text-sm text-textSecondary">
            Davayi acan kisi ilk iddiasini sunar. Sistem bu iddiadan mahkeme turunu, taraf vekillerini ve acilis akisini sekillendirir.
          </p>
          {isDavaci ? (
            <>
              <textarea
                value={draftSummary}
                onChange={(event) => setDraftSummary(event.target.value.slice(0, 600))}
                className="mt-4 min-h-32 w-full resize-none rounded-md border border-border bg-surfaceElevated px-3 py-2 text-sm text-textPrimary"
                placeholder="Ornek: Davali, ortak mutfaktaki son baklavayi yedigini inkar ediyor. Davaci kamera kaydi ve cay lekesiyle hakkini ariyor."
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-textSecondary">{draftSummary.length}/600</span>
                <button
                  type="button"
                  onClick={submitSummary}
                  disabled={summaryLoading || draftSummary.trim().length < 20}
                  className="rounded-md bg-primary px-4 py-2 font-semibold text-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {summaryLoading ? "Kaydediliyor..." : "Iddiayi Sun"}
                </button>
              </div>
            </>
          ) : (
            <p className="mt-4 rounded-md bg-surfaceElevated px-3 py-2 text-sm text-textSecondary">
              Davaci {davaci?.nickname || "oyuncu"} ilk iddiasini hazirliyor.
            </p>
          )}
        </div>
      );
    }

    if (phase === "lawyer_assignment") {
      return (
        <div className="rounded-xl border border-primaryDark bg-surface p-5">
          <h2 className="text-lg font-bold text-primary">Vekiller Ataniyor</h2>
          <p className="mt-2 text-sm text-textSecondary">Katip kaydi aciliyor, taraf vekilleri dosyaya isleniyor.</p>
          <p className="mt-4 text-3xl font-extrabold">{remainingSeconds}</p>
        </div>
      );
    }

    if (phase === "roll_call_countdown") {
      return (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-bold">Yoklama Icin Geri Sayim</h2>
          <p className="mt-2 text-sm text-textSecondary">Avukatlar yerini aldi. Mubasir taraflari salona cagirmadan once yoklama hazirlaniyor.</p>
          <p className="mt-4 text-5xl font-black text-primary">{remainingSeconds}</p>
        </div>
      );
    }

    if (phase === "roll_call") {
      return (
        <div className="rounded-xl border border-primaryDark bg-surface p-5">
          <h2 className="text-lg font-bold text-primary">Mubasir Anonsu</h2>
          <p className="mt-3 rounded-md bg-surfaceElevated px-3 py-3 text-sm leading-6 text-textPrimary">
            {opening?.bailiffAnnouncement || "Mubasir taraflari ve vekilleri salona davet eder."}
          </p>
          <p className="mt-3 text-sm text-textSecondary">Mahkeme: {courtType || "Asliye Hukuk Mahkemesi"}</p>
        </div>
      );
    }

    if (phase === "court_preparing") {
      return (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-bold">Durusma Salonu Hazirlaniyor</h2>
          <p className="mt-2 text-sm text-textSecondary">Hakim dosyayi inceliyor, taraflar yerlerine geciyor, kayit aciliyor.</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surfaceElevated">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
          </div>
          <p className="mt-3 text-sm text-textSecondary">Baslamaya {remainingSeconds} saniye.</p>
        </div>
      );
    }

    return null;
  }

  if (phase === "claim") {
    const myRole = currentParticipant?.role;
    const isParty = myRole === "davaci" || myRole === "davali";
    const isSpectator = !isParty;
    const trialActive = Boolean(trial && !trial.finished);
    const isMyTurn = trialActive && trial?.activeActor === myRole;
    // Senaryolu modda: sirasi gelen taraf veya izleyici (yan sohbet) yazabilir.
    const canType = !trialActive || isMyTurn || isSpectator;

    let turnBanner: { text: string; tone: "wait" | "you" | "ai" | "done" };
    if (!trial) {
      turnBanner = { text: "Serbest tartisma", tone: "wait" };
    } else if (trial.finished) {
      turnBanner = { text: "Durusma sona erdi", tone: "done" };
    } else if (trial.activeActor) {
      const actorParticipant = participants.find((participant) => participant.role === trial.activeActor);
      const actorName = actorParticipant?.nickname || roleLabel(trial.activeActor);
      turnBanner = isMyTurn
        ? { text: "Soz sende! Konus.", tone: "you" }
        : { text: `Sira: ${roleLabel(trial.activeActor)} (${actorName})`, tone: "wait" };
    } else {
      turnBanner = { text: `${typingRole ? roleLabel(typingRole as ParticipantRole) : "Mahkeme"} konusuyor...`, tone: "ai" };
    }

    const bannerToneClass =
      turnBanner.tone === "you"
        ? "border-success text-success"
        : turnBanner.tone === "ai"
          ? "border-secondary text-secondary"
          : turnBanner.tone === "done"
            ? "border-border text-textSecondary"
            : "border-primaryDark text-primary";

    const inputPlaceholder = !canType
      ? "Sira sende degil, bekle..."
      : isSpectator && trialActive
        ? "Izleyici sohbeti..."
        : "Mesajini buraya yaz...";

    const typingSlot = typingRole ? bubbleSlotForRole(typingRole as MessageRole) : null;

    return (
      <main className="min-h-screen bg-background px-4 py-6 text-textPrimary">
        <section className="mx-auto flex max-w-4xl flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-extrabold tracking-widest">{roomCode}</h1>
              <p className="text-xs text-textSecondary">
                {courtType || "Asliye Hukuk Mahkemesi"}
                {trial ? ` • Tur ${trial.round}/${trial.totalRounds}` : " • Durusma suruyor"}
              </p>
            </div>
            <Link href="/" className="rounded-md border border-border px-3 py-1.5 text-sm">
              Cikis
            </Link>
          </div>

          <div className={`flex items-center justify-between gap-3 rounded-xl border bg-surface px-4 py-2.5 ${bannerToneClass}`}>
            <span className="text-sm font-bold">{turnBanner.text}</span>
            {turnBanner.tone === "wait" && trial?.activeActor && turnRemaining !== null ? (
              <span className="text-sm font-black tabular-nums">{turnRemaining}s</span>
            ) : null}
            {turnBanner.tone === "you" && turnRemaining !== null ? (
              <span className="text-sm font-black tabular-nums">{turnRemaining}s</span>
            ) : null}
          </div>

          <div className="relative aspect-[43/24] w-full overflow-hidden rounded-2xl border border-border bg-black">
            <img
              src="/mahkeme-salonu.png"
              alt="Mahkeme salonu"
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0">
              {(["left", "center", "right"] as BubbleLane[]).map((lane) => {
                const typingHere = typingSlot && laneOfSlot[typingSlot] === lane ? typingSlot : null;
                const latest = laneLatest[lane];
                const messageVisible = latest && nowMs < (laneShownUntil[lane] ?? 0);
                const slot = typingHere || (messageVisible && latest ? latest.slot : null);
                if (!slot) {
                  return null;
                }
                const isTyping = Boolean(typingHere);
                const message = !isTyping && latest ? latest.message : null;
                const anchor = bubbleAnchors[slot];
                const tailClass =
                  anchor.tail === "left"
                    ? "left-5"
                    : anchor.tail === "right"
                      ? "right-5"
                      : "left-1/2 -translate-x-1/2";
                return (
                  <div key={lane} className="absolute w-[40%] max-w-[160px]" style={anchor.style}>
                    <div className="relative rounded-2xl bg-white px-2.5 py-1.5 text-slate-900 shadow-lg ring-1 ring-black/10">
                      {isTyping ? (
                        <p className="text-xs font-bold tracking-widest text-primaryDark">. . .</p>
                      ) : message ? (
                        <>
                          <p className="text-[9px] font-bold uppercase tracking-wide text-primaryDark">
                            {message.nickname} • {roleLabel(message.role)}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold leading-snug">{message.text}</p>
                        </>
                      ) : null}
                      <span className={`absolute -bottom-1.5 h-3 w-3 rotate-45 bg-white ${tailClass}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-bold">Durusma Sohbeti</h2>
              <span className="text-xs text-textSecondary">{messages.length} mesaj</span>
            </div>
            <div ref={chatLogRef} className="max-h-72 min-h-40 space-y-1.5 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? (
                <p className="text-sm text-textSecondary">Durusma basliyor...</p>
              ) : (
                messages.map((message) => (
                  <p key={message.id} className="text-sm leading-6">
                    <span className="font-bold text-primary">
                      {message.nickname} ({roleLabel(message.role)}):
                    </span>{" "}
                    <span className="text-textPrimary">{message.text}</span>
                  </p>
                ))
              )}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
              className="flex items-center gap-2 border-t border-border p-3"
            >
              <input
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value.slice(0, 240))}
                placeholder={inputPlaceholder}
                disabled={!canType}
                className="flex-1 rounded-md border border-border bg-surfaceElevated px-3 py-2 text-sm text-textPrimary outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!canType || draftMessage.trim().length === 0}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                Gonder
              </button>
            </form>
          </div>
          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-textPrimary">
      <section className="mx-auto max-w-5xl space-y-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-textSecondary">Oda Kodu</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-widest">{roomCode}</h1>
          <p className="mt-3 text-sm text-textSecondary">
            Hos geldin, {nickname}. Aktif faz: {phaseLabels[phase]}.
          </p>
        </div>

        {renderPhasePanel()}

        {settings ? (
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-lg font-bold">Oyun Ayarlari</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-surfaceElevated px-3 py-1">
                Seyirci: {settings.spectatorsAllowed ? "acik" : "kapali"}
              </span>
              <span className="rounded-full bg-surfaceElevated px-3 py-1">
                Sirayla konusma: {settings.turnOrder ? "acik" : "kapali"}
              </span>
              <span className="rounded-full bg-surfaceElevated px-3 py-1">
                Cevap suresi: {settings.answerTimeoutSec ? `${settings.answerTimeoutSec} sn` : "suresiz"}
              </span>
              <span className="rounded-full bg-surfaceElevated px-3 py-1">Tur: {settings.rounds}</span>
            </div>
          </div>
        ) : null}

        {claimSummary ? (
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-lg font-bold">Ilk Iddia</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">{claimSummary}</p>
            <p className="mt-3 text-sm text-primary">{courtType || "Asliye Hukuk Mahkemesi"}</p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-lg font-bold">Taraflar ve Katilimcilar</h2>
            <ul className="mt-3 space-y-2 text-sm text-textSecondary">
              {participants.map((participant) => (
                <li key={participant.id} className="flex items-center justify-between gap-3 rounded-md bg-surfaceElevated px-3 py-2">
                  <span>{participant.nickname}{participant.nickname === nickname ? " (sen)" : ""}</span>
                  <span className="text-xs text-primary">{roleLabel(participant.role)}</span>
                </li>
              ))}
              {participants.length === 0 ? (
                <li className="rounded-md bg-surfaceElevated px-3 py-2">Diger oyuncular baglaninca burada gorunecek</li>
              ) : null}
            </ul>
            {opening ? (
              <div className="mt-4 grid gap-2 text-sm text-textSecondary sm:grid-cols-2">
                <p>Davaci: {opening.davaciName}</p>
                <p>Davali: {opening.davaliName}</p>
                <p>Davaci vekili: {opening.davaciAvukatiName}</p>
                <p>Davali vekili: {opening.davaliAvukatiName}</p>
              </div>
            ) : null}
            {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-lg font-bold">Aksiyonlar</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={roleActionLoading || phase !== "lobby"}
                onClick={() => selectRole("davaci")}
                className="rounded-md border border-border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Davaci Ol
              </button>
              <button
                type="button"
                disabled={roleActionLoading || phase !== "lobby"}
                onClick={() => selectRole("davali")}
                className="rounded-md border border-border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Davali Ol
              </button>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(roomCode)}
                className="rounded-md bg-primary px-3 py-2 font-semibold text-background"
              >
                Kodu Kopyala
              </button>
              <Link href="/" className="rounded-md border border-border px-3 py-2">
                Ana Sayfaya Don
              </Link>
            </div>
            <p className="mt-3 text-xs text-textSecondary">
              Baslangic sirasi: taraflar secilir, davaci ilk iddiasini sunar, sistem mahkeme turunu ve vekilleri belirler, mubasir yoklama yapar.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
