# Project Overview

## Project Identity

- **Name:** Absürt Mahkeme
- **Tagline:** Arkadaşlarla absürt ve eğlenceli mini mahkeme oyun sahnesi!
- **Type:** Mobile-first web app
- **Primary Language:** TypeScript

---

## Constraint Alignment

This product **MUST** strictly follow these final, locked constraints:

- Only web/mobile-first. No native mobile apps, no voice/video, no 3D/animation, no public match, no media upload, no serious legal content, no monetization, no mandatory signup, no user accounts.
- Access is via **nickname + private 6-char room code** only. No friends, profiles, or social login.
- Each round: **exactly 1 davacı and 1 davalı (human)**. All other roles (mübaşir, hakim, avukatlar) are AI. Up to 6 spectators/jurors per room allowed, jury can only emote/vote.
- **Server-authoritative** (Node.js + Socket.IO) controls all game state, transitions, validation, phase timing, and AI orchestration; clients only render state and send user intent.
- **All phase transitions, timeouts, disconnects, and room authority reside on the dedicated game server** (NO client logic, no Vercel polling, no cron jobs, no client timers).
- All **AI output is filtered, short, harmless, Turkish-first, scenario-based**, never about real crimes, persons, or taboo content.
- All forbidden and out-of-scope features (see below) are strictly prohibited from implementation or schema.

---

## Problem Statement

Groups of Turkish-speaking friends seeking a quick, playful shared experience often try to invent party games or "mini-mahkeme" roleplay via chat apps or board game evenings. These workarounds are slow to set up, have vague or shifting rules, often end in awkward silences or problematic jokes, and are hard to moderate for safety or fairness. With no purpose-built tool, people lose time clarifying the game, worry about topic suitability, and struggle to keep it lighthearted—resulting in lost interest, awkward moments, and much wasted effort, especially if anyone is new to the group or remote.

---

## Solution

Absürt Mahkeme is a Turkish-first, mobile-friendly web game that lets any group play a safe, comedic “courtroom” in 5 minutes. No signup is needed—just join with a nickname and private 6-letter room code. Each round, two real players are "davacı" and "davalı" in an absurd court case, while AI plays the roles of mübaşir, hakim, and both lawyers with theatrical, filtered, short Turkish humor. Spectators can react or participate via jury votes. Everything (timing, validation, AI, role/phase management) is server-controlled for safety, speed, and fun. Cases never target the person—only the topic. The key “aha moment” is watching a trivial fight (e.g. "last baklava eaten") escalate into a ridiculous AI-driven court drama, then seeing a satire-style verdict, all within strict time and safety rules.

---

## User Personas

### Persona 1: Ege (Organizer / Starter)
- **Age / Location:** 24 / İzmir
- **Tech comfort:** Intermediate
- **Primary goal when using this app:** Launch quick, fun group games without setup hassle.
- **Biggest frustration the app solves:** No waiting, no signup—instant laughter with zero friction.
- **How they find out about the app:** Group chat meme/joke, or viral story.
- **Device they use most:** Mobile

### Persona 2: Sude (Entertainer)
- **Age / Location:** 21 / İstanbul
- **Tech comfort:** Beginner
- **Primary goal when using this app:** Make gatherings funny without risk or effort.
- **Biggest frustration the app solves:** No need to be the group clown—AI does the funny part, always safe.
- **How they find out about the app:** Heard about it at school, word of mouth.
- **Device they use most:** Mobile

### Persona 3: Baran (Remote Participant)
- **Age / Location:** 27 / Berlin
- **Tech comfort:** Advanced
- **Primary goal when using this app:** Join friends’ group games from afar, easily.
- **Biggest frustration the app solves:** No signup, no install, works in browser, Turkish-focused.
- **How they find out about the app:** Gets room code from friends’ chat.
- **Device they use most:** Both mobile and desktop

---

## Feature Specification — MVP (Must ship in v1.0)

### Feature 1: Mobile-First Landing & Nickname Entry

- **What it does:**  
  On the home screen, user enters a nickname (2–18 UTF-8 chars, Turkish supported). The server filters for profanity or forbidden words.
