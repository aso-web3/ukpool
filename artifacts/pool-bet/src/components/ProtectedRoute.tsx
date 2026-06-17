import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useGetMe, AuthUserRole } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: AuthUserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, error } = useGetMe();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !user) {
    setLocation("/login");
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === "admin") setLocation("/admin");
    else if (user.role === "agent") setLocation("/agent");
    else if (user.role === "cashier") setLocation("/cashier");
    else setLocation("/");
    return null;
  }

  return <>{children}</>;
}
