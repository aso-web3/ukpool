import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { and, asc, desc, eq, sql, inArray, gte, lt } from "drizzle-orm";
import {
  db,
  usersTable,
  managersTable,
  agentsTable,
  cashiersTable,
  agentApplicationsTable,
  poolWeeksTable,
  fixturesTable,
  weekOddsTable,
  ticketsTable,
  agentCollectionsTable,
  commissionSettingsTable,
  managerCommissionPaymentsTable,
} from "@workspace/db";
import {
  CreateAgentBody,
  CreatePoolWeekBody,
  ApproveAgentApplicationBody,
  UpdatePoolWeekStatusBody,
  SetFixturesBody,
  UpdateFixtureStatusBody,
  SetWeekOddsBody,
  SubmitWeekResultsBody,
  ListAgentApplicationsQueryParams,
} from "@workspace/api-zod";
import { requireRole } from "../middlewares/auth";
import { createUserWithPassword } from "./auth";
import { DEFAULT_ODDS, ODDS_TYPES, POOL_TYPES } from "../lib/domain";
import { winningLinesFor, calcWinnings } from "../lib/perm";

const router: IRouter = Router();

router.use("/admin", requireRole("admin"));

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [{ agents }] = await db
    .select({ agents: sql<number>`cast(count(*) as int)` })
    .from(agentsTable);
  const [{ cashiers }] = await db
    .select({ cashiers: sql<number>`cast(count(*) as int)` })
    .from(cashiersTable);
  const [{ pendingApplications }] = await db
    .select({ pendingApplications: sql<number>`cast(count(*) as int)` })
    .from(agentApplicationsTable)
    .where(eq(agentApplicationsTable.status, "pending"));

  const [activeWeek] = await db
    .select()
    .from(poolWeeksTable)
    .where(eq(poolWeeksTable.status, "open"))
    .orderBy(desc(poolWeeksTable.weekNumber))
    .limit(1);
  let chosenWeek = activeWeek;
  if (!chosenWeek) {
    const [latest] = await db
      .select()
      .from(poolWeeksTable)
      .orderBy(desc(poolWeeksTable.weekNumber))
      .limit(1);
    chosenWeek = latest;
  }

  let weekTickets = 0;
  let weekStake = 0;
  let weekPayout = 0;
  if (chosenWeek) {
    const [stats] = await db
      .select({
        count: sql<number>`cast(count(*) as int)`,
        stake: sql<string>`coalesce(sum(${ticketsTable.stake}), 0)`,
        payout: sql<string>`coalesce(sum(${ticketsTable.winnings}), 0)`,
      })
      .from(ticketsTable)
      .where(eq(ticketsTable.weekId, chosenWeek.id));
    weekTickets = Number(stats?.count ?? 0);
    weekStake = Number(stats?.stake ?? 0);
    weekPayout = Number(stats?.payout ?? 0);
  }

  res.json({
    agents: Number(agents ?? 0),
    cashiers: Number(cashiers ?? 0),
    pendingApplications: Number(pendingApplications ?? 0),
    activeWeek: chosenWeek ?? null,
    weekTickets,
    weekStake,
    weekPayout,
  });
});

