import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2, FlaskConical } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ProtocolComponent = Database["public"]["Tables"]["protocol_components"]["Row"];
type InventoryProduct = Database["public"]["Tables"]["inventory_products"]["Row"];

interface ComponentWithProduct extends ProtocolComponent {
  product?: InventoryProduct;
}

interface Props {
  versionId: string;
  canEdit: boolean;
}

const DOSE_UNITS = ["ml", "L", "g", "kg", "cc"];
const DOSE_BASES = ["bomba", "hectárea", "planta", "litro"];

export function ProtocolComponentsEditor({ versionId, canEdit }: Props) {
  const { toast } = useToast();
  const [components, setComponents] = useState<ComponentWithProduct[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newComponent, setNewComponent] = useState({
    product_id: "",
    dose_amount: 0,
    dose_unit: "ml",
    dose_base: "bomba",
    withdrawal_days: 0,
  });

  useEffect(() => {
    fetchData();
  }, [versionId]);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [componentsRes, productsRes] = await Promise.all([
      supabase
        .from("protocol_components")
        .select("*, product:inventory_products(*)")
        .eq("protocol_version_id", versionId),
      supabase
        .from("inventory_products")
        .select("*")
        .eq("is_active", true)
        .order("name"),
    ]);

    if (componentsRes.error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los componentes",
        variant: "destructive",
      });
    } else {
      setComponents(componentsRes.data || []);
    }

    if (!productsRes.error) {
      setProducts(productsRes.data || []);
    }

    setIsLoading(false);
  };

  const handleAddComponent = async () => {
    if (!newComponent.product_id) {
      toast({
        title: "Error",
        description: "Selecciona un producto",
        variant: "destructive",
      });
      return;
    }

    if (newComponent.dose_amount <= 0) {
      toast({
        title: "Error",
        description: "La dosis debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("protocol_components").insert({
      protocol_version_id: versionId,
      product_id: newComponent.product_id,
      dose_amount: newComponent.dose_amount,
      dose_unit: newComponent.dose_unit,
      dose_base: newComponent.dose_base,
      withdrawal_days: newComponent.withdrawal_days,
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el componente",
        variant: "destructive",
      });
    } else {
      toast({ title: "Componente agregado" });
      setNewComponent({
        product_id: "",
        dose_amount: 0,
        dose_unit: "ml",
        dose_base: "bomba",
        withdrawal_days: 0,
      });
      fetchData();
    }
    setIsSaving(false);
  };

  const handleDeleteComponent = async (componentId: string) => {
    if (!confirm("¿Eliminar este componente?")) return;

    const { error } = await supabase
      .from("protocol_components")
      .delete()
      .eq("id", componentId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el componente",
        variant: "destructive",
      });
    } else {
      toast({ title: "Componente eliminado" });
      fetchData();
    }
  };

  const handleUpdateComponent = async (
    component: ComponentWithProduct,
    updates: Partial<ProtocolComponent>
  ) => {
    const { error } = await supabase
      .from("protocol_components")
      .update(updates)
      .eq("id", component.id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el componente",
        variant: "destructive",
      });
    } else {
      fetchData();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="w-4 h-4" />
          Componentes (Productos y Dosis)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {components.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay componentes definidos</p>
        ) : (
          <div className="space-y-2">
            {components.map((comp) => (
              <div
                key={comp.id}
                className="flex flex-wrap items-center gap-2 p-3 rounded-md border bg-card"
              >
                <div className="flex-1 min-w-[150px]">
                  <span className="font-medium text-sm">
                    {comp.product?.name || "Producto eliminado"}
                  </span>
                  {comp.product?.active_ingredient && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({comp.product.active_ingredient})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {canEdit ? (
                    <>
                      <Input
                        type="number"
                        value={comp.dose_amount}
                        onChange={(e) =>
                          handleUpdateComponent(comp, { dose_amount: parseFloat(e.target.value) || 0 })
                        }
                        className="h-8 w-20 text-sm"
                        min={0}
                        step={0.1}
                      />
                      <Select
                        value={comp.dose_unit}
                        onValueChange={(value) => handleUpdateComponent(comp, { dose_unit: value })}
                      >
                        <SelectTrigger className="h-8 w-16 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOSE_UNITS.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">por</span>
                      <Select
                        value={comp.dose_base}
                        onValueChange={(value) => handleUpdateComponent(comp, { dose_base: value })}
                      >
                        <SelectTrigger className="h-8 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOSE_BASES.map((b) => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : (
                    <span className="text-sm">
                      {comp.dose_amount} {comp.dose_unit} / {comp.dose_base}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {canEdit ? (
                    <>
                      <span className="text-xs text-muted-foreground">PC:</span>
                      <Input
                        type="number"
                        value={comp.withdrawal_days}
                        onChange={(e) =>
                          handleUpdateComponent(comp, { withdrawal_days: parseInt(e.target.value) || 0 })
                        }
                        className="h-8 w-16 text-sm"
                        min={0}
                      />
                      <span className="text-xs text-muted-foreground">días</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      PC: {comp.withdrawal_days} días
                    </span>
                  )}
                </div>

                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteComponent(comp.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {canEdit && (
          <div className="space-y-3 pt-3 border-t">
            <Label className="text-xs font-medium">Agregar componente</Label>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs">Producto</Label>
                <Select
                  value={newComponent.product_id || "__none__"}
                  onValueChange={(value) => {
                    if (value === "__none__") return;
                    const product = products.find(p => p.id === value);
                    setNewComponent({
                      ...newComponent,
                      product_id: value,
                      withdrawal_days: product?.default_withdrawal_days || 0,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.length === 0 ? (
                      <SelectItem value="__none__" disabled>No hay productos</SelectItem>
                    ) : (
                      products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.active_ingredient && `(${p.active_ingredient})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-20">
                <Label className="text-xs">Dosis</Label>
                <Input
                  type="number"
                  value={newComponent.dose_amount || ""}
                  onChange={(e) =>
                    setNewComponent({ ...newComponent, dose_amount: parseFloat(e.target.value) || 0 })
                  }
                  min={0}
                  step={0.1}
                />
              </div>

              <div className="w-20">
                <Label className="text-xs">Unidad</Label>
                <Select
                  value={newComponent.dose_unit}
                  onValueChange={(value) => setNewComponent({ ...newComponent, dose_unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOSE_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-28">
                <Label className="text-xs">Base</Label>
                <Select
                  value={newComponent.dose_base}
                  onValueChange={(value) => setNewComponent({ ...newComponent, dose_base: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOSE_BASES.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-20">
                <Label className="text-xs">PC (días)</Label>
                <Input
                  type="number"
                  value={newComponent.withdrawal_days || ""}
                  onChange={(e) =>
                    setNewComponent({ ...newComponent, withdrawal_days: parseInt(e.target.value) || 0 })
                  }
                  min={0}
                />
              </div>

              <Button onClick={handleAddComponent} disabled={isSaving} size="sm">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
