import type { Server as SocketIOServer } from "socket.io";
import { addAgentMessage, getAiConfig, getRoom, initTrial } from "./roomManager";
import type { AgentRole, Room, SpeakerRole, TrialBeat } from "./roomManager";
import { generateReply } from "./aiClient";

// Bir cikti geldikten sonra siradaki konusmacinin (AI veya insan) baslamasi icin
// minimum bekleme. Sahneler cok hizli gecmesin, izleyici okuyabilsin.
const AI_BEAT_DELAY_MS = 6000;
const HUMAN_ADVANCE_DELAY_MS = 6000;
const turnTimers = new Map<string, NodeJS.Timeout>();

function emitState(io: SocketIOServer, code: string): void {
  const room = getRoom(code);
  if (room) {
    io.of("/game").to(code).emit("server:roomState", { room, phase: room.phase });
  }
}

function clearTurnTimer(code: string): void {
  const timer = turnTimers.get(code);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(code);
  }
}

const personaBySpeaker: Record<AgentRole, string> = {
  davaci_avukati:
    "Sen davaci tarafin komik bir AVUKATISIN. Muvekkilini hep 3. sahis ('muvekkilim') savunursun; kendini davaci veya bir nesne yerine koymazsin. KISA ve vurucu konusursun: tek absurt benzetme + komik punchline. Uzun tirat YOK.",
  davali_avukati:
    "Sen davali tarafin komik bir AVUKATISIN. Muvekkilini hep 3. sahis ('muvekkilim') savunursun; kendini davali veya bir nesne yerine koymazsin. KISA ve vurucu konusursun: karsi tarafi sevimli igneleyen tek komik cumle. Uzun tirat YOK.",
  judge:
    "Sen alayci, lafini sakinmayan, komik ama otoriter bir hakimsin. KISA, igneleyici tek cumlelerle taraflari tiye alirsin. Uzun konusma YOK. Amacin izleyiciyi guldurmek.",
  mubasir: "Sen teatral ve komik bir mubasirsin. KISA, abartili, eglenceli tek cumlelik anonslar yaparsin."
};

const speakerLabel: Record<AgentRole, string> = {
  davaci_avukati: "Davaci Vekili",
  davali_avukati: "Davali Vekili",
  judge: "Hakim",
  mubasir: "Mubasir"
};

function lastMessageByRole(room: Room, role: "davaci" | "davali"): string | undefined {
  for (let index = room.messages.length - 1; index >= 0; index -= 1) {
    if (room.messages[index].role === role) {
      return room.messages[index].text;
    }
  }
  return undefined;
}

function quote(text?: string): string {
  if (!text) {
    return '"(henuz bir sey soylemedi)"';
  }
  return `"${text.slice(0, 160)}"`;
}

function intentInstruction(beat: TrialBeat, room: Room): string {
  const court = room.courtType || "Asliye Hukuk Mahkemesi";
  const davaci = room.opening?.davaciName || "Davaci";
  const davali = room.opening?.davaliName || "Davali";
  const lastDavaci = lastMessageByRole(room, "davaci");
  const lastDavali = lastMessageByRole(room, "davali");

  switch (beat.intent) {
    case "open":
      return `'${court}' davasinda ${davaci} ve ${davali}'yi salona cagirarak durusmayi abartili ve komik bir tonda ac.`;
    case "amplify_davaci":
      return `Davaci ${davaci} AZ ONCE sunu dedi: ${quote(lastDavaci)}. Tam bu cumledeki SPESIFIK detaya (gectigi nesne/yer/sayi/iddia) DOGRUDAN gonderme yaparak onu absurt ve komik sekilde abart. Genel kek/adalet lafi ETME, bu spesifik detaya tak.`;
    case "amplify_davali":
      return `Davali ${davali} AZ ONCE sunu dedi: ${quote(lastDavali)}. Tam bu cumleye DOGRUDAN gonderme yaparak muvekkilini savun ve karsi tarafi komik sekilde curut. Genel laf ETME, bu spesifik detaya tak.`;
    case "round_summary":
      return `Son cikislar -> ${davaci}: ${quote(lastDavaci)} | ${davali}: ${quote(lastDavali)}. Bu iki SPESIFIK cikisa gonderme yaparak ikisini de isimleriyle komik sekilde tiye al, sonra sonraki tura gectigini soyle.`;
    case "verdict":
      return `Son cikislar -> ${davaci}: ${quote(lastDavaci)} | ${davali}: ${quote(lastDavali)}. Bu cikislardaki SOMUT detaylari (sayilar, nesneler, yerler, suclamalar) karara dahil ederek komik ve kesin bir karar ver (suclu veya beraat), gulunecek kadar absurt bir ceza ver ve tokmagi indir (TAK!).`;
    case "close":
      return "Durusmanin bittigini komik ve teatral sekilde duyur, salonu bosalt.";
    default:
      return "Rolunde kisa, komik bir replik yaz.";
  }
}

