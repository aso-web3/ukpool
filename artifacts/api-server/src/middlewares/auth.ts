import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  agentsTable,
  cashiersTable,
} from "@workspace/db";
import type { Role } from "../lib/domain";

export interface AuthContext {
  userId: number;
  username: string;
  name: string;
  role: Role;
  agentId: number | null;
  cashierId: number | null;
  shopName: string | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export async function loadAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.session.userId;
  if (!userId) {
    next();
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) {
    req.session.destroy(() => undefined);
    next();
    return;
  }
  let agentId: number | null = null;
  let cashierId: number | null = null;
  let shopName: string | null = null;
  if (user.role === "agent") {
    const [agent] = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.userId, user.id));
    if (agent) {
      agentId = agent.id;
      shopName = agent.shopName;
    }
  } else if (user.role === "cashier") {
    const [cashier] = await db
      .select()
      .from(cashiersTable)
      .where(eq(cashiersTable.userId, user.id));
    if (cashier) {
      cashierId = cashier.id;
      agentId = cashier.agentId;
      const [agent] = await db
        .select()
        .from(agentsTable)
        .where(eq(agentsTable.id, cashier.agentId));
      if (agent) shopName = agent.shopName;
    }
  }
  req.auth = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role as Role,
    agentId,
    cashierId,
    shopName,
  };
  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
