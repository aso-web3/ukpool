import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  ticketsTable,
  poolWeeksTable,
  fixturesTable,
  weekOddsTable,
  cashiersTable,
  agentsTable,
  managersTable,
  usersTable,
} from "@workspace/db";
import {
  CreateTicketBody,
  ListTicketsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import {
  totalLinesFor,
  validateSelection,
} from "../lib/perm";
import { generateTicketCode } from "../lib/ticketCode";
import type { OddsType, PoolType } from "../lib/domain";

const router: IRouter = Router();

router.use("/tickets", requireAuth);

interface TicketRow {
  ticket: typeof ticketsTable.$inferSelect;
  weekNumber: number;
  cashierName: string;
  shopName: string;
}

function shapeTicket(row: TicketRow) {
  const t = row.ticket;
  return {
    id: t.id,
    ticketCode: t.ticketCode,
    weekId: t.weekId,
    weekNumber: row.weekNumber,
    cashierId: t.cashierId,
    cashierName: row.cashierName,
    agentId: t.agentId,
    shopName: row.shopName,
    betType: t.betType,
    poolType: t.poolType,
    oddsType: t.oddsType,
    oddsValue: Number(t.oddsValue),
    selectedNumbers: t.selectedNumbers,
    totalLines: t.totalLines,
    stake: Number(t.stake),
    perLine: Number(t.perLine),
    status: t.status,
    winningLines: t.winningLines,
    winnings: Number(t.winnings),
    createdAt: t.createdAt,
  };
}

router.get("/tickets", async (req, res): Promise<void> => {
  const parsed = ListTicketsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { weekId, cashierId, agentId, status, scope } = parsed.data;

const page = Math.max(Number(req.query.page || 1), 1);
const pageSize = 20;
const offset = (page - 1) * pageSize;
  const auth = req.auth!;

  const conditions = [];
let effectiveWeekId = weekId;

if (effectiveWeekId === undefined) {
  const [activeWeek] = await db
    .select({
      id: poolWeeksTable.id,
    })
    .from(poolWeeksTable)
    .where(eq(poolWeeksTable.status, "open"))
    .orderBy(desc(poolWeeksTable.weekNumber))
    .limit(1);

  if (activeWeek) {
    effectiveWeekId = activeWeek.id;
  }
}
  if (effectiveWeekId !== undefined) conditions.push(eq(ticketsTable.weekId, effectiveWeekId));
  if (status !== undefined) conditions.push(eq(ticketsTable.status, status));

if (auth.role === "cashier") {

  if (!auth.cashierId) {
    res.json([]);
    return;
  }

  conditions.push(
    eq(ticketsTable.cashierId, auth.cashierId)
  );

  if (
    cashierId !== undefined &&
    cashierId !== auth.cashierId
  ) {
    res.json([]);
    return;
  }

} else if (auth.role === "agent") {

  if (!auth.agentId) {
    res.json([]);
    return;
  }

  conditions.push(
    eq(ticketsTable.agentId, auth.agentId)
  );

  if (cashierId !== undefined) {
    conditions.push(
      eq(ticketsTable.cashierId, cashierId)
    );
  }

} else if (auth.role === "manager") {

  const [manager] = await db
    .select()
    .from(managersTable)
    .where(
      eq(managersTable.userId, auth.userId)
    );

  if (!manager) {
    res.json([]);
    return;
  }

  const managerAgents = await db
    .select({
      id: agentsTable.id,
    })
    .from(agentsTable)
    .where(
      eq(agentsTable.managerId, manager.id)
    );

  const agentIds = managerAgents.map(
    (a) => a.id
  );

  if (agentIds.length === 0) {
    res.json([]);
    return;
  }

  conditions.push(
  inArray(
    ticketsTable.agentId,
    agentIds
  )
);

if (
  agentId !== undefined &&
  agentIds.includes(agentId)
) {
  conditions.push(
    eq(ticketsTable.agentId, agentId)
  );
}

} else {

  if (agentId !== undefined) {
    conditions.push(
      eq(ticketsTable.agentId, agentId)
    );
  }

  if (cashierId !== undefined) {
    conditions.push(
      eq(ticketsTable.cashierId, cashierId)
    );
  }
}

const [{ total }] = await db
  .select({
    total: db.$count(ticketsTable),
  })
  .from(ticketsTable)
  .where(
    conditions.length > 0
      ? and(...conditions)
      : undefined
  );

const rows = await db
  .select({
    ticket: ticketsTable,
    weekNumber: poolWeeksTable.weekNumber,
    cashierName: usersTable.name,
    shopName: agentsTable.shopName,
  })
  .from(ticketsTable)
  .innerJoin(
    poolWeeksTable,
    eq(poolWeeksTable.id, ticketsTable.weekId)
  )
  .innerJoin(
    cashiersTable,
    eq(cashiersTable.id, ticketsTable.cashierId)
  )
  .innerJoin(
    usersTable,
    eq(usersTable.id, cashiersTable.userId)
  )
  .innerJoin(
    agentsTable,
    eq(agentsTable.id, ticketsTable.agentId)
  )
  .where(
    conditions.length > 0
      ? and(...conditions)
      : undefined
  )
  .orderBy(desc(ticketsTable.createdAt))
  .limit(pageSize)
  .offset(offset);

res.json({
  tickets: rows.map(shapeTicket),
  total,
  page,
  pageSize,
  totalPages: Math.ceil(total / pageSize),
});
});

router.get("/tickets/stats", async (req, res): Promise<void> => {
  const parsed = ListTicketsQueryParams.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { weekId, cashierId, agentId, status } = parsed.data;
  const auth = req.auth!;

  const conditions = [];

  if (weekId !== undefined) {
    conditions.push(eq(ticketsTable.weekId, weekId));
  }

if (status !== undefined) {
  conditions.push(eq(ticketsTable.status, status));
}

  if (auth.role === "cashier") {
    if (!auth.cashierId) {
      res.json({
        totalTickets: 0,
        totalAmount: 0,
        totalWinnings: 0,
        totalCancelled: 0,
      });
      return;
    }

    conditions.push(eq(ticketsTable.cashierId, auth.cashierId));
  } else if (auth.role === "agent") {
    if (!auth.agentId) {
      res.json({
        totalTickets: 0,
        totalAmount: 0,
        totalWinnings: 0,
        totalCancelled: 0,
      });
      return;
    }

    conditions.push(eq(ticketsTable.agentId, auth.agentId));

    if (cashierId !== undefined) {
      conditions.push(eq(ticketsTable.cashierId, cashierId));
    }
  } else {
    if (agentId !== undefined) {
      conditions.push(eq(ticketsTable.agentId, agentId));
    }

    if (cashierId !== undefined) {
      conditions.push(eq(ticketsTable.cashierId, cashierId));
    }
  }

  const rows = await db
    .select({
      status: ticketsTable.status,
      stake: ticketsTable.stake,
      winnings: ticketsTable.winnings,
    })
    .from(ticketsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const totalTickets = rows.filter(
    (r) => r.status !== "cancelled",
  ).length;

  const totalAmount = rows
    .filter((r) => r.status !== "cancelled")
    .reduce((sum, r) => sum + Number(r.stake), 0);

  const totalWinnings = rows
    .filter((r) => r.status === "won")
    .reduce((sum, r) => sum + Number(r.winnings), 0);

  const totalCancelled = rows.filter(
    (r) => r.status === "cancelled",
  ).length;

  res.json({
    totalTickets,
    totalAmount,
    totalWinnings,
    totalCancelled,
  });
});

router.post("/tickets", async (req, res): Promise<void> => {
  const auth = req.auth!;
  if (auth.role !== "cashier" || !auth.cashierId || !auth.agentId) {
    res.status(403).json({ error: "Only cashiers can create tickets" });
    return;
  }
  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { weekId, betType, poolType, oddsType, selectedNumbers, stake } =
    parsed.data;
  const validationError = validateSelection(
    betType,
    poolType as PoolType,
    selectedNumbers,
  );
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  if (stake <= 0) {
    res.status(400).json({ error: "Stake must be positive" });
    return;
  }
  const [cashier] = await db
    .select()
    .from(cashiersTable)
    .where(eq(cashiersTable.id, auth.cashierId));
  if (!cashier) {
    res.status(400).json({ error: "Cashier not found" });
    return;
  }
  if (stake > Number(cashier.maxStake)) {
    res
      .status(400)
      .json({ error: `Stake exceeds your maximum (${cashier.maxStake})` });
    return;
  }
  const [week] = await db
    .select()
    .from(poolWeeksTable)
    .where(eq(poolWeeksTable.id, weekId));
  if (!week) {
    res.status(400).json({ error: "Week not found" });
    return;
  }
  if (week.status !== "open") {
    res.status(400).json({ error: "Week is not open for betting" });
    return;
  }
  // Check no closed/postponed fixtures selected
  const fixtures = await db
    .select()
    .from(fixturesTable)
    .where(eq(fixturesTable.weekId, weekId));
  const closed = new Set(
    fixtures.filter((f) => f.status !== "open").map((f) => f.number),
  );
  for (const n of selectedNumbers) {
    if (closed.has(n)) {
      res.status(400).json({ error: `Match #${n} is closed. Please remove it.` });
      return;
    }
  }
  const totalLines = totalLinesFor(
    betType,
    poolType as PoolType,
    selectedNumbers.length,
  );
  if (totalLines <= 0) {
    res.status(400).json({ error: "Invalid selection" });
    return;
  }
  const allOdds = await db
    .select()
    .from(weekOddsTable)
    .where(eq(weekOddsTable.weekId, weekId));
  const found = allOdds.find(
    (o) => o.poolType === poolType && o.oddsType === (oddsType as OddsType),
  );
  if (!found) {
    res.status(400).json({ error: "Odds not configured for this pool" });
    return;
  }
  const oddsValue = Number(found.oddsValue);
  const perLine = stake / totalLines;
  const code = generateTicketCode(week.weekNumber);
  const [agent] = await db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.id, auth.agentId));
  const [cashierUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, cashier.userId));
  const [ticket] = await db
    .insert(ticketsTable)
    .values({
      ticketCode: code,
      weekId,
      cashierId: auth.cashierId,
      agentId: auth.agentId,
      betType,
      poolType: poolType as PoolType,
      oddsType: oddsType as OddsType,
      oddsValue: String(oddsValue),
      selectedNumbers,
      totalLines,
      stake: String(stake),
      perLine: String(perLine),
    })
    .returning();
  res.status(201).json(
    shapeTicket({
      ticket,
      weekNumber: week.weekNumber,
      cashierName: cashierUser?.name ?? "",
      shopName: agent?.shopName ?? "",
    }),
  );
});

