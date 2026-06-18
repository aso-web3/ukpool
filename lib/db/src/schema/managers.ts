import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

import { usersTable } from "./users";

export const managersTable = pgTable("managers", {
  id: serial("id").primaryKey(),

  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "cascade",
    }),

  phone: text("phone").notNull(),

  email: text("email").notNull(),

  location: text("location").notNull(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export type Manager =
  typeof managersTable.$inferSelect;
