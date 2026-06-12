import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { room_participants } from "./participants";
import { rounds } from "./rounds";

export const jury_votes = pgTable("jury_votes", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  round_id: uuid("round_id").notNull().references(() => rounds.id, { onDelete: "cascade" }),
  participant_id: uuid("participant_id").notNull().references(() => room_participants.id, { onDelete: "cascade" }),
  vote: varchar("vote", { length: 24 }).notNull(),
  vote_weight: integer("vote_weight").notNull().default(1),
  created_at: timestamp("created_at", { mode: "date", precision: 6 }).notNull().defaultNow()
});
