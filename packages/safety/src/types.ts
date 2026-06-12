export interface SafetyInput {
  text: string;
  participantId?: string;
}

export interface SafetyResult {
  passed: boolean;
  sanitizedText: string;
  reason?: string;
}
