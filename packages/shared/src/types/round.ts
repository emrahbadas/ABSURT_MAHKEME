export interface Round {
  id: string;
  roomCode: string;
  index: number;
  startedAt: string;
  endedAt: string | null;
}
