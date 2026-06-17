import {
  pgTable,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// Schema for connect-pg-simple session storage.
export const sessionsTable = pgTable(
  "user_sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: timestamp("expire", { withTimezone: false }).notNull(),
  },
  (t) => ({
    expireIdx: index("idx_user_sessions_expire").on(t.expire),
  }),
);
