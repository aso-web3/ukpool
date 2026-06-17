import {
  pgTable,
  serial,
  integer,
  text,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { poolWeeksTable } from "./poolWeeks";

export const fixtureStatusEnum = pgEnum("fixture_status", [
  "open",
  "closed",
  "postponed",
]);

export const fixturesTable = pgTable(
  "fixtures",
  {
    id: serial("id").primaryKey(),
    weekId: integer("week_id")
      .notNull()
      .references(() => poolWeeksTable.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    homeTeam: text("home_team").notNull().default(""),
    awayTeam: text("away_team").notNull().default(""),
    status: fixtureStatusEnum("status").notNull().default("open"),
  },
  (t) => ({
    weekNumberUnique: uniqueIndex("fixtures_week_number_unique").on(
      t.weekId,
      t.number,
    ),
  }),
);

export type Fixture = typeof fixturesTable.$inferSelect;
