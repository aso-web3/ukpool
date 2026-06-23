import { Card } from "@/components/ui/card";

export default function ManagerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Manager Dashboard
        </h1>

        <p className="text-sm text-muted-foreground">
          Welcome to the manager portal.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-2">
          Manager Area
        </h2>

        <p className="text-muted-foreground">
          Manager features are being configured.
        </p>
      </Card>
    </div>
  );
}
