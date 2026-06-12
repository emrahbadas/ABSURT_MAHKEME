import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { rounds } from "./rounds";

export const ai_messages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  round_id: uuid("round_id").notNull().references(() => rounds.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 24 }).notNull(),
  content: varchar("content", { length: 500 }).notNull(),
  fallback_used: varchar("fallback_used", { length: 5 }).notNull().default("false"),
  created_at: timestamp("created_at", { mode: "date", precision: 6 }).notNull().defaultNow()
});
