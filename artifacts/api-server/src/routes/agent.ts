import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  db,
  usersTable,
  agentsTable,
  cashiersTable,
  poolWeeksTable,
  ticketsTable,
} from "@workspace/db";
import { CreateCashierBody } from "@workspace/api-zod";
import { requireRole } from "../middlewares/auth";
import { createUserWithPassword } from "./auth";

const router: IRouter = Router();

router.use("/agent", requireRole("agent"));

router.get("/agent/stats", async (req, res): Promise<void> => {
  const agentId = req.auth?.agentId;
  if (!agentId) {
    res.status(400).json({ error: "Agent not found" });
    return;
  }
  const [{ cashiers }] = await db
    .select({ cashiers: sql<number>`cast(count(*) as int)` })
    .from(cashiersTable)
    .where(eq(cashiersTable.agentId, agentId));

  const [activeWeek] = await db
    .select()
    .from(poolWeeksTable)
    .where(eq(poolWeeksTable.status, "open"))
    .orderBy(desc(poolWeeksTable.weekNumber))
    .limit(1);
  let chosen = activeWeek;
  if (!chosen) {
    const [latest] = await db
      .select()
      .from(poolWeeksTable)
      .orderBy(desc(poolWeeksTable.weekNumber))
      .limit(1);
    chosen = latest;
  }

  let weekTickets = 0;
  let weekStake = 0;
  let weekPayout = 0;
  let commissionAmount = 0;
  let cashierActivity: { cashierId: number; cashierName: string; tickets: number; stake: number }[] = [];
  if (chosen) {
    const [stats] = await db
      .select({
        count: sql<number>`cast(count(*) as int)`,
        stake: sql<string>`coalesce(sum(${ticketsTable.stake}), 0)`,
        payout: sql<string>`coalesce(sum(${ticketsTable.winnings}), 0)`,
      })
      .from(ticketsTable)
      .where(
        and(
          eq(ticketsTable.weekId, chosen.id),
          eq(ticketsTable.agentId, agentId),
        ),
      );
    weekTickets = Number(stats?.count ?? 0);
    weekStake = Number(stats?.stake ?? 0);
    weekPayout = Number(stats?.payout ?? 0);

if (chosen.status === "settled") {
  const [commissionStats] = await db
    .select({
      validSales: sql<string>`coalesce(sum(${ticketsTable.stake}), 0)`,
    })
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.weekId, chosen.id),
        eq(ticketsTable.agentId, agentId),
        sql`${ticketsTable.status} in ('won', 'lost')`
      )
    );

  const validSales = Number(commissionStats?.validSales ?? 0);
  const commissionPercent = Number(chosen.commissionPercent);

  commissionAmount = (validSales * commissionPercent) / 100;
}

    const activity = await db
      .select({
        cashierId: cashiersTable.id,
        cashierName: usersTable.name,
        tickets: sql<number>`cast(count(${ticketsTable.id}) as int)`,
        stake: sql<string>`coalesce(sum(${ticketsTable.stake}), 0)`,
      })
      .from(cashiersTable)
      .innerJoin(usersTable, eq(usersTable.id, cashiersTable.userId))
      .leftJoin(
        ticketsTable,
        and(
          eq(ticketsTable.cashierId, cashiersTable.id),
          eq(ticketsTable.weekId, chosen.id),
        ),
      )
      .where(eq(cashiersTable.agentId, agentId))
      .groupBy(cashiersTable.id, usersTable.name);
    cashierActivity = activity.map((a) => ({
      cashierId: a.cashierId,
      cashierName: a.cashierName,
      tickets: Number(a.tickets ?? 0),
      stake: Number(a.stake ?? 0),
    }));
  }

  res.json({
    cashiers: Number(cashiers ?? 0),
    weekTickets,
    weekStake,
    weekPayout,
    commissionAmount,
    cashierActivity,
  });
});

router.get("/agent/pool-weeks/:id/commission", async (req, res): Promise<void> => {
  const agentId = req.auth?.agentId;

  if (!agentId) {
    res.status(400).json({ error: "Agent not found" });
    return;
  }

  const id = Number(req.params["id"]);

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [week] = await db
    .select()
    .from(poolWeeksTable)
    .where(eq(poolWeeksTable.id, id));

  if (!week) {
    res.status(404).json({ error: "Week not found" });
    return;
  }

  if (week.status !== "settled") {
    res.status(400).json({ error: "Commission available only for settled weeks" });
    return;
  }

  const [stats] = await db
    .select({
      validSales: sql<string>`coalesce(sum(${ticketsTable.stake}), 0)`,
    })
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.weekId, id),
        eq(ticketsTable.agentId, agentId),
        sql`${ticketsTable.status} in ('won', 'lost')`
      )
    );

  const validSales = Number(stats?.validSales ?? 0);
  const commissionPercent = Number(week.commissionPercent);
  const commissionAmount = (validSales * commissionPercent) / 100;

  res.json({
    weekId: week.id,
    weekNumber: week.weekNumber,
    validSales,
    commissionAmount,
  });
});

