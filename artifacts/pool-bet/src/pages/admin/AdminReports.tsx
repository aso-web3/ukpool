import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export default function AdminReports() {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [weekId, setWeekId] = useState<number | undefined>();
const now = new Date();
const [reportMonth, setReportMonth] =
  useState(now.getMonth() + 1);
const [reportYear, setReportYear] =
  useState(now.getFullYear());
const [monthlyReport, setMonthlyReport] =
  useState({
    commissionPercent: 0,
    paymentScheduleValue: "",

    totalNetRevenue: 0,
    totalCommission: 0,
    adminProfit: 0,

    managers: [],
  });
const [paymentStatus, setPaymentStatus] =
  useState({
    status: "pending",
    paidAt: null,
    totalCommission: 0,
  });
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
  const [showPayConfirm, setShowPayConfirm] =
  useState(false);

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

useEffect(() => {
  fetch(
    `/api/admin/monthly-manager-report?month=${reportMonth}&year=${reportYear}`,
    {
      credentials: "include",
    }
  )
    .then((r) => r.json())
    .then((d) => {
      setMonthlyReport({
        commissionPercent:
          d.commissionPercent || 0,

        paymentScheduleValue:
          d.paymentScheduleValue || "",

        totalNetRevenue:
          d.totalNetRevenue || 0,

        totalCommission:
          d.totalCommission || 0,

        adminProfit:
          d.adminProfit || 0,

        managers:
          Array.isArray(d.managers)
            ? d.managers
            : [],
      });
    });
}, [reportMonth, reportYear]);

useEffect(() => {
  fetch(
    `/api/admin/monthly-manager-report/status?month=${reportMonth}&year=${reportYear}`,
    {
      credentials: "include",
    }
  )
    .then((r) => r.json())
    .then((data) => {
      setPaymentStatus(data);
    });
}, [reportMonth, reportYear]);

const totalManagerSales =
  managers.reduce(
    (sum, m) => sum + (m.sales || 0),
    0
  );

const totalManagerCollections =
  managers.reduce(
    (sum, m) => sum + (m.collections || 0),
    0
  );

const totalManagerOutstanding =
  managers.reduce(
    (sum, m) => sum + (m.outstanding || 0),
    0
  );

const totalManagerWinnings =
  managers.reduce(
    (sum, m) => sum + (m.winnings || 0),
    0
  );

const totalManagerAgentCommission =
  managers.reduce(
    (sum, m) => sum + (m.agentCommission || 0),
    0
  );

const totalManagerNetRevenue =
  managers.reduce(
    (sum, m) => sum + (m.netRevenue || 0),
    0
  );

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
<tr className="font-semibold border-t">
  <td className="py-3 px-4">
    TOTAL
  </td>

  <td className="text-right px-4 py-3">
    {formatCurrency(report.validSales)}
  </td>

  <td className="text-right px-4 py-3">
    {formatCurrency(report.totalWinnings)}
  </td>

  <td className="text-right px-4 py-3">
    -
  </td>

  <td className="text-right px-4 py-3">
    {formatCurrency(report.agentCommission)}
  </td>
</tr>
</tbody>
    </table>
  </div>
</Card>

<Card className="p-6 w-full">
  <h2 className="font-semibold mb-4">
    Manager Settlement Breakdown
  </h2>

  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="text-left py-3 px-4">
            Manager
          </th>

          <th className="text-right py-3 px-4">
            Sales
          </th>

          <th className="text-right py-3 px-4">
            Collected
          </th>

          <th className="text-right py-3 px-4">
            Outstanding
          </th>

          <th className="text-right py-3 px-4">
            Winnings
          </th>

          <th className="text-right py-3 px-4">
            Agent Comm.
          </th>

          <th className="text-right py-3 px-4">
            Net Revenue
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
              {formatCurrency(m.sales)}
            </td>

            <td className="text-right px-4 py-3">
              {formatCurrency(m.collections)}
            </td>

            <td className="text-right px-4 py-3">
              {formatCurrency(m.outstanding)}
            </td>

            <td className="text-right px-4 py-3">
              {formatCurrency(m.winnings)}
            </td>

            <td className="text-right px-4 py-3">
              {formatCurrency(m.agentCommission)}
            </td>

            <td className="text-right px-4 py-3 font-semibold">
              {formatCurrency(m.netRevenue)}
            </td>
          </tr>
        ))}

<tr className="font-semibold border-t">
  <td className="py-3 px-4">
    TOTAL
  </td>

  <td className="text-right px-4 py-3">
    {formatCurrency(totalManagerSales)}
  </td>

  <td className="text-right px-4 py-3">
    {formatCurrency(totalManagerCollections)}
  </td>

  <td className="text-right px-4 py-3">
    {formatCurrency(totalManagerOutstanding)}
  </td>

  <td className="text-right px-4 py-3">
    {formatCurrency(totalManagerWinnings)}
  </td>

  <td className="text-right px-4 py-3">
    {formatCurrency(
      totalManagerAgentCommission
    )}
  </td>

  <td className="text-right px-4 py-3">
    {formatCurrency(
      totalManagerNetRevenue
    )}
  </td>
