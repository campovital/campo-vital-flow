import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, Mail, Lock, User, AlertCircle, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ForgotPasswordDialog } from "@/components/auth/ForgotPasswordDialog";
import { useNetworkStatus } from "@/hooks/use-network-status";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp, user, isOfflineMode } = useAuth();
  const { isOnline } = useNetworkStatus();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  if (user) {
    navigate("/", { replace: true });
    return null;
  }

  // Check if there's a persisted session in localStorage (supabase stores tokens)
  const hasPersistedSession = (() => {
    try {
      const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (!storageKey) return false;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!(parsed?.access_token || parsed?.refresh_token);
    } catch {
      return false;
    }
  })();

  const handleOfflineEntry = () => {
    // Navigate to home - AppLayout already allows access in offline mode
    navigate("/", { replace: true });
    toast({
      title: "Modo sin conexión",
      description: "Estás trabajando offline. Los datos se sincronizarán al recuperar conexión.",
    });
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión correctamente",
      });
      navigate("/", { replace: true });
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      if (error.message.includes("already registered")) {
        setError("Este correo ya está registrado. Por favor inicia sesión.");
      } else {
        setError(error.message);
      }
      setIsLoading(false);
    } else {
      toast({
        title: "¡Cuenta creada!",
        description: "Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.",
      });
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-field-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-harvest shadow-glow mb-4">
            <Leaf className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground">Campovital</h1>
          <p className="text-primary-foreground/80 mt-1">Gestión de Cultivo de Gulupa</p>
        </div>
        {/* Offline entry option */}
        {!isOnline && hasPersistedSession && (
          <Card className="shadow-strong border-0 mb-4 border-l-4 border-l-warning">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <WifiOff className="w-5 h-5 text-warning-foreground" />
                <span className="font-medium text-sm">Sin conexión a internet</span>
              </div>
              <p className="text-muted-foreground text-sm mb-3">
                Tienes una sesión previa guardada. Puedes entrar en modo offline y tus datos se sincronizarán cuando recuperes conexión.
              </p>
              <Button onClick={handleOfflineEntry} variant="outline" className="w-full gap-2">
                <WifiOff className="w-4 h-4" />
                Entrar sin conexión
              </Button>
            </CardContent>
          </Card>
        )}

        {!isOnline && !hasPersistedSession && (
          <Card className="shadow-strong border-0 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <WifiOff className="w-5 h-5 text-destructive" />
                <span className="font-medium text-sm">Sin conexión a internet</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Necesitas conexión para iniciar sesión por primera vez. Una vez autenticado, podrás acceder sin conexión.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-strong border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Acceso al Sistema</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Correo electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <ForgotPasswordDialog />
                  </div>
                  <Button type="submit" variant="field" className="w-full" disabled={isLoading}>
                    {isLoading ? "Ingresando..." : "Iniciar Sesión"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        name="fullName"
                        type="text"
                        placeholder="Juan Pérez"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Correo electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        className="pl-10"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="field" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-primary-foreground/60 text-sm mt-6">
          Sistema de gestión bajo estándares OCATI / ICA
        </p>
      </div>
    </div>
  );
}
