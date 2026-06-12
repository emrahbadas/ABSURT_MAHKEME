# Roles, Permissions & AI System Prompts

## Constraint Alignment

- **Roles, permission logic, and AI prompt contracts below strictly reflect:**
    - **Locked MVP, out-of-scope, and guardrail sections** from project contract.
    - **ONLY two active human roles per round:** one `davacı` and one `davalı`. All other roles are spectators/jury (read-only except emote/jury vote), or system (AI) roles.
    - **NO user accounts or persistent user roles:** access is nickname + one-time room code only.
  - **No admin/moderator roles, no expanded user authority, no server-side RBAC tables, no persistent account-auth JWT flow.**
    - **All AI game characters (mübaşir, hakim, avukatlar) are always server-orchestrated AI roles.**
    - **Game server is exclusively responsible for all state, validation, and transitions. Client can never override server authority, nor escalate capabilities.**
    - **No client-side phase/role logic, no persistent identity, no out-of-scope features.**

---

## User Roles

| Role            | Type   | Description                                                                                               | Who/How Assigned                            |
|-----------------|--------|-----------------------------------------------------------------------------------------------------------|----------------------------------------------|
| **davacı**      | Human  | Plaintiff; submits claim and final words, can select case topic. Only one per round/room.                | Chosen by user (server locks)                |
| **davalı**      | Human  | Defendant; answers claim and submits final words. Only one per round/room.                               | Chosen by user (server locks)                |
| **spectator**   | Human  | Joins room to watch; can send short emotes and in voting phase, cast one jury vote per round.            | Any further participant beyond actives       |
| **jury**        | Human  | Same as spectator; can cast vote and emotes when allowed.                                                | Spectator with voting phase privilege        |
| **mübaşir**     | AI     | Delivers dramatic opening speech each round. Not user-assignable.                                        | System-only, at round start                  |
| **hakim**       | AI     | Judge; asks absürt key question and rules on verdict (percentage and funny ruling).                      | System-only, at phase trigger                |
| **davacı avukatı** | AI  | AI lawyer for davacı, provides comic side reaction/comment.                                              | System-only, follows plaintiff's statement   |
| **davalı avukatı** | AI  | AI lawyer for davalı, provides comic side reaction/comment.                                              | System-only, follows defendant's statement   |

> **NOTE:**  
> _NO_ “user”, “admin”, or “moderator” roles. No user with expanded privileges or escalation.

---

## Permission Matrix

| Action                                      | davacı | davalı | spectator/jury | AI roles (system only) |
|----------------------------------------------|:------:|:------:|:--------------:|:----------------------:|
| Create room                                 |   ✓    |   ✓    |       ✓        |          ✗            |
| Join (private) room                         |   ✓    |   ✓    |       ✓        |          ✗            |
| Select role (davacı/davalı)                 |   ✓    |   ✓    |       ✗        |          ✗            |
| Submit claim / defense                      |  own   |  own   |       ✗        |          ✗            |
| Submit final words                          |  own   |  own   |       ✗        |          ✗            |
| Select/submit case topic                    | phase  | phase  |       ✗        |          ✗            |
| Send emote                                  |   ✗    |   ✗    |    phase*      |          ✗            |
| Cast jury vote                              |   ✗    |   ✗    |    phase*      |          ✗            |
| Watch room state                            |   ✓    |   ✓    |       ✓        |     (server-only)      |
| Progress phase                              |   ✗    |   ✗    |       ✗        |     server-only        |
| Trigger AI prompt                           |   ✗    |   ✗    |       ✗        |     server-only        |
| Receive AI content                          |   ✓    |   ✓    |       ✓        |          ✓            |
| Kick/ban                                    |   ✗    |   ✗    |       ✗        |          ✗            |
| Upload file/video/audio                     |   ✗    |   ✗    |       ✗        |          ✗            |

`own` = Only on their own statement in correct phase  
`phase*` = Only permitted in defined phase, throttled/rate-limited

> **No field ever implemented or supporting persistent user roles, admin, or moderator actions.**

---

## RBAC Implementation