- **Who uses it:** All personas.
- **Entry point:** `/`
- **Happy path:**  
  1. User enters a valid nickname.  
  2. Buttons enable.  
  3. User chooses to create or join a room.
- **Edge cases to handle:**  
  - Blank/nickname too short/too long  
  - Forbidden word/profanity detected  
  - Duplicate nickname in room
- **Validation rules:**  
  - 2–18 codepoints  
  - Unicode supported, Turkish allowed  
  - No forbidden words (server blocklist)  
  - No spaces-only nicknames
- **Success state:**  
  Buttons: "Oda Oluştur" / "Koda Katıl" enabled.
- **Error states:**  
  - `Lütfen 2-18 karakterlik uygun bir rumuz girin.`  
  - `Bu rumuz uygun değil.`
- **Priority:** P0

---

### Feature 2: Private Room Creation

- **What it does:**  
  Server generates a unique, 6-character uppercase (A-Z0-9) room code and places the first user into a "waiting" room state.
- **Who uses it:** Anyone starting a new game.
- **Entry point:** Home → "Oda Oluştur"
- **Happy path:**  
  1. User taps create.  
  2. Server generates unique code, creates room.  
  3. User sees “Paylaşılacak Oda Kodu: [CODE]”.
- **Edge cases to handle:**  
  - Generated code collides  
  - Infra/DB error
- **Validation rules:**  
  - Code must be unique in Redis and Postgres  
  - Code format strict: 6-chars, A–Z/0–9
- **Success state:**  
  Shareable room code and waiting room UI.
- **Error states:**  
  - `Oda oluşturulamadı, lütfen tekrar deneyin.`
- **Priority:** P0

---

### Feature 3: Join Private Room by Code

- **What it does:**  
  User enters the 6-letter code, if room exists and open joins lobby, else error.
- **Who uses it:** Invited users.
- **Entry point:** Home → "Koda Katıl"
- **Happy path:**  
  1. User enters code.  
  2. Server validates: open, capacity available.  
  3. User joins, sees lobby.
- **Edge cases to handle:**  
  - Invalid code format  
  - Nonexistent code  
  - Room closed  
  - Room full  
  - Duplicate nickname in room
- **Validation rules:**  
  - Code: 6 uppercase A–Z/0–9  
  - Room open  
  - Nickname unique in room
- **Success state:**  
  Room lobby/roster screen.
- **Error states:**  
  - `Oda bulunamadı.`  
  - `Oda dolu.`  
  - `Bu rumuz kullanılıyor.`
- **Priority:** P0

---

### Feature 4: Davacı/Davalı Role Selection

- **What it does:**  
  Users claim davacı or davalı; role locking fully server-side to prevent race/dupe.
- **Who uses it:** All room participants.
- **Entry point:** Room lobby after joining.
- **Happy path:**  
  1. User taps on available role.  
  2. Server locks role if available.  
  3. Role visually locked in UI.
- **Edge cases to handle:**  
  - Two users pick same role at once  
  - Disconnect between lock and next step  
  - User abandons before locking
- **Validation rules:**  
  - 1 davacı, 1 davalı per round  
  - No duplicate or unassigned state
- **Success state:**  
  Both roles visually assigned and unchangeable for round.
- **Error states:**  
  - `Rol kapıldı, tekrar deneyin.`
- **Priority:** P0

---

### Feature 5: Absurd Case Card Selection / Custom Topic Input

- **What it does:**  
  Users select a case from a curated, safe list or propose a custom topic (1–140 chars) that passes length/forbidden topic blocklist.
- **Who uses it:** Human players (pre-game).
- **Entry point:** After role assignment, before trial opening.
- **Happy path:**  
  1. User picks a card or enters topic.  
  2. Server validates; if valid, advances phase.
- **Edge cases to handle:**  
  - Blank or repeat topic  
  - Over 140 chars  
  - Forbidden/inappropriate wording  
  - AI rejects case
- **Validation rules:**  
  - 1–140 chars  
  - Turkish, no forbidden/blocked topics/personal attacks  
  - Uniqueness within session
- **Success state:**  
  "Dava seçildi" confirmation.
- **Error states:**  
  - `Konu uygun değil.`  
  - `Çok uzun, kısaltın.`
- **Priority:** P0

---

