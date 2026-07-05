import { Card } from "@/components/ui/card";

export default function AdminReports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Financial Reports
        </h1>

        <p className="text-sm text-muted-foreground">
          Financial reports are calculated from valid settled tickets only.
        </p>
      </div>

      <Card className="p-6">
        <p className="text-muted-foreground">
          Reports module coming next...
        </p>
      </Card>
    </div>
  );
}
