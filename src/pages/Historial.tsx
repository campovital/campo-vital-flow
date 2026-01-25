import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Sprout,
  Bug,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

interface Lot {
  id: string;
  name: string;
}

interface DayEvent {
  type: "application" | "harvest" | "pest";
  id: string;
  title: string;
  status?: string;
}

interface DayData {
  [key: string]: DayEvent[];
}

export default function Historial() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLot, setSelectedLot] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dayData, setDayData] = useState<DayData>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<DayEvent[]>([]);

  useEffect(() => {
    fetchLots();
  }, []);

  useEffect(() => {
    fetchMonthData();
  }, [currentMonth, selectedLot]);

  const fetchLots = async () => {
    const { data } = await supabase
      .from("lots")
      .select("id, name")
      .order("name");
    if (data) setLots(data);
  };

  const fetchMonthData = async () => {
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const newDayData: DayData = {};

    // Fetch applications
    let appQuery = supabase
      .from("applications")
      .select("id, device_time, status, protocol_version_id")
      .gte("device_time", start)
      .lte("device_time", end);

    if (selectedLot !== "all") {
      appQuery = appQuery.eq("lot_id", selectedLot);
    }

    const { data: applications } = await appQuery;

    applications?.forEach((app) => {
      const dateKey = format(new Date(app.device_time), "yyyy-MM-dd");
      if (!newDayData[dateKey]) newDayData[dateKey] = [];
      newDayData[dateKey].push({
        type: "application",
        id: app.id,
        title: "Aplicación",
        status: app.status,
      });
    });

    // Fetch harvests
    let harvestQuery = supabase
      .from("harvests")
      .select("id, harvest_date, total_kg")
      .gte("harvest_date", start)
      .lte("harvest_date", end);

    if (selectedLot !== "all") {
      harvestQuery = harvestQuery.eq("lot_id", selectedLot);
    }

    const { data: harvests } = await harvestQuery;

    harvests?.forEach((harvest) => {
      const dateKey = harvest.harvest_date;
      if (!newDayData[dateKey]) newDayData[dateKey] = [];
      newDayData[dateKey].push({
        type: "harvest",
        id: harvest.id,
        title: `Cosecha: ${harvest.total_kg} kg`,
      });
    });

    // Fetch pest reports
    let pestQuery = supabase
      .from("pest_reports")
      .select("id, created_at, pest_type, severity")
      .gte("created_at", start)
      .lte("created_at", end);

    if (selectedLot !== "all") {
      pestQuery = pestQuery.eq("lot_id", selectedLot);
    }

    const { data: pests } = await pestQuery;

    pests?.forEach((pest) => {
      const dateKey = format(new Date(pest.created_at), "yyyy-MM-dd");
      if (!newDayData[dateKey]) newDayData[dateKey] = [];
      newDayData[dateKey].push({
        type: "pest",
        id: pest.id,
        title: `${pest.pest_type} (Sev: ${pest.severity})`,
      });
    });

    setDayData(newDayData);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  // Get offset for first day of month
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7; // Adjust for Monday start

  const handleDayClick = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const events = dayData[dateKey] || [];
    setSelectedDate(day);
    setSelectedEvents(events);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "application":
        return <ClipboardList className="w-4 h-4" />;
      case "harvest":
        return <Sprout className="w-4 h-4" />;
      case "pest":
        return <Bug className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "application":
        return "bg-primary/10 text-primary border-primary/20";
      case "harvest":
        return "bg-success/10 text-success border-success/20";
      case "pest":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-primary" />
              Historial de Actividades
            </h1>
            <p className="text-muted-foreground mt-1">
              Calendario de aplicaciones, cosechas y reportes
            </p>
          </div>
          
          <Select value={selectedLot} onValueChange={setSelectedLot}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos los lotes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los lotes</SelectItem>
              {lots.map((lot) => (
                <SelectItem key={lot.id} value={lot.id}>
                  {lot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Calendar */}
        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-lg capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for offset */}
              {Array.from({ length: startOffset }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}
              
              {/* Days */}
              {days.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const events = dayData[dateKey] || [];
                const hasApplication = events.some((e) => e.type === "application");
                const hasHarvest = events.some((e) => e.type === "harvest");
                const hasPest = events.some((e) => e.type === "pest");

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors relative",
                      isToday(day) && "ring-2 ring-primary",
                      selectedDate && isSameDay(day, selectedDate)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                      !isSameMonth(day, currentMonth) && "text-muted-foreground/50"
                    )}
                  >
                    <span className="font-medium">{format(day, "d")}</span>
                    {events.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {hasApplication && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                        {hasHarvest && (
                          <div className="w-1.5 h-1.5 rounded-full bg-success" />
                        )}
                        {hasPest && (
                          <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Aplicación</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-muted-foreground">Cosecha</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-warning" />
                <span className="text-muted-foreground">Sanitario</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Events */}
        {selectedDate && (
          <Card className="shadow-soft animate-slide-up">
            <CardHeader className="pb-2">
              <CardTitle className="text-base capitalize">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Sin actividades registradas
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        getEventColor(event.type)
                      )}
                    >
                      {getEventIcon(event.type)}
                      <div className="flex-1">
                        <p className="font-medium">{event.title}</p>
                        {event.status && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {event.status.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