**Absürt Mahkeme MVP does NOT use persistent/classic account auth RBAC/JWT. All role logic is per ephemeral room session:**

```typescript
// File: packages/shared/src/types/roomState.ts
export type ParticipantRole = 'davacı' | 'davalı' | 'spectator' | 'jury';

export interface RoomParticipant {
  id: string; // socket/session id
  nickname: string;
  role: ParticipantRole;
  joinedAt: number; // epoch ms
  isActive: boolean;
}
```

**Role assignment and all permission checks:**
- Happen ONLY on server, in `apps/game-server`
- Based on current in-memory/Redis state per room/session
- Client can only request; server always validates phase/role/state before every action

**NO backend users table, no persistent account-auth JWT flow, no role escalation routes, no “login”. Access is nickname+code only.**

---

## Room Role Assignment Process

1. **User joins room:** Submits nickname (filtered server-side), and 6-char private code.
2. **Server assigns role:**  
   - If a davacı slot is empty and requested, server locks for that session.
   - Same for davalı.
   - All others become spectators/jury, not upgradable without rejoin.
3. **Each in-room action:** Server checks if role is permitted for the action/phase, else rejects/event is dropped.

---

## API & Event Authorization Rules

| Event / Endpoint                           | Who can invoke / access           | Hard checks                                                       |
|--------------------------------------------|-----------------------------------|-------------------------------------------------------------------|
| `client:createRoom`                        | Anyone (with nickname)            | Valid, non-blocked, unique room code; nickname filter             |
| `client:joinRoom`                          | Anyone (with nickname/code)       | Room exists & space; nickname unique in room                      |
| `client:selectRole`                        | Pre-game participants             | Only if that role not locked; only once per round                 |
| `client:selectCaseCard`                    | Active davacı/davalı              | During selection phase; only one per player; filtered content     |
| `client:submitCustomTopic`                 | Active davacı/davalı              | During selection phase; strict length and content filters         |
| `client:submitStatement`                   | davacı/davalı, correct phase      | Only in their statement phase; 10–140 chars, forbidden content    |
| `client:submitFinalWords`                  | davacı/davalı, correct phase      | Only in final words phase; 1 per player, ≤80 chars, safe          |
| `client:sendEmote`                         | spectators/jury                   | Only in allowed phases, max rate, always filtered                 |
| `client:castJuryVote`                      | spectators/jury, voting phase     | Only once per round per participant; only during this phase       |
| server-originated (`server:*`)             | SYSTEM ONLY                       | Only Socket.IO game server can broadcast these events             |
| `GET /api/rooms/:code/history`             | Any client                        | Strictly read-only, maximum 10 rounds, only public round data     |

**No endpoints for admin, moderator, kick/ban, persistent user data, file upload, etc.**

---

## All Allowed User Operations

| Operation                    | Allowed Roles           | Enforcement                                   | Other Constraints                     |
|------------------------------|------------------------|-----------------------------------------------|---------------------------------------|
| Create or join room          | All                    | Nickname filter, code rules                   | No duplicate nickname in room         |
| Lock as davacı/davalı        | One per slot per round | Slot open & not yet filled for round          | Once per round                        |
| Submit statement/final words | Active in correct phase| Per-phase only, per-role only, safe+short     | Strict input validation                |
| Send emote                   | Spectator/jury         | Allowed phase, server-throttled, filtered     | One at a time, max per period         |
| Jury vote                    | Spectator/jury         | One per voting phase, per participant         | Not allowed outside phase             |
| Progress phase               | (NEVER allowed)        | Server/game logic only (timeouts, responses)  |                                      |
| Receive AI output            | All                    | Server-pushed only                            |                                      |

---

## AI System Prompts

All AI roles are strictly server-driven; players cannot trigger, seed, or override these:

### Mübaşir Opening — System Prompt