router.get("/admin/reports", async (req, res) => {
  const weekId = req.query.weekId
    ? Number(req.query.weekId)
    : undefined;

const [salesRow] = await db
  .select({
    sales: sql<string>`
      coalesce(sum(${ticketsTable.stake}), 0)
    `,
  })
  .from(ticketsTable)
  .where(
    weekId
      ? eq(ticketsTable.weekId, weekId)
      : undefined
  );

const [collectionsRow] = await db
  .select({
    collections: sql<string>`
      coalesce(
        sum(${agentCollectionsTable.cashAmount})
        +
        sum(${agentCollectionsTable.transferAmount}),
        0
      )
    `,
  })
  .from(agentCollectionsTable)
  .where(
    weekId
      ? eq(agentCollectionsTable.weekId, weekId)
      : undefined
  );

const sales = Number(
  salesRow?.sales ?? 0
);

const collections = Number(
  collectionsRow?.collections ?? 0
);

const outstanding =
  sales - collections;

const [selectedWeek] = weekId
  ? await db
      .select()
      .from(poolWeeksTable)
      .where(eq(poolWeeksTable.id, weekId))
  : [];

const commissionPercent = Number(
  selectedWeek?.commissionPercent ?? 0
);

const managers = await db
  .select({
    id: managersTable.id,
    name: usersTable.name,
  })
  .from(managersTable)
  .innerJoin(
    usersTable,
    eq(usersTable.id, managersTable.userId)
  );

const managerRows = [];
for (const manager of managers) {
  const agents = await db
    .select({
      id: agentsTable.id,
    })
    .from(agentsTable)
    .where(
      eq(
        agentsTable.managerId,
        manager.id
      )
    );

  let managerSales = 0;
  let managerCollections = 0;
  let managerWinnings = 0;
  let managerAgentCommission = 0;

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
              eq(
                ticketsTable.agentId,
                agent.id
              ),
              eq(
                ticketsTable.weekId,
                weekId
              )
            )
          : eq(
              ticketsTable.agentId,
              agent.id
            )
      );

const [settlement] = await db
  .select({
    winnings: sql<number>`
      coalesce(sum(${ticketsTable.winnings}),0)
    `,
  })
  .from(ticketsTable)
  .where(
    weekId
      ? and(
          eq(ticketsTable.agentId, agent.id),
          eq(ticketsTable.weekId, weekId),
          inArray(
            ticketsTable.status,
            ["won", "lost"]
          )
        )
      : and(
          eq(ticketsTable.agentId, agent.id),
          inArray(
            ticketsTable.status,
            ["won", "lost"]
          )
        )
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
              eq(
                agentCollectionsTable.agentId,
                agent.id
              ),
              eq(
                agentCollectionsTable.weekId,
                weekId
              )
            )
          : eq(
              agentCollectionsTable.agentId,
              agent.id
            )
      );

    managerSales += Number(sales ?? 0);

    managerCollections +=
      Number(collections.cash ?? 0) +
      Number(collections.transfer ?? 0);
managerWinnings += Number(
  settlement?.winnings ?? 0
);

managerAgentCommission +=
  (Number(sales ?? 0) * commissionPercent) / 100;
  }

  managerRows.push({
    managerId: manager.id,
    managerName: manager.name,
    agents: agents.length,
    sales: managerSales,
    collections: managerCollections,
    outstanding:
      managerSales -
      managerCollections,
    winnings: managerWinnings,

    agentCommission:
       managerAgentCommission,

    netRevenue:
       managerSales -
       managerWinnings -
       managerAgentCommission,
  });
}

const [settlementRow] = await db
  .select({
    validSales: sql<string>`
      coalesce(sum(${ticketsTable.stake}),0)
    `,
    totalWinnings: sql<string>`
      coalesce(sum(${ticketsTable.winnings}),0)
    `,
  })
  .from(ticketsTable)
  .where(
    weekId
      ? and(
          eq(ticketsTable.weekId, weekId),
          inArray(
            ticketsTable.status,
            ["won", "lost"]
          )
        )
      : inArray(
          ticketsTable.status,
          ["won", "lost"]
        )
  );

const validSales = Number(
  settlementRow?.validSales ?? 0
);

const totalWinnings = Number(
  settlementRow?.totalWinnings ?? 0
);

const agentCommission =
  (validSales * commissionPercent) / 100;

const netRevenue =
  validSales -
  totalWinnings -
  agentCommission;

const agentSettlement = weekId
  ? await db
      .select({
        agentId: agentsTable.id,
        agentName: agentsTable.shopName,

        validSales: sql<string>`
          coalesce(sum(${ticketsTable.stake}),0)
        `,

        winnings: sql<string>`
          coalesce(sum(${ticketsTable.winnings}),0)
        `,
      })
      .from(ticketsTable)
      .innerJoin(
        agentsTable,
        eq(ticketsTable.agentId, agentsTable.id)
      )
      .where(
        and(
          eq(ticketsTable.weekId, weekId),
          inArray(
            ticketsTable.status,
            ["won", "lost"]
          )
        )
      )
      .groupBy(
        agentsTable.id,
        agentsTable.shopName
      )
  : [];

