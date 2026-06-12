"use client";

import { Copy, DoorOpen, Gavel, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

type GameSettings = {
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

export default function NewRoomPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("Misafir");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    const nickFromQuery = new URLSearchParams(window.location.search).get("nickname");
    setNickname(nickFromQuery || "Misafir");
    setAiEnabled(Boolean(sessionStorage.getItem("ai_api_key")));
  }, []);

  function createRoom() {
    if (isCreating) {
      return;
    }

    setIsCreating(true);
    setError("");
    setRoomCode("");

    const gameServerUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL || "http://localhost:3100";
    const socket = io(`${gameServerUrl}/game`, { transports: ["websocket"] });
    let isSettled = false;

    const failWithMessage = (message: string) => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      setIsCreating(false);
      setRoomCode("");
      setError(message);
      socket.disconnect();
    };

    const timeoutId = setTimeout(() => {
      failWithMessage("Game server baglantisi zaman asimina ugradi. Lutfen tekrar dene.");
    }, 5000);

    socket.on("connect_error", () => {
      clearTimeout(timeoutId);
      failWithMessage("Game servera baglanilamadi. Lutfen pnpm dev acik oldugunu kontrol et.");
    });

    const apiKey = sessionStorage.getItem("ai_api_key") || "";
    const model = sessionStorage.getItem("ai_model") || "";

    socket.emit(
      "client:createRoom",
      { nickname, apiKey, model, settings },
      (response: { ok: boolean; roomCode?: string; message?: string }) => {
        if (isSettled) {
          return;
        }
        clearTimeout(timeoutId);
        isSettled = true;
        socket.disconnect();
        setIsCreating(false);

        if (!response.ok || !response.roomCode) {
          setRoomCode("");
          setError(response.message || "Oda olusturulamadi.");
          return;
        }

        setRoomCode(response.roomCode);
      }
    );
  }

  function goToRoom() {
    if (!roomCode) {
      return;
    }
    router.push(`/room/${roomCode}?nickname=${encodeURIComponent(nickname)}`);
  }

  const timeoutOptions: Array<{ label: string; value: number | null }> = [
    { label: "60 sn", value: 60 },
    { label: "90 sn", value: 90 },
    { label: "Suresiz", value: null }
  ];

  return (
    <main className="min-h-screen bg-[#251711] px-4 py-8 text-textPrimary">
      <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-5xl items-center gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div className="overflow-hidden rounded-lg border border-white/15 bg-[#fff2c8] shadow-2xl">
          <img src="/mahkeme-salonu.png" alt="Mahkeme salonu" className="h-80 w-full object-cover object-center md:h-[540px]" />
        </div>

        <div className="rounded-lg border border-primary/40 bg-[#172033] p-5 shadow-2xl">
          <p className="text-sm font-semibold text-primary">Oyun kurulumu</p>
          <h1 className="mt-2 text-3xl font-black">Durusmayi ayarla</h1>
          <p className="mt-1 text-textSecondary">
            Oyuncu: {nickname} • AI: {aiEnabled ? "aktif" : "kapali"}
          </p>

          {/* AYARLAR */}
          <div className="mt-5 space-y-3">
            <SettingToggle
              label="Seyirci katilabilsin"
              hint="Kapaliysa odaya yalnizca davaci ve davali girer."
              checked={settings.spectatorsAllowed}
              onChange={(value) => setSettings((current) => ({ ...current, spectatorsAllowed: value }))}
            />
            <SettingToggle
              label="Sirayla konusma (koreografi)"
              hint="Acikken her tarafin sirasi gelince konusur; AI ajanlar aralara girer."
              checked={settings.turnOrder}
              onChange={(value) => setSettings((current) => ({ ...current, turnOrder: value }))}
            />

            <div className="rounded-md border border-white/10 bg-[#0f172a] p-3">
              <p className="text-sm font-semibold">Insan oyuncu cevap suresi</p>
              <p className="text-xs text-textSecondary">Davaci/davali sirasinda bekleme suresi.</p>
              <div className="mt-2 flex gap-2">
                {timeoutOptions.map((option) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => setSettings((current) => ({ ...current, answerTimeoutSec: option.value }))}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                      settings.answerTimeoutSec === option.value
                        ? "border-primary bg-primary text-background"
                        : "border-border text-textSecondary hover:border-primary/60"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-white/10 bg-[#0f172a] p-3">
              <p className="text-sm font-semibold">Tur sayisi</p>
              <div className="mt-2 flex gap-2">
                {[2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSettings((current) => ({ ...current, rounds: value }))}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                      settings.rounds === value
                        ? "border-primary bg-primary text-background"
                        : "border-border text-textSecondary hover:border-primary/60"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ODA KODU */}
          {roomCode ? (
            <div className="mt-5 rounded-lg border border-white/10 bg-[#fff7df] p-4 text-center text-[#23140c]">
              <p className="text-sm font-bold text-[#6b3f25]">Olusan Oda Kodu</p>
              <p className="mt-1 break-all text-4xl font-black tracking-widest">{roomCode}</p>
            </div>
          ) : null}

          {/* AKSIYONLAR */}
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {roomCode ? (
              <>
                <button
                  onClick={goToRoom}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-black text-background"
                >
                  <DoorOpen size={18} />
                  Odaya Gir
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(roomCode)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 font-semibold"
                >
                  <Copy size={18} />
                  Kopyala
                </button>
                <button
                  onClick={() => {
                    setRoomCode("");
                    createRoom();
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 font-semibold"
                >
                  <RefreshCw size={18} />
                  Yeni Kod
                </button>
              </>
            ) : (
              <button
                onClick={createRoom}
                disabled={isCreating}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#e7442f] px-4 py-2 font-black text-white disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-3"
              >
                <Gavel size={18} />
                {isCreating ? "Olusturuluyor..." : "Oda Olustur"}
              </button>
            )}
          </div>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}

function SettingToggle({
  label,
  hint,
  checked,
  onChange
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-[#0f172a] p-3 text-left"
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-textSecondary">{hint}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-primary" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
