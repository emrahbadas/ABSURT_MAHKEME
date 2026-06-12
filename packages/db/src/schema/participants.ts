import { index, integer, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";

export const room_participants = pgTable(
  "room_participants",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    room_id: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    nickname: varchar("nickname", { length: 18 }).notNull(),
    role: varchar("role", { length: 24 }).notNull(),
    joined_at: timestamp("joined_at", { mode: "date", precision: 6 }).notNull().defaultNow(),
    left_at: timestamp("left_at", { mode: "date", precision: 6 }),
    session_token: varchar("session_token", { length: 128 }).notNull(),
    is_active: integer("is_active").notNull().default(1)
  },
  (table) => ({
    roomNicknameUnique: uniqueIndex("room_participants_room_nickname_unique").on(table.room_id, table.nickname),
    sessionTokenUnique: uniqueIndex("room_participants_session_token_unique").on(table.session_token),
    nicknameIdx: index("room_participants_nickname_idx").on(table.nickname)
  })
);
