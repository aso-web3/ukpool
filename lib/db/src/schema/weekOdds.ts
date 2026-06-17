import {
  pgTable,
  serial,
  integer,
  numeric,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { poolWeeksTable } from "./poolWeeks";

export const poolTypeEnum = pgEnum("pool_type", [
  "single",
  "double",
  "nap",
  "under3",
  "under4",
  "under5",
  "under6",
]);

export const oddsTypeEnum = pgEnum("odds_type", ["standard", "high"]);

export const weekOddsTable = pgTable(
  "week_odds",
  {
    id: serial("id").primaryKey(),
    weekId: integer("week_id")
      .notNull()
      .references(() => poolWeeksTable.id, { onDelete: "cascade" }),
    poolType: poolTypeEnum("pool_type").notNull(),
    oddsType: oddsTypeEnum("odds_type").notNull(),
    oddsValue: numeric("odds_value", { precision: 10, scale: 2 }).notNull(),
  },
  (t) => ({
    weekPoolOddsUnique: uniqueIndex("week_odds_unique").on(
      t.weekId,
      t.poolType,
      t.oddsType,
    ),
  }),
);

export type WeekOdds = typeof weekOddsTable.$inferSelect;
