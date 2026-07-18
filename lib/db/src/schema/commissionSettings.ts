import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const commissionSettingsTable = pgTable(
  "commission_settings",
  {
    id: serial("id").primaryKey(),

    defaultCommissionPercent: integer(
      "default_commission_percent"
    )
      .notNull()
      .default(2),

    paymentScheduleType: text(
      "payment_schedule_type"
    )
      .notNull()
      .default("fixed_day"),

    paymentScheduleValue: text(
      "payment_schedule_value"
    )
      .notNull()
      .default("25"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  }
);

export type CommissionSettings =
  typeof commissionSettingsTable.$inferSelect;
