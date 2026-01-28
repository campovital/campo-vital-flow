import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, CheckCircle, Archive, FileText } from "lucide-react";
import { ProtocolStepsEditor } from "./ProtocolStepsEditor";
import { ProtocolComponentsEditor } from "./ProtocolComponentsEditor";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Protocol = Database["public"]["Tables"]["protocols"]["Row"];
type ProtocolVersion = Database["public"]["Tables"]["protocol_versions"]["Row"];
type ProtocolStatus = Database["public"]["Enums"]["protocol_status"];

const STATUS_LABELS: Record<ProtocolStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

const STATUS_COLORS: Record<ProtocolStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/10 text-success",
  archived: "bg-warning/10 text-warning",
};

interface Props {
  protocol: Protocol;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
}

export function ProtocolVersionsManager({ protocol, open, onOpenChange, canManage }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newVersionNotes, setNewVersionNotes] = useState("");
  const [showNewVersionForm, setShowNewVersionForm] = useState(false);

  // Query for versions using React Query
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["protocol-versions", protocol.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_versions")
        .select("*")
        .eq("protocol_id", protocol.id)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data as ProtocolVersion[];
    },
    enabled: open,
  });

  // Create version mutation
  const createVersionMutation = useMutation({
    mutationFn: async () => {
      const nextVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) + 1 : 1;
      const { error } = await supabase.from("protocol_versions").insert({
        protocol_id: protocol.id,
        version_number: nextVersion,
        notes: newVersionNotes.trim() || null,
        status: "draft",
      });
      if (error) throw error;
      return nextVersion;
    },
    onSuccess: (nextVersion) => {
      queryClient.invalidateQueries({ queryKey: ["protocol-versions", protocol.id] });
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-rules"] });
      toast({
        title: "Versión creada",
        description: `Versión ${nextVersion} creada como borrador`,
      });
      setNewVersionNotes("");
      setShowNewVersionForm(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la versión",
        variant: "destructive",
      });
    },
  });

  // Publish version mutation
  const publishMutation = useMutation({
    mutationFn: async (version: ProtocolVersion) => {
      const { error } = await supabase
        .from("protocol_versions")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", version.id);
      if (error) throw error;
      return version;
    },
    onSuccess: (version) => {
      queryClient.invalidateQueries({ queryKey: ["protocol-versions", protocol.id] });
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-rules"] });
      toast({
        title: "Versión publicada",
        description: `Versión ${version.version_number} ahora está activa`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo publicar la versión",
        variant: "destructive",
      });
    },
  });

  // Archive version mutation
  const archiveMutation = useMutation({
    mutationFn: async (version: ProtocolVersion) => {
      const { error } = await supabase
        .from("protocol_versions")
        .update({ status: "archived" })
        .eq("id", version.id);
      if (error) throw error;
      return version;
    },
    onSuccess: (version) => {
      queryClient.invalidateQueries({ queryKey: ["protocol-versions", protocol.id] });
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-rules"] });
      toast({
        title: "Versión archivada",
        description: `Versión ${version.version_number} fue archivada`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo archivar la versión",
        variant: "destructive",
      });
    },
  });

  const isMobile = useIsMobile();
  const isCreating = createVersionMutation.isPending;


  const content = (
    <div className="space-y-4">
      {canManage && (
        <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
          {showNewVersionForm ? (
            <div className="flex flex-col sm:flex-row sm:items-end gap-2 w-full">
              <div className="flex-1 space-y-2">
                <Label>Notas de la versión (opcional)</Label>
                <Textarea
                  placeholder="Cambios en esta versión..."
                  value={newVersionNotes}
                  onChange={(e) => setNewVersionNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => createVersionMutation.mutate()} disabled={isCreating} className="flex-1 sm:flex-none">
                  {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Crear
                </Button>
                <Button variant="outline" onClick={() => setShowNewVersionForm(false)} className="flex-1 sm:flex-none">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowNewVersionForm(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-1" />
              Nueva Versión
            </Button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay versiones. Crea la primera versión para definir pasos y componentes.
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {versions.map((version) => (
            <AccordionItem key={version.id} value={version.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">v{version.version_number}</span>
                  <Badge className={STATUS_COLORS[version.status]}>
                    {STATUS_LABELS[version.status]}
                  </Badge>
                  {version.notes && (
                    <span className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                      {version.notes}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  {canManage && version.status === "draft" && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => publishMutation.mutate(version)} disabled={publishMutation.isPending}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Publicar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => archiveMutation.mutate(version)} disabled={archiveMutation.isPending}>
                        <Archive className="w-4 h-4 mr-1" />
                        Archivar
                      </Button>
                    </div>
                  )}
                  {canManage && version.status === "published" && (
                    <Button size="sm" variant="outline" onClick={() => archiveMutation.mutate(version)} disabled={archiveMutation.isPending}>
                      <Archive className="w-4 h-4 mr-1" />
                      Archivar
                    </Button>
                  )}

                  <ProtocolStepsEditor
                    versionId={version.id}
                    canEdit={canManage && version.status === "draft"}
                  />

                  <ProtocolComponentsEditor
                    versionId={version.id}
                    canEdit={canManage && version.status === "draft"}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[95vh] flex flex-col">
          <DrawerHeader className="flex-shrink-0 border-b pb-4 relative">
            <DrawerTitle className="flex items-center gap-2 pr-8">
              <FileText className="w-5 h-5 text-primary" />
              Versiones de "{protocol.name}"
            </DrawerTitle>
            <DrawerDescription>
              Gestiona las versiones del protocolo
            </DrawerDescription>
            <DrawerClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar</span>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Versiones de "{protocol.name}"
          </DialogTitle>
          <DialogDescription>
            Gestiona las versiones del protocolo con sus pasos y componentes
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