const agentSettlementRows =
  agentSettlement.map((row) => {
    const validSales = Number(
      row.validSales ?? 0
    );

    const winnings = Number(
      row.winnings ?? 0
    );

    const commissionAmount =
      (validSales * commissionPercent) / 100;

    return {
      agentId: row.agentId,
      agentName: row.agentName,

      validSales,
      winnings,

      commissionPercent,
      commissionAmount,
    };
  });

  res.json({
  weekId,
  sales,
  collections,
  outstanding,
  validSales,
  totalWinnings,
  agentCommission,
  netRevenue,
  managers: managerRows,
  agentSettlement: agentSettlementRows,
});
});

router.get(
  "/admin/monthly-manager-report",
  async (req, res) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (!month || !year) {
      res.status(400).json({
        error: "Month and year required",
      });
      return;
    }

    const startDate = new Date(
      Date.UTC(year, month - 1, 1)
    );

    const endDate = new Date(
      Date.UTC(year, month, 1)
    );

    const [settings] = await db
      .select()
      .from(commissionSettingsTable)
      .limit(1);

    const commissionPercent =
      Number(
        settings?.defaultCommissionPercent ?? 2
      );

    const managers = await db
      .select({
        id: managersTable.id,
        name: usersTable.name,
      })
      .from(managersTable)
      .innerJoin(
        usersTable,
        eq(usersTable.id, managersTable.userId)
      );

    const managerRows = [];

    let totalNetRevenue = 0;
    let totalCommission = 0;

    for (const manager of managers) {
      const agents = await db
        .select({
          id: agentsTable.id,
        })
        .from(agentsTable)
        .where(
          eq(
            agentsTable.managerId,
            manager.id
          )
        );

      let managerSales = 0;
      let managerWinnings = 0;
      let managerAgentCommission = 0;

      for (const agent of agents) {
        const [row] = await db
          .select({
            sales: sql<number>`
              coalesce(sum(${ticketsTable.stake}),0)
            `,
            winnings: sql<number>`
              coalesce(sum(${ticketsTable.winnings}),0)
            `,
          })
          .from(ticketsTable)
          .innerJoin(
            poolWeeksTable,
            eq(
              poolWeeksTable.id,
              ticketsTable.weekId
            )
          )
          .where(
            and(
              eq(
                ticketsTable.agentId,
                agent.id
              ),
              inArray(
                ticketsTable.status,
                ["won", "lost"]
              ),
              eq(
                poolWeeksTable.status,
                "settled"
              ),
              gte(
                poolWeeksTable.settledAt,
                startDate
              ),
              lt(
                poolWeeksTable.settledAt,
                endDate
              )
            )
          );

        const sales =
          Number(row?.sales ?? 0);

        const winnings =
          Number(row?.winnings ?? 0);

        managerSales += sales;

        managerWinnings += winnings;

        managerAgentCommission +=
          (sales * commissionPercent) / 100;
      }

      const netRevenue =
        managerSales -
        managerWinnings -
        managerAgentCommission;

      const managerCommission =
        (netRevenue * commissionPercent) / 100;

      totalNetRevenue += netRevenue;
      totalCommission += managerCommission;

      managerRows.push({
        managerId: manager.id,
        managerName: manager.name,

        netRevenue,

        commissionPercent,

        commissionAmount:
          Number(managerCommission.toFixed(2)),
      });
    }

    res.json({
      month,
      year,

      commissionPercent,

      paymentScheduleType:
        settings?.paymentScheduleType,

      paymentScheduleValue:
        settings?.paymentScheduleValue,

      managers: managerRows,

      totalNetRevenue,

      totalCommission:
        Number(totalCommission.toFixed(2)),

      adminProfit:
        Number(
          (totalNetRevenue - totalCommission)
            .toFixed(2)
        ),
    });
  }
);

