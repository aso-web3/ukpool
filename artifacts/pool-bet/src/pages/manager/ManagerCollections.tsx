import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ManagerCollections() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [weekId, setWeekId] = useState<number | undefined>();
const [agents, setAgents] = useState<any[]>([]);
const [agentId, setAgentId] = useState<number | undefined>();
const [open, setOpen] = useState(false);
const [selectedAgent, setSelectedAgent] = useState<any>(null);
const [historyOpen, setHistoryOpen] = useState(false);
const [historyRows, setHistoryRows] = useState<any[]>([]);

const [form, setForm] = useState({
  cashAmount: "",
  transferAmount: "",
  note: "",
});

useEffect(() => {
  fetch("/api/public/weeks")
    .then((r) => r.json())
    .then((d) => {
      if (Array.isArray(d)) {
        setWeeks(d);

        const currentWeek =
          d.find((w: any) => w.status === "open") ??
          d[d.length - 1];

        if (currentWeek) {
          setWeekId(currentWeek.id);
        }
      }
    })
    .catch(() => setWeeks([]));
}, []);

useEffect(() => {
  fetch("/api/manager/agents", {
    credentials: "include",
  })
    .then((r) => r.json())
    .then((d) => {
      setAgents(Array.isArray(d) ? d : []);
    })
    .catch(() => setAgents([]));
}, []);

  useEffect(() => {
    fetch(
  `/api/manager/collections?${new URLSearchParams({
    ...(weekId
      ? { weekId: String(weekId) }
      : {}),
    ...(agentId
      ? { agentId: String(agentId) }
      : {}),
  }).toString()}`,
  {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        setRows(Array.isArray(d) ? d : []);
      })
      .finally(() => setLoading(false));
  }, [weekId, agentId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Collections
        </h1>

        <p className="text-sm text-muted-foreground">
          Agent sales and collections.
        </p>
<div className="mt-4 flex gap-3">
  <select
    className="border rounded-md px-3 py-2"
    value={weekId ?? ""}
    onChange={(e) =>
  setWeekId(
    e.target.value
      ? Number(e.target.value)
      : undefined
  )
}
  >
    <option value="">
      All Weeks
    </option>
    {weeks.map((w) => (
      <option
        key={w.id}
        value={w.id}
      >
        {w.season}/{w.season + 1} - Week {w.weekNumber}
      </option>
    ))}
  </select>

<select
  className="border rounded-md px-3 py-2"
  value={agentId ?? ""}
  onChange={(e) =>
    setAgentId(
      e.target.value
        ? Number(e.target.value)
        : undefined
    )
  }
>
  <option value="">
    All Agents
  </option>

  {agents.map((agent) => (
    <option
      key={agent.id}
      value={agent.id}
    >
      {agent.shopName}
    </option>
  ))}
</select>
</div>
      </div>

      <Card className="p-4">
        {loading && (
          <div className="text-center py-8">
            Loading...
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="text-center py-8">
            No collection data
          </div>
        )}

        {!loading && rows.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3">
                  Agent
                </th>

                <th className="text-right py-3">
                  Total Sales
                </th>

                <th className="text-right py-3">
  Cash
</th>

<th className="text-right py-3">
  Transfer
</th>

<th className="text-right py-3">
  Collected
</th>

<th className="text-right py-3">
  Balance
</th>

<th className="text-center py-3">
  Status
</th>

<th className="text-center py-3">
  Action
</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.agentId}
                  className="border-b"
                >
                  <td className="py-3">
                    {row.shopName}
                  </td>

                  <td className="text-right">
                    {formatCurrency(
                      row.totalSales
                    )}
                  </td>

<td className="text-right">
  {formatCurrency(
    row.cashCollected
  )}
</td>

<td className="text-right">
  {formatCurrency(
    row.transferCollected
  )}
</td>

<td className="text-right">
  {formatCurrency(
    row.totalCollected
  )}
</td>

<td className="text-right font-bold">
  {formatCurrency(
    row.balance
  )}
</td>

<td className="text-center">
  {row.balance > 0
    ? "Owing"
    : row.balance < 0
    ? "Credit"
    : "Settled"}
</td>

<td className="text-center">
  <div className="flex gap-2 justify-center">
    <Button
      size="sm"
      onClick={() => {
        setSelectedAgent(row);
        setOpen(true);
      }}
    >
      Record
    </Button>

    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        const res = await fetch(
          `/api/manager/collections/history?agentId=${row.agentId}`,
          {
            credentials: "include",
          }
        );

        const data = await res.json();

        setSelectedAgent(row);
        setHistoryRows(
          Array.isArray(data) ? data : []
        );
        setHistoryOpen(true);
      }}
    >
      History
    </Button>
  </div>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

