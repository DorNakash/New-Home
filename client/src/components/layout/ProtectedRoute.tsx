import { Navigate, Outlet } from "react-router-dom";
import { useMe } from "@/lib/queries/auth";

export function ProtectedRoute() {
  const { data: me, isLoading, isError } = useMe();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">טוען...</div>;
  }

  if (isError || !me) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
