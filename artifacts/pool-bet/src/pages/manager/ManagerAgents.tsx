import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ManagerAgents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const res = await fetch("/api/manager/agents", {
          credentials: "include",
        });

        const data = await res.json();

        if (Array.isArray(data)) {
          setAgents(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAgents();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          My Agents
        </h1>

        <p className="text-sm text-muted-foreground">
          Agents assigned to you.
        </p>
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
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            )}

            {!isLoading && agents.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No agents assigned to you.
                </TableCell>
              </TableRow>
            )}

            {agents.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  {a.shopName}
                </TableCell>

                <TableCell className="font-mono text-xs">
                  {a.username}
                </TableCell>

                <TableCell>
                  {a.location}
                </TableCell>

                <TableCell className="font-mono text-xs">
                  {a.phone}
                </TableCell>

                <TableCell className="text-xs">
                  {a.email}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