### Feature 6: AI Mübaşir Dramatic Opening

- **What it does:**  
  Upon case lock, server triggers a short (≤200 chars), Turkish, slightly absurd introduction via controlled AI or templates as backup, presented as a styled message card.
- **Who uses it:** All room participants.
- **Entry point:** Start of round.
- **Happy path:**  
  1. Server generates intro text.  
  2. All see dramatized intro card with possible emoji.
- **Edge cases to handle:**  
  - AI returns unsafe/empty/long/English intro  
  - AI fails: fallback template used
- **Validation rules:**  
  - ≤200 chars, Turkish, scenario-based, no personal reference, not empty or offensive
- **Success state:**  
  Dramatic styled card with opening.
- **Error states:**  
  - `Açılış yüklenemedi, tekrar deneyin.`
- **Priority:** P0

---

### Feature 7: Phase-Based Game With Hard Server Deadlines

- **What it does:**  
  All game phases enforce strict timing (20–50s per phase, max 5 min overall), with server-authoritative state machine. If participant fails to answer in time, auto-advance with safe placeholder.
- **Who uses it:** All
- **Entry point:** After round start; every phase.
- **Happy path:**  
  1. Server opens phase.  
  2. Player/AI responds in time.  
  3. Phase auto-advances once input or deadline hit.
- **Edge cases to handle:**  
  - Player never responds  
  - Slow/inconsistent network  
  - Attempted client skipping
- **Validation rules:**  
  - Phase times strictly enforced server-side  
  - Placeholders (e.g. "Yanıt verilmedi") on timeout
- **Success state:**  
  Phases sequentially progress automatically.
- **Error states:**  
  - `Süre doldu, otomatik geçildi.`
- **Priority:** P0

---

### Feature 8: User Claim & Defense Statement Input

- **What it does:**  
  Davacı and davalı each submit a short (10–140 char) statement, filtered for safety, profanity, forbidden content.
- **Who uses it:** Davacı, Davalı
- **Entry point:** Upon phase turn.
- **Happy path:**  
  1. Input passes all rules  
  2. Submission triggers phase progress
- **Edge cases to handle:**  
  - Too short/long  
  - Forbidden/spam/blank input  
  - Disconnect/timeout
- **Validation rules:**  
  - 10–140 chars  
  - No forbidden topics, personal attacks, or repeated spam  
  - Turkish preferred
- **Success state:**  
  Progress to lawyer phase.
- **Error states:**  
  - `Girdi uzunluğu geçersiz veya içerik uygun değil.`
- **Priority:** P0

---

### Feature 9: AI Lawyer Commentary & Hakim Question

- **What it does:**  
  Server generates short (≤180 char), safely sarcastic/funny comments from both AI lawyers, then a short, Turkish hakim question. All output is filtered and may use fallback templates.
- **Who uses it:** All
- **Entry point:** After both player statements.
- **Happy path:**  
  1. Both AI lawyers respond.  
  2. Hakim poses question.
- **Edge cases to handle:**  
  - Unsafe/long/empty outputs from AI  
  - LLM API fails
- **Validation rules:**  
  - 1–2 lines each; ≤180 chars  
  - Turkish, safe, not personal, not legal advice
- **Success state:**  
  Response cards styled with color/icon.
- **Error states:**  
  - `Yanıt yüklenemedi, tekrar deneniyor.`
- **Priority:** P0

---

### Feature 10: Final Words

- **What it does:**  
  Davacı and davalı each give a last short statement (≤80 chars, same filters as above).
- **Who uses it:** Davacı, Davalı
- **Entry point:** Final Words phase.
- **Happy path:**  
  1. Each submits final words.  
  2. Server stores, progresses.
- **Edge cases to handle:**  
  - Blank/forbidden/too long input  
  - Timeout/disconnect
- **Validation rules:**  
  - ≤80 chars  
  - No forbidden topics/phrases
- **Success state:**  
  Advance to verdict.
- **Error states:**  
  - `Kısa, uygun bir son söz yazın.`
- **Priority:** P1

---

### Feature 11: AI Hakim Verdict, Haklılık Oranları & Funny Ruling

