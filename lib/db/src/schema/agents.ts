import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { managersTable } from "./managers";

export const agentsTable = pgTable("agents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  managerId: integer("manager_id")
  .references(() => managersTable.id),
  shopName: text("shop_name").notNull(),
  location: text("location").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Agent = typeof agentsTable.$inferSelect;
