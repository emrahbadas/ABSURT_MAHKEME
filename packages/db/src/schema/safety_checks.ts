import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { player_statements } from "./statements";

export const safety_checks = pgTable("safety_checks", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  statement_id: uuid("statement_id").notNull().references(() => player_statements.id, { onDelete: "cascade" }),
  passed: integer("passed").notNull(),
  reason: varchar("reason", { length: 240 }),
  created_at: timestamp("created_at", { mode: "date", precision: 6 }).notNull().defaultNow()
});
