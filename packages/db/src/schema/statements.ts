import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { room_participants } from "./participants";
import { rounds } from "./rounds";

export const player_statements = pgTable("player_statements", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  round_id: uuid("round_id").notNull().references(() => rounds.id, { onDelete: "cascade" }),
  participant_id: uuid("participant_id").notNull().references(() => room_participants.id, { onDelete: "cascade" }),
  phase: varchar("phase", { length: 24 }).notNull(),
  content: varchar("content", { length: 140 }).notNull(),
  safety_passed: integer("safety_passed").notNull().default(1),
  created_at: timestamp("created_at", { mode: "date", precision: 6 }).notNull().defaultNow()
});