- **What it does:**  
  Server AI delivers a verdict with clear Turkish percentage (must sum to 100), assigns “haklılık” rates, and emits a short, scenario-based funny “ruling” (≤150 chars, always harmless).
- **Who uses it:** All participants.
- **Entry point:** Verdict phase.
- **Happy path:**  
  1. Server computes winner/percentages.  
  2. Ruling card and round recap visible to all.
- **Edge cases to handle:**  
  - Percentages don't sum to 100  
  - Unsafe output  
  - Empty or failed generation
- **Validation rules:**  
  - Each percentage 0–100, sum to 100  
  - Ruling is Turkish, topic-based, ≤150 chars, never personal/offensive
- **Success state:**  
  Verdict card and recap visible.
- **Error states:**  
  - `Güvenli karar oluşturulamadı, tekrar deneniyor.`
- **Priority:** P0

---

### Feature 12: Round Summary & Short History

- **What it does:**  
  After verdict, show full recap: users, case, statements, verdict, “haklılık” percentages, and ruling text. Store/show max 10 past rounds per room.
- **Who uses it:** All participants
- **Entry point:** Post-verdict (auto) and on request in lobby/history screen.
- **Happy path:**  
  1. Each new round appended to history (room-local).  
  2. Users may revisit the last 10 cases anytime.
- **Edge cases to handle:**  
  - History empty  
  - Disconnection/history not loadable  
  - Overflow/prune oldest
- **Validation rules:**  
  - Only current room’s recent rounds  
  - 10 rounds max; on overflow, oldest removed
- **Success state:**  
  Emoji/UI recap cards for each round.
- **Error states:**  
  - `Tur geçmişi yüklenemedi.`
- **Priority:** P1

---

### Feature 13: Realtime Synced Room & Round State

- **What it does:**  
  Server pushes authoritative state for every transition, join, leave, or input; all clients react in <1s. No client or polling logic allowed.
- **Who uses it:** All
- **Entry point:** Any in-room screen.
- **Happy path:**  
  1. All events are pushed to all participants.  
  2. All UIs reflect the exact current state.
- **Edge cases to handle:**  
  - Race/slow subscribe  
  - Flaky internet
- **Validation rules:**  
  - No client-initiated business logic/authority  
  - All state from server socket events
- **Success state:**  
  All users see up-to-date room/phase instantly.
- **Error states:**  
  - `Bağlantı yavaş, tekrar deneniyor...`
- **Priority:** P0

---

### Feature 14: Disconnect / No-answer / Leave Fallback

- **What it does:**  
  If a user disconnects or fails to answer, on server timeout the phase proceeds with a visible placeholder card (e.g. “Yanıt verilmedi”). If all users leave, room is closed.
- **Who uses it:** All
- **Entry point:** Any phase needing input.
- **Happy path:**  
  1. No answer in time → placeholder used.  
  2. User may reconnect and resume.
- **Edge cases to handle:**  
  - Both users disconnect  
  - Multiple reconnects  
  - Room closed
- **Validation rules:**  
  - Placeholders always visible for skipped turns  
  - Room closes once all users have left
- **Success state:**  
  Fallback text visible as needed.
- **Error states:**  
  - `Oda kapandı. Yeniden katılmak için yeni kod alın.`
- **Priority:** P0

---

## Explicitly Out of Scope for v1.0

- **Native mobile apps:** NO iOS/Android, Expo, React Native, nor app store distribution—web only (MVP constraint).
- **Voice/video features or AI voices:** No voice, video, text-to-speech, nor audio chat.
- **3D/animated scenes, avatars, heavy animation:** Unavailable; only static/elevated UI is used.
- **Public lobby or stranger matchmaking:** Only private codes; no public or random rooms.
- **Monetization:** NO payments, rewards, betting, premium features, or in-app store.
- **Mandatory account registration, social login, persistent profiles:** Not allowed; every identity is nickname + code only, session-ephemeral.
- **Evidence or file/photo/video/document upload:** Must not occur in any form.
- **Admin/mod/backoffice, long-term league, ranking, seasons, scoring:** Never built in MVP.
- **Serious, realistic legal advice or simulation, or Turkish/real court forms:** Never shown, mimicked, or output.
- **Any forbidden/sensitive AI topics (especially crime, sexuality, trauma, money, appearance, identity, relationships):** Blocked at ALL entry/exit points, never allowed via custom topics.
- **Client-authoritative state or timers:** All state and logic is server authoritative, strictly enforced server-side.
- **Complex scoring, season tables, or rewards/penalties:** Never planned.
- **Any feature not listed in the MVP above, including friend graphs, account persistence, or media handling:** Out of scope.

