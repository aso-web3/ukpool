import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  useListTickets,
  useListCashiers,
  useCancelTicket,
  getListTicketsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/format";

const ticketStatusColor = (s: string) =>
  s === "won" ? "border-primary/40 text-primary" :
  s === "lost" ? "border-muted-foreground/40 text-muted-foreground" :
  s === "cancelled" ? "border-orange-400/40 text-orange-400" :
  "border-blue-400/40 text-blue-400";

export default function AgentTickets() {
  const queryClient = useQueryClient();

const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<{ weekId?: number; cashierId?: number; status?: string }>({});
  const params: any = { page };
  if (filters.weekId !== undefined) params.weekId = filters.weekId;
  if (filters.cashierId !== undefined) params.cashierId = filters.cashierId;
  if (filters.status) params.status = filters.status;
  const { data, isLoading } = useListTickets(params);

const tickets = data?.tickets ?? [];
const totalPages = data?.totalPages ?? 1;
  const { data: cashiers } = useListCashiers();
  const [weeks, setWeeks] = useState<any[]>([]);

useEffect(() => {
  fetch("/api/public/weeks")
    .then((r) => r.json())
    .then((d) => setWeeks(Array.isArray(d) ? d : []))
    .catch(() => setWeeks([]));
}, []);
useEffect(() => {
  if (
    weeks.length > 0 &&
    filters.weekId === undefined
  ) {
    const currentWeek =
      weeks.find((w) => w.status === "open") ??
      weeks[weeks.length - 1];

    setFilters((prev) => ({
      ...prev,
      weekId: currentWeek.id,
    }));
  }
}, [weeks]);
  console.log("weeks:", weeks);
  const cancel = useCancelTicket();
  const [stats, setStats] = useState({
  totalTickets: 0,
  totalAmount: 0,
  totalWinnings: 0,
  totalCancelled: 0,
});

  const onCancel = (id: number) => {
    if (!confirm("Cancel this ticket?")) return;
    cancel.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Ticket cancelled");
          queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
        },
        onError: (e: any) => toast.error(e?.message ?? "Failed"),
      }
    );
  };

useEffect(() => {
  const qs = new URLSearchParams();

  if (filters.weekId !== undefined) {
    qs.append("weekId", String(filters.weekId));
  }

  if (filters.cashierId !== undefined) {
    qs.append("cashierId", String(filters.cashierId));
  }

  if (filters.status) {
    qs.append("status", filters.status);
  }

  fetch(`/api/tickets/stats?${qs.toString()}`, {
    credentials: "include",
  })
    .then((r) => r.json())
    .then((data) => setStats(data))
    .catch(console.error);
}, [filters]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
        <p className="text-sm text-muted-foreground">All tickets sold across your shop.</p>
      </div>

      <div className="flex flex-wrap gap-3 no-print">
        <Select
  value={String(filters.weekId ?? "all")}
  onValueChange={(v) => {
    setFilters({
      ...filters,
      weekId: v === "all" ? undefined : parseInt(v, 10),
    });
  }}
>
  <SelectTrigger className="w-[180px]">
    <SelectValue />
  </SelectTrigger>

  <SelectContent>
    <SelectItem value="all">All weeks</SelectItem>

    {(weeks ?? []).map((w) => (
      <SelectItem
        key={`week-${w.id}`}
        value={String(w.id)}
      >
        {w.season}/{w.season + 1} - Week {w.weekNumber}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
        <Select value={filters.cashierId?.toString() ?? "all"} onValueChange={(v) => setFilters({ ...filters, cashierId: v === "all" ? undefined : Number(v) })}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All cashiers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cashiers</SelectItem>
            {cashiers?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.status ?? "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Week</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead>Bet</TableHead>
              <TableHead className="text-right">Stake</TableHead>
              <TableHead className="text-right">Winnings</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right no-print">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>}
            {!isLoading && (!tickets || tickets.length === 0) && (
              <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No tickets match filters</TableCell></TableRow>
            )}
            {tickets?.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">{t.ticketCode}</TableCell>
                <TableCell className="font-mono">#{t.weekNumber}</TableCell>
                <TableCell>{t.cashierName}</TableCell>
                <TableCell className="text-xs uppercase">{t.betType} · {t.poolType} · {t.oddsType}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(t.stake)}</TableCell>
                <TableCell className="text-right tabular-nums">{t.winnings > 0 ? formatCurrency(t.winnings) : "—"}</TableCell>
                <TableCell><Badge variant="outline" className={ticketStatusColor(t.status)}>{t.status}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                <TableCell className="text-right no-print">
                  <div className="flex justify-end gap-2">
                    <Link href={`/tickets/${t.id}`}><Button size="sm" variant="ghost">View</Button></Link>
                    {t.status === "active" && <Button size="sm" variant="outline" onClick={() => onCancel(t.id)}>Cancel</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <Card className="p-4">
    <div className="text-xs text-muted-foreground">Tickets Sold</div>
    <div className="text-2xl font-bold">{stats.totalTickets}</div>
  </Card>

  <Card className="p-4">
    <div className="text-xs text-muted-foreground">Amount Sold</div>
    <div className="text-2xl font-bold">
      {formatCurrency(stats.totalAmount)}
    </div>
  </Card>

  <Card className="p-4">
    <div className="text-xs text-muted-foreground">Winnings</div>
    <div className="text-2xl font-bold">
      {formatCurrency(stats.totalWinnings)}
    </div>
  </Card>

  <Card className="p-4">
    <div className="text-xs text-muted-foreground">Cancelled</div>
    <div className="text-2xl font-bold">{stats.totalCancelled}</div>
  </Card>
</div>
<div className="flex items-center justify-center gap-2">
  <Button
    variant="outline"
    size="sm"
    disabled={page <= 1}
    onClick={() => setPage((p) => p - 1)}
  >
    Previous
  </Button>

  <div className="text-sm text-muted-foreground">
    Page {page} of {totalPages}
  </div>

  <Button
    variant="outline"
    size="sm"
    disabled={page >= totalPages}
    onClick={() => setPage((p) => p + 1)}
  >
    Next
  </Button>
</div>
    </div>
  );
}
