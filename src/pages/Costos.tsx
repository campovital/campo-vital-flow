import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Package,
  Users,
  DollarSign,
  Plus,
  History,
  TrendingUp,
  Calculator,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ProductPriceHistory } from "@/components/costs/ProductPriceHistory";
import { OperatorCostEditor } from "@/components/costs/OperatorCostEditor";
import { ApplicationCostsSummary } from "@/components/costs/ApplicationCostsSummary";

interface Product {
  id: string;
  name: string;
  unit: string;
  category: string | null;
  is_active: boolean;
  current_price?: number;
}

interface Operator {
  id: string;
  full_name: string;
  hourly_rate: number;
  currency: string;
  is_active: boolean;
}

export default function Costos() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [showPriceHistory, setShowPriceHistory] = useState(false);
  const [showOperatorEditor, setShowOperatorEditor] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchProducts(), fetchOperators()]);
    setIsLoading(false);
  };

  const fetchProducts = async () => {
    const { data: productsData } = await supabase
      .from("inventory_products")
      .select("*")
      .order("name");

    if (productsData) {
      // Fetch current prices for each product
      const productsWithPrices = await Promise.all(
        productsData.map(async (product) => {
          const { data: priceData } = await supabase
            .from("product_price_history")
            .select("unit_price")
            .eq("product_id", product.id)
            .lte("effective_date", new Date().toISOString().split("T")[0])
            .order("effective_date", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...product,
            current_price: priceData?.unit_price || 0,
          };
        })
      );
      setProducts(productsWithPrices);
    }
  };

  const fetchOperators = async () => {
    const { data } = await supabase
      .from("operators")
      .select("id, full_name, hourly_rate, currency, is_active")
      .order("full_name");
    if (data) setOperators(data as Operator[]);
  };

  const formatCurrency = (value: number, currency: string = "COP") => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalProductsCost = products.reduce((sum, p) => sum + (p.current_price || 0), 0);
  const avgOperatorRate = operators.length > 0 
    ? operators.reduce((sum, o) => sum + (o.hourly_rate || 0), 0) / operators.length 
    : 0;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Costos</h1>
            <p className="text-muted-foreground">
              Administra precios de insumos y tarifas de mano de obra
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Productos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">
                {products.filter((p) => p.current_price && p.current_price > 0).length} con precio configurado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Operarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{operators.length}</div>
              <p className="text-xs text-muted-foreground">
                Tarifa promedio: {formatCurrency(avgOperatorRate)}/hora
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cálculo Automático</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">Activo</div>
              <p className="text-xs text-muted-foreground">
                Costos calculados en cada aplicación
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos
            </TabsTrigger>
            <TabsTrigger value="operators" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Mano de Obra
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Costos por Aplicación
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Catálogo de Productos</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead className="text-right">Precio Actual</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          {product.category ? (
                            <Badge variant="outline">{product.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell className="text-right font-mono">
                          {product.current_price && product.current_price > 0 ? (
                            formatCurrency(product.current_price)
                          ) : (
                            <span className="text-muted-foreground">Sin precio</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowPriceHistory(true);
                            }}
                          >
                            <History className="h-4 w-4 mr-1" />
                            Precios
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operators Tab */}
          <TabsContent value="operators">
            <Card>
              <CardHeader>
                <CardTitle>Tarifas de Mano de Obra</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operario</TableHead>
                      <TableHead className="text-right">Tarifa por Hora</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operators.map((operator) => (
                      <TableRow key={operator.id}>
                        <TableCell className="font-medium">{operator.full_name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {operator.hourly_rate > 0 ? (
                            formatCurrency(operator.hourly_rate, operator.currency)
                          ) : (
                            <span className="text-muted-foreground">Sin tarifa</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={operator.is_active ? "default" : "secondary"}>
                            {operator.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOperator(operator);
                              setShowOperatorEditor(true);
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <ApplicationCostsSummary />
          </TabsContent>
        </Tabs>

        {/* Price History Dialog */}
        {selectedProduct && (
          <ProductPriceHistory
            product={selectedProduct}
            open={showPriceHistory}
            onOpenChange={(open) => {
              setShowPriceHistory(open);
              if (!open) {
                setSelectedProduct(null);
                fetchProducts();
              }
            }}
          />
        )}

        {/* Operator Editor Dialog */}
        {selectedOperator && (
          <OperatorCostEditor
            operator={selectedOperator}
            open={showOperatorEditor}
            onOpenChange={(open) => {
              setShowOperatorEditor(open);
              if (!open) {
                setSelectedOperator(null);
                fetchOperators();
              }
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
