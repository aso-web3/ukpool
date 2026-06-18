import { pgTable, serial, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "agent", "cashier"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
