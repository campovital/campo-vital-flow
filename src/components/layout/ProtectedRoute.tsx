import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { usePermissions, type AppModule } from "@/hooks/use-permissions";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  module?: AppModule;
  requireManage?: boolean;
}

export function ProtectedRoute({ children, module, requireManage }: ProtectedRouteProps) {
  const { user, isLoading: authLoading, canManage, isOfflineMode } = useAuth();
  const { canView, isLoading: permLoading } = usePermissions();

  if (authLoading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isOfflineMode) {
    return <Navigate to="/auth" replace />;
  }

  if (requireManage && !canManage) {
    return <Navigate to="/" replace />;
  }

  if (module && !canView(module)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
