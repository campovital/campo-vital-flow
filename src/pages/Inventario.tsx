import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Package, Loader2, Boxes, ChevronDown, ChevronRight } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type InventoryProduct = Database["public"]["Tables"]["inventory_products"]["Row"];
type InventoryBatch = Database["public"]["Tables"]["inventory_batches"]["Row"] & {
  product?: { name: string } | null;
};

const CATEGORY_OPTIONS = [
  { value: "fungicida", label: "Fungicida" },
  { value: "insecticida", label: "Insecticida" },
  { value: "fertilizante", label: "Fertilizante" },
  { value: "herbicida", label: "Herbicida" },
  { value: "bioestimulante", label: "Bioestimulante" },
  { value: "coadyuvante", label: "Coadyuvante" },
  { value: "otro", label: "Otro" },
];

const UNIT_OPTIONS = ["L", "kg", "ml", "g", "unidad"];

export default function Inventario() {
  const { toast } = useToast();
  const { canManage } = useAuth();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [editingBatch, setEditingBatch] = useState<InventoryBatch | null>(null);

  const [productForm, setProductForm] = useState({
    name: "",
    category: "",
    unit: "L",
    active_ingredient: "",
    default_withdrawal_days: 0,
    is_active: true,
    ingrediente_activo: "",
    concentracion: "",
    registro_ica: "",
    categoria_toxicologica: "",
    titular_registro: "",
    numero_lote: "",
    contenido_neto: "",
    fecha_vencimiento: "",
  });
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  const [batchForm, setBatchForm] = useState({
    product_id: "",
    batch_number: "",
    quantity: 0,
    unit_cost: 0,
    supplier: "",
    purchase_date: "",
    expiry_date: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchProducts(), fetchBatches()]);
    setIsLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("inventory_products")
      .select("*")
      .order("name");

    if (!error) setProducts(data || []);
  };

  const fetchBatches = async () => {
    const { data, error } = await supabase
      .from("inventory_batches")
      .select("*, product:inventory_products(name)")
      .order("expiry_date");

    if (!error) setBatches(data || []);
  };

  // Product handlers
  const handleOpenProductDialog = (product?: InventoryProduct) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        category: product.category || "",
        unit: product.unit,
        active_ingredient: product.active_ingredient || "",
        default_withdrawal_days: product.default_withdrawal_days || 0,
        is_active: product.is_active ?? true,
        ingrediente_activo: (product as any).ingrediente_activo || "",
        concentracion: (product as any).concentracion || "",
        registro_ica: (product as any).registro_ica || "",
        categoria_toxicologica: (product as any).categoria_toxicologica || "",
        titular_registro: (product as any).titular_registro || "",
        numero_lote: (product as any).numero_lote || "",
        contenido_neto: (product as any).contenido_neto || "",
        fecha_vencimiento: (product as any).fecha_vencimiento || "",
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: "",
        category: "",
        unit: "L",
        active_ingredient: "",
        default_withdrawal_days: 0,
        is_active: true,
        ingrediente_activo: "",
        concentracion: "",
        registro_ica: "",
        categoria_toxicologica: "",
        titular_registro: "",
        numero_lote: "",
        contenido_neto: "",
        fecha_vencimiento: "",
      });
    }
    setProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) {
      toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    const payload = {
      name: productForm.name.trim(),
      category: productForm.category || null,
      unit: productForm.unit,
      active_ingredient: productForm.active_ingredient.trim() || null,
      default_withdrawal_days: productForm.default_withdrawal_days,
      is_active: productForm.is_active,
      ingrediente_activo: productForm.ingrediente_activo.trim() || null,
      concentracion: productForm.concentracion.trim() || null,
      registro_ica: productForm.registro_ica.trim() || null,
      categoria_toxicologica: productForm.categoria_toxicologica.trim() || null,
      titular_registro: productForm.titular_registro.trim() || null,
      numero_lote: productForm.numero_lote.trim() || null,
      contenido_neto: productForm.contenido_neto.trim() || null,
      fecha_vencimiento: productForm.fecha_vencimiento || null,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("inventory_products")
        .update(payload)
        .eq("id", editingProduct.id);

      if (error) {
        toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
      } else {
        toast({ title: "Producto actualizado", description: `"${productForm.name}" actualizado` });
        setProductDialogOpen(false);
        fetchProducts();
      }
    } else {
      const { error } = await supabase.from("inventory_products").insert(payload);

      if (error) {
        toast({ title: "Error", description: "No se pudo crear el producto", variant: "destructive" });
      } else {
        toast({ title: "Producto creado", description: `"${productForm.name}" agregado al inventario` });
        setProductDialogOpen(false);
        fetchProducts();
      }
    }

    setIsSaving(false);
  };

  const handleDeleteProduct = async (product: InventoryProduct) => {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;

    const { error } = await supabase.from("inventory_products").delete().eq("id", product.id);

    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar. Puede tener lotes asociados.", variant: "destructive" });
    } else {
      toast({ title: "Producto eliminado" });
      fetchProducts();
    }
  };

  // Batch handlers
  const handleOpenBatchDialog = (batch?: InventoryBatch) => {
    if (batch) {
      setEditingBatch(batch);
      setBatchForm({
        product_id: batch.product_id,
        batch_number: batch.batch_number || "",
        quantity: batch.quantity,
        unit_cost: batch.unit_cost || 0,
        supplier: batch.supplier || "",
        purchase_date: batch.purchase_date || "",
        expiry_date: batch.expiry_date || "",
      });
    } else {
      setEditingBatch(null);
      setBatchForm({
        product_id: "",
        batch_number: "",
        quantity: 0,
        unit_cost: 0,
        supplier: "",
        purchase_date: "",
        expiry_date: "",
      });
    }
    setBatchDialogOpen(true);
  };

  const handleSaveBatch = async () => {
    if (!batchForm.product_id) {
      toast({ title: "Error", description: "Selecciona un producto", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    const payload = {
      product_id: batchForm.product_id,
      batch_number: batchForm.batch_number.trim() || null,
      quantity: batchForm.quantity,
      unit_cost: batchForm.unit_cost || null,
      supplier: batchForm.supplier.trim() || null,
      purchase_date: batchForm.purchase_date || null,
      expiry_date: batchForm.expiry_date || null,
    };

    if (editingBatch) {
      const { error } = await supabase
        .from("inventory_batches")
        .update(payload)
        .eq("id", editingBatch.id);

      if (error) {
        toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
      } else {
        toast({ title: "Lote actualizado" });
        setBatchDialogOpen(false);
        fetchBatches();
      }
    } else {
      const { error } = await supabase.from("inventory_batches").insert(payload);

      if (error) {
        toast({ title: "Error", description: "No se pudo crear el lote", variant: "destructive" });
      } else {
        toast({ title: "Lote registrado" });
        setBatchDialogOpen(false);
        fetchBatches();
      }
    }

    setIsSaving(false);
  };

  const handleDeleteBatch = async (batch: InventoryBatch) => {
    if (!confirm("¿Eliminar este lote?")) return;

    const { error } = await supabase.from("inventory_batches").delete().eq("id", batch.id);

    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    } else {
      toast({ title: "Lote eliminado" });
      fetchBatches();
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <AppLayout>
      <section className="space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-6 h-6 text-terracotta" />
              Inventario
            </h1>
            <p className="text-muted-foreground mt-1">
              Productos y lotes de insumos agrícolas
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver
            </Link>
          </Button>
        </header>

        <Tabs defaultValue="products" className="w-full">
          <TabsList>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Productos
            </TabsTrigger>
            <TabsTrigger value="batches" className="flex items-center gap-2">
              <Boxes className="w-4 h-4" />
              Lotes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Card className="border-0 shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Productos</CardTitle>
                  <CardDescription>{products.length} producto(s)</CardDescription>
                </div>
                {canManage && (
                  <Button onClick={() => handleOpenProductDialog()}>
                    <Plus className="w-4 h-4 mr-1" />
                    Nuevo Producto
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay productos registrados
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead>Días Carencia</TableHead>
                        <TableHead>Estado</TableHead>
                        {canManage && <TableHead className="w-24">Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => {
                        const p = product as any;
                        const hasDetails = p.ingrediente_activo || p.concentracion || p.registro_ica || p.categoria_toxicologica || p.titular_registro || p.numero_lote || p.contenido_neto || p.fecha_vencimiento;
                        const isExpanded = expandedProductId === product.id;
                        return (
                          <>
                            <TableRow key={product.id}>
                              <TableCell className="p-1">
                                {hasDetails && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                                    aria-label={isExpanded ? "Colapsar" : "Ver detalles"}
                                  >
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>{product.category || "-"}</TableCell>
                              <TableCell>{product.unit}</TableCell>
                              <TableCell>{product.default_withdrawal_days || 0}</TableCell>
                              <TableCell>
                                <Badge variant={product.is_active ? "default" : "secondary"}>
                                  {product.is_active ? "Activo" : "Inactivo"}
                                </Badge>
                              </TableCell>
                              {canManage && (
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenProductDialog(product)}>
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product)}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                            {isExpanded && hasDetails && (
                              <TableRow key={`${product.id}-detail`} className="bg-muted/30">
                                <TableCell colSpan={canManage ? 7 : 6} className="p-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                    {p.ingrediente_activo && <div><span className="font-semibold text-muted-foreground">Ingrediente activo:</span> {p.ingrediente_activo}</div>}
                                    {p.concentracion && <div><span className="font-semibold text-muted-foreground">Concentración:</span> {p.concentracion}</div>}
                                    {p.registro_ica && <div><span className="font-semibold text-muted-foreground">Registro ICA:</span> {p.registro_ica}</div>}
                                    {p.titular_registro && <div><span className="font-semibold text-muted-foreground">Titular del registro:</span> {p.titular_registro}</div>}
                                    {p.categoria_toxicologica && <div><span className="font-semibold text-muted-foreground">Categoría toxicológica:</span> {p.categoria_toxicologica}</div>}
                                    {p.numero_lote && <div><span className="font-semibold text-muted-foreground">Número de lote:</span> {p.numero_lote}</div>}
                                    {p.contenido_neto && <div><span className="font-semibold text-muted-foreground">Contenido neto:</span> {p.contenido_neto}</div>}
                                    {p.fecha_vencimiento && <div><span className="font-semibold text-muted-foreground">Vence:</span> {p.fecha_vencimiento}</div>}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batches">
            <Card className="border-0 shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Lotes de Inventario</CardTitle>
                  <CardDescription>{batches.length} lote(s)</CardDescription>
                </div>
                {canManage && (
                  <Button onClick={() => handleOpenBatchDialog()}>
                    <Plus className="w-4 h-4 mr-1" />
                    Nuevo Lote
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : batches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay lotes registrados
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Costo Unit.</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Vence</TableHead>
                        {canManage && <TableHead className="w-24">Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batches.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell className="font-medium">{batch.product?.name || "-"}</TableCell>
                          <TableCell>{batch.batch_number || "-"}</TableCell>
                          <TableCell>{batch.quantity}</TableCell>
                          <TableCell>{formatCurrency(batch.unit_cost)}</TableCell>
                          <TableCell>{batch.supplier || "-"}</TableCell>
                          <TableCell>{batch.expiry_date || "-"}</TableCell>
                          {canManage && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenBatchDialog(batch)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteBatch(batch)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Product Dialog */}
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 sm:w-full">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
              <DialogDescription>Ingresa los datos del producto</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ej: Mancozeb 80%"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*]:min-w-0">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={productForm.category || "__none__"}
                    onValueChange={(v) => setProductForm({ ...productForm, category: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin categoría</SelectItem>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unidad</Label>
                  <Select
                    value={productForm.unit}
                    onValueChange={(v) => setProductForm({ ...productForm, unit: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ingrediente Activo</Label>
                <Input
                  value={productForm.active_ingredient}
                  onChange={(e) => setProductForm({ ...productForm, active_ingredient: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*]:min-w-0">
                <div className="space-y-2">
                  <Label>Días de Carencia</Label>
                  <Input
                    type="number"
                    value={productForm.default_withdrawal_days}
                    onChange={(e) => setProductForm({ ...productForm, default_withdrawal_days: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center justify-between pt-6">
                  <Label>Activo</Label>
                  <Switch
                    checked={productForm.is_active}
                    onCheckedChange={(v) => setProductForm({ ...productForm, is_active: v })}
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <Button variant="outline" onClick={() => setProductDialogOpen(false)} className="sm:w-auto">Cancelar</Button>
                <Button onClick={handleSaveProduct} disabled={isSaving} className="flex-1">
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Batch Dialog */}
        <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 sm:w-full">
            <DialogHeader>
              <DialogTitle>{editingBatch ? "Editar Lote" : "Nuevo Lote"}</DialogTitle>
              <DialogDescription>Registra un lote de inventario</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Producto *</Label>
                <Select
                  value={batchForm.product_id || "__none__"}
                  onValueChange={(v) => setBatchForm({ ...batchForm, product_id: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                  <SelectContent>
                    {products.filter(p => p.is_active).length === 0 ? (
                      <SelectItem value="__none__" disabled>No hay productos activos</SelectItem>
                    ) : (
                      products.filter(p => p.is_active).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*]:min-w-0">
                <div className="space-y-2">
                  <Label>Número de Lote</Label>
                  <Input
                    value={batchForm.batch_number}
                    onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    value={batchForm.quantity}
                    onChange={(e) => setBatchForm({ ...batchForm, quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*]:min-w-0">
                <div className="space-y-2">
                  <Label>Costo Unitario (COP)</Label>
                  <Input
                    type="number"
                    value={batchForm.unit_cost}
                    onChange={(e) => setBatchForm({ ...batchForm, unit_cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Input
                    value={batchForm.supplier}
                    onChange={(e) => setBatchForm({ ...batchForm, supplier: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*]:min-w-0">
                <div className="space-y-2">
                  <Label>Fecha de Compra</Label>
                  <Input
                    type="date"
                    value={batchForm.purchase_date}
                    onChange={(e) => setBatchForm({ ...batchForm, purchase_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Vencimiento</Label>
                  <Input
                    type="date"
                    value={batchForm.expiry_date}
                    onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <Button variant="outline" onClick={() => setBatchDialogOpen(false)} className="sm:w-auto">Cancelar</Button>
                <Button onClick={handleSaveBatch} disabled={isSaving} className="flex-1">
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </AppLayout>
  );
}
