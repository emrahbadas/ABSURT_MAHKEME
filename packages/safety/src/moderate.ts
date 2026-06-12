import { forbiddenWords } from "./forbiddenWords";
import type { SafetyInput, SafetyResult } from "./types";

export function moderateText(input: SafetyInput): SafetyResult {
  const lowered = input.text.toLocaleLowerCase("tr-TR");
  const blocked = forbiddenWords.find((word) => lowered.includes(word));

  if (blocked) {
    return {
      passed: false,
      sanitizedText: "[icerik filtrelendi]",
      reason: `blocked_word:${blocked}`
    };
  }

  return {
    passed: true,
    sanitizedText: input.text.trim()
  };
}
