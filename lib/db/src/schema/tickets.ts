import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  pgEnum,
  timestamp,
} from "drizzle-orm/pg-core";
import { poolWeeksTable } from "./poolWeeks";
import { cashiersTable } from "./cashiers";
import { agentsTable } from "./agents";
import { poolTypeEnum, oddsTypeEnum } from "./weekOdds";

export const betTypeEnum = pgEnum("bet_type", ["nap", "perm"]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "active",
  "cancelled",
  "won",
  "lost",
]);

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketCode: text("ticket_code").notNull().unique(),
  weekId: integer("week_id")
    .notNull()
    .references(() => poolWeeksTable.id, { onDelete: "cascade" }),
  cashierId: integer("cashier_id")
    .notNull()
    .references(() => cashiersTable.id, { onDelete: "cascade" }),
  agentId: integer("agent_id")
    .notNull()
    .references(() => agentsTable.id, { onDelete: "cascade" }),
  betType: betTypeEnum("bet_type").notNull(),
  poolType: poolTypeEnum("pool_type").notNull(),
  oddsType: oddsTypeEnum("odds_type").notNull(),
  oddsValue: numeric("odds_value", { precision: 10, scale: 2 }).notNull(),
  selectedNumbers: integer("selected_numbers").array().notNull(),
  totalLines: integer("total_lines").notNull(),
  stake: numeric("stake", { precision: 12, scale: 2 }).notNull(),
  perLine: numeric("per_line", { precision: 12, scale: 4 }).notNull(),
  status: ticketStatusEnum("status").notNull().default("active"),
  winningLines: integer("winning_lines").notNull().default(0),
  winnings: numeric("winnings", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Ticket = typeof ticketsTable.$inferSelect;
