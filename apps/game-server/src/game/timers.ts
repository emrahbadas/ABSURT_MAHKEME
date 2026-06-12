export type PhaseDeadline = {
  phase: string;
  deadlineAt: number;
};

export function createDeadline(phase: string, durationSeconds: number): PhaseDeadline {
  return {
    phase,
    deadlineAt: Date.now() + durationSeconds * 1000
  };
}
