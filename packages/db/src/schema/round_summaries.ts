import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { rounds } from "./rounds";

export const round_summaries = pgTable("round_summaries", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  round_id: uuid("round_id").notNull().references(() => rounds.id, { onDelete: "cascade" }),
  summary_text: varchar("summary_text", { length: 1000 }).notNull(),
  created_at: timestamp("created_at", { mode: "date", precision: 6 }).notNull().defaultNow()
});
