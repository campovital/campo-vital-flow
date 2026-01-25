import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { PestReportStatusBadge } from "./PestReportStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { History, ArrowRight, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type PestReportStatus = "pendiente" | "en_tratamiento" | "resuelto";

interface StatusHistoryEntry {
  id: string;
  previous_status: PestReportStatus | null;
  new_status: PestReportStatus;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
  profile?: {
    full_name: string;
  } | null;
}

interface StatusHistoryDialogProps {
  reportId: string;
  pestType: string;
}

export function StatusHistoryDialog({ reportId, pestType }: StatusHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, reportId]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pest_report_status_history")
      .select(`
        id,
        previous_status,
        new_status,
        changed_by,
        changed_at,
        notes,
        profile:profiles!pest_report_status_history_changed_by_fkey(full_name)
      `)
      .eq("pest_report_id", reportId)
      .order("changed_at", { ascending: false });

    if (!error && data) {
      setHistory(data as unknown as StatusHistoryEntry[]);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <History className="w-3.5 h-3.5" />
          <span className="text-xs">Historial</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de {pestType}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="space-y-4 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Sin historial de cambios</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-0">
              {/* Timeline line */}
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
              
              {history.map((entry, index) => (
                <div key={entry.id} className="relative pb-6 last:pb-0">
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute -left-4 w-3 h-3 rounded-full border-2 bg-background",
                    index === 0 ? "border-primary" : "border-muted-foreground/30"
                  )} />
                  
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    {/* Status change */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.previous_status ? (
                        <>
                          <PestReportStatusBadge status={entry.previous_status} />
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground mr-1">Creado como</span>
                      )}
                      <PestReportStatusBadge status={entry.new_status} />
                    </div>
                    
                    {/* Metadata */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(entry.changed_at), "d MMM yyyy, HH:mm", { locale: es })}
                      </span>
                      {entry.profile?.full_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {entry.profile.full_name}
                        </span>
                      )}
                    </div>
                    
                    {/* Notes */}
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground italic">
                        "{entry.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
