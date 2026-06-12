export type PlayerRole = "davaci" | "davali";

export function isPlayerRole(value: string): value is PlayerRole {
  return value === "davaci" || value === "davali";
}
