import {
  pgTable,
  serial,
  integer,
  numeric,
  timestamp,
  text,
} from "drizzle-orm/pg-core";

import { managersTable } from "./managers";
import { usersTable } from "./users";

export const managerCommissionPaymentsTable =
  pgTable(
    "manager_commission_payments",
    {
      id: serial("id").primaryKey(),

      month: integer("month").notNull(),

      year: integer("year").notNull(),

      managerId: integer("manager_id")
        .notNull()
        .references(() => managersTable.id),

      commissionPercent: numeric(
        "commission_percent",
        {
          precision: 5,
          scale: 2,
        }
      ).notNull(),

      commissionAmount: numeric(
        "commission_amount",
        {
          precision: 14,
          scale: 2,
        }
      ).notNull(),

      status: text("status")
        .notNull()
        .default("pending"),

      paidAt: timestamp("paid_at", {
        withTimezone: true,
      }),

      paidByUserId: integer(
        "paid_by_user_id"
      ).references(() => usersTable.id),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        }
      )
        .notNull()
        .defaultNow(),
    }
  );

export type ManagerCommissionPayment =
  typeof managerCommissionPaymentsTable.$inferSelect;
