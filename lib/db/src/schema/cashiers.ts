import {
  pgTable,
  serial,
  timestamp,
  integer,
  numeric,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { agentsTable } from "./agents";

export const cashiersTable = pgTable("cashiers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  agentId: integer("agent_id")
    .notNull()
    .references(() => agentsTable.id, { onDelete: "cascade" }),
  maxStake: numeric("max_stake", { precision: 12, scale: 2 })
    .notNull()
    .default("100000"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Cashier = typeof cashiersTable.$inferSelect;
