"use client";

import { DoorOpen, Hash } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

export default function JoinPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("Misafir");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const canJoin = normalizedCode.length >= 4;

  useEffect(() => {
    const nickFromQuery = new URLSearchParams(window.location.search).get("nickname");
    if (nickFromQuery) {
      setNickname(nickFromQuery);
    }
  }, []);

  function onJoin() {
    if (!canJoin || isJoining) {
      return;
    }

    setIsJoining(true);
    setError("");

    const gameServerUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL || "http://localhost:3100";
    const socket = io(`${gameServerUrl}/game`, { transports: ["websocket"] });

    socket.emit(
      "client:joinRoom",
      { nickname, roomCode: normalizedCode },
      (response: { ok: boolean; roomCode?: string; message?: string }) => {
        socket.disconnect();
        setIsJoining(false);

        if (!response.ok || !response.roomCode) {
          setError(response.message || "Odaya girilemedi.");
          return;
        }

        router.push(`/room?code=${response.roomCode}&nickname=${encodeURIComponent(nickname)}`);
      }
    );
  }

  return (
    <main className="min-h-screen bg-[#1c2536] px-4 py-8 text-textPrimary">
      <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-5xl items-center gap-6 md:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-white/15 bg-[#fff7df] p-6 text-[#23140c] shadow-2xl">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-background">
            <Hash size={24} />
          </div>
          <h1 className="mt-4 text-3xl font-black">Oda kodunu gir</h1>
          <p className="mt-2 text-[#6b3f25]">Oyuncu: {nickname}</p>

          <label className="mt-6 block text-sm font-bold text-[#5a321d]">Oda Kodu</label>
          <input
            value={normalizedCode}
            onChange={(event) => setCode(event.target.value)}
            className="mt-2 w-full rounded-md border border-[#c88c42] bg-white px-3 py-4 text-center text-3xl font-black tracking-widest text-[#23140c] outline-none ring-primary/30 transition focus:ring-4"
            placeholder="AB12CD"
            maxLength={6}
          />

          <button
            onClick={onJoin}
            disabled={!canJoin}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#e7442f] px-4 py-2 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DoorOpen size={18} />
            {isJoining ? "Baglaniyor..." : "Odaya Gir"}
          </button>
          {error ? <p className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
        </div>

        <div className="overflow-hidden rounded-lg border border-white/15 shadow-2xl">
          <img src="/absurt-mahkeme-poster.png" alt="Absurt Mahkeme" className="h-80 w-full object-cover object-center md:h-[520px]" />
        </div>
      </section>
    </main>
  );
}
