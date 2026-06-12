import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const case_cards = pgTable("case_cards", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  content: varchar("content", { length: 140 }).notNull().unique(),
  weight: integer("weight").notNull().default(1),
  emoji: varchar("emoji", { length: 4 }).notNull(),
  is_active: integer("is_active").notNull().default(1)
});

export const case_topics = pgTable("case_topics", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  content: varchar("content", { length: 140 }).notNull().unique(),
  created_at: timestamp("created_at", { mode: "date", precision: 6 }).notNull().defaultNow(),
  is_approved: integer("is_approved").notNull().default(1)
});
