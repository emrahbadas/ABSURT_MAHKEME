import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  status: varchar("status", { length: 24 }).notNull().default("waiting"),
  max_participants: integer("max_participants").notNull().default(8),
  created_at: timestamp("created_at", { mode: "date", precision: 6 }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { mode: "date", precision: 6 }).notNull().defaultNow()
});
