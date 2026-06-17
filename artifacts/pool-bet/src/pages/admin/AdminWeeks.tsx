import { useState } from "react";
import {
  useListPoolWeeks,
  useCreatePoolWeek,
  getListPoolWeeksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/format";

const statusColor = (s: string) =>
  s === "open" ? "border-primary/40 text-primary" :
  s === "settled" ? "border-blue-400/40 text-blue-400" :
  s === "closed" ? "border-orange-400/40 text-orange-400" :
  "border-muted-foreground/40 text-muted-foreground";

function toIso(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function AdminWeeks() {
  const queryClient = useQueryClient();
  const { data: weeks, isLoading } = useListPoolWeeks();
  const create = useCreatePoolWeek();
  const [open, setOpen] = useState(false);
  const today = new Date();
  const yyyymmdd = today.toISOString().slice(0, 10);
  const [form, setForm] = useState({
    season: 2026,
    weekNumber: (weeks?.[0]?.weekNumber ?? 0) + 1,
    opensDate: yyyymmdd,
    opensTime: "10:00",
    closesDate: yyyymmdd,
    closesTime: "14:00",
    commissionPercent: 10,
  });

  const onCreate = () => {
    create.mutate(
      {
        data: {
	  season: Number(form.season),
          weekNumber: Number(form.weekNumber),
          opensAt: toIso(form.opensDate, form.opensTime),
          closesAt: toIso(form.closesDate, form.closesTime),
	  commissionPercent: Number(form.commissionPercent),
        },
      },
      {
        onSuccess: () => {
          toast.success(
  `Season ${form.season}/${form.season + 1} - Week ${form.weekNumber} created with 49 fixtures and default odds`
);
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: getListPoolWeeksQueryKey() });
        },
        onError: (e: any) => toast.error(e?.message ?? "Failed"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pool weeks</h1>
          <p className="text-sm text-muted-foreground">Each week ships with 49 fixture slots and a default odds table.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> New week</Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Week</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Opens</TableHead>
              <TableHead>Closes</TableHead>
              <TableHead>Settled</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>}
            {!isLoading && (!weeks || weeks.length === 0) && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No weeks created yet</TableCell></TableRow>
            )}
            {weeks?.map((w) => (
              <TableRow key={w.id} className="cursor-pointer hover:bg-muted/30">
                <TableCell className="font-mono font-bold">
  {w.season}/{w.season + 1} - Week {w.weekNumber}
</TableCell>
                <TableCell><Badge variant="outline" className={statusColor(w.status)}>{w.status}</Badge></TableCell>
                <TableCell className="text-xs">{formatDate(w.opensAt)}</TableCell>
                <TableCell className="text-xs">{formatDate(w.closesAt)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{w.settledAt ? formatDate(w.settledAt) : "—"}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/weeks/${w.id}`}>
                    <Button variant="ghost" size="sm">Manage <ChevronRight className="h-4 w-4 ml-1" /></Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New pool week</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
<div className="space-y-2">
  <Label>Season</Label>
  <Input
    type="number"
    value={form.season}
    onChange={(e) =>
      setForm({
        ...form,
        season: Number(e.target.value),
      })
    }
  />
</div>
            <div className="col-span-2"><Label>Week number</Label><Input type="number" value={form.weekNumber} onChange={(e) => setForm({ ...form, weekNumber: Number(e.target.value) })} /></div>
	    <div className="col-span-2">
  <Label>Commission %</Label>
  <Input
    type="number"
    min="0"
    max="100"
    step="0.1"
    value={form.commissionPercent}
    onChange={(e) =>
      setForm({
        ...form,
        commissionPercent: Number(e.target.value),
      })
    }
  />
</div>
            <div><Label>Opens date</Label><Input type="date" value={form.opensDate} onChange={(e) => setForm({ ...form, opensDate: e.target.value })} /></div>
            <div><Label>Opens time</Label><Input type="time" value={form.opensTime} onChange={(e) => setForm({ ...form, opensTime: e.target.value })} /></div>
            <div><Label>Closes date</Label><Input type="date" value={form.closesDate} onChange={(e) => setForm({ ...form, closesDate: e.target.value })} /></div>
            <div><Label>Closes time</Label><Input type="time" value={form.closesTime} onChange={(e) => setForm({ ...form, closesTime: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onCreate} disabled={create.isPending}>{create.isPending ? "Creating..." : "Create week"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
