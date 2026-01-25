import { useEffect, createContext, useContext, ReactNode } from "react";
import { useOverdueAlerts } from "@/hooks/use-overdue-alerts";
import { useAuth } from "@/lib/auth";

interface OverdueAlertsContextType {
  overdueCount: number;
  requestNotificationPermission: () => Promise<boolean>;
  notificationsEnabled: boolean;
  checkOverdueReports: () => Promise<void>;
}

const OverdueAlertsContext = createContext<OverdueAlertsContextType | null>(null);

export function useOverdueAlertsContext() {
  const context = useContext(OverdueAlertsContext);
  if (!context) {
    throw new Error("useOverdueAlertsContext must be used within OverdueAlertsProvider");
  }
  return context;
}

interface OverdueAlertsProviderProps {
  children: ReactNode;
}

export function OverdueAlertsProvider({ children }: OverdueAlertsProviderProps) {
  const { user } = useAuth();
  const { 
    overdueCount, 
    checkOverdueReports, 
    requestNotificationPermission,
    notificationsEnabled 
  } = useOverdueAlerts();

  // Check for overdue reports when user logs in
  useEffect(() => {
    if (user) {
      checkOverdueReports();
    }
  }, [user, checkOverdueReports]);

  return (
    <OverdueAlertsContext.Provider 
      value={{ 
        overdueCount, 
        requestNotificationPermission, 
        notificationsEnabled,
        checkOverdueReports 
      }}
    >
      {children}
    </OverdueAlertsContext.Provider>
  );
}
