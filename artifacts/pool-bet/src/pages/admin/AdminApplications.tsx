import { useState } from "react";
import {
  useListAgentApplications,
  useApproveAgentApplication,
  useRejectAgentApplication,
  getListAgentApplicationsQueryKey,
  getListAgentsQueryKey,
  getGetAdminStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export default function AdminApplications() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const queryClient = useQueryClient();
  const { data: apps, isLoading } = useListAgentApplications({ status });
  const approve = useApproveAgentApplication();
  const reject = useRejectAgentApplication();

  const [approving, setApproving] = useState<{ id: number; shop: string } | null>(null);
  const [credentials, setCredentials] = useState({ username: "", password: "" });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListAgentApplicationsQueryKey({ status }) });
    queryClient.invalidateQueries({ queryKey: getListAgentApplicationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
  };

  const onApprove = () => {
    if (!approving) return;
    if (!credentials.username || !credentials.password) {
      toast.error("Username and password required");
      return;
    }
    approve.mutate(
      { id: approving.id, data: credentials },
      {
        onSuccess: () => {
          toast.success(`Approved ${approving.shop}`);
          setApproving(null);
          setCredentials({ username: "", password: "" });
          invalidate();
        },
        onError: (e: any) => toast.error(e?.message ?? "Failed to approve"),
      }
    );
  };

  const onReject = (id: number, shop: string) => {
    reject.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success(`Rejected ${shop}`);
          invalidate();
        },
        onError: () => toast.error("Failed to reject"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agent applications</h1>
        <p className="text-sm text-muted-foreground">Review applications submitted via the public site.</p>
      </div>
      <Tabs value={status} onValueChange={(v) => setStatus(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
            )}
            {!isLoading && (!apps || apps.length === 0) && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No applications</TableCell></TableRow>
            )}
            {apps?.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.shopName}</TableCell>
                <TableCell>{a.location}</TableCell>
                <TableCell className="font-mono text-xs">{a.phone}</TableCell>
                <TableCell className="text-xs">{a.email}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    a.status === "approved" ? "border-primary/40 text-primary" :
                    a.status === "rejected" ? "border-destructive/40 text-destructive" :
                    "border-muted-foreground/40 text-muted-foreground"
                  }>{a.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {a.status === "pending" && (
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" onClick={() => setApproving({ id: a.id, shop: a.shopName })}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => onReject(a.id, a.shopName)}>Reject</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!approving} onOpenChange={(o) => !o && setApproving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve "{approving?.shop}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Set login credentials for this agent. They will use these to access their dashboard.</p>
            <div>
              <Label htmlFor="ap-username">Username</Label>
              <Input id="ap-username" value={credentials.username} onChange={(e) => setCredentials({ ...credentials, username: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ap-password">Password</Label>
              <Input id="ap-password" type="text" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproving(null)}>Cancel</Button>
            <Button onClick={onApprove} disabled={approve.isPending}>{approve.isPending ? "Approving..." : "Approve & create agent"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