// AI'nin kendi rolunu unutmamasi (orn. avukatin "kek" agziyla konusmasi) icin
// her mesajda rolu somut ve sahis bilgisiyle hatirlatir.
function roleAnchor(beat: TrialBeat, room: Room): string {
  const davaci = room.opening?.davaciName || "Davaci";
  const davali = room.opening?.davaliName || "Davali";
  switch (beat.speaker) {
    case "davaci_avukati":
      return `Sen davaci ${davaci}'nin AVUKATISIN. Ondan "muvekkilim" diye 3. sahis bahsedersin; onun hakkini savunursun.`;
    case "davali_avukati":
      return `Sen davali ${davali}'nin AVUKATISIN. Ondan "muvekkilim" diye 3. sahis bahsedersin; onun hakkini savunursun.`;
    case "judge":
      return "Sen HAKIMSIN; durusmayi yonetir, taraflari tiye alir ve karar verirsin.";
    case "mubasir":
      return "Sen MUBASIRSIN; salona anons yaparsin.";
    default:
      return "";
  }
}

// Modelin bazen ekledigi konusmaci etiketini ve cok-karakterli diyalogu temizler.
function sanitizeReply(text: string): string {
  let out = text.trim();
  // Bastaki "KAYRA:", "AV. MUZAFFER ...:", "Av. Mebrure ...:" gibi konusmaci etiketini at.
  out = out.replace(/^["'`\s]*(?:[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9.\s]{1,38}|Av\.[^\n:]{1,38}):\s*/u, "");
  // Model birden fazla konusmaci uretmisse, ikinci "AD:" etiketinden once kes.
  const secondSpeaker = out.search(/\s[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ.]{1,30}:\s/u);
  if (secondSpeaker > 15) {
    out = out.slice(0, secondSpeaker);
  }
  out = out.replace(/^["'`]+|["'`]+$/g, "").trim();

  // Token limiti yuzunden cumle yarim kalmissa, son tamamlanmis cumleye kadar kirp.
  if (!/[.!?…)"']\s*$/u.test(out)) {
    const lastPunct = Math.max(out.lastIndexOf("."), out.lastIndexOf("!"), out.lastIndexOf("?"), out.lastIndexOf("…"));
    if (lastPunct >= 15) {
      out = out.slice(0, lastPunct + 1).trim();
    }
  }
  return out;
}

const fallbackPool: Record<string, string[]> = {
  open: [
    "Degerli hazirun, durusma basliyor! Taraflar salona alinsin!",
    "Sessizlik! Mahkeme heyeti geliyor, herkes ayaga!",
    "Durusma baslamistir, taraflar yerlerini alsin!"
  ],
  amplify_davaci: [
    "Sayin hakim, muvekkilim o kadar hakli ki adalet bile onu kiskaniyor!",
    "Bu haksizlik karsisinda tarih bile utancindan kizardi sayin hakim!",
    "Muvekkilimin masumiyeti gun gibi ortada, hatta gunes biraz kiskandi!"
  ],
  amplify_davali: [
    "Sayin hakim, bu iddialar pamuk sekeri kadar havali ama bir o kadar bos!",
    "Muvekkilim masum; suclu ararsak en fazla kaderi suclu bulabiliriz!",
    "Karsi tarafin delili, ruzgarda ucan bir alisveris fisi kadar saglam!"
  ],
  round_summary: [
    "Ikinizi de dinledim, ikiniz de bir alem cikti; haydi sonraki tura!",
    "Bu kadar drama tiyatroya yakisir; devam, sonraki tur!",
    "Kafam karisti ama eglendim; bir sonraki tura geciyoruz!"
  ],
  verdict: [
    "Geregi dusunuldu, karar aciklanmistir. Tokmak inmistir! (TAK!)",
    "Mahkememiz karar vermistir, tokmak inmistir! (TAK!)",
    "Hukum kesinlesmistir, dosya kapanmistir! (TAK!)"
  ],
  close: [
    "Durusma bitmistir, salonu bosaltin arkadaslar!",
    "Oturum sona ermistir, herkese gecmis olsun!",
    "Mahkeme tatil edilmistir, salonu bosaltin!"
  ]
};

function fallbackLine(beat: TrialBeat): string {
  const pool = fallbackPool[beat.intent];
  if (!pool || pool.length === 0) {
    return "Soz bende, kisaca belirteyim.";
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildPrompt(room: Room, beat: TrialBeat): string {
  const transcript = room.messages
    .slice(-10)
    .map((message) => `- ${message.nickname}: ${message.text}`)
    .join("\n");
  const label = speakerLabel[beat.speaker as AgentRole];
  const maxSentence =
    beat.intent === "verdict" ? "en fazla 2 kisa cumle (toplam ~35 kelime)" : "TEK kisa cumle (en fazla ~25 kelime)";

  return (
    `Mahkeme turu: ${room.courtType || "Asliye Hukuk Mahkemesi"}\n` +
    `ANA DAVA KONUSU (tartisma HER ZAMAN bunun etrafinda kalmali): ${room.claimSummary || "-"}\n\n` +
    `Sahnedeki son konusmalar (YALNIZCA baglam icindir; bunlari tekrar etme, devamini yazma):\n` +
    `${transcript || "(henuz konusma yok)"}\n\n` +
    `${roleAnchor(beat, room)}\n` +
    `Gorevin: ${intentInstruction(beat, room)}\n\n` +
    `TON: Absurt, eglenceli, guldurucu olsun; sevimli/komik alay olur ama hakaret, kufur veya kiricilik OLMAZ. Hedef: izleyici gulsun.\n\n` +
    `COK ONEMLI KURALLAR:\n` +
    `- SADECE kendi replicini yaz: ${maxSentence}. Bu siniri ASLA asma; uzun paragraf/tirat YASAK.\n` +
    `- DENGE: En son sozdeki/sakadaki spesifik detaydan ILHAM AL ve ona gonderme yap; ama o ilhami ANA DAVA KONUSUNA BAGLA. Yani komikligi son sozden cikar, baglami davadan koru.\n` +
    `- Cumleni mutlaka tamamla; yarim birakma.\n` +
    `- ROLUNDE KAL: kendini baska biri (davaci/davali) ya da bir nesne (orn. kek) yerine koyma; onlarin agziyla 1. sahis konusma.\n` +
    `- Cevabin basina konusmaci adi/etiketi KOYMA (ornegin "KAYRA:", "${label}:" yazma).\n` +
    `- Baska karakterlerin sozlerini YAZMA, diyalog kurma, listeleme.\n` +
    `- Tirnak, parantez, aciklama ekleme. Sadece duz replik metni.`
  );
}

export function startTrial(io: SocketIOServer, code: string): void {
  const trial = initTrial(code);
  if (!trial) {
    return;
  }
  emitState(io, code);
  driveBeat(io, code);
}

// Aktif beat'i isler: insan ise sira aci ve bekle, AI ise uret-bas-ilerle.
function driveBeat(io: SocketIOServer, code: string): void {
  const room = getRoom(code);
  if (!room || !room.trial) {
    return;
  }

  const trial = room.trial;

  if (trial.index >= trial.beats.length) {
    trial.finished = true;
    trial.activeActor = undefined;
    trial.turnEndsAt = undefined;
    clearTurnTimer(code);
    emitState(io, code);
    return;
  }

  const beat = trial.beats[trial.index];
  trial.round = beat.round;

  if (beat.kind === "human") {
    trial.activeActor = beat.speaker === "davaci" ? "davaci" : "davali";
    const timeoutSec = room.settings.answerTimeoutSec;
    trial.turnEndsAt = timeoutSec ? Date.now() + timeoutSec * 1000 : undefined;
    emitState(io, code);

    clearTurnTimer(code);
    if (timeoutSec) {
      turnTimers.set(
        code,
        setTimeout(() => onTurnTimeout(io, code), timeoutSec * 1000 + 500)
      );
    }
    return;
  }

  trial.activeActor = undefined;
  trial.turnEndsAt = undefined;
  emitState(io, code);
  void runAiBeat(io, code, beat);
}

async function runAiBeat(io: SocketIOServer, code: string, beat: TrialBeat): Promise<void> {
  const room = getRoom(code);
  if (!room || !room.trial) {
    return;
  }

  io.of("/game").to(code).emit("server:agentTyping", { role: beat.speaker });

  let text = fallbackLine(beat);
  const config = getAiConfig(code);
  if (config) {
    try {
      const raw = await generateReply({
        apiKey: config.apiKey,
        model: config.model,
        system: personaBySpeaker[beat.speaker as AgentRole],
        prompt: buildPrompt(room, beat)
      });
      const cleaned = sanitizeReply(raw);
      text = cleaned.length > 0 ? cleaned : fallbackLine(beat);
    } catch (error) {
      io.of("/game").to(code).emit("server:error", {
        code: "AI_FALLBACK",
        message: `AI yanit veremedi, hazir metin kullanildi: ${(error as Error).message}`
      });
    }
  }

  const added = addAgentMessage(code, beat.speaker as AgentRole, text);
  if (added) {
    io.of("/game").to(code).emit("server:chatMessage", { message: added.message });
  }

  const current = getRoom(code);
  if (current?.trial) {
    current.trial.index += 1;
  }
  setTimeout(() => driveBeat(io, code), AI_BEAT_DELAY_MS);
}

function onTurnTimeout(io: SocketIOServer, code: string): void {
  const room = getRoom(code);
  if (!room || !room.trial) {
    return;
  }

  const beat = room.trial.beats[room.trial.index];
  const who = beat?.speaker === "davaci" ? "Davaci" : "Davali";
  const added = addAgentMessage(code, "mubasir", `${who} sure icinde konusmadi, sira devam ediyor.`);
  if (added) {
    io.of("/game").to(code).emit("server:chatMessage", { message: added.message });
  }

  room.trial.index += 1;
  driveBeat(io, code);
}

// Aktif insanin gecerli mesajindan sonra cagrilir; siradaki beat'e gecer.
export function onHumanTurnDone(io: SocketIOServer, code: string): void {
  clearTurnTimer(code);
  const room = getRoom(code);
  if (!room || !room.trial) {
    return;
  }
  // Sirayi hemen kapat ki 400ms icinde gelen ikinci mesaj beat atlatmasin.
  room.trial.activeActor = undefined;
  room.trial.turnEndsAt = undefined;
  room.trial.index += 1;
  setTimeout(() => driveBeat(io, code), HUMAN_ADVANCE_DELAY_MS);
}

export function isActorsTurn(code: string, role: string): boolean {
  const room = getRoom(code);
  if (!room || !room.trial || room.trial.finished) {
    return false;
  }
  return room.trial.activeActor === role;
}

export function isTrialActive(code: string): boolean {
  const room = getRoom(code);
  return Boolean(room?.trial && !room.trial.finished);
}

export function disposeTrial(code: string): void {
  clearTurnTimer(code);
}
