import Redis from "ioredis";
import { getConfig } from "../config";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(getConfig().redisUrl);
  }
  return redisClient;
}