---

## Yol Haritası — Gelecek Özellikler (Post-v1.0)

> Bu maddeler v1.0 kapsamı **dışındadır** ve henüz uygulanmamıştır. Bazıları yukarıdaki v1.0 "Out of Scope" kısıtlarını **bilinçli olarak gevşetir**; o yüzden ancak v1.0 stabilleştikten sonra, ayrı bir sürümde ele alınacaktır.

### 1. Resimli Kanıt Sun Modu
- Oyuncular duruşma sohbet bölümünden **kanıt resmi attach** edebilir (📎).
- Sahnede **"Kanıtları Gör"** butonuyla o duruşmadaki tüm kanıtlar bir galeride açılıp incelenir.
- AI hakim/avukatlar bu görselleri **vision** ile değerlendirir (AI istemcisi OpenAI `gpt-4o-mini` / `gpt-4.1-mini` — ikisi de görsel girdi destekler; `messages.content` dizisine `image_url` eklenecek).
- ⚠️ **Kısıt gevşetmesi:** v1.0'daki "Evidence or file/photo/video upload: Must not occur" kuralını gevşetir. Güvenli görsel moderasyonu gerekecek.

### 2. AI Karakterler İçin Kişilik Modu
- Mübaşir, hakim ve avukatlar için seçilebilir **kişilik/ton profilleri** (örn. sert hakim, komik hakim, dramatik avukat, sakin avukat).
- Oda kurulumunda (oyun ayarları) seçilir; orkestratör persona promptlarını bu profile göre kurar.

### 3. Tüm Karakterler İçin Avatar Seçimi
- Arka sahne (mahkeme salonu) **statik** kalır; üzerindeki **avukatlar, hakim, mübaşir ve oyuncu (davacı/davalı)** avatarları **değiştirilebilir**.
- Baloncuk çapaları (`bubbleAnchors`) mevcut konumlarda kalır; sadece karakter görselleri katman olarak değişir.
- ⚠️ **Kısıt gevşetmesi:** v1.0'daki "avatars: only static/elevated UI" kuralını gevşetir (animasyon değil, yalnızca seçilebilir statik avatar).

---

## User Stories (BDD format)

```
Given I open Absürt Mahkeme on mobile
When I enter a nickname and press "Oda Oluştur"
Then I receive a unique room code
And see the waiting room screen

Given I have a friend's room code
When I enter it to join
Then I enter the private lobby
And see all participant nicknames

Given two users join a room
When both select either davacı or davalı roles
Then the roles become server-locked
And the round can begin

Given I am assigned davacı
When the claim phase starts
Then I see my input area
And cannot continue without submitting a valid statement

Given the defense phase is active
When I’m davalı and submit my reply
Then the server checks for forbidden topics
And only accepts if safe and within 140 chars

Given both statements are collected
When the lawyer AI phases start
Then I see unique, funny comments from both AI lawyers
And a short hakim question appears

Given I do not answer a prompt in time
When server countdown ends
Then my turn is auto-advanced
And “Yanıt verilmedi” is shown in my place

Given I try to submit a forbidden or inappropriate case topic
When I press submit
Then a clear error appears
And I must choose a new topic

Given round moves to final verdict
When AI hakim computes percentages and ruling
Then I see which side is “haklı” in % and a funny ruling

Given I disconnect mid-round and return before game end
When I claim my spot with code/nickname
Then I rejoin current round at correct phase

Given all users leave a room
When anyone else tries to join again
Then the room is marked as closed

Given multiple games are played in the same room
When I request “Tur Geçmişi”
Then I see recap cards (max 10)
And latest verdict and funny ruling
```

---

## Success Metrics

