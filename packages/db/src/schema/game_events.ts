import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";

export const game_events = pgTable("game_events", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  room_id: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  event_name: varchar("event_name", { length: 64 }).notNull(),
  payload_json: varchar("payload_json", { length: 4000 }).notNull(),
  created_at: timestamp("created_at", { mode: "date", precision: 6 }).notNull().defaultNow()
});