router.post(
  "/admin/monthly-manager-report/pay",
  async (req, res) => {
    const { month, year } = req.body;

    const userId = req.auth?.userId;

    if (!userId) {
      res.status(401).json({
        error: "Authentication required",
      });
      return;
    }

    if (!month || !year) {
      res.status(400).json({
        error: "Month and year required",
      });
      return;
    }

    const existing = await db
      .select()
      .from(managerCommissionPaymentsTable)
      .where(
        and(
          eq(
            managerCommissionPaymentsTable.month,
            Number(month)
          ),
          eq(
            managerCommissionPaymentsTable.year,
            Number(year)
          )
        )
      );

    if (existing.length > 0) {
      res.status(400).json({
        error: "Month already paid",
      });
      return;
    }

const startDate = new Date(
  Date.UTC(Number(year), Number(month) - 1, 1)
);

const endDate = new Date(
  Date.UTC(Number(year), Number(month), 1)
);

const [settings] = await db
  .select()
  .from(commissionSettingsTable)
  .limit(1);

const commissionPercent =
  Number(
    settings?.defaultCommissionPercent ?? 2
  );

const managers = await db
  .select({
    id: managersTable.id,
    name: usersTable.name,
  })
  .from(managersTable)
  .innerJoin(
    usersTable,
    eq(usersTable.id, managersTable.userId)
  );

let totalAgents = 0;
let totalNetRevenue = 0;
const paymentPreview = [];
let totalCommission = 0;

for (const manager of managers) {
  const agents = await db
    .select({
      id: agentsTable.id,
    })
    .from(agentsTable)
    .where(
      eq(
        agentsTable.managerId,
        manager.id
      )
    );

  totalAgents += agents.length;

  let managerSales = 0;
  let managerWinnings = 0;
  let managerAgentCommission = 0;

for (const agent of agents) {
  const [row] = await db
    .select({
  sales: sql<number>`
    coalesce(sum(${ticketsTable.stake}),0)
  `,

  winnings: sql<number>`
    coalesce(sum(${ticketsTable.winnings}),0)
  `,
})
    .from(ticketsTable)
    .innerJoin(
      poolWeeksTable,
      eq(
        poolWeeksTable.id,
        ticketsTable.weekId
      )
    )
    .where(
      and(
        eq(
          ticketsTable.agentId,
          agent.id
        ),
        inArray(
          ticketsTable.status,
          ["won", "lost"]
        ),
        eq(
          poolWeeksTable.status,
          "settled"
        ),
        gte(
          poolWeeksTable.settledAt,
          startDate
        ),
        lt(
          poolWeeksTable.settledAt,
          endDate
        )
      )
    );

managerSales += Number(
  row?.sales ?? 0
);

managerWinnings += Number(
  row?.winnings ?? 0
);

managerAgentCommission +=
  (Number(row?.sales ?? 0) *
    commissionPercent) /
  100;
}

const netRevenue =
  managerSales -
  managerWinnings -
  managerAgentCommission;

const managerCommission =
  (netRevenue * commissionPercent) / 100;

paymentPreview.push({
  managerId: manager.id,
  managerName: manager.name,
  commissionAmount: Number(
    managerCommission.toFixed(2)
  ),
});

totalCommission += managerCommission;

totalNetRevenue += netRevenue;

await db.insert(
  managerCommissionPaymentsTable
).values({
  month: Number(month),

  year: Number(year),

  managerId: manager.id,

  commissionPercent:
  commissionPercent.toFixed(2),

commissionAmount:
  managerCommission.toFixed(2),

  status: "paid",

  paidAt: new Date(),

  paidByUserId: userId,
  });

}

res.json({
  success: true,

  managerCount:
    paymentPreview.length,

  totalNetRevenue:
    Number(totalNetRevenue.toFixed(2)),

  totalCommission:
    Number(totalCommission.toFixed(2)),

  managers:
    paymentPreview,
});
  }
);

router.get(
  "/admin/monthly-manager-report/status",
  async (req, res) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    const payments = await db
      .select({
        paidAt:
          managerCommissionPaymentsTable.paidAt,

        commissionAmount:
          managerCommissionPaymentsTable
            .commissionAmount,
      })
      .from(managerCommissionPaymentsTable)
      .where(
        and(
          eq(
            managerCommissionPaymentsTable.month,
            month
          ),
          eq(
            managerCommissionPaymentsTable.year,
            year
          )
        )
      );

    if (payments.length === 0) {
      res.json({
        status: "pending",
      });
      return;
    }

    const totalCommission =
      payments.reduce(
        (sum, row) =>
          sum +
          Number(
            row.commissionAmount ?? 0
          ),
        0
      );

    res.json({
      status: "paid",

      paidAt:
        payments[0]?.paidAt,

      totalCommission:
        Number(
          totalCommission.toFixed(2)
        ),
    });
  }
);

