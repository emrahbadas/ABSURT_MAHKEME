"use client";

import { DoorOpen, Gavel, UserRound } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "../components/NavBar";
import { ErrorModal } from "../components/ErrorModal";
import { isValidNickname } from "../utils/validation";

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [error, setError] = useState("");

  function validateNickname() {
    if (!isValidNickname(nickname)) {
      setError("Lutfen 2-18 karakterlik uygun bir rumuz girin.");
      return false;
    }
    setError("");
    return true;
  }

  function persistAiSettings() {
    // API anahtari URL'e konmaz; sadece bu sekme icin sessionStorage'da tutulur.
    sessionStorage.setItem("ai_api_key", apiKey.trim());
    sessionStorage.setItem("ai_model", model.trim() || "gpt-4o-mini");
  }

  function onCreateRoom() {
    if (!validateNickname()) {
      return;
    }

    persistAiSettings();
    router.push(`/room/new?nickname=${encodeURIComponent(nickname)}`);
  }

  function onJoinWithCode() {
    if (!validateNickname()) {
      return;
    }

    persistAiSettings();
    router.push(`/join?nickname=${encodeURIComponent(nickname)}`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#20121b] text-textPrimary">
      <img
        src="/absurt-mahkeme-poster.png"
        alt="Absurt Mahkeme afisi"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(32,18,27,0.94),rgba(32,18,27,0.64)_45%,rgba(32,18,27,0.18))]" />
      <NavBar />

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-57px)] max-w-6xl items-end gap-8 px-4 py-8 md:grid-cols-[1fr_390px] md:items-center md:py-12">
        <div className="max-w-2xl pb-4">
          <p className="mb-3 inline-flex rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
            Absurt rol play mahkemesi
          </p>
          <h2 className="max-w-xl text-4xl font-black leading-tight text-white sm:text-5xl">
            Iddiani sun, vekiller abartsin, hakim tokmagi indirsin.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-100">
            Davaci ilk iddiayi girer; sistem mahkeme turunu, AI avukatlari, mubasir anonsunu ve durusma akisini kurar.
          </p>
        </div>

        <div className="rounded-lg border border-white/20 bg-[#fff7df]/95 p-4 text-[#23140c] shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-background">
              <UserRound size={20} />
            </span>
            <div>
              <h3 className="text-lg font-black">Oyuncu girisi</h3>
              <p className="text-sm text-[#6b3f25]">Rumuzunu yaz ve durusmaya gec.</p>
            </div>
          </div>

          <label className="mt-5 block text-sm font-bold text-[#5a321d]">Rumuz</label>
          <input
            className="mt-2 w-full rounded-md border border-[#c88c42] bg-white px-3 py-3 text-[#23140c] outline-none ring-primary/30 transition focus:ring-4"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            maxLength={18}
            placeholder="Ornek: SuperEge"
          />
          <label className="mt-4 block text-sm font-bold text-[#5a321d]">
            OpenAI API Key <span className="font-normal text-[#9a6a4a]">(AI hakim/avukatlar icin)</span>
          </label>
          <input
            type="password"
            className="mt-2 w-full rounded-md border border-[#c88c42] bg-white px-3 py-3 text-[#23140c] outline-none ring-primary/30 transition focus:ring-4"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-... (bos birakirsan AI kapali olur)"
            autoComplete="off"
            spellCheck={false}
          />

          <label className="mt-3 block text-sm font-bold text-[#5a321d]">Model</label>
          <select
            className="mt-2 w-full rounded-md border border-[#c88c42] bg-white px-3 py-2.5 text-[#23140c] outline-none ring-primary/30 transition focus:ring-4"
            value={model}
            onChange={(event) => setModel(event.target.value)}
          >
            <option value="gpt-4o-mini">GPT-4o mini (hizli / ucuz)</option>
            <option value="gpt-4.1-mini">GPT-4.1 mini (daha yetenekli)</option>
          </select>
          <p className="mt-1 text-xs text-[#9a6a4a]">
            Ikisi de gorsel destekli (ileride kanit resmi icin). Anahtar yalnizca bu sekmede tutulur, sunucuya yalnizca oda kuran kisiden gider.
          </p>
          {error ? (
            <div className="mt-3 text-textPrimary">
              <ErrorModal message={error} />
            </div>
          ) : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              onClick={onCreateRoom}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#e7442f] px-3 py-2 font-black text-white shadow-md transition hover:bg-[#c93525]"
            >
              <Gavel size={18} />
              Oda Olustur
            </button>
            <button
              onClick={onJoinWithCode}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#c88c42] bg-white px-3 py-2 font-black text-[#23140c] transition hover:bg-[#fff1c4]"
            >
              <DoorOpen size={18} />
              Koda Katil
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
