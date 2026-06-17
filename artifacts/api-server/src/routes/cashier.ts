import { Router, type IRouter } from "express";
import { asc, desc, eq } from "drizzle-orm";
import {
  db,
  poolWeeksTable,
  fixturesTable,
  weekOddsTable,
  cashiersTable,
} from "@workspace/db";
import { CalculateBetBody } from "@workspace/api-zod";
import { requireRole } from "../middlewares/auth";
import {
  totalLinesFor,
  validateSelection,
} from "../lib/perm";
import type { OddsType, PoolType } from "../lib/domain";

const router: IRouter = Router();

router.use("/cashier", requireRole("cashier"));

router.get("/cashier/active-weeks", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: poolWeeksTable.id,
      weekNumber: poolWeeksTable.weekNumber,
      status: poolWeeksTable.status,
      closesAt: poolWeeksTable.closesAt,
    })
    .from(poolWeeksTable)
    .where(eq(poolWeeksTable.status, "open"))
    .orderBy(desc(poolWeeksTable.weekNumber));
  res.json(rows);
});

router.get("/cashier/weeks/:id", async (req, res): Promise<void> => {
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
  const fixtures = await db
    .select({
      number: fixturesTable.number,
      status: fixturesTable.status,
    })
    .from(fixturesTable)
    .where(eq(fixturesTable.weekId, id))
    .orderBy(asc(fixturesTable.number));
  const odds = await db
    .select()
    .from(weekOddsTable)
    .where(eq(weekOddsTable.weekId, id));
  const cashierId = req.auth?.cashierId;
  let maxStake = 0;
  if (cashierId) {
    const [cashier] = await db
      .select()
      .from(cashiersTable)
      .where(eq(cashiersTable.id, cashierId));
    if (cashier) maxStake = Number(cashier.maxStake);
  }
  res.json({
    week: {
      id: week.id,
      weekNumber: week.weekNumber,
      status: week.status,
      closesAt: week.closesAt,
    },
    fixtures,
    odds,
    maxStake,
  });
});

router.post("/cashier/calculate", async (req, res): Promise<void> => {
  const parsed = CalculateBetBody.safeParse(req.body);
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
  const totalLines = totalLinesFor(
    betType,
    poolType as PoolType,
    selectedNumbers.length,
  );
  if (totalLines <= 0) {
    res.status(400).json({ error: "Invalid selection" });
    return;
  }
  const [oddsRow] = await db
    .select()
    .from(weekOddsTable)
    .where(eq(weekOddsTable.weekId, weekId));
  void oddsRow;
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
  const possibleMaxWinnings = oddsValue * stake;
  res.json({
    totalLines,
    perLine,
    oddsValue,
    possibleMaxWinnings,
  });
});

export default router;