router.get(
  "/admin/commission-settings",
  async (_req, res): Promise<void> => {
    const [settings] = await db
      .select()
      .from(commissionSettingsTable)
      .limit(1);

    res.json(settings);
  }
);

router.put(
  "/admin/commission-settings",
  async (req, res): Promise<void> => {
    const {
      defaultCommissionPercent,
      paymentScheduleType,
      paymentScheduleValue,
    } = req.body;

    await db
      .update(commissionSettingsTable)
      .set({
        defaultCommissionPercent:
          Number(defaultCommissionPercent),

        paymentScheduleType,

        paymentScheduleValue:
          String(paymentScheduleValue),
      })
      .where(
        eq(
          commissionSettingsTable.id,
          1
        )
      );

    const [updated] = await db
      .select()
      .from(commissionSettingsTable)
      .where(
        eq(
          commissionSettingsTable.id,
          1
        )
      );

    res.json(updated);
  }
);

// ----- Agent Applications -----
router.get("/admin/agent-applications", async (req, res): Promise<void> => {
  const params = ListAgentApplicationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const status = params.data.status;
  const rows = await db
    .select()
    .from(agentApplicationsTable)
    .where(status ? eq(agentApplicationsTable.status, status) : undefined)
    .orderBy(desc(agentApplicationsTable.createdAt));
  res.json(rows);
});

router.post(
  "/admin/agent-applications/:id/approve",
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = ApproveAgentApplicationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [app] = await db
      .select()
      .from(agentApplicationsTable)
      .where(eq(agentApplicationsTable.id, id));
    if (!app) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    if (app.status !== "pending") {
      res.status(400).json({ error: "Application already processed" });
      return;
    }
const [{ count }] = await db
  .select({
    count: sql<number>`cast(count(*) as int)`,
  })
  .from(agentsTable);

const username = `DPL${String(count + 1).padStart(3, "0")}`;

const user = await createUserWithPassword({
  username,
  password: parsed.data.password,
  name: app.shopName,
  role: "agent",
});
    const [agent] = await db
      .insert(agentsTable)
      .values({
        userId: user.id,
        shopName: app.shopName,
        location: app.location,
        phone: app.phone,
        email: app.email,
      })
      .returning();
    await db
      .update(agentApplicationsTable)
      .set({ status: "approved", processedAt: new Date() })
      .where(eq(agentApplicationsTable.id, id));
    res.json({
      id: agent.id,
      userId: agent.userId,
      username: user.username,
      shopName: agent.shopName,
      location: agent.location,
      phone: agent.phone,
      email: agent.email,
      cashiersCount: 0,
      createdAt: agent.createdAt,
    });
  },
);

router.patch("/admin/agents/:id", async (req, res): Promise<void> => {
  const agentId = Number(req.params["id"]);

  if (!Number.isFinite(agentId)) {
    res.status(400).json({ error: "Invalid agent id" });
    return;
  }

  const [agent] = await db
    .select({
      id: agentsTable.id,
      userId: agentsTable.userId,
    })
    .from(agentsTable)
    .where(eq(agentsTable.id, agentId));

  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  const {
    username,
    password,
    shopName,
    location,
    phone,
    email,
    managerId,
    active,
  } = req.body ?? {};

  if (username) {
  }

  const userUpdate: any = {};

  if (username) userUpdate.username = username;
  if (shopName) userUpdate.name = shopName;
  if (typeof active === "boolean") userUpdate.isActive = active;

  if (password) {
    userUpdate.passwordHash = await bcrypt.hash(password, 10);
  }

  if (Object.keys(userUpdate).length > 0) {
    await db
      .update(usersTable)
      .set(userUpdate)
      .where(eq(usersTable.id, agent.userId));
  }

  await db
    .update(agentsTable)
    .set({
      ...(shopName && { shopName }),
      ...(location && { location }),
      ...(phone && { phone }),
      ...(email && { email }),
      ...(managerId && { managerId: Number(managerId) }),
    })
    .where(eq(agentsTable.id, agentId));

  if (active === false) {
    const linkedCashiers = await db
      .select({
        userId: cashiersTable.userId,
      })
      .from(cashiersTable)
      .where(eq(cashiersTable.agentId, agentId));

    if (linkedCashiers.length > 0) {
      await db
        .update(usersTable)
        .set({
          isActive: false,
        })
        .where(
          inArray(
            usersTable.id,
            linkedCashiers.map((c) => c.userId),
          ),
        );
    }
  }

  res.json({
    success: true,
    message: "Agent updated successfully",
  });
});

