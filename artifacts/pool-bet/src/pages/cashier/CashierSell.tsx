import { useEffect, useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetCashierWeekDetail,
  useCalculateBet,
  useCreateTicket,
  getGetCashierWeekDetailQueryKey,
  getListTicketsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Printer, RefreshCw } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { combinations, pickSizeForPool, validateSelection } from "@/lib/perm";

type BetType = "nap" | "perm";
type PoolType =
  | "single"
  | "double"
  | "nap"
  | "under3"
  | "under4"
  | "under5"
  | "under6";
type OddsType = "standard" | "high";

const POOL_LABELS: Record<PoolType, string> = {
  single: "Single",
  double: "Double",
  nap: "NAP (3 picks)",
  under3: "Under 3",
  under4: "Under 4",
  under5: "Under 5",
  under6: "Under 6",
};

export default function CashierSell() {
  const [, params] = useRoute("/cashier/sell/:weekId");
  const [, setLocation] = useLocation();
  const weekId = Number(params?.weekId);
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetCashierWeekDetail(weekId);
  const calculate = useCalculateBet();
  const createTicket = useCreateTicket();

  const [betType, setBetType] = useState<BetType>("nap");
  const [poolType, setPoolType] = useState<PoolType>("nap");
  const [oddsType, setOddsType] = useState<OddsType>("standard");
  const [selected, setSelected] = useState<number[]>([]);
  const [stake, setStake] = useState<number>(100);
  const [calc, setCalc] = useState<{ totalLines: number; perLine: number; oddsValue: number; possibleMaxWinnings: number } | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);

  // Fixture status lookup
  const fixtureStatusByNumber = useMemo(() => {
    const m: Record<number, "open" | "closed" | "postponed"> = {};
    data?.fixtures.forEach((f) => { m[f.number] = f.status as any; });
    return m;
  }, [data?.fixtures]);

  // Switching bet type sets sensible defaults
  useEffect(() => {
  if (betType === "nap") {
    setPoolType("nap");
  } else if (poolType === "nap") {
    setPoolType("single");
  }
}, [betType]);

  const validationError = validateSelection(poolType, selected.length, betType);

  // Local computed (instant) so UI is responsive even before server roundtrip
  const localTotalLines = useMemo(() => {
  if (poolType === "single") {
    return selected.length === 1 ? 1 : 0;
  }

  if (poolType === "double") {
    return selected.length === 2 ? 1 : 0;
  }

  if (betType === "nap") {
    return selected.length === 3 && poolType === "nap" ? 1 : 0;
  }

  const k = pickSizeForPool(poolType);

  if (selected.length < k) return 0;

  return combinations(selected.length, k);
}, [betType, poolType, selected.length]);

  const localOddsValue = useMemo(() => {
    const o = data?.odds.find((x) => x.poolType === poolType && x.oddsType === oddsType);
    return o ? Number(o.oddsValue) : 0;
  }, [data?.odds, poolType, oddsType]);

  // Debounced server calc (for authoritative answer)
  useEffect(() => {
    if (!data || validationError || localTotalLines <= 0 || stake <= 0) {
      setCalc(null);
      return;
    }
    const handle = setTimeout(() => {
      calculate.mutate(
        { data: { weekId, betType, poolType, oddsType, selectedNumbers: selected, stake } },
        {
          onSuccess: (r) => setCalc(r),
          onError: () => setCalc(null),
        }
      );
    }, 250);
    return () => clearTimeout(handle);
  }, [weekId, betType, poolType, oddsType, JSON.stringify(selected), stake, validationError, localTotalLines, !!data]);

  const toggleNumber = (n: number) => {
    const status = fixtureStatusByNumber[n];
    if (status && status !== "open") {
      toast.error(`Match #${n} is ${status}. Cannot select.`);
      return;
    }
    setSelected((s) => {
      if (s.includes(n)) return s.filter((x) => x !== n);
      if (s.length >= 30) { toast.error("Maximum 30 selections"); return s; }
      return [...s, n].sort((a, b) => a - b);
    });
  };

  const reset = () => {
    setSelected([]);
    setStake(100);
    setCalc(null);
  };

  const onPlace = () => {
    if (validationError) { toast.error(validationError); return; }
    if (stake <= 0) { toast.error("Stake must be > 0"); return; }
    if (data && stake > data.maxStake) { toast.error(`Stake exceeds your max (${formatCurrency(data.maxStake)})`); return; }
    createTicket.mutate(
      { data: { weekId, betType, poolType, oddsType, selectedNumbers: selected, stake } },
      {
        onSuccess: (t) => {
  toast.success(`Ticket ${t.ticketCode} placed`);

  queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
  queryClient.invalidateQueries({ queryKey: getGetCashierWeekDetailQueryKey(weekId) });

setLocation(`/tickets/${t.id}`);
},
        onError: (e: any) => toast.error(e?.message ?? "Failed to place"),
      }
    );
  };

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!data) return <div className="text-muted-foreground">Week not found</div>;
  if (data.week.status !== "open") {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-xl font-semibold">Week not open</h2>
        <p className="text-muted-foreground mt-2">This week is currently {data.week.status}. Tickets cannot be sold.</p>
        <Button className="mt-4" onClick={() => setLocation("/cashier")}>Back to weeks</Button>
      </Card>
    );
  }

  const totalLines = calc?.totalLines ?? localTotalLines;
  const oddsValue = calc?.oddsValue ?? localOddsValue;
  const perLine = calc?.perLine ?? (totalLines > 0 ? stake / totalLines : 0);
  const maxWin = calc?.possibleMaxWinnings ?? oddsValue * stake;

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Selling for</div>
            <h1 className="text-3xl font-mono font-bold">Week #{data.week.weekNumber}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={reset}><RefreshCw className="h-4 w-4 mr-2" /> Reset</Button>
        </div>
        <Card className="p-4 md:p-6">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 49 }, (_, i) => i + 1).map((n) => {
              const sel = selected.includes(n);
              const status = fixtureStatusByNumber[n] ?? "open";
              const closed = status !== "open";
              return (
                <motion.button
                  key={n}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggleNumber(n)}
                  disabled={closed}
                  className={`relative aspect-square rounded-md border font-mono font-bold text-sm md:text-base transition-all overflow-hidden ${
                    closed
                      ? "border-destructive/40 bg-destructive/5 text-destructive/60 cursor-not-allowed"
                      : sel
                        ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                        : "border-border bg-card hover:border-primary/60 hover:bg-card/80"
                  }`}
                >
                  {n}
                  {closed && (
                    <span className="absolute inset-x-0 bottom-0 text-[8px] uppercase tracking-wider bg-destructive/20">
                      {status}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
          <div className="mt-4 text-xs text-muted-foreground flex items-center gap-4">
            <span>{selected.length} selected</span>
            {selected.length > 0 && (
              <span className="font-mono">Numbers: {selected.join(", ")}</span>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-4 self-start">
        <Card className="p-5 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bet type</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button variant={betType === "nap" ? "default" : "outline"} onClick={() => setBetType("nap")}>NAP</Button>
              <Button variant={betType === "perm" ? "default" : "outline"} onClick={() => setBetType("perm")}>PERM</Button>
            </div>
          </div>

          {betType === "perm" && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pool</Label>
              <RadioGroup value={poolType} onValueChange={(v) => setPoolType(v as PoolType)} className="grid grid-cols-2 gap-2 mt-2">
                {([
  "single",
  "double",
  "under3",
  "under4",
  "under5",
  "under6",
] as PoolType[]).map((p) => (
                  <div key={p} className="flex items-center space-x-2 border border-border rounded-md p-2 cursor-pointer hover:border-primary/50" onClick={() => setPoolType(p)}>
                    <RadioGroupItem value={p} id={`p-${p}`} />
                    <Label htmlFor={`p-${p}`} className="cursor-pointer text-sm font-normal">{POOL_LABELS[p]}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Odds tier</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button variant={oddsType === "standard" ? "default" : "outline"} size="sm" onClick={() => setOddsType("standard")}>Standard</Button>
              <Button variant={oddsType === "high" ? "default" : "outline"} size="sm" onClick={() => setOddsType("high")}>High odd</Button>
            </div>
          </div>

          <div>
            <Label htmlFor="stake" className="text-xs uppercase tracking-wider text-muted-foreground">Stake</Label>
            <Input id="stake" type="number" min={0} max={data.maxStake} value={stake} onChange={(e) => setStake(Number(e.target.value))} className="font-mono text-lg mt-2" />
            <div className="text-xs text-muted-foreground mt-1">Max per ticket: {formatCurrency(data.maxStake)}</div>
          </div>
        </Card>

        <Card className="p-5 space-y-3 border-primary/20">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Live calculation</div>
          {validationError ? (
            <div className="text-sm text-destructive py-2">{validationError}</div>
          ) : totalLines === 0 ? (
            <div className="text-sm text-muted-foreground py-2">Pick numbers to calculate</div>
          ) : (
            <div className="space-y-2 text-sm">
              <Row label="Total lines" value={totalLines.toLocaleString()} />
              <Row label="Per line" value={formatCurrency(perLine)} />
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Possible max win</span>
                  <span className="font-mono text-2xl font-bold text-primary">{formatCurrency(maxWin)}</span>
                </div>
              </div>
            </div>
          )}
          <Button size="lg" className="w-full" onClick={onPlace} disabled={!!validationError || totalLines === 0 || createTicket.isPending}>
            {createTicket.isPending ? "Placing..." : "Place bet"}
          </Button>
        </Card>
      </div>

      <Dialog open={!!receipt} onOpenChange={(o) => { if (!o) { setReceipt(null); reset(); } }}>
        <DialogContent className="max-w-md">
          {receipt && (
            <div className="receipt-print space-y-4">
              <div className="text-center border-b border-border pb-1">
                <div className="font-bold text-3xl tracking-tight">
  Diamondpool 49
</div>
                <div className="text-xs text-muted-foreground">{receipt.shopName}</div>
              </div>
              <div className="text-center">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Ticket</div>
                <div className="font-mono text-lg font-bold tracking-tight">
  {receipt.ticketCode}
</div>
              </div>
              <div className="space-y-1.5 text-sm">
                <Row label="Date" value={formatDate(receipt.createdAt)} />
                <Row label="Cashier" value={receipt.cashierName} />
                <Row label="Week" value={`#${receipt.weekNumber}`} />
                <Row label="Bet type" value={`${receipt.betType.toUpperCase()} · ${receipt.poolType}`} />
                <Row label="Odds tier" value={receipt.oddsType} />
                <Row label="Total lines" value={receipt.totalLines} />
                <Row label="Per line" value={formatCurrency(Number(receipt.perLine))} />
                <Row label="Stake" value={formatCurrency(Number(receipt.stake))} />
              </div>
              <div className="border-t border-border pt-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Selected numbers</div>
                <div className="flex flex-wrap gap-1.5">
                  {receipt.selectedNumbers.map((n: number) => (
                    <Badge key={n} variant="outline" className="font-mono">{n}</Badge>
                  ))}
                </div>
              </div>
              <div className="text-center text-xs text-muted-foreground border-t border-border pt-3">
                Good luck — play responsibly.
              </div>
              <div className="flex gap-2 print:hidden">
                <Button variant="outline" className="flex-1" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
                <Button className="flex-1" onClick={() => { setReceipt(null); reset(); }}>New bet</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
