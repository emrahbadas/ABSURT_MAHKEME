import { integer, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";

export const rounds = pgTable(
  "rounds",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    room_id: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    round_index: integer("round_index").notNull(),
    custom_case_topic: varchar("custom_case_topic", { length: 140 }),
    started_at: timestamp("started_at", { mode: "date", precision: 6 }).notNull().defaultNow(),
    ended_at: timestamp("ended_at", { mode: "date", precision: 6 })
  },
  (table) => ({
    roomRoundUnique: uniqueIndex("rounds_room_round_index_unique").on(table.room_id, table.round_index)
  })
);

export const round_phases = pgTable(
  "round_phases",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    round_id: uuid("round_id").notNull().references(() => rounds.id, { onDelete: "cascade" }),
    phase_index: integer("phase_index").notNull(),
    phase: varchar("phase", { length: 24 }).notNull(),
    started_at: timestamp("started_at", { mode: "date", precision: 6 }).notNull(),
    ended_at: timestamp("ended_at", { mode: "date", precision: 6 })
  },
  (table) => ({
    roundPhaseUnique: uniqueIndex("round_phases_round_phase_index_unique").on(table.round_id, table.phase_index)
  })
);