```
SEN Absürt Mahkeme'nin teatral mübaşiri, etkileyici ama mizahi bir açılış sunarsın. Her zaman Türkçe, max 200 karakterde, absürt bir mahkeme başlatıyorsun.

- Davanın adını ve iki gerçek oyuncunun rumuzunu an.
- Hakimi, avukatları (isim değil “AI” olduğunu hissettirmeden) özetle tanıt.
- Aşırı dramatik, kısa ve beklenmedik bir giriş kullan. Kaba veya kişisel olma!
- Mizah, absürtlük ve abartı serbest ama asla gerçek yargı veya tavsiye yok.
- Hassas, kişisel, mahrem, gerçek isim veya suç içeren detaylara YASAK.
- Girişte emoji veya abartılı ünlem kullanabilirsin.

Format:  
{
  "message": "string (max 200 karakter, tek cümle, fazla detaya girmeden, Türkçe, emoji serbest, güvenli)"
}
```

Input schema:
```typescript
interface MubasirIntroInput {
  plaintiffNickname: string;
  defendantNickname: string;
  caseTitle: string;
}
```

Output schema:
```typescript
interface MubasirIntroOutput {
  message: string; // 200 karakter, Türkçe, absürt ve güvenli girizgah
}
```
---

### Davacı/Davalı Avukatı — Lawyer Commentary — System Prompt

```
SEN Absürt Mahkeme'de bir AI avukatsın (ya davacının ya davalının tarafında), Türkçe ve kısa, mizahi bir yorum yazacaksın.

Kurallar:
1. Yalnızca o turdaki davacı/davalı argümanına kısa ve absürd yanıt ver.
2. Tarafını hafifçe öv, ama karşıya sert/düşmanca olma.
3. Komik, absürt veya şaşırtıcı mizah, Türkçe ve <180 karakter.
4. Kişisel, mahrem, ciddi ya da gerçekçi hukuk terimi/teklifi kullanma.
5. Asla kullanıcıya doğrudan hitap, isim ya da özel bilgi verme.
6. Yasaklı veya hassas konudan asla bahsetme.
7. Emoji veya dramatik vurgu serbest.
8. Şaka ve mizah her zaman senaryoya odaklansın.
9. Sadece tek cümlelik çıktı ver.

Format:
{
  "comment": "string (max 180 karakter, Türkçe, absürt-komik, güvenli, tek cümle)"
}
```

Input schema:
```typescript
interface LawyerCommentaryInput {
  side: 'davacı' | 'davalı';
  ownStatement: string;
  opponentStatement: string;
  caseTitle: string;
}
```
Output schema:
```typescript
interface LawyerCommentaryOutput {
  comment: string; // 180 karakter, absürt-komik, Türkçe, güvenli
}
```
---

### Hakim — Judge Question — System Prompt

```
SEN Absürt Mahkeme'nin hakimisın. Kısa, absürt, hafif iğneleyici ama asla kırıcı veya ciddi olmayan bir soru çıkar.

Kurallar:
1. Davanın başlığı, davacı ve davalı iddiaları üzerinden sorunu mizahi ve teatral üretirsin.
2. Sorun max 120 karakter ve Türkçe olmalı.
3. Kişisel bilgi, suç, cinsellik, sağlık, gerçek yargı içeren uyarı, soru veya öneri asla yazma.
4. Her zaman genel ve konudan şaşırtan bir mizah tonu olmalı; absürt.
5. Sadece TEK cümle ve SORU işaretiyle bitir.

Format:
{
  "question": "string (max 120 karakter, tek cümle, Türkçe, absürt ve komik, güvenli)"
}
```

Input schema:
```typescript
interface JudgeQuestionInput {
  caseTitle: string;
  plaintiffStatement: string;
  defendantStatement: string;
}
```
Output schema:
```typescript
interface JudgeQuestionOutput {
  question: string; // 120 karakter, tek cümle, Türkçe
}
```
---

### Hakim — Verdict Calculation and Funny Ruling — System Prompt

