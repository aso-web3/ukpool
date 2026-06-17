import { useState } from "react";
import {
  useListAgents,
  useCreateAgent,
  getListAgentsQueryKey,
  getGetAdminStatsQueryKey,
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

export default function AdminAgents() {
  const queryClient = useQueryClient();
  const { data: agents, isLoading } = useListAgents();
  const create = useCreateAgent();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ password: "", shopName: "", location: "", phone: "", email: "" });
const [editOpen, setEditOpen] = useState(false);
const [editingAgent, setEditingAgent] = useState<any>(null);
const [savingEdit, setSavingEdit] = useState(false);

const [editForm, setEditForm] = useState({
  username: "",
  password: "",
  shopName: "",
  location: "",
  phone: "",
  email: "",
  active: true,
});

  const onCreate = () => {
  if (
    !form.password ||
    !form.shopName ||
    !form.location ||
    !form.phone ||
    !form.email
  ) {
    toast.error("All fields required");
    return;
  }

  create.mutate(
    { data: form },
    {
      onSuccess: () => {
        toast.success("Agent created");
        setOpen(false);
        setForm({
          password: "",
          shopName: "",
          location: "",
          phone: "",
          email: "",
        });

        queryClient.invalidateQueries({
          queryKey: getListAgentsQueryKey(),
        });

        queryClient.invalidateQueries({
          queryKey: getGetAdminStatsQueryKey(),
        });
      },
      onError: (e: any) =>
        toast.error(e?.message ?? "Failed"),
    }
  );
};

const onSaveEdit = async () => {
  if (!editingAgent) return;

  try {
    setSavingEdit(true);

    const res = await fetch(
  `/api/admin/agents/${editingAgent.id}`,
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

    toast.success("Agent updated");
    setEditOpen(false);

    queryClient.invalidateQueries({
      queryKey: getListAgentsQueryKey(),
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
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground">Shops licensed to operate Diamondpool 49 terminals.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> New agent</Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Cashiers</TableHead>
	      <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>}
            {!isLoading && (!agents || agents.length === 0) && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No agents yet. Approve an application or create one manually.</TableCell></TableRow>
            )}
            {agents?.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.shopName}</TableCell>
                <TableCell className="font-mono text-xs">{a.username}</TableCell>
                <TableCell>{a.location}</TableCell>
                <TableCell className="font-mono text-xs">{a.phone}</TableCell>
                <TableCell className="text-xs">{a.email}</TableCell>
                <TableCell className="text-right tabular-nums">{a.cashiersCount}</TableCell>
<TableCell className="text-right">
  <Button
    size="sm"
    variant="outline"
    onClick={() => {
  setEditingAgent(a);
  setEditForm({
    username: a.username,
    password: "",
    shopName: a.shopName,
    location: a.location,
    phone: a.phone,
    email: a.email,
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
          <DialogHeader><DialogTitle>New agent</DialogTitle></DialogHeader>
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

  <div className="col-span-2">
    <Label>Shop name</Label>
    <Input
      value={form.shopName}
      onChange={(e) =>
        setForm({ ...form, shopName: e.target.value })
      }
    />
  </div>

  <div className="col-span-2">
    <Label>Location</Label>
    <Input
      value={form.location}
      onChange={(e) =>
        setForm({ ...form, location: e.target.value })
      }
    />
  </div>

  <div>
    <Label>Phone</Label>
    <Input
      value={form.phone}
      onChange={(e) =>
        setForm({ ...form, phone: e.target.value })
      }
    />
  </div>

  <div>
    <Label>Email</Label>
    <Input
      type="email"
      value={form.email}
      onChange={(e) =>
        setForm({ ...form, email: e.target.value })
      }
    />
  </div>
</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onCreate} disabled={create.isPending}>{create.isPending ? "Creating..." : "Create agent"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
<Dialog open={editOpen} onOpenChange={setEditOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Agent</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
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
        <Label>Shop Name</Label>
        <Input
          value={editForm.shopName}
          onChange={(e) =>
            setEditForm({ ...editForm, shopName: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Location</Label>
        <Input
          value={editForm.location}
          onChange={(e) =>
            setEditForm({ ...editForm, location: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Phone</Label>
        <Input
          value={editForm.phone}
          onChange={(e) =>
            setEditForm({ ...editForm, phone: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Email</Label>
        <Input
          value={editForm.email}
          onChange={(e) =>
            setEditForm({ ...editForm, email: e.target.value })
          }
        />
      </div>

      <div className="flex items-center justify-between border rounded-md p-3">
        <span className="text-sm font-medium">Agent Active</span>
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