router.post(
  "/admin/agent-applications/:id/reject",
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [app] = await db
      .update(agentApplicationsTable)
      .set({ status: "rejected", processedAt: new Date() })
      .where(eq(agentApplicationsTable.id, id))
      .returning();
    if (!app) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    res.json(app);
  },
);

// ----- Agents -----
router.get("/admin/agents", async (_req, res): Promise<void> => {
  const rows = await db
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
      cashiersCount: sql<number>`cast(count(${cashiersTable.id}) as int)`,
    })
    .from(agentsTable)
    .innerJoin(usersTable, eq(usersTable.id, agentsTable.userId))
    .leftJoin(cashiersTable, eq(cashiersTable.agentId, agentsTable.id))
    .groupBy(agentsTable.id, usersTable.username)
    .orderBy(desc(agentsTable.createdAt));
  res.json(
    rows.map((r) => ({
      ...r,
      cashiersCount: Number(r.cashiersCount ?? 0),
    })),
  );
});

router.post("/admin/agents", async (req, res): Promise<void> => {
  const parsed = CreateAgentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [{ count }] = await db
  .select({
    count: sql<number>`cast(count(*) as int)`,
  })
  .from(agentsTable);

const username =
  `DPL${String(count + 1).padStart(3, "0")}`;

const user = await createUserWithPassword({
  username,
  password: parsed.data.password,
  name: parsed.data.shopName,
  role: "agent",
});
  const [agent] = await db
    .insert(agentsTable)
    .values({
      userId: user.id,
      managerId: parsed.data.managerId,
      shopName: parsed.data.shopName,
      location: parsed.data.location,
      phone: parsed.data.phone,
      email: parsed.data.email,
    })
    .returning();
  res.status(201).json({
    id: agent.id,
    userId: agent.userId,
    username: user.username,
    shopName: agent.shopName,
    location: agent.location,
    phone: agent.phone,
    email: agent.email,
    cashiersCount: 0,
    createdAt: agent.createdAt,
  });
});

// ----- Pool Weeks -----
router.get("/admin/pool-weeks", async (_req, res): Promise<void> => {
  const rows = await db
  .select()
  .from(poolWeeksTable)
  .orderBy(
    desc(poolWeeksTable.season),
    desc(poolWeeksTable.weekNumber)
  );
  res.json(rows);
});

router.post("/admin/pool-weeks", async (req, res): Promise<void> => {
  const parsed = CreatePoolWeekBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
if (
  parsed.data.weekNumber < 1 ||
  parsed.data.weekNumber > 52
) {
  res.status(400).json({
    error: "Week number must be between 1 and 52",
  });
  return;
}
  const existing = await db
  .select()
  .from(poolWeeksTable)
  .where(
    and(
      eq(poolWeeksTable.weekNumber, parsed.data.weekNumber),
      eq(poolWeeksTable.season, parsed.data.season)
    )
  );
  if (existing.length > 0) {
    res.status(400).json({ error: "Week number already exists" });
    return;
  }
  const [week] = await db
    .insert(poolWeeksTable)
    .values({
  season: parsed.data.season,
  weekNumber: parsed.data.weekNumber,
  opensAt: new Date(parsed.data.opensAt),
  closesAt: new Date(parsed.data.closesAt),
  commissionPercent: String(parsed.data.commissionPercent),
})
    .returning();
  // Auto-create 49 fixtures and default odds
  await db.insert(fixturesTable).values(
    Array.from({ length: 49 }, (_, i) => ({
      weekId: week.id,
      number: i + 1,
      homeTeam: "",
      awayTeam: "",
    })),
  );
  const oddsRows: { weekId: number; poolType: typeof POOL_TYPES[number]; oddsType: typeof ODDS_TYPES[number]; oddsValue: string }[] = [];
  for (const pt of POOL_TYPES) {
    for (const ot of ODDS_TYPES) {
      oddsRows.push({
        weekId: week.id,
        poolType: pt,
        oddsType: ot,
        oddsValue: String(DEFAULT_ODDS[pt][ot]),
      });
    }
  }
  await db.insert(weekOddsTable).values(oddsRows);
  res.status(201).json(week);
});

