import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export default function ManagerDashboard() {
const [stats, setStats] = useState({
  agents: 0,
  sales: 0,
  collected: 0,
  outstanding: 0,
});

useEffect(() => {
  fetch("/api/manager/collections", {
    credentials: "include",
  })
    .then((r) => r.json())
    .then((rows) => {
      const agents = rows.length;

      const sales = rows.reduce(
        (sum: number, row: any) =>
          sum + row.totalSales,
        0
      );

      const collected = rows.reduce(
        (sum: number, row: any) =>
          sum + row.totalCollected,
        0
      );

      const outstanding = rows.reduce(
        (sum: number, row: any) =>
          sum + row.balance,
        0
      );

      setStats({
        agents,
        sales,
        collected,
        outstanding,
      });
    });
}, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Manager Dashboard
        </h1>

        <p className="text-sm text-muted-foreground">
          Welcome to the manager portal.
        </p>
      </div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

  <Card className="p-6">
    <div className="text-sm text-muted-foreground">
      My Agents
    </div>

    <div className="text-3xl font-bold">
      {stats.agents}
    </div>
  </Card>

  <Card className="p-6">
    <div className="text-sm text-muted-foreground">
      Total Sales
    </div>

    <div className="text-3xl font-bold">
      {formatCurrency(stats.sales)}
    </div>
  </Card>

  <Card className="p-6">
    <div className="text-sm text-muted-foreground">
      Collected
    </div>

    <div className="text-3xl font-bold">
      {formatCurrency(stats.collected)}
    </div>
  </Card>

  <Card className="p-6">
    <div className="text-sm text-muted-foreground">
      Outstanding
    </div>

    <div className="text-3xl font-bold">
      {formatCurrency(stats.outstanding)}
    </div>
  </Card>

</div>
    </div>
  );
}
