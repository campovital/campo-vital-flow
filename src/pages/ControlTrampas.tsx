import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrapsPendingView } from "@/components/traps/TrapsPendingView";
import { TrapsRegisterActivity } from "@/components/traps/TrapsRegisterActivity";
import { TrapsHistoryView } from "@/components/traps/TrapsHistoryView";
import { TrapsManageView } from "@/components/traps/TrapsManageView";
import { AlertTriangle, ClipboardList, History, Settings2 } from "lucide-react";

export default function ControlTrampas() {
  const [activeTab, setActiveTab] = useState("pendientes");

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Control de Trampas</h1>
            <p className="text-sm text-muted-foreground">Monitoreo y seguimiento de trampas en campo</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pendientes" className="text-xs sm:text-sm gap-1">
              <AlertTriangle className="w-3.5 h-3.5 hidden sm:block" />
              Pendientes
            </TabsTrigger>
            <TabsTrigger value="registrar" className="text-xs sm:text-sm gap-1">
              <ClipboardList className="w-3.5 h-3.5 hidden sm:block" />
              Registrar
            </TabsTrigger>
            <TabsTrigger value="historial" className="text-xs sm:text-sm gap-1">
              <History className="w-3.5 h-3.5 hidden sm:block" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="gestionar" className="text-xs sm:text-sm gap-1">
              <Settings2 className="w-3.5 h-3.5 hidden sm:block" />
              Gestionar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendientes">
            <TrapsPendingView onRegister={(trapId) => { setActiveTab("registrar"); }} />
          </TabsContent>
          <TabsContent value="registrar">
            <TrapsRegisterActivity />
          </TabsContent>
          <TabsContent value="historial">
            <TrapsHistoryView />
          </TabsContent>
          <TabsContent value="gestionar">
            <TrapsManageView />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
