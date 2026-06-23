import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout, AuthUserRole } from "@workspace/api-client-react";
import { LogOut, Home, Users, FileText, Calendar, LayoutDashboard, Receipt, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const logout = useLogout();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/");
      }
    });
  };

const handleChangePassword = async () => {
  if (!currentPassword || !newPassword) {
    toast.error("Fill all password fields");
    return;
  }

  try {
    setChangingPassword(true);

    const res = await fetch("/api/me/change-password", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || "Failed to change password");
      return;
    }

    toast.success("Password changed successfully");
    setShowPasswordDialog(false);
    setCurrentPassword("");
    setNewPassword("");
  } catch {
    toast.error("Something went wrong");
  } finally {
    setChangingPassword(false);
  }
};

  if (!user) return <>{children}</>;

  const navItems = getNavItems(user.role);

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
      <aside className="w-64 flex-col border-r border-border bg-sidebar print:hidden hidden md:flex">
        <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
          <Link href={`/${user.role}`} className="flex items-center gap-2 font-bold text-lg tracking-tight text-sidebar-primary">
            DiamondPool <span className="text-sidebar-foreground">49</span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-auto py-4">
          <nav className="flex flex-col gap-1 px-2">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  location === item.href || location.startsWith(item.href + '/')
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border space-y-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-foreground">{user.name || user.username}</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-sidebar-foreground/50 truncate max-w-[120px]">{user.shopName || "HQ"}</span>
              <Badge variant="outline" className="text-[10px] uppercase bg-sidebar-primary/10 text-sidebar-primary border-sidebar-primary/20">
                {user.role}
              </Badge>
            </div>
          </div>
          <Button
  variant="outline"
  size="sm"
  className="w-full justify-start text-muted-foreground"
  onClick={() => setShowPasswordDialog(true)}
>
  Change Password
</Button>

<Button
  variant="outline"
  size="sm"
  className="w-full justify-start text-muted-foreground"
  onClick={handleLogout}
>
  <LogOut className="mr-2 h-4 w-4" />
  Sign Out
</Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-4 md:hidden print:hidden">
          <Link href={`/${user.role}`} className="font-bold text-lg text-primary mr-auto">
            DiamondPool 49
          </Link>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6 print:p-0 print:overflow-visible">
          {children}
        </div>
      </main>
<Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Change Password</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <Input
        type="password"
        placeholder="Current password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />

      <Input
        type="password"
        placeholder="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />

      <Button
        className="w-full"
        onClick={handleChangePassword}
        disabled={changingPassword}
      >
        {changingPassword ? "Changing..." : "Update Password"}
      </Button>
    </div>
  </DialogContent>
</Dialog>
    </div>
  );
}

function getNavItems(role: AuthUserRole) {
  switch (role) {
    case "admin":
      return [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/applications", label: "Applications", icon: FileText },
        { href: "/admin/agents", label: "Agents", icon: Users },
	{ href: "/admin/managers", label: "Managers", icon: Users },
        { href: "/admin/weeks", label: "Pool Weeks", icon: Calendar },
	{ href: "/admin/tickets", label: "Tickets", icon: Ticket },
      ];
    case "agent":
      return [
        { href: "/agent", label: "Dashboard", icon: LayoutDashboard },
        { href: "/agent/cashiers", label: "Cashiers", icon: Users },
        { href: "/agent/tickets", label: "Tickets", icon: Receipt },
      ];
    case "cashier":
      return [
        { href: "/cashier", label: "Sell tickets", icon: Home },
        { href: "/cashier/tickets", label: "My tickets", icon: Receipt },
      ];
    default:
      return [];
  }
}
