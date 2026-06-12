type CourtAgentRole = "mubasir" | "lawyer_davaci" | "lawyer_davali" | "hakim";
type HumanRole = "davaci" | "davali";
type AgentMode = "speak" | "listen" | "silent";

export type OrchestratedPhase =
  | "claim_summary"
  | "lawyer_assignment"
  | "roll_call_countdown"
  | "roll_call"
  | "court_preparing"
  | "claim"
  | "defense"
  | "lawyer_comment"
  | "judge_question"
  | "final_words"
  | "verdict";

export type SafeAiMessage = {
  text: string;
  status: "ok" | "fallback";
};

export type AgentDirective = {
  role: CourtAgentRole;
  mode: AgentMode;
  reason: string;
  promptFrame?: string;
};

export type OrchestratorContext = {
  phase: OrchestratedPhase;
  claimSummary?: string;
  activeHumanRole?: HumanRole;
  activeAgentRole?: CourtAgentRole;
};

const agentRoles: CourtAgentRole[] = ["mubasir", "lawyer_davaci", "lawyer_davali", "hakim"];

const agentPromptFrames: Record<CourtAgentRole, string> = {
  mubasir:
    "Sen teatral mubasirsin. Sadece orkestrator soz verdiginde taraflari ve mahkeme turunu kisa, guvenli ve absurt tonda anons et.",
  lawyer_davaci:
    "Sen davaci vekilisin. Sadece orkestrator soz verdiginde davacinin iddiasini komik veya dramatik bicimde guclendir; soz hakki yoksa sus ve dinle.",
  lawyer_davali:
    "Sen davali vekilisin. Sadece orkestrator soz verdiginde savunmayi komik veya dramatik bicimde destekle; soz hakki yoksa sus ve dinle.",
  hakim:
    "Sen hakimsin. Sadece orkestrator soz verdiginde durusmayi yonet, soru sor veya karari bildir; insan oyuncular konusurken sus."
};

function makeDirective(role: CourtAgentRole, mode: AgentMode, reason: string): AgentDirective {
  return {
    role,
    mode,
    reason,
    promptFrame: mode === "speak" ? agentPromptFrames[role] : undefined
  };
}

export function createFallbackMessage(): SafeAiMessage {
  return {
    text: "Durusma basliyor, herkes yerine gecsin.",
    status: "fallback"
  };
}

export function planAgentDirectives(context: OrchestratorContext): AgentDirective[] {
  if (context.phase === "roll_call") {
    return agentRoles.map((role) =>
      makeDirective(role, role === "mubasir" ? "speak" : "listen", role === "mubasir" ? "Mubasir taraflari salona cagirir." : "Anons sirasinda diger ajanlar dinler.")
    );
  }

  if (context.phase === "judge_question" || context.phase === "verdict") {
    return agentRoles.map((role) =>
      makeDirective(role, role === "hakim" ? "speak" : "listen", role === "hakim" ? "Hakim durusmayi yonetir." : "Hakim soz alirken diger ajanlar dinler.")
    );
  }

  if (context.phase === "lawyer_comment" && context.activeAgentRole) {
    return agentRoles.map((role) =>
      makeDirective(
        role,
        role === context.activeAgentRole ? "speak" : "listen",
        role === context.activeAgentRole
          ? "Avukat, onceki beyana gore kisa absurt yorum yapar."
          : "Ayni anda tek ajan konusur; digerleri senaryoyu bozmaz."
      )
    );
  }

  if (context.phase === "claim" || context.phase === "defense" || context.phase === "final_words") {
    const speaker = context.activeHumanRole === "davaci" ? "davaci" : context.activeHumanRole === "davali" ? "davali" : "oyuncu";
    return agentRoles.map((role) =>
      makeDirective(role, "listen", `${speaker} soz hakki kullaniyor; ajanlar girdi uretmeden dinler.`)
    );
  }

  return agentRoles.map((role) =>
    makeDirective(role, "silent", "Hazirlik fazinda ajanlar arka planda baglami izler, cikti uretmez.")
  );
}