<Dialog
  open={historyOpen}
  onOpenChange={setHistoryOpen}
>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>
        Collection History - {selectedAgent?.shopName}
      </DialogTitle>
    </DialogHeader>

    <div className="max-h-[400px] overflow-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">
              Date
            </th>

	    <th className="text-center py-2">
              Week
	    </th>

            <th className="text-right py-2">
              Cash
            </th>

            <th className="text-right py-2">
              Transfer
            </th>

            <th className="text-left py-2">
              Note
            </th>
          </tr>
        </thead>

        <tbody>
          {historyRows.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="text-center py-6"
              >
                No history found
              </td>
            </tr>
          )}

          {historyRows.map((row) => (
            <tr
              key={row.id}
              className="border-b"
            >
              <td className="py-2">
                {new Date(
                  row.createdAt
                ).toLocaleDateString()}
              </td>

              <td className="text-center">
                {row.weekNumber}
              </td>

              <td className="text-right">
                {formatCurrency(
                  row.cashAmount
                )}
              </td>

              <td className="text-right">
                {formatCurrency(
                  row.transferAmount
                )}
              </td>

              <td>
                {row.note ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </DialogContent>
</Dialog>

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        Record Collection
      </DialogTitle>
    </DialogHeader>

    <div className="space-y-4">

      <div>
        <Label>Agent</Label>
        <Input
          value={selectedAgent?.shopName ?? ""}
          disabled
        />
      </div>

      <div>
        <Label>Cash Amount</Label>
        <Input
          type="number"
          value={form.cashAmount}
          onChange={(e) =>
            setForm({
              ...form,
              cashAmount: e.target.value,
            })
          }
        />
      </div>

      <div>
        <Label>Transfer Amount</Label>
        <Input
          type="number"
          value={form.transferAmount}
          onChange={(e) =>
            setForm({
              ...form,
              transferAmount: e.target.value,
            })
          }
        />
      </div>

      <div>
        <Label>Note</Label>
        <Input
          value={form.note}
          onChange={(e) =>
            setForm({
              ...form,
              note: e.target.value,
            })
          }
        />
      </div>

    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>

      <Button
        onClick={async () => {
          const res = await fetch(
            "/api/manager/collections",
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                weekId,
                agentId:
                  selectedAgent?.agentId,
                cashAmount:
                  Number(form.cashAmount || 0),
                transferAmount:
                  Number(form.transferAmount || 0),
                note: form.note,
              }),
            }
          );

          if (!res.ok) {
            toast.error("Failed");
            return;
          }

          toast.success("Collection saved");

setOpen(false);

setForm({
  cashAmount: "",
  transferAmount: "",
  note: "",
});

fetch(
  `/api/manager/collections?${new URLSearchParams({
    ...(weekId && {
      weekId: String(weekId),
    }),
    ...(agentId && {
      agentId: String(agentId),
    }),
  }).toString()}`,
  {
    credentials: "include",
  }
)
  .then((r) => r.json())
  .then((d) => {
    setRows(Array.isArray(d) ? d : []);
  });
        }}
      >
        Save Collection
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
}
