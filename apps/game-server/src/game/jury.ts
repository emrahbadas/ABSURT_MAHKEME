export function computeJuryEffect(votes: Array<"davaci" | "davali">): number {
  const davaci = votes.filter((v) => v === "davaci").length;
  const davali = votes.filter((v) => v === "davali").length;
  const total = davaci + davali;

  if (total === 0) {
    return 0;
  }

  return Math.round(((davaci - davali) / total) * 10);
}