</tr>
</tbody>
    </table>
  </div>
</Card>

<Card className="p-6 w-full">
  <h2 className="font-semibold mb-4">
    Monthly Manager Report
  </h2>

<div className="mb-4 flex items-center justify-between">
  <span
    className={
      paymentStatus.status === "paid"
        ? "px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold"
        : "px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold"
    }
  >
    {paymentStatus.status.toUpperCase()}
  </span>

  {paymentStatus.status !== "paid" && (
<button
  onClick={() =>
    setShowPayConfirm(true)
  }
  className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium"
>
  Mark As Paid
</button>
  )}
</div>

  <div className="flex gap-4 mb-4">
    <select
      className="border rounded-md px-3 py-2"
      value={reportMonth}
      onChange={(e) =>
        setReportMonth(Number(e.target.value))
      }
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <option
          key={i + 1}
          value={i + 1}
        >
          {new Date(
            2026,
            i,
            1
          ).toLocaleString("default", {
            month: "long",
          })}
        </option>
      ))}
    </select>

    <input
      type="number"
      className="border rounded-md px-3 py-2 w-32"
      value={reportYear}
      onChange={(e) =>
        setReportYear(Number(e.target.value))
      }
    />
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <Card className="p-4">
      <div className="text-sm text-muted-foreground">
        Monthly Net Revenue
      </div>

      <div className="text-2xl font-bold">
        {formatCurrency(
          monthlyReport.totalNetRevenue
        )}
      </div>
    </Card>

    <Card className="p-4">
      <div className="text-sm text-muted-foreground">
        Manager Commission
      </div>

      <div className="text-2xl font-bold">
        {formatCurrency(
          monthlyReport.totalCommission
        )}
      </div>
    </Card>

    <Card className="p-4">
      <div className="text-sm text-muted-foreground">
        Admin Profit
      </div>

      <div className="text-2xl font-bold">
        {formatCurrency(
          monthlyReport.adminProfit
        )}
      </div>
    </Card>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="text-left py-3 px-4">
            Manager
          </th>

          <th className="text-right py-3 px-4">
            Net Revenue
          </th>

          <th className="text-right py-3 px-4">
            %
          </th>

          <th className="text-right py-3 px-4">
            Commission
          </th>
        </tr>
      </thead>

      <tbody>
        {monthlyReport.managers.map(
          (m: any) => (
            <tr
              key={m.managerId}
              className="border-b"
            >
              <td className="py-3 px-4">
                {m.managerName}
              </td>

              <td className="text-right px-4 py-3">
                {formatCurrency(
                  m.netRevenue
                )}
              </td>

              <td className="text-right px-4 py-3">
                {m.commissionPercent}%
              </td>

              <td className="text-right px-4 py-3">
                {formatCurrency(
                  m.commissionAmount
                )}
              </td>
            </tr>
          )
        )}

        <tr className="font-semibold border-t">
          <td className="py-3 px-4">
            TOTAL
          </td>

          <td className="text-right px-4 py-3">
            {formatCurrency(
              monthlyReport.totalNetRevenue
            )}
          </td>

          <td className="text-right px-4 py-3">
            -
          </td>

          <td className="text-right px-4 py-3">
            {formatCurrency(
              monthlyReport.totalCommission
            )}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</Card>
{showPayConfirm &&
 paymentStatus.status !== "paid" && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-background text-foreground rounded-lg p-6 w-full max-w-md border">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        Confirm Payment
      </h3>

      <p className="mb-6 text-foreground">
        Are you sure you want to mark{" "}
        {reportMonth}/{reportYear}
        {" "}as paid?
      </p>

      <div className="flex justify-end gap-3">
        <button
          onClick={() =>
            setShowPayConfirm(false)
          }
          className="px-4 py-2 border rounded-md"
        >
          Cancel
        </button>

        <button
          onClick={async () => {
  const response = await fetch(
    "/api/admin/monthly-manager-report/pay",
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        month: reportMonth,
        year: reportYear,
      }),
    }
  );

  const data = await response.json();

if (!response.ok) {
  alert(data.error || "Payment failed");
  return;
}

console.log("PAY ROUTE RESPONSE", data);

setShowPayConfirm(false);

const statusResponse = await fetch(
  `/api/admin/monthly-manager-report/status?month=${reportMonth}&year=${reportYear}`,
  {
    credentials: "include",
  }
);

const statusData =
  await statusResponse.json();

setPaymentStatus(statusData);

alert(
  `Managers: ${data.managerCount}
Total Commission: ₦${data.totalCommission}`
);
}}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
