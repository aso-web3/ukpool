import { useGetAgentStats } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function AgentDashboard() {
  const { data, isLoading } = useGetAgentStats();
  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!data) return <div className="text-muted-foreground">No data</div>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shop overview</h1>
        <p className="text-sm text-muted-foreground">Today's activity across your cashier desks.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Cashiers</div><div className="text-3xl font-bold tabular-nums mt-2">{data.cashiers}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Receipt className="h-4 w-4" /> Tickets this week</div><div className="text-3xl font-bold tabular-nums mt-2">{data.weekTickets}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Total stake</div><div className="text-3xl font-bold tabular-nums mt-2">{formatCurrency(data.weekStake)}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Payout</div><div className="text-3xl font-bold tabular-nums mt-2">{formatCurrency(data.weekPayout)}</div></Card>
	<Card className="p-5">
  <div className="text-xs uppercase tracking-wider text-muted-foreground">
    My commission
  </div>
  <div className="text-3xl font-bold tabular-nums mt-2">
    {formatCurrency(data.commissionAmount || 0)}
  </div>
</Card>
      </div>
      <Card>
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold">Cashier activity (this week)</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cashier</TableHead>
              <TableHead className="text-right">Tickets</TableHead>
              <TableHead className="text-right">Stake</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.cashierActivity.length === 0 && (
              <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No cashier activity this week.</TableCell></TableRow>
            )}
            {data.cashierActivity.map((c) => (
              <TableRow key={c.cashierId}>
                <TableCell className="font-medium">{c.cashierName}</TableCell>
                <TableCell className="text-right tabular-nums">{c.tickets}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(c.stake)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
