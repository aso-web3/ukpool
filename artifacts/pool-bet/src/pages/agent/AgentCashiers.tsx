import { useState } from "react";
import {
  useListCashiers,
  useCreateCashier,
  getListCashiersQueryKey,
  getGetAgentStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function AgentCashiers() {
  const queryClient = useQueryClient();
  const { data: cashiers, isLoading } = useListCashiers();
  const create = useCreateCashier();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ password: "", name: "", maxStake: 5000 });
const [editOpen, setEditOpen] = useState(false);
const [editingCashier, setEditingCashier] = useState<any>(null);
const [editForm, setEditForm] = useState({
  name: "",
  username: "",
  password: "",
  maxStake: 0,
  active: true,
});
const [savingEdit, setSavingEdit] = useState(false);

  const onCreate = () => {
    if (!form.password || !form.name) { toast.error("All fields required"); return; }
    create.mutate(
      { data: form },
      {
        onSuccess: () => {
          toast.success("Cashier created");
          setOpen(false);
          setForm({ password: "", name: "", maxStake: 5000 });
          queryClient.invalidateQueries({ queryKey: getListCashiersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAgentStatsQueryKey() });
        },
        onError: (e: any) => toast.error(e?.message ?? "Failed"),
      }
    );
  };

const onSaveEdit = async () => {
  if (!editingCashier) return;

  try {
    setSavingEdit(true);

    const res = await fetch(
      `/api/agent/cashiers/${editingCashier.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }

    toast.success("Cashier updated");
    setEditOpen(false);

    queryClient.invalidateQueries({
      queryKey: getListCashiersQueryKey(),
    });

  } catch {
    toast.error("Something went wrong");
  } finally {
    setSavingEdit(false);
  }
};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cashiers</h1>
          <p className="text-sm text-muted-foreground">Counter staff who can sell tickets.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> New cashier</Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead className="text-right">Max stake</TableHead>
              <TableHead className="text-right">Tickets sold</TableHead>
	      <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>}
            {!isLoading && (!cashiers || cashiers.length === 0) && (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No cashiers yet</TableCell></TableRow>
            )}
            {cashiers?.map((c) => (
              <TableRow key={c.id}>
  <TableCell className="font-medium">{c.name}</TableCell>
  <TableCell className="font-mono text-xs">{c.username}</TableCell>
  <TableCell className="text-right tabular-nums">{formatCurrency(c.maxStake)}</TableCell>
  <TableCell className="text-right tabular-nums">{c.ticketCount}</TableCell>
  <TableCell className="text-right">
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
  setEditingCashier(c);
  setEditForm({
    name: c.name,
    username: c.username,
    password: "",
    maxStake: c.maxStake,
    active: true,
  });
  setEditOpen(true);
}}
    >
      Edit
    </Button>
  </TableCell>
</TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New cashier</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
  <Label>Password</Label>
  <Input
    type="text"
    value={form.password}
    onChange={(e) =>
      setForm({ ...form, password: e.target.value })
    }
  />
</div>
            <div className="col-span-2"><Label>Display name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="col-span-2"><Label>Max stake per ticket</Label><Input type="number" value={form.maxStake} onChange={(e) => setForm({ ...form, maxStake: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onCreate} disabled={create.isPending}>{create.isPending ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
<Dialog open={editOpen} onOpenChange={setEditOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Cashier</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input
          value={editForm.name}
          onChange={(e) =>
            setEditForm({ ...editForm, name: e.target.value })
          }
        />
      </div>

      <div>
        <Label>New Password (optional)</Label>
        <Input
          value={editForm.password}
          onChange={(e) =>
            setEditForm({ ...editForm, password: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Max Stake</Label>
        <Input
          type="number"
          value={editForm.maxStake}
          onChange={(e) =>
            setEditForm({
              ...editForm,
              maxStake: Number(e.target.value),
            })
          }
        />
      </div>

<div className="flex items-center justify-between border rounded-md p-3">
  <span className="text-sm font-medium">Cashier Active</span>
  <Button
    type="button"
    variant={editForm.active ? "default" : "destructive"}
    size="sm"
    onClick={() =>
      setEditForm({
        ...editForm,
        active: !editForm.active,
      })
    }
  >
    {editForm.active ? "Active" : "Disabled"}
  </Button>
</div>

      <Button
        className="w-full"
        onClick={onSaveEdit}
        disabled={savingEdit}
      >
        {savingEdit ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  </DialogContent>
</Dialog>
    </div>
  );
}