router.get("/admin/pool-weeks/:id/commissions", async (req, res): Promise<void> => {
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

  const rows = await db
    .select({
      agentId: agentsTable.id,
      agentName: agentsTable.shopName,
      validSales: sql<string>`coalesce(sum(${ticketsTable.stake}), 0)`,
    })
    .from(ticketsTable)
    .innerJoin(agentsTable, eq(ticketsTable.agentId, agentsTable.id))
    .where(
      and(
        eq(ticketsTable.weekId, id),
        inArray(ticketsTable.status, ["won", "lost"])
      )
    )
    .groupBy(agentsTable.id, agentsTable.shopName);

  const commissionPercent = Number(week.commissionPercent);

  const result = rows.map((row) => {
    const validSales = Number(row.validSales);
    const commissionAmount = (validSales * commissionPercent) / 100;

    return {
      agentId: row.agentId,
      agentName: row.agentName,
      validSales,
      commissionPercent,
      commissionAmount,
    };
  });

  res.json(result);
});

router.get("/admin/pool-weeks/:id", async (req, res): Promise<void> => {
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
    .select()
    .from(fixturesTable)
    .where(eq(fixturesTable.weekId, id))
    .orderBy(asc(fixturesTable.number));
  const odds = await db
    .select()
    .from(weekOddsTable)
    .where(eq(weekOddsTable.weekId, id));
  res.json({ week, fixtures, odds });
});

router.patch("/admin/pool-weeks/:id", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdatePoolWeekStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [week] = await db
    .update(poolWeeksTable)
    .set({ status: parsed.data.status })
    .where(eq(poolWeeksTable.id, id))
    .returning();
  if (!week) {
    res.status(404).json({ error: "Week not found" });
    return;
  }
  res.json(week);
});

router.put(
  "/admin/pool-weeks/:id/fixtures",
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = SetFixturesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const existing = await db
      .select()
      .from(fixturesTable)
      .where(eq(fixturesTable.weekId, id));
    const byNumber = new Map(existing.map((f) => [f.number, f]));
    for (const incoming of parsed.data.fixtures) {
      const found = byNumber.get(incoming.number);
      if (found) {
        await db
          .update(fixturesTable)
          .set({
            homeTeam: incoming.homeTeam,
            awayTeam: incoming.awayTeam,
          })
          .where(eq(fixturesTable.id, found.id));
      } else {
        await db.insert(fixturesTable).values({
          weekId: id,
          number: incoming.number,
          homeTeam: incoming.homeTeam,
          awayTeam: incoming.awayTeam,
        });
      }
    }
    const updated = await db
      .select()
      .from(fixturesTable)
      .where(eq(fixturesTable.weekId, id))
      .orderBy(asc(fixturesTable.number));
    res.json(updated);
  },
);

router.patch("/admin/fixtures/:id/status", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateFixtureStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(fixturesTable)
    .set({ status: parsed.data.status })
    .where(eq(fixturesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Fixture not found" });
    return;
  }
  res.json(updated);
});

router.put("/admin/pool-weeks/:id/odds", async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = SetWeekOddsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  for (const o of parsed.data.odds) {
    if (o.oddsValue <= 0) {
      res.status(400).json({ error: "Odds must be positive" });
      return;
    }
  }
  for (const o of parsed.data.odds) {
    const existing = await db
      .select()
      .from(weekOddsTable)
      .where(
        and(
          eq(weekOddsTable.weekId, id),
          eq(weekOddsTable.poolType, o.poolType),
          eq(weekOddsTable.oddsType, o.oddsType),
        ),
      );
    if (existing.length > 0) {
      await db
        .update(weekOddsTable)
        .set({ oddsValue: String(o.oddsValue) })
        .where(eq(weekOddsTable.id, existing[0].id));
    } else {
      await db.insert(weekOddsTable).values({
        weekId: id,
        poolType: o.poolType,
        oddsType: o.oddsType,
        oddsValue: String(o.oddsValue),
      });
    }
  }
  const odds = await db
    .select()
    .from(weekOddsTable)
    .where(eq(weekOddsTable.weekId, id));
  res.json(odds);
});

