import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const agentApplicationStatusEnum = pgEnum(
  "agent_application_status",
  ["pending", "approved", "rejected"],
);

export const agentApplicationsTable = pgTable("agent_applications", {
  id: serial("id").primaryKey(),
  shopName: text("shop_name").notNull(),
  location: text("location").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  status: agentApplicationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export type AgentApplication = typeof agentApplicationsTable.$inferSelect;
