export const redisKeys = {
  session: (token: string) => `session:${token}`,
  room: (roomCode: string) => `room:${roomCode}`,
  jury: (roomCode: string, roundIndex: number) => `jury:${roomCode}:${roundIndex}`
};