| Metric                           | Baseline | 30-day target | 90-day target | How to measure                                |
|-----------------------------------|----------|---------------|---------------|-----------------------------------------------|
| Daily active rooms                | 0        | 30            | 200           | Supabase: distinct room activity per day      |
| Unique daily players              | 0        | 60            | 400           | Supabase: distinct nickname/room combos       |
| Room completion rate (%)          | –        | 75%           | 90%           | Started vs. completed rounds (DB query)       |
| Avg round time (min)              | –        | <6            | <5            | Round start/end timestamps                    |
| AI blocked content incidents/mo   | –        | <3            | <1            | Safety filter blocks/counts                   |
| Mobile user ratio (%)             | –        | >80%          | >85%          | User-agent logs / analytic events             |
| Session crash rate (%)            | –        | <2            | <1            | Client error/session loss logs                |
| Time to first joke (median min)   | –        | <2            | <1.5          | Event sequence + user survey/feedback         |

---

## Non-Functional Requirements

| Requirement                  | Specification                                                | How to test                       |
|------------------------------|-------------------------------------------------------------|-----------------------------------|
| Page load time               | < 2s on 4G mobile, <1MB entry                               | Lighthouse CI, Playwright         |
| API response time            | < 300ms p99 on main JSON API endpoints                      | k6 load test, Sentry traces       |
| Uptime                       | ≥99.5% monthly for both Vercel & Supabase                  | UptimeRobot, Vercel built-in      |
| Concurrent users             | 500 rooms/players without degradation                       | k6 concurrent stress test         |
| Mobile support               | iOS 15+, Android 10+, Chrome 100+                           | BrowserStack, manual test         |
| Accessibility (a11y)         | WCAG 2.1 AA label, visible focus, contrast, alt tags        | axe-core CI, manual audit         |
| Security (input/API)         | All entries escape XSS/SQLi, no raw user code in output     | Static scanner, case/unit test    |
| Privacy                      | No persistent PII, all data ephemeral to room/session       | Schema/code/manual review         |
| Realtime latency             | Room state round-trip <1s                                   | Client/server event logs          |
| Multi-language fallback      | Turkish for all main UI, English fallback for errors only   | Manual language QA                |

---

## UI/UX Directives

- **Color Palette:**  
  - Background: `#0F172A`  
  - Surface: `#1E293B`  
  - SurfaceElevated: `#334155`  
  - Primary: `#F59E0B`  
  - PrimaryDark: `#B45309`  
  - Secondary: `#8B5CF6`  
  - Accent: `#EC4899`  
  - Success: `#22C55E`  
  - Warning: `#F97316`  
  - Danger: `#EF4444`  
  - TextPrimary: `#F8FAFC`  
  - TextSecondary: `#CBD5E1`  
  - Border: `#475569`

- **Typography:**  
  - Font: `Inter, Arial, Helvetica, sans-serif`
  - Headings: Inter, 600–700 weight, 1.4 line-height
  - Body: Inter, 15–17px, 1.7 line-height

- **Tone of Voice:**  
  - Always playful, comic, non-personal; never serious or critical.
  - Turkish-first, concise, short lines.

- **Loading States:**  
  - Animated skeletons for statements; circular spinner and `AI yazıyor...` for AI messaging.

- **Empty States:**  
  - Friendly emoji and `Henüz dava açılmadı! Bir tane başlatın 🎲`

- **Error Messages:**  
  - Always short, polite, clear:
    - `Bağlantı koptu, tekrar deniyoruz…`
    - `Bu rumuz uygun değil. Lütfen yenisini girin.`
    - `Girdi izin verilmiyor: Topluluk kurallarımıza aykırı.`
    - `Beklenmeyen hata. Sayfayı yenileyin.`
  - No technical/backend details. English fallback only for "unexpected error".

---

**Summary:**  
Absürt Mahkeme is a web-based, mobile-first, real-time, party court game for friends, centered on Turkish language and humor. It features strict server authority for all game state and phase handling, AI-generated theatrical court commentary, absolute input/output safety filtering, private 6-character room codes, and no accounts, monetization, or media. Only two active players per round—everyone else is spectator/juror with limited input. Animations, voice/video, admin tools, media features, or public matchmaking are strictly out of scope for MVP. The mission: rapid, safe, absurd group fun—zero awkwardness, zero risk.