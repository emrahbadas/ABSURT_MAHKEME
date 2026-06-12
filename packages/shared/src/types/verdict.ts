export interface Verdict {
  winner: "davaci" | "davali" | null;
  percentages: { davaci: number; davali: number };
  ruling: string;
  juryEffect: number;
  createdAt: string;
}
