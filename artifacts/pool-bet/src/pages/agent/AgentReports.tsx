import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AgentReports() {
  const [filters, setFilters] = useState<{ weekId?: number }>({});
  const [weeks, setWeeks] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/public/weeks")
      .then((r) => r.json())
      .then((d) => setWeeks(Array.isArray(d) ? d : []))
      .catch(() => setWeeks([]));
  }, []);

useEffect(() => {
  let url = "/api/agent/reports";

  if (filters.weekId !== undefined) {
    url += `?weekId=${filters.weekId}`;
  }

  fetch(url, {
    credentials: "include",
  })
    .then((r) => r.json())
    .then((d) => setReports(Array.isArray(d) ? d : []))
    .catch(() => setReports([]));
}, [filters.weekId]);

  useEffect(() => {
    if (weeks.length > 0 && filters.weekId === undefined) {
      const currentWeek =
        weeks.find((w) => w.status === "open") ??
        weeks[weeks.length - 1];

      setFilters({
        weekId: currentWeek.id,
      });
    }
  }, [weeks]);

const totals = reports.reduce(
  (acc, report) => ({
    validSales: acc.validSales + report.validSales,
    winnings: acc.winnings + report.winnings,
    paidToManager: acc.paidToManager + report.paidToManager,
    outstanding: acc.outstanding + report.outstandingBalance,
    commission: acc.commission + report.commission,
  }),
  {
    validSales: 0,
    winnings: 0,
    paidToManager: 0,
    outstanding: 0,
    commission: 0,
  }
);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Agent Reports
        </h1>

        <p className="text-sm text-muted-foreground">
          View your weekly financial report.
        </p>
      </div>

      <Card className="p-4">
        <Select
          value={
            filters.weekId === undefined
              ? "all"
              : String(filters.weekId)
         }
          onValueChange={(v) =>
            setFilters({
              weekId: v === "all" ? undefined : Number(v),
            })
          }
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select Week" />
          </SelectTrigger>

          <SelectContent>
	    <SelectItem value="all">All Weeks</SelectItem>
            {weeks.map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>
                {w.season}/{w.season + 1} - Week {w.weekNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

<Card>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Week</TableHead>
        <TableHead className="text-right">Valid Sales</TableHead>
        <TableHead className="text-right">Winnings</TableHead>
        <TableHead className="text-right">Paid to Manager</TableHead>
        <TableHead className="text-right">Outstanding</TableHead>
        <TableHead className="text-right">Commission</TableHead>
      </TableRow>
    </TableHeader>

    <TableBody>
  {reports.length === 0 ? (
    <TableRow>
      <TableCell
        colSpan={6}
        className="py-8 text-center text-muted-foreground"
      >
        No report found.
      </TableCell>
    </TableRow>
  ) : (
    reports.map((report) => (
      <TableRow key={report.weekId}>
        <TableCell>
          {report.season}/{report.season + 1} - Week {report.weekNumber}
        </TableCell>

        <TableCell className="text-right">
          {formatCurrency(report.validSales)}
        </TableCell>

        <TableCell className="text-right">
          {formatCurrency(report.winnings)}
        </TableCell>

        <TableCell className="text-right">
          {formatCurrency(report.paidToManager)}
        </TableCell>

        <TableCell className="text-right">
          {formatCurrency(report.outstandingBalance)}
        </TableCell>

        <TableCell className="text-right">
          {formatCurrency(report.commission)}
        </TableCell>
      </TableRow>
    ))
  )}
</TableBody>
  </Table>
</Card>

<div className="grid gap-4 mt-6 md:grid-cols-2 lg:grid-cols-5">
  <Card>
    <CardHeader>
      <CardTitle className="text-sm">Valid Sales</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">
        {formatCurrency(totals.validSales)}
      </p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle className="text-sm">Winnings</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">
        {formatCurrency(totals.winnings)}
      </p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle className="text-sm">Paid to Manager</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">
        {formatCurrency(totals.paidToManager)}
      </p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle className="text-sm">Outstanding</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">
        {formatCurrency(totals.outstanding)}
      </p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle className="text-sm">Commission</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">
        {formatCurrency(totals.commission)}
      </p>
    </CardContent>
  </Card>
</div>
    </div>
  );
}
