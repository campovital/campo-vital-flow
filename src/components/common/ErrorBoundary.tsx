import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-6">
            <div className="flex flex-col items-center justify-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Algo salió mal al cargar este componente
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Puedes intentar recargar o continuar navegando
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Simple inline fallback for map components
export function MapFallback() {
  return (
    <div className="h-[400px] rounded-xl bg-muted/50 border-2 border-dashed border-border flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="font-medium">No se pudo cargar el mapa</p>
        <p className="text-sm">El resto de la aplicación sigue funcionando</p>
      </div>
    </div>
  );
}
