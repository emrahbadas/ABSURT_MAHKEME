import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { rounds } from "./rounds";

export const verdicts = pgTable("verdicts", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  round_id: uuid("round_id").notNull().references(() => rounds.id, { onDelete: "cascade" }),
  winner: varchar("winner", { length: 24 }),
  percentage_davaci: integer("percentage_davaci").notNull(),
  percentage_davali: integer("percentage_davali").notNull(),
  ruling_text: varchar("ruling_text", { length: 500 }).notNull(),
  jury_effect: integer("jury_effect").notNull().default(0),
  created_at: timestamp("created_at", { mode: "date", precision: 6 }).notNull().defaultNow()
});
