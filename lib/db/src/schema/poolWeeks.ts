import {
  pgTable,
  serial,
  integer,
  timestamp,
  pgEnum,
  numeric,
} from "drizzle-orm/pg-core";

export const poolWeekStatusEnum = pgEnum("pool_week_status", [
  "draft",
  "open",
  "closed",
  "settled",
]);

export const poolWeeksTable = pgTable("pool_weeks", {
  id: serial("id").primaryKey(),
  season: integer("season").notNull().default(2026),
  weekNumber: integer("week_number").notNull(),
  status: poolWeekStatusEnum("status").notNull().default("draft"),
  opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  winningNumbers: integer("winning_numbers").array().notNull().default([]),
  commissionPercent: numeric("commission_percent", {
  precision: 5,
  scale: 2,
})
  .notNull()
  .default("10.00"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PoolWeek = typeof poolWeeksTable.$inferSelect;
