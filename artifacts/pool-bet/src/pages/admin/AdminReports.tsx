import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export default function AdminReports() {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [weekId, setWeekId] = useState<number | undefined>();
const [report, setReport] = useState({
  sales: 0,
  collections: 0,
  outstanding: 0,

  validSales: 0,
  totalWinnings: 0,
  agentCommission: 0,
  netRevenue: 0,
});
  const [managers, setManagers] = useState<any[]>([]);
  const [agentSettlement, setAgentSettlement] = useState<any[]>([]);

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
  fetch(
    `/api/admin/reports?${
      weekId
        ? new URLSearchParams({
            weekId: String(weekId),
          }).toString()
        : ""
    }`,
    {
      credentials: "include",
    }
  )
    .then((r) => r.json())
    .then((d) => {
  setReport({
    sales: d.sales || 0,
    collections: d.collections || 0,
    outstanding: d.outstanding || 0,

    validSales: d.validSales || 0,
    totalWinnings: d.totalWinnings || 0,
    agentCommission: d.agentCommission || 0,
    netRevenue: d.netRevenue || 0,
  });

  setManagers(
    Array.isArray(d.managers)
      ? d.managers
      : []
  );

setAgentSettlement(
  Array.isArray(d.agentSettlement)
    ? d.agentSettlement
    : []
);
});
}, [weekId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Financial Reports
        </h1>

        <p className="text-sm text-muted-foreground">
          Financial reports are calculated from valid settled tickets only.
        </p>
      </div>

<div className="mt-4">
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
        value={w.id.toString()}
      >
        {w.season}/{w.season + 1} - Week {w.weekNumber}
      </option>
    ))}
  </select>
</div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">
            Total Sales
          </div>

          <div className="text-3xl font-bold">
            {formatCurrency(report.sales)}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-muted-foreground">
            Collections
          </div>

          <div className="text-3xl font-bold">
            {formatCurrency(report.collections)}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-muted-foreground">
            Outstanding
          </div>

          <div className="text-3xl font-bold">
            {formatCurrency(report.outstanding)}
          </div>
        </Card>
</div>

<Card className="p-6 w-full">
  <h2 className="font-semibold mb-4">
    Manager Performance
  </h2>

  <div className="overflow-x-auto">
     <table className="w-full">
    <thead>
      <tr className="border-b">
        <th className="text-right py-3 px-4">
          Manager
        </th>

        <th className="text-right py-3 px-4">
          Agents
        </th>

        <th className="text-right py-3 px-4">
          Sales
        </th>

        <th className="text-right py-3 px-4">
          Collections
        </th>

        <th className="text-right py-2">
          Outstanding
        </th>
      </tr>
    </thead>

    <tbody>
      {managers.map((m) => (
        <tr
          key={m.managerId}
          className="border-b"
        >
          <td className="py-3 px-4">
            {m.managerName}
          </td>

          <td className="text-right px-4 py-3">
            {m.agents}
          </td>

          <td className="text-right px-4 py-3">
            {formatCurrency(m.sales)}
          </td>

          <td className="text-right px-4 py-3">
            {formatCurrency(m.collections)}
          </td>

          <td className="text-right px-4 py-3">
            {formatCurrency(m.outstanding)}
          </td>
        </tr>
      ))}
   </tbody>
  </table>
</div>
</Card>

<Card className="p-6 w-full">
  <h2 className="font-semibold mb-4">
    Settlement Summary
  </h2>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    <div>
      <div className="text-sm text-muted-foreground">
        Valid Sales
      </div>

      <div className="text-2xl font-bold">
        {formatCurrency(report.validSales)}
      </div>
    </div>

    <div>
      <div className="text-sm text-muted-foreground">
        Total Winnings
      </div>

      <div className="text-2xl font-bold">
        {formatCurrency(report.totalWinnings)}
      </div>
    </div>

<div>
  <div className="text-sm text-muted-foreground">
    Total Agent Commission
  </div>

  <div className="text-2xl font-bold">
    {formatCurrency(report.agentCommission)}
  </div>
</div>

<div>
  <div className="text-sm text-muted-foreground">
    Net Revenue
  </div>

  <div className="text-2xl font-bold">
    {formatCurrency(report.netRevenue)}
  </div>
</div>

  </div>
</Card>

<Card className="p-6 w-full">
  <h2 className="font-semibold mb-4">
    Agent Settlement Breakdown
  </h2>

  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="text-left py-3 px-4">
            Agent
          </th>

          <th className="text-right py-3 px-4">
            Valid Sales
          </th>

          <th className="text-right py-3 px-4">
            Winnings
          </th>

          <th className="text-right py-3 px-4">
            Comm %
          </th>

          <th className="text-right py-3 px-4">
            Commission
          </th>
        </tr>
      </thead>

      <tbody>
        {agentSettlement.map((a) => (
          <tr
            key={a.agentId}
            className="border-b"
          >
            <td className="py-3 px-4">
              {a.agentName}
            </td>

            <td className="text-right px-4 py-3">
              {formatCurrency(a.validSales)}
            </td>

            <td className="text-right px-4 py-3">
              {formatCurrency(a.winnings)}
            </td>

            <td className="text-right px-4 py-3">
              {a.commissionPercent}%
            </td>

            <td className="text-right px-4 py-3">
              {formatCurrency(a.commissionAmount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</Card>
    </div>
  );
}
