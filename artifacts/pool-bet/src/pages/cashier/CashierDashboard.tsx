import { Link } from "wouter";
import {
  useGetActiveWeeksForCashier,
  useListTickets,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowRight } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/format";

export default function CashierDashboard() {
  const { data: weeks, isLoading: wLoading } = useGetActiveWeeksForCashier();
  const { data } = useListTickets({});

const tickets = data?.tickets ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sell tickets</h1>
        <p className="text-sm text-muted-foreground">Pick an open week to start selling.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {wLoading && <Card className="p-6 text-muted-foreground">Loading weeks...</Card>}
        {!wLoading && (!weeks || weeks.length === 0) && (
          <Card className="p-6 text-muted-foreground col-span-2">
            No weeks open for betting right now.
          </Card>
        )}
        {weeks?.map((w) => (
          <Link key={w.id} href={`/cashier/sell/${w.id}`}>
            <Card className="p-6 hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <Calendar className="h-4 w-4" /> Pool week
                  </div>
                  <div className="text-4xl font-mono font-bold mt-1">#{w.weekNumber}</div>
                  <div className="text-xs text-muted-foreground mt-2">Closes {formatDate(w.closesAt)}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className="border-primary text-primary">OPEN</Badge>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">My recent tickets</h2>
          <Link href="/cashier/tickets"><Button variant="ghost" size="sm">View all</Button></Link>
        </div>
        <div className="divide-y divide-border">
          {(!tickets || tickets.length === 0) && (
            <div className="p-6 text-center text-muted-foreground">No tickets yet today.</div>
          )}
          {tickets?.slice(0, 8).map((t) => (
            <Link key={t.id} href={`/tickets/${t.id}`}>
              <div className="p-4 flex items-center justify-between hover:bg-muted/30 cursor-pointer">
                <div>
                  <div className="font-mono text-sm">{t.ticketCode}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Week #{t.weekNumber} · {t.betType.toUpperCase()} {t.poolType} · {t.selectedNumbers.length} picks
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono tabular-nums">{formatCurrency(t.stake)}</div>
                  <Badge variant="outline" className="text-[10px] mt-1">{t.status}</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