router.get("/tickets/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .select({
      ticket: ticketsTable,
      weekNumber: poolWeeksTable.weekNumber,
      cashierName: usersTable.name,
      shopName: agentsTable.shopName,
    })
    .from(ticketsTable)
    .innerJoin(poolWeeksTable, eq(poolWeeksTable.id, ticketsTable.weekId))
    .innerJoin(cashiersTable, eq(cashiersTable.id, ticketsTable.cashierId))
    .innerJoin(usersTable, eq(usersTable.id, cashiersTable.userId))
    .innerJoin(agentsTable, eq(agentsTable.id, ticketsTable.agentId))
    .where(eq(ticketsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  const auth = req.auth!;
  if (auth.role === "cashier" && row.ticket.cashierId !== auth.cashierId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (auth.role === "agent" && row.ticket.agentId !== auth.agentId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(shapeTicket(row));
});

router.post("/tickets/:id/cancel", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [ticket] = await db
  .select({
    id: ticketsTable.id,
    weekId: ticketsTable.weekId,
    cashierId: ticketsTable.cashierId,
    agentId: ticketsTable.agentId,
    status: ticketsTable.status,
    weekStatus: poolWeeksTable.status,
  })
  .from(ticketsTable)
  .innerJoin(poolWeeksTable, eq(poolWeeksTable.id, ticketsTable.weekId))
  .where(eq(ticketsTable.id, id));
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  const auth = req.auth!;

if (auth.role === "cashier" && ticket.cashierId !== auth.cashierId) {
  res.status(403).json({ error: "Forbidden" });
  return;
}

if (auth.role === "agent" && ticket.agentId !== auth.agentId) {
  res.status(403).json({ error: "Forbidden" });
  return;
}
  if (ticket.status !== "active") {
    res.status(400).json({ error: "Ticket is not active" });
    return;
  }

if (auth.role === "cashier" && ticket.weekStatus !== "open") {
  res.status(400).json({
    error: "Cashiers can only cancel tickets before week closes",
  });
  return;
}
const [week] = await db
  .select()
  .from(poolWeeksTable)
  .where(eq(poolWeeksTable.id, ticket.weekId));

if (!week) {
  res.status(404).json({ error: "Pool week not found" });
  return;
}

if (new Date() > new Date(week.closesAt)) {
  res.status(400).json({ error: "Betting has closed. Ticket cannot be cancelled." });
  return;
}
  const [updated] = await db
    .update(ticketsTable)
    .set({ status: "cancelled" })
    .where(eq(ticketsTable.id, id))
    .returning();
  const [meta] = await db
    .select({
      weekNumber: poolWeeksTable.weekNumber,
      cashierName: usersTable.name,
      shopName: agentsTable.shopName,
    })
    .from(ticketsTable)
    .innerJoin(poolWeeksTable, eq(poolWeeksTable.id, ticketsTable.weekId))
    .innerJoin(cashiersTable, eq(cashiersTable.id, ticketsTable.cashierId))
    .innerJoin(usersTable, eq(usersTable.id, cashiersTable.userId))
    .innerJoin(agentsTable, eq(agentsTable.id, ticketsTable.agentId))
    .where(eq(ticketsTable.id, id));
  res.json(
    shapeTicket({
      ticket: updated,
      weekNumber: meta.weekNumber,
      cashierName: meta.cashierName,
      shopName: meta.shopName,
    }),
  );
});

export default router;
