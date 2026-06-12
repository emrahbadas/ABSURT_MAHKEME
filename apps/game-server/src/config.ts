import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.string().default("3100"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  POSTGRES_URL: z.string().default("postgresql://user:pass@localhost:5432/db"),
  CORS_ORIGIN: z.string().default("http://localhost:3000")
});

export type AppConfig = {
  nodeEnv: string;
  port: number;
  redisUrl: string;
  postgresUrl: string;
  corsOrigin: string;
};

export function getConfig(): AppConfig {
  const parsed = configSchema.parse(process.env);

  return {
    nodeEnv: parsed.NODE_ENV,
    port: Number(parsed.PORT),
    redisUrl: parsed.REDIS_URL,
    postgresUrl: parsed.POSTGRES_URL,
    corsOrigin: parsed.CORS_ORIGIN
  };
}
