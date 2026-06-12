export type RoundPhase =
  | "lobby"
  | "claim_summary"
  | "lawyer_assignment"
  | "roll_call_countdown"
  | "roll_call"
  | "court_preparing"
  | "opening"
  | "claim"
  | "defense"
  | "lawyer_comment"
  | "judge_question"
  | "final_words"
  | "verdict"
  | "summary";

export const phaseOrder: RoundPhase[] = [
  "lobby",
  "claim_summary",
  "lawyer_assignment",
  "roll_call_countdown",
  "roll_call",
  "court_preparing",
  "opening",
  "claim",
  "defense",
  "lawyer_comment",
  "judge_question",
  "final_words",
  "verdict",
  "summary"
];

export function getNextPhase(current: RoundPhase): RoundPhase | null {
  const index = phaseOrder.indexOf(current);
  if (index < 0 || index === phaseOrder.length - 1) {
    return null;
  }
  return phaseOrder[index + 1];
}
