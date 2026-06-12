import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema/**/*.ts",
  out: "./src/schema/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.POSTGRES_URL || ""
  }
} satisfies Config;
