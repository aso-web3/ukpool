import session, { type SessionOptions } from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import type { Role } from "./domain";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    role?: Role;
  }
}

const PgStore = connectPgSimple(session);

const secret = process.env["SESSION_SECRET"];
if (!secret) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const isProduction = process.env["NODE_ENV"] === "production";

const options: SessionOptions = {
  store: new PgStore({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: true,
  }),
  secret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 1000 * 60 * 30, // 14 days
  },
};

export const sessionMiddleware = session(options);
