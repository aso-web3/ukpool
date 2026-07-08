import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetTicket,
  useCancelTicket,
  useGetMe,
  getGetTicketQueryKey,
  getListTicketsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Printer } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/format";

const ticketStatusColor = (s: string) =>
  s === "won" ? "border-primary/40 text-primary" :
  s === "lost" ? "border-muted-foreground/40 text-muted-foreground" :
  s === "cancelled" ? "border-orange-400/40 text-orange-400" :
  "border-blue-400/40 text-blue-400";

export default function TicketDetail() {
  const [, params] = useRoute("/tickets/:id");
  const id = Number(params?.id);
  const queryClient = useQueryClient();
  const { data: t, isLoading } = useGetTicket(id);
  const { data: me } = useGetMe();
  const cancel = useCancelTicket();

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!t) return <div className="text-muted-foreground">Ticket not found</div>;

  const homeHref = me?.role === "admin" ? "/admin" : me?.role === "agent" ? "/agent/tickets" : "/cashier/tickets";

  const onCancel = () => {
    if (!confirm("Cancel this ticket?")) return;
    cancel.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Cancelled");
          queryClient.invalidateQueries({ queryKey: getGetTicketQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
        },
        onError: (e: any) => toast.error(e?.message ?? "Failed"),
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href={homeHref} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center print:hidden">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Link>
      <Card className="p-6 md:p-8 receipt-print">
        <div className="text-center border-b border-border pb-4">
          <div className="font-bold text-2xl">Diamondpool 49</div>
          <div className="text-base font-bold text-black">{t.shopName}</div>
        </div>
        <div className="text-center py-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Ticket</div>
          <div className="font-mono text-lg font-bold tracking-tight">
  {t.ticketCode}
</div>
          <div className="mt-2"><Badge variant="outline" className={ticketStatusColor(t.status)}>{t.status}</Badge></div>
        </div>
        <div className="space-y-3 text-base font-bold border-y border-black py-4">
          <Row label="Date" value={formatDate(t.createdAt)} />
          <Row label="Cashier" value={t.cashierName} />
          <Row label="Week" value={`#${t.weekNumber}`} />
          <Row label="Bet type" value={`${t.betType.toUpperCase()} · ${t.poolType}`} />
          <Row label="Odds tier" value={t.oddsType} />
          <Row label="Total lines" value={t.totalLines} />
          <Row label="Per line" value={formatCurrency(t.perLine)} />
          <Row label="Stake" value={formatCurrency(t.stake)} />
          {t.status !== "active" && t.status !== "cancelled" && (
            <>
              <Row label="Winning lines" value={t.winningLines ?? 0} />
              <Row label="Winnings" value={formatCurrency(t.winnings)} />
            </>
          )}
        </div>
        <div className="py-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Selected numbers</div>
          <div className="flex flex-wrap gap-2">
            {t.selectedNumbers.map((n) => (
              <Badge key={n} variant="outline" className="font-mono text-base px-3 py-1">{n}</Badge>
            ))}
          </div>
        </div>
        <div className="text-center text-xs text-muted-foreground pt-2">
          Good luck — play responsibly.
        </div>
      </Card>

<div className="flex gap-2 print:hidden">
  <Button
    variant="outline"
    className="flex-1"
    onClick={() => window.print()}
  >
    <Printer className="h-4 w-4 mr-2" />
    Print
  </Button>

  {me?.role === "cashier" ? (
    <Link href={`/cashier/sell/${t.weekId}`} className="flex-1">
      <Button className="w-full">
        Bet Again
      </Button>
    </Link>
  ) : (
    t.status === "active" &&
    (me?.role === "admin" ||
      (me?.role === "agent" && me.agentId === t.agentId)) && (
      <Button
        variant="destructive"
        className="flex-1"
        onClick={onCancel}
        disabled={cancel.isPending}
      >
        {cancel.isPending ? "Cancelling..." : "Cancel ticket"}
      </Button>
    )
  )}
</div>

</div>
);
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
