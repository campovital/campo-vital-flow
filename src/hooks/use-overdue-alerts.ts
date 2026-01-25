import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OverdueReport {
  id: string;
  pest_type: string;
  severity: number;
  follow_up_date: string;
  lot_name: string | null;
}

interface UseOverdueAlertsReturn {
  overdueReports: OverdueReport[];
  overdueCount: number;
  loading: boolean;
  checkOverdueReports: () => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  notificationsEnabled: boolean;
}

export function useOverdueAlerts(): UseOverdueAlertsReturn {
  const { toast } = useToast();
  const [overdueReports, setOverdueReports] = useState<OverdueReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hasShownInitialAlert, setHasShownInitialAlert] = useState(false);

  // Check if browser notifications are supported and enabled
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast({
        title: "No soportado",
        description: "Tu navegador no soporta notificaciones push",
        variant: "destructive",
      });
      return false;
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      setNotificationsEnabled(granted);
      
      if (granted) {
        toast({
          title: "Notificaciones activadas",
          description: "Recibirás alertas de reportes vencidos",
        });
      }
      
      return granted;
    }

    toast({
      title: "Permisos denegados",
      description: "Activa las notificaciones en la configuración de tu navegador",
      variant: "destructive",
    });
    return false;
  }, [toast]);

  // Show browser notification
  const showBrowserNotification = useCallback((reports: OverdueReport[]) => {
    if (!notificationsEnabled || reports.length === 0) return;

    const title = `${reports.length} reporte${reports.length > 1 ? 's' : ''} sanitario${reports.length > 1 ? 's' : ''} vencido${reports.length > 1 ? 's' : ''}`;
    const body = reports.length === 1
      ? `${reports[0].pest_type} en ${reports[0].lot_name || 'lote desconocido'}`
      : `Tipos: ${reports.slice(0, 3).map(r => r.pest_type).join(', ')}${reports.length > 3 ? '...' : ''}`;

    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "overdue-pest-reports",
        requireInteraction: true,
      });
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  }, [notificationsEnabled]);

  // Check for overdue reports
  const checkOverdueReports = useCallback(async () => {
    setLoading(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("pest_reports")
        .select(`
          id,
          pest_type,
          severity,
          follow_up_date,
          lot:lots(name)
        `)
        .neq("status", "resuelto")
        .lt("follow_up_date", today)
        .order("follow_up_date", { ascending: true });

      if (error) {
        console.error("Error fetching overdue reports:", error);
        return;
      }

      const reports: OverdueReport[] = (data || []).map((r: any) => ({
        id: r.id,
        pest_type: r.pest_type,
        severity: r.severity,
        follow_up_date: r.follow_up_date,
        lot_name: r.lot?.name || null,
      }));

      setOverdueReports(reports);

      // Show alerts only on first check (login)
      if (!hasShownInitialAlert && reports.length > 0) {
        setHasShownInitialAlert(true);
        
        // Show toast notification
        toast({
          title: `⚠️ ${reports.length} reporte${reports.length > 1 ? 's' : ''} vencido${reports.length > 1 ? 's' : ''}`,
          description: "Hay reportes sanitarios que requieren atención inmediata",
          variant: "destructive",
        });

        // Show browser notification if enabled
        showBrowserNotification(reports);
      }
    } catch (error) {
      console.error("Error checking overdue reports:", error);
    } finally {
      setLoading(false);
    }
  }, [toast, showBrowserNotification, hasShownInitialAlert]);

  return {
    overdueReports,
    overdueCount: overdueReports.length,
    loading,
    checkOverdueReports,
    requestNotificationPermission,
    notificationsEnabled,
  };
}
