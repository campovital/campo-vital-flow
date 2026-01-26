import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Product {
  id: string;
  name: string;
  unit: string;
  category: string | null;
  current_price?: number;
}

interface PriceHistoryEntry {
  id: string;
  unit_price: number;
  effective_date: string;
  notes: string | null;
  created_at: string;
}

interface ProductPriceHistoryProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductPriceHistory({ product, open, onOpenChange }: ProductPriceHistoryProps) {
  const { toast } = useToast();
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && product) {
      fetchHistory();
    }
  }, [open, product]);

  const fetchHistory = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("product_price_history")
      .select("*")
      .eq("product_id", product.id)
      .order("effective_date", { ascending: false });

    if (data) {
      setHistory(data);
    }
    setIsLoading(false);
  };

  const handleAddPrice = async () => {
    if (!newPrice || parseFloat(newPrice) <= 0) {
      toast({
        title: "Error",
        description: "Ingrese un precio válido",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.from("product_price_history").insert({
      product_id: product.id,
      unit_price: parseFloat(newPrice),
      effective_date: effectiveDate,
      notes: notes || null,
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el precio",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Precio registrado",
        description: `Nuevo precio de ${formatCurrency(parseFloat(newPrice))} efectivo desde ${effectiveDate}`,
      });
      setNewPrice("");
      setNotes("");
      setShowAddForm(false);
      fetchHistory();
    }
    setIsSaving(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPriceChange = (current: number, previous: number | null) => {
    if (!previous) return null;
    const change = ((current - previous) / previous) * 100;
    return change;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Historial de Precios - {product.name}
            <Badge variant="outline">{product.unit}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Price Form */}
          {showAddForm ? (
            <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
              <h4 className="font-medium">Nuevo Precio</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Precio por {product.unit}</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="Ej: 25000"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Fecha efectiva</Label>
                  <Input
                    id="date"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Ej: Actualización por nuevo proveedor"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddPrice} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Nuevo Precio
            </Button>
          )}

          {/* Price History Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay historial de precios para este producto
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Efectiva</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Cambio</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry, index) => {
                  const previousPrice = history[index + 1]?.unit_price || null;
                  const priceChange = getPriceChange(entry.unit_price, previousPrice);
                  
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(new Date(entry.effective_date), "dd MMM yyyy", { locale: es })}
                        {index === 0 && (
                          <Badge variant="default" className="ml-2">
                            Actual
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(entry.unit_price)}
                      </TableCell>
                      <TableCell>
                        {priceChange !== null && (
                          <div className="flex items-center gap-1">
                            {priceChange > 0 ? (
                              <>
                                <TrendingUp className="w-4 h-4 text-destructive" />
                                <span className="text-destructive">
                                  +{priceChange.toFixed(1)}%
                                </span>
                              </>
                            ) : priceChange < 0 ? (
                              <>
                                <TrendingDown className="w-4 h-4 text-success" />
                                <span className="text-success">
                                  {priceChange.toFixed(1)}%
                                </span>
                              </>
                            ) : (
                              <>
                                <Minus className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">0%</span>
                              </>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.notes || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