router.post(
  "/admin/pool-weeks/:id/results",
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = SubmitWeekResultsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const winners = Array.from(new Set(parsed.data.winningNumbers)).filter(
      (n) => n >= 1 && n <= 49,
    );
    const [week] = await db
      .select()
      .from(poolWeeksTable)
      .where(eq(poolWeeksTable.id, id));
    if (!week) {
      res.status(404).json({ error: "Week not found" });
      return;
    }
    const tickets = await db
      .select()
      .from(ticketsTable)
      .where(
        and(
          eq(ticketsTable.weekId, id),
          inArray(ticketsTable.status, ["active"]),
        ),
      );
    let ticketsWon = 0;
    let totalStake = 0;
    let totalPayout = 0;
    const oddsRows = await db
  .select()
  .from(weekOddsTable)
  .where(eq(weekOddsTable.weekId, id));

const oddsMap = new Map(
  oddsRows.map((o) => [
    `${o.poolType}:${o.oddsType}`,
    Number(o.oddsValue),
  ]),
);
    for (const t of tickets) {
  const wl = winningLinesFor(
    t.betType,
    t.poolType,
    t.selectedNumbers,
    winners,
  );

  const currentOdds = oddsMap.get(`${t.poolType}:${t.oddsType}`);

if (!currentOdds) {
  res.status(400).json({
    error: `Missing odds for ticket ${t.id}`,
  });
  return;
}

  const payout = calcWinnings(
    wl,
    currentOdds,
    Number(t.stake),
    t.totalLines,
  );
      const newStatus = wl > 0 ? "won" : "lost";
      if (wl > 0) ticketsWon += 1;
      totalStake += Number(t.stake);
      totalPayout += payout;
      await db
        .update(ticketsTable)
        .set({
          status: newStatus,
          winningLines: wl,
          winnings: payout.toFixed(2),
        })
        .where(eq(ticketsTable.id, t.id));
    }
    await db
      .update(poolWeeksTable)
      .set({
        status: "settled",
        settledAt: new Date(),
        winningNumbers: winners,
      })
      .where(eq(poolWeeksTable.id, id));
    res.json({
      weekId: id,
      ticketsSettled: tickets.length,
      ticketsWon,
      totalStake,
      totalPayout,
    });
  },
);

// ----- Managers -----
router.get("/admin/managers", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: managersTable.id,
      userId: managersTable.userId,
      username: usersTable.username,
      name: usersTable.name,
      phone: managersTable.phone,
      email: managersTable.email,
      location: managersTable.location,
      isActive: usersTable.isActive,
      createdAt: managersTable.createdAt,
      agentsCount: sql<number>`cast(count(${agentsTable.id}) as int)`,
    })
    .from(managersTable)
    .innerJoin(
      usersTable,
      eq(usersTable.id, managersTable.userId)
    )
    .leftJoin(
      agentsTable,
      eq(agentsTable.managerId, managersTable.id)
    )
    .groupBy(
      managersTable.id,
      usersTable.id
    )
    .orderBy(desc(managersTable.createdAt));

  res.json(rows);
});

router.post("/admin/managers", async (req, res): Promise<void> => {
  const { password, name, location, phone, email } = req.body ?? {};

  if (
    !password ||
    !name ||
    !location ||
    !phone ||
    !email
  ) {
    res.status(400).json({
      error: "All fields are required",
    });
    return;
  }

  const [{ count }] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(managersTable);

  const username =
    `MGR${String(count + 1).padStart(3, "0")}`;

  const user = await createUserWithPassword({
    username,
    password,
    name,
    role: "manager",
  });

  const [manager] = await db
    .insert(managersTable)
    .values({
      userId: user.id,
      location,
      phone,
      email,
    })
    .returning();

  res.status(201).json({
    id: manager.id,
    userId: manager.userId,
    username: user.username,
    name: user.name,
    location: manager.location,
    phone: manager.phone,
    email: manager.email,
    createdAt: manager.createdAt,
  });
});

export default router;
