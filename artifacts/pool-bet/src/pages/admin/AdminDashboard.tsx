import { useGetAdminStats } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Users, FileText, Calendar, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/format";

function Stat({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint?: string; icon: any }) {
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useGetAdminStats();
  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!data) return <div className="text-muted-foreground">No data</div>;
  const w = data.activeWeek;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin overview</h1>
          <p className="text-sm text-muted-foreground">Network at a glance.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Agents" value={data.agents} icon={Users} />
        <Stat label="Cashiers" value={data.cashiers} icon={Users} />
        <Stat label="Pending applications" value={data.pendingApplications} icon={FileText} />
        <Stat label="Active week" value={w ? `#${w.weekNumber}` : "—"} hint={w?.status?.toUpperCase()} icon={Calendar} />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 space-y-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">This week's performance</h2>
            {w && (
              <Badge variant="outline" className="border-primary/30 text-primary">Week {w.weekNumber}</Badge>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Tickets</div>
              <div className="text-2xl font-bold tabular-nums mt-1 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-muted-foreground" />
                {data.weekTickets}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Stake</div>
              <div className="text-2xl font-bold tabular-nums mt-1">{formatCurrency(data.weekStake)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Payout</div>
              <div className="text-2xl font-bold tabular-nums mt-1">{formatCurrency(data.weekPayout)}</div>
            </div>
          </div>
        </Card>
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Quick actions</h2>
          <div className="space-y-2 text-sm">
            <Link href="/admin/applications" className="block hover:text-primary">→ Review applications ({data.pendingApplications} pending)</Link>
            <Link href="/admin/weeks" className="block hover:text-primary">→ Manage pool weeks</Link>
            <Link href="/admin/agents" className="block hover:text-primary">→ Manage agents</Link>
            {w && <Link href={`/admin/weeks/${w.id}`} className="block hover:text-primary">→ Open week #{w.weekNumber}</Link>}
          </div>
        </Card>
      </div>
    </div>
  );
}
