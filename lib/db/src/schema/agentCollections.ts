import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { agentsTable } from "./agents";
import { managersTable } from "./managers";
import { poolWeeksTable } from "./poolWeeks";

export const agentCollectionsTable = pgTable(
  "agent_collections",
  {
    id: serial("id").primaryKey(),

    weekId: integer("week_id")
      .notNull()
      .references(() => poolWeeksTable.id),

    agentId: integer("agent_id")
      .notNull()
      .references(() => agentsTable.id),

    managerId: integer("manager_id")
      .notNull()
      .references(() => managersTable.id),

    cashAmount: integer("cash_amount")
      .notNull()
      .default(0),

    transferAmount: integer("transfer_amount")
      .notNull()
      .default(0),

    note: text("note"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  }
);

export type AgentCollection =
  typeof agentCollectionsTable.$inferSelect;
