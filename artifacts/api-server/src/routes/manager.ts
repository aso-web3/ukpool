import { Router } from "express";
import { eq, sql, and, desc } from "drizzle-orm";
import {
  db,
  managersTable,
  agentsTable,
  usersTable,
  ticketsTable,
  agentCollectionsTable,
  poolWeeksTable,
} from "@workspace/db";
import { requireRole } from "../middlewares/auth";

const router = Router();

router.use("/manager", requireRole("manager"));

router.get("/manager/agents", async (req, res) => {
  const userId = req.auth?.userId;
const weekId =
  req.query.weekId
    ? Number(req.query.weekId)
    : undefined;

const agentId =
  req.query.agentId
    ? Number(req.query.agentId)
    : undefined;

  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [manager] = await db
    .select()
    .from(managersTable)
    .where(eq(managersTable.userId, userId))
;

  if (!manager) {
    res.status(404).json({ error: "Manager not found" });
    return;
  }

  const agents = await db
    .select({
      id: agentsTable.id,
      userId: agentsTable.userId,
      managerId: agentsTable.managerId,
      username: usersTable.username,
      shopName: agentsTable.shopName,
      location: agentsTable.location,
      phone: agentsTable.phone,
      email: agentsTable.email,
      createdAt: agentsTable.createdAt,
    })
    .from(agentsTable)
    .innerJoin(
      usersTable,
      eq(agentsTable.userId, usersTable.id)
    )
    .where(eq(agentsTable.managerId, manager.id));

  res.json(agents);
});

router.get("/manager/collections", async (req, res) => {
  const userId = req.auth?.userId;

  const weekId =
    req.query.weekId
      ? Number(req.query.weekId)
      : undefined;

  const agentId =
    req.query.agentId
      ? Number(req.query.agentId)
      : undefined;

  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [manager] = await db
    .select()
    .from(managersTable)
    .where(eq(managersTable.userId, userId));

  if (!manager) {
    res.status(404).json({ error: "Manager not found" });
    return;
  }

  const agents = await db
  .select({
    id: agentsTable.id,
    shopName: agentsTable.shopName,
  })
  .from(agentsTable)
  .where(
    agentId
      ? and(
          eq(agentsTable.managerId, manager.id),
          eq(agentsTable.id, agentId)
        )
      : eq(
          agentsTable.managerId,
          manager.id
        )
  );

  const result = [];

  for (const agent of agents) {
    const [{ sales }] = await db
  .select({
    sales: sql<number>`
      coalesce(sum(${ticketsTable.stake}),0)
    `,
  })
  .from(ticketsTable)
  .where(
    weekId
      ? and(
          eq(ticketsTable.agentId, agent.id),
          eq(ticketsTable.weekId, weekId)
        )
      : eq(ticketsTable.agentId, agent.id)
  );

const [collections] = await db
  .select({
    cash: sql<number>`
      coalesce(sum(${agentCollectionsTable.cashAmount}),0)
    `,
    transfer: sql<number>`
      coalesce(sum(${agentCollectionsTable.transferAmount}),0)
    `,
  })
  .from(agentCollectionsTable)
  .where(
    weekId
      ? and(
          eq(agentCollectionsTable.agentId, agent.id),
          eq(agentCollectionsTable.weekId, weekId)
        )
      : eq(agentCollectionsTable.agentId, agent.id)
  );

    result.push({
      agentId: agent.id,
      shopName: agent.shopName,
      totalSales: Number(sales ?? 0),
      cashCollected: Number(collections.cash ?? 0),
transferCollected: Number(collections.transfer ?? 0),

totalCollected:
  Number(collections.cash ?? 0) +
  Number(collections.transfer ?? 0),

balance:
  Number(sales ?? 0) -
  (
    Number(collections.cash ?? 0) +
    Number(collections.transfer ?? 0)
  ),
    });
  }

  res.json(result);
});

router.post("/manager/collections", async (req, res) => {
  const userId = req.auth?.userId;

  if (!userId) {
    res.status(401).json({
      error: "Authentication required",
    });
    return;
  }

  const [manager] = await db
    .select()
    .from(managersTable)
    .where(eq(managersTable.userId, userId));

  if (!manager) {
    res.status(404).json({
      error: "Manager not found",
    });
    return;
  }

  const {
    weekId,
    agentId,
    cashAmount,
    transferAmount,
    note,
  } = req.body;

  if (!weekId || !agentId) {
    res.status(400).json({
      error: "Week and agent required",
    });
    return;
  }

  await db.insert(agentCollectionsTable).values({
    weekId: Number(weekId),
    agentId: Number(agentId),
    managerId: manager.id,
    cashAmount: Number(cashAmount || 0),
    transferAmount: Number(
      transferAmount || 0
    ),
    note: note || null,
  });

  res.json({
    success: true,
  });
});

router.get(
  "/manager/collections/history",
  async (req, res) => {
    const userId = req.auth?.userId;

    if (!userId) {
      res.status(401).json({
        error: "Authentication required",
      });
      return;
    }

    const agentId = Number(req.query.agentId);

    if (!agentId) {
      res.status(400).json({
        error: "Agent required",
      });
      return;
    }

    const rows = await db
  .select({
    id: agentCollectionsTable.id,
    weekId: agentCollectionsTable.weekId,
    weekNumber: poolWeeksTable.weekNumber,
    cashAmount: agentCollectionsTable.cashAmount,
    transferAmount: agentCollectionsTable.transferAmount,
    note: agentCollectionsTable.note,
    createdAt: agentCollectionsTable.createdAt,
  })
  .from(agentCollectionsTable)
  .innerJoin(
    poolWeeksTable,
    eq(
      poolWeeksTable.id,
      agentCollectionsTable.weekId
    )
  )
  .where(
    eq(
      agentCollectionsTable.agentId,
      agentId
    )
  )
  .orderBy(
    desc(agentCollectionsTable.createdAt)
  );

    res.json(rows);
  }
);

export default router;
