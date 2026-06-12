export function isValidRoomCode(roomCode: string): boolean {
  return /^[A-Z0-9]{6}$/.test(roomCode);
}

export function isValidStatementLength(text: string): boolean {
  const length = text.trim().length;
  return length >= 10 && length <= 140;
}

export function isValidFinalWordsLength(text: string): boolean {
  return text.trim().length <= 80;
}
