import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  db,
  poolWeeksTable,
  agentsTable,
  agentApplicationsTable,
} from "@workspace/db";
import { SubmitAgentApplicationBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/public/current-week", async (_req, res): Promise<void> => {
  const [week] = await db
    .select()
    .from(poolWeeksTable)
    .where(eq(poolWeeksTable.status, "open"))
    .orderBy(desc(poolWeeksTable.weekNumber))
    .limit(1);
  let chosen = week;
  if (!chosen) {
    const [latest] = await db
      .select()
      .from(poolWeeksTable)
      .orderBy(desc(poolWeeksTable.weekNumber))
      .limit(1);
    chosen = latest;
  }
  const [{ count: agentCount }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(agentsTable);
  res.json({
    week: chosen ?? null,
    totalAgents: Number(agentCount ?? 0),
    totalShops: Number(agentCount ?? 0),
  });
});

router.get("/public/weeks", async (_req, res): Promise<void> => {
  const weeks = await db
    .select({
      id: poolWeeksTable.id,
      season: poolWeeksTable.season,
      weekNumber: poolWeeksTable.weekNumber,
      status: poolWeeksTable.status,
    })
    .from(poolWeeksTable)
    .orderBy(
  desc(poolWeeksTable.season),
  desc(poolWeeksTable.weekNumber)
);

  res.json(weeks);
});

router.post("/public/agent-applications", async (req, res): Promise<void> => {
  const parsed = SubmitAgentApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [app] = await db
    .insert(agentApplicationsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(app);
});

export default router;
