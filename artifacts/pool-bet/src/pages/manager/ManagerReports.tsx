import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export default function ManagerReports() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [weeks, setWeeks] = useState<any[]>([]);
  const [weekId, setWeekId] = useState<number | undefined>();

  const [agents, setAgents] = useState<any[]>([]);
  const [agentId, setAgentId] = useState<number | undefined>();

  useEffect(() => {
    fetch("/api/public/weeks")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setWeeks(d);
        }
      })
      .catch(() => setWeeks([]));
  }, []);

  useEffect(() => {
    fetch("/api/manager/agents", {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        setAgents(Array.isArray(d) ? d : []);
      })
      .catch(() => setAgents([]));
  }, []);

  useEffect(() => {
    setLoading(true);

    fetch(
      `/api/manager/collections?${new URLSearchParams({
        ...(weekId
          ? { weekId: String(weekId) }
          : {}),
        ...(agentId
          ? { agentId: String(agentId) }
          : {}),
      }).toString()}`,
      {
        credentials: "include",
      }
    )
      .then((r) => r.json())
      .then((d) => {
        setRows(Array.isArray(d) ? d : []);
      })
      .finally(() => setLoading(false));
  }, [weekId, agentId]);

  const totalSales = rows.reduce(
    (sum, row) => sum + Number(row.totalSales || 0),
    0
  );

  const totalCollected = rows.reduce(
    (sum, row) => sum + Number(row.totalCollected || 0),
    0
  );

  const totalBalance = rows.reduce(
    (sum, row) => sum + Number(row.balance || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Reports
        </h1>

        <p className="text-sm text-muted-foreground">
          Manager reports and summaries.
        </p>

        <div className="mt-4 flex gap-3">
          <select
            className="border rounded-md px-3 py-2"
            value={weekId ?? ""}
            onChange={(e) =>
              setWeekId(
                e.target.value
                  ? Number(e.target.value)
                  : undefined
              )
            }
          >
            <option value="">
              All Weeks
            </option>

            {weeks.map((w) => (
              <option
                key={w.id}
                value={w.id}
              >
                Week {w.weekNumber}
              </option>
            ))}
          </select>

          <select
            className="border rounded-md px-3 py-2"
            value={agentId ?? ""}
            onChange={(e) =>
              setAgentId(
                e.target.value
                  ? Number(e.target.value)
                  : undefined
              )
            }
          >
            <option value="">
              All Agents
            </option>

            {agents.map((agent) => (
              <option
                key={agent.id}
                value={agent.id}
              >
                {agent.shopName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card className="p-4">
        {loading ? (
          <div className="text-center py-8">
            Loading...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3">
                  Agent
                </th>

                <th className="text-right py-3">
                  Sales
                </th>

                <th className="text-right py-3">
                  Collected
                </th>

                <th className="text-right py-3">
                  Balance
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.agentId}
                  className="border-b"
                >
                  <td className="py-3">
                    {row.shopName}
                  </td>

                  <td className="text-right">
                    {formatCurrency(
                      row.totalSales
                    )}
                  </td>

                  <td className="text-right">
                    {formatCurrency(
                      row.totalCollected
                    )}
                  </td>

                  <td className="text-right font-bold">
                    {formatCurrency(
                      row.balance
                    )}
                  </td>
                </tr>
              ))}

              <tr className="font-bold border-t">
                <td className="py-3">
                  TOTAL
                </td>

                <td className="text-right">
                  {formatCurrency(totalSales)}
                </td>

                <td className="text-right">
                  {formatCurrency(totalCollected)}
                </td>

                <td className="text-right">
                  {formatCurrency(totalBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
