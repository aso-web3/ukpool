import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, agentsTable, cashiersTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import { loadAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { username, password } = parsed.data;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
if (!user.isActive) {
  res.status(403).json({ error: "Account has been disabled" });
  return;
}
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  req.session.userId = user.id;
  req.session.role = user.role;
  // Re-load auth context for the response.
  await new Promise<void>((resolve) =>
    loadAuth(req, res, () => resolve()),
  );
  if (!req.auth) {
    res.status(500).json({ error: "Failed to load session" });
    return;
  }
  res.json(req.auth);
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.status(204).end();
  });
});

router.get("/auth/me", (req, res): void => {
  if (!req.auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(req.auth);
});

router.post("/me/change-password", async (req, res): Promise<void> => {
  if (!req.auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { currentPassword, newPassword } = req.body ?? {};

  if (!currentPassword || !newPassword) {
    res.status(400).json({
      error: "Current password and new password are required",
    });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({
      error: "New password must be at least 6 characters",
    });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.auth.userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!ok) {
    res.status(401).json({
      error: "Current password is incorrect",
    });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  await db
    .update(usersTable)
    .set({
      passwordHash: newHash,
    })
    .where(eq(usersTable.id, user.id));

  res.json({
    success: true,
    message: "Password changed successfully",
  });
});

export default router;

// Helper used by admin/agent routes to create users.
export async function createUserWithPassword(input: {
  username: string;
  password: string;
  name: string;
  role: "admin" | "agent" | "cashier";
}) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({
      username: input.username,
      passwordHash,
      name: input.name,
      role: input.role,
    })
    .returning();
  return user;
}

export async function findAgentForUser(userId: number) {
  const [agent] = await db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.userId, userId));
  return agent;
}

export async function findCashierForUser(userId: number) {
  const [cashier] = await db
    .select()
    .from(cashiersTable)
    .where(eq(cashiersTable.userId, userId));
  return cashier;
}