router.get("/agent/cashiers", async (req, res): Promise<void> => {
  const agentId = req.auth?.agentId;
  if (!agentId) {
    res.status(400).json({ error: "Agent not found" });
    return;
  }
  const rows = await db
    .select({
      id: cashiersTable.id,
      userId: cashiersTable.userId,
      agentId: cashiersTable.agentId,
      username: usersTable.username,
      name: usersTable.name,
      maxStake: cashiersTable.maxStake,
      createdAt: cashiersTable.createdAt,
      ticketCount: sql<number>`cast(count(${ticketsTable.id}) as int)`,
    })
    .from(cashiersTable)
    .innerJoin(usersTable, eq(usersTable.id, cashiersTable.userId))
    .leftJoin(ticketsTable, eq(ticketsTable.cashierId, cashiersTable.id))
    .where(eq(cashiersTable.agentId, agentId))
    .groupBy(cashiersTable.id, usersTable.username, usersTable.name)
    .orderBy(desc(cashiersTable.createdAt));
  res.json(
    rows.map((r) => ({
      ...r,
      maxStake: Number(r.maxStake),
      ticketCount: Number(r.ticketCount ?? 0),
    })),
  );
});

router.post("/agent/cashiers", async (req, res): Promise<void> => {
  const agentId = req.auth?.agentId;
  if (!agentId) {
    res.status(400).json({ error: "Agent not found" });
    return;
  }
  const parsed = CreateCashierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
const [agent] = await db
  .select({
    username: usersTable.username,
  })
  .from(agentsTable)
  .innerJoin(usersTable, eq(usersTable.id, agentsTable.userId))
  .where(eq(agentsTable.id, agentId));

const [{ count }] = await db
  .select({
    count: sql<number>`cast(count(*) as int)`,
  })
  .from(cashiersTable)
  .where(eq(cashiersTable.agentId, agentId));

const username =
  `${agent.username}-C${String(count + 1).padStart(2, "0")}`;

const user = await createUserWithPassword({
  username,
  password: parsed.data.password,
  name: parsed.data.name,
  role: "cashier",
});
  const [cashier] = await db
    .insert(cashiersTable)
    .values({
      userId: user.id,
      agentId,
      maxStake: String(parsed.data.maxStake),
    })
    .returning();
  res.status(201).json({
    id: cashier.id,
    userId: cashier.userId,
    agentId: cashier.agentId,
    username: user.username,
    name: user.name,
    maxStake: Number(cashier.maxStake),
    ticketCount: 0,
    createdAt: cashier.createdAt,
  });
});

router.patch("/agent/cashiers/:id", async (req, res): Promise<void> => {
  const agentId = req.auth?.agentId;

  if (!agentId) {
    res.status(400).json({ error: "Agent not found" });
    return;
  }

  const cashierId = Number(req.params["id"]);

  if (!Number.isFinite(cashierId)) {
    res.status(400).json({ error: "Invalid cashier id" });
    return;
  }

  const [cashier] = await db
    .select({
      id: cashiersTable.id,
      userId: cashiersTable.userId,
      agentId: cashiersTable.agentId,
    })
    .from(cashiersTable)
    .where(eq(cashiersTable.id, cashierId));

  if (!cashier || cashier.agentId !== agentId) {
    res.status(404).json({ error: "Cashier not found" });
    return;
  }

  const { name, username, password, maxStake, active } = req.body ?? {};

  if (username) {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username));

    if (existing.length > 0 && existing[0].id !== cashier.userId) {
      res.status(400).json({ error: "Username already taken" });
      return;
    }
  }

  const userUpdate: any = {};

  if (name) userUpdate.name = name;
  if (username) userUpdate.username = username;
  if (typeof active === "boolean") userUpdate.isActive = active;

  if (password) {
    userUpdate.passwordHash = await bcrypt.hash(password, 10);
  }

  if (Object.keys(userUpdate).length > 0) {
    await db
      .update(usersTable)
      .set(userUpdate)
      .where(eq(usersTable.id, cashier.userId));
  }

  if (maxStake !== undefined) {
    await db
      .update(cashiersTable)
      .set({
        maxStake: String(maxStake),
      })
      .where(eq(cashiersTable.id, cashierId));
  }

  res.json({
    success: true,
    message: "Cashier updated successfully",
  });
});

export default router;
