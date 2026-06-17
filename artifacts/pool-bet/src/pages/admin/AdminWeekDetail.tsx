import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import {
  useGetPoolWeek,
  useSetFixtures,
  useUpdateFixtureStatus,
  useSetWeekOdds,
  useUpdatePoolWeekStatus,
  useSubmitWeekResults,
  getGetPoolWeekQueryKey,
  getListPoolWeeksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

const POOL_TYPES = [
  "single",
  "double",
  "nap",
  "under3",
  "under4",
  "under5",
  "under6",
] as const;
const ODDS_TYPES = ["standard", "high"] as const;
const POOL_LABELS: Record<string, string> = {
  single: "Single",
  double: "Double",
  nap: "NAP",
  under3: "Under 3",
  under4: "Under 4",
  under5: "Under 5",
  under6: "Under 6",
};

const statusColor = (s: string) =>
  s === "open" ? "border-primary/40 text-primary" :
  s === "settled" ? "border-blue-400/40 text-blue-400" :
  s === "closed" ? "border-orange-400/40 text-orange-400" :
  "border-muted-foreground/40 text-muted-foreground";

export default function AdminWeekDetail() {
  const [, params] = useRoute("/admin/weeks/:id");
  const id = Number(params?.id);
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetPoolWeek(id);
  const setFixtures = useSetFixtures();
  const updateFixture = useUpdateFixtureStatus();
  const setOdds = useSetWeekOdds();
  const updateStatus = useUpdatePoolWeekStatus();
  const submitResults = useSubmitWeekResults();

  const [fixtureRows, setFixtureRows] = useState<{ number: number; homeTeam: string; awayTeam: string }[]>([]);
  const [oddsRows, setOddsRows] = useState<Record<string, number>>({});
  const [winners, setWinners] = useState<number[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);

  useEffect(() => {
    if (data) {
      setFixtureRows(data.fixtures.map((f) => ({ number: f.number, homeTeam: f.homeTeam, awayTeam: f.awayTeam })));
      const o: Record<string, number> = {};
      for (const item of data.odds) o[`${item.poolType}_${item.oddsType}`] = Number(item.oddsValue);
      setOddsRows(o);
      setWinners(data.week.winningNumbers ?? []);
      if (data.week.status === "settled") {
  fetch(`/api/admin/pool-weeks/${id}/commissions`, {
    credentials: "include",
  })
    .then((r) => r.json())
    .then(setCommissions)
    .catch(() => setCommissions([]));
}
    }
  }, [data?.week.id]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetPoolWeekQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListPoolWeeksQueryKey() });
  };

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!data) return <div className="text-muted-foreground">Not found</div>;
  const { week, fixtures } = data;

  const onSaveFixtures = () => {
    setFixtures.mutate(
      { id, data: { fixtures: fixtureRows } },
      {
        onSuccess: () => { toast.success("Fixtures saved"); invalidate(); },
        onError: () => toast.error("Failed to save fixtures"),
      }
    );
  };

  const toggleFixtureStatus = (fixtureId: number, current: string) => {
    const newStatus = current === "open" ? "closed" : "open";
    updateFixture.mutate(
      { id: fixtureId, data: { status: newStatus } },
      {
        onSuccess: () => { toast.success(`Match ${newStatus}`); invalidate(); },
        onError: () => toast.error("Failed"),
      }
    );
  };

  const setFixturePostponed = (fixtureId: number) => {
    updateFixture.mutate(
      { id: fixtureId, data: { status: "postponed" } },
      {
        onSuccess: () => { toast.success("Marked postponed"); invalidate(); },
        onError: () => toast.error("Failed"),
      }
    );
  };

  const onSaveOdds = () => {
    const odds = [];
    for (const pt of POOL_TYPES) {
      for (const ot of ODDS_TYPES) {
        const key = `${pt}_${ot}`;
        odds.push({ poolType: pt, oddsType: ot, oddsValue: Number(oddsRows[key] || 0) });
      }
    }
    setOdds.mutate(
      { id, data: { odds } },
      {
        onSuccess: () => { toast.success("Odds saved"); invalidate(); },
        onError: () => toast.error("Failed"),
      }
    );
  };

  const onChangeStatus = (newStatus: "draft" | "open" | "closed") => {
    updateStatus.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => { toast.success(`Week ${newStatus}`); invalidate(); },
        onError: () => toast.error("Failed"),
      }
    );
  };

  const toggleWinner = (n: number) => {
    setWinners((w) => (w.includes(n) ? w.filter((x) => x !== n) : [...w, n].sort((a, b) => a - b)));
  };

  const onSubmitResults = () => {
    if (winners.length === 0) { toast.error("Pick at least one winning number"); return; }
    if (!confirm(`Settle week #${week.weekNumber} with ${winners.length} winning numbers? This is irreversible.`)) return;
    submitResults.mutate(
      { id, data: { winningNumbers: winners } },
      {
        onSuccess: (r) => {
          toast.success(`Settled. ${r.ticketsWon}/${r.ticketsSettled} tickets won.`);
          invalidate();
        },
        onError: () => toast.error("Failed to settle"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono">Week #{week.weekNumber}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <Badge variant="outline" className={statusColor(week.status)}>{week.status}</Badge>
            <span>Opens {formatDate(week.opensAt)}</span>
            <span>·</span>
            <span>Closes {formatDate(week.closesAt)}</span>
	    <span>·</span>
	    <span>Commission {Number(week.commissionPercent)}%</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="fixtures">
        <TabsList>
          <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
          <TabsTrigger value="odds">Odds</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
	  <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        <TabsContent value="fixtures" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Set match-ups for all 49 fixtures. Close individual matches to remove them from active betting.</p>
            <Button onClick={onSaveFixtures} disabled={setFixtures.isPending}>{setFixtures.isPending ? "Saving..." : "Save all"}</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Home team</TableHead>
                  <TableHead>Away team</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fixtureRows.map((r, idx) => {
                  const fixture = fixtures.find((f) => f.number === r.number);
                  return (
                    <TableRow key={r.number}>
                      <TableCell className="font-mono font-bold">{r.number}</TableCell>
                      <TableCell><Input value={r.homeTeam} onChange={(e) => { const c = [...fixtureRows]; c[idx] = { ...c[idx], homeTeam: e.target.value }; setFixtureRows(c); }} placeholder="Home" /></TableCell>
                      <TableCell><Input value={r.awayTeam} onChange={(e) => { const c = [...fixtureRows]; c[idx] = { ...c[idx], awayTeam: e.target.value }; setFixtureRows(c); }} placeholder="Away" /></TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          fixture?.status === "open" ? "border-primary/40 text-primary" :
                          fixture?.status === "postponed" ? "border-orange-400/40 text-orange-400" :
                          "border-destructive/40 text-destructive"
                        }>{fixture?.status ?? "open"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {fixture && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => toggleFixtureStatus(fixture.id, fixture.status)}>
                              {fixture.status === "open" ? "Close" : "Reopen"}
                            </Button>
                            {fixture.status !== "postponed" && (
                              <Button size="sm" variant="outline" onClick={() => setFixturePostponed(fixture.id)}>Postpone</Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="odds" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Set odds (multipliers) per pool type and odds tier.</p>
            <Button onClick={onSaveOdds} disabled={setOdds.isPending}>{setOdds.isPending ? "Saving..." : "Save odds"}</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pool type</TableHead>
                  <TableHead>Standard (100-1)</TableHead>
                  <TableHead>High odd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {POOL_TYPES.map((pt) => (
                  <TableRow key={pt}>
                    <TableCell className="font-medium">{POOL_LABELS[pt]}</TableCell>
                    {ODDS_TYPES.map((ot) => {
                      const key = `${pt}_${ot}`;
                      return (
                        <TableCell key={ot}>
                          <Input type="number" step="0.01" className="font-mono w-32" value={oddsRows[key] ?? 0} onChange={(e) => setOddsRows({ ...oddsRows, [key]: Number(e.target.value) })} />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold">Current status: <Badge variant="outline" className={statusColor(week.status)}>{week.status}</Badge></h3>
              <p className="text-sm text-muted-foreground mt-1">Tickets can only be sold while the week is OPEN.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onChangeStatus("draft")} variant="outline" disabled={week.status === "draft" || week.status === "settled"}>Draft</Button>
              <Button onClick={() => onChangeStatus("open")} disabled={week.status === "open" || week.status === "settled"}>Open for betting</Button>
              <Button onClick={() => onChangeStatus("closed")} variant="outline" disabled={week.status === "closed" || week.status === "settled"}>Close betting</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold">Select winning numbers</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tap the numbers that drew this week. {winners.length} selected. {week.status === "settled" && <span className="text-blue-400">(Already settled)</span>}
              </p>
            </div>
            <div className="grid grid-cols-7 md:grid-cols-10 gap-2">
              {Array.from({ length: 49 }, (_, i) => i + 1).map((n) => {
                const sel = winners.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleWinner(n)}
                    disabled={week.status === "settled"}
                    className={`aspect-square rounded-md border font-mono font-bold text-sm transition-all ${
                      sel
                        ? "bg-primary text-primary-foreground border-primary scale-105"
                        : "border-border bg-card hover:border-primary/50"
                    } ${week.status === "settled" ? "opacity-60 cursor-not-allowed" : ""}`}
                  >{n}</button>
                );
              })}
            </div>
            <Button size="lg" onClick={onSubmitResults} disabled={submitResults.isPending || week.status === "settled"}>
              {submitResults.isPending ? "Settling..." : week.status === "settled" ? "Already settled" : "Submit results & settle bets"}
            </Button>
          </Card>
        </TabsContent>
<TabsContent value="commissions" className="space-y-4">
  <Card>
    <div className="p-6">
      <h3 className="font-semibold text-lg">Agent commissions</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Commission is calculated only after settlement using valid tickets.
      </p>
    </div>

    {week.status !== "settled" ? (
      <div className="p-6 text-muted-foreground">
        Commission becomes available after this week is settled.
      </div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead className="text-right">Sales</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right">Commission</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commissions?.length ? (
            commissions.map((row) => (
              <TableRow key={row.agentId}>
                <TableCell>{row.agentName}</TableCell>
                <TableCell className="text-right font-mono">
                  ₦{Number(row.validSales).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {row.commissionPercent}%
                </TableCell>
                <TableCell className="text-right font-mono font-bold">
                  ₦{Number(row.commissionAmount).toLocaleString()}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                No commission data
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    )}
  </Card>
</TabsContent>
      </Tabs>
    </div>
  );
}