```
SEN Absürt Mahkeme'nin hakimisın. Tarafların beyanları ve jüri oyunu göz önünde bulundur, absürt bir yüzde haklılık oranı (toplam 100!) paylaş ve komik, zararsız, kısa bir karar yaz.

Kurallar:
1. Haklılık yüzde: Sadece 0–100 arasında, toplamı 100 olacak şekilde iki tarafa paylaştır.
2. Karar metni asla kimseyi yargılayan, aşağılama/kişisel veya gerçek ceza içeren bir şey olmayacak; tamamen absürt ve komik.
3. Karar max 150 karakter, Türkçe, yasaklı konudan uzak.
4. Bahsi geçen davacı/davalı rumuzunu asla yazma.
5. Sonuç tek cümle ve mizahi.
6. Şaka, dava başlığıyla ilgili olmalı; asla ciddi tavsiye olmaz.
7. Jüri oyu `<juryFavor: 'davacı' | 'davalı' | null>` ile eklenir, sonuçta hafif etkili olabilir.

Format:
{
  "plaintiffPercent": number,     // 0-100, toplam: plaintiff+defendant=100
  "defendantPercent": number,     // 0-100
  "ruling": string                // Max 150 karakter, Türkçe, absürt-harmless
}
```

Input schema:
```typescript
interface JudgeVerdictInput {
  caseTitle: string;
  plaintiffStatement: string;
  defendantStatement: string;
  juryFavor: 'davacı' | 'davalı' | null;
}
```
Output schema:
```typescript
interface JudgeVerdictOutput {
  plaintiffPercent: number;    // 0..100
  defendantPercent: number;    // 0..100
  ruling: string;              // 150 karakter, absürt ve güvenli
}
```

---

## AI Input/Output Safety Enforcement

- All user input (nickname, statement, topic) _must_ pass forbidden topic and profanity filters before being sent to AI or stored.
- All AI outputs are JSON-structured; server _must_ validate:
    - JSON schema conformance
    - Length ≤ prompt limit
    - Turkish only, never personal, never legal advice/realistic judgment
    - If validation fails, **template fallback output** is provided (hard-coded safe message).

**Fallbacks Example:**
- Mübaşir: `"Absürdiyet Sahnesi açılıyor! Herkes yerine geçsin! 🎭"`
- Avukat: `"Saygıdeğer mahkeme, bu dava alışılmışın dışında bir fenomendir!"`
- Hakim soru: `"Bu kadar garip bir dava bir daha görülür mü?"`
- Hakim karar: `"Taraflar, bu absürtliğin kazananı bellisiz; gülmek serbest!"`

---

## Out of Scope: Forbidden Roles and Permissions

- No persistent “user”, “admin”, “moderator”, or any escalated privilege.
- No persistent account-auth tokens/JWT. Short-lived room `sessionToken` values for Socket.IO authorization are required by server contract.
- No kick/ban/mute, profile, avatar, or file upload.
- No client-authoritative state; server _always_ decides and validates.
- No networking escalation, room discoverability, or matchmaking.

---

## Summary Table: Role Capabilities

| Capability                  | davacı | davalı | spectator/jury | mübaşir (AI) | avukat (AI) | hakim (AI) |
|-----------------------------|--------|--------|:-------------:|:------------:|:-----------:|:----------:|
| Create/join room            | ✓      | ✓      |       ✓       |      ✗       |     ✗       |    ✗       |
| Select own role             | ✓      | ✓      |       ✗       |      ✗       |     ✗       |    ✗       |
| Submit claim/defense        | ✓      | ✓      |       ✗       |      ✗       |     ✗       |    ✗       |
| Submit final words          | ✓      | ✓      |       ✗       |      ✗       |     ✗       |    ✗       |
| Select/submit case topic    | ✓      | ✓      |       ✗       |      ✗       |     ✗       |    ✗       |
| Give emote                  | ✗      | ✗      |       ✓       |      ✗       |     ✗       |    ✗       |
| Jury vote                   | ✗      | ✗      |       ✓       |      ✗       |     ✗       |    ✗       |
| Receive AI content          | ✓      | ✓      |       ✓       |      ✓       |     ✓       |    ✓       |
| Orchestrate server logic    | ✗      | ✗      |       ✗       |   server     |   server    |  server    |

---

# End of Contract

All above specifications for roles, permissions, and AI system prompts are FINAL, complete, and authoritative for Absürt Mahkeme MVP v1.0.  
_No extra role, permission, or prompt must be implemented or presumed beyond those listed above._