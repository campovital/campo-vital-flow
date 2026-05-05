import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Link2, Loader2, Copy, Check, ShieldAlert, ShieldCheck } from "lucide-react";

export interface ManageAccessSubject {
  /** Operator id when linking is needed; null when only resetting passwords. */
  operatorId?: string | null;
  /** Existing auth user id, if any. */
  userId?: string | null;
  /** Display name. */
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: ManageAccessSubject | null;
  onLinked?: (userId: string) => void;
}

/**
 * Centralized dialog to manage system access for any subject (operator, profile, etc.).
 * - Reset password (admin-generate-temp-password) when userId exists.
 * - Link to existing auth user by email (admin-link-user) when operatorId is provided and userId is missing.
 * Never creates new auth accounts.
 */
export function ManageAccessDialog({ open, onOpenChange, subject, onLinked }: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [tempPwd, setTempPwd] = useState<{ password: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!subject) return null;

  const close = () => {
    setEmail("");
    setTempPwd(null);
    setCopied(false);
    onOpenChange(false);
  };

  const handleReset = async () => {
    if (!subject.userId) return;
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-generate-temp-password", {
        body: { target_user_id: subject.userId },
      });
      if (error) {
        const msg = (error as any)?.context?.error || (error as any)?.message || "No se pudo generar la clave";
        throw new Error(msg);
      }
      if (!data?.temp_password) throw new Error("Sin respuesta del servidor");
      setTempPwd({ password: data.temp_password, expiresAt: data.expires_at });
      setCopied(false);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "No se pudo generar la clave", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const handleLink = async () => {
    if (!subject.operatorId || !email.trim()) return;
    setLinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-link-user", {
        body: { operator_id: subject.operatorId, email: email.trim() },
      });
      if (error) {
        // Try to read structured error from response
        let msg = "No se pudo vincular";
        try {
          const ctx: any = (error as any)?.context;
          if (ctx?.error) msg = ctx.error;
          else if (typeof ctx === "string") msg = ctx;
        } catch {}
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Cuenta vinculada", description: email });
      onLinked?.((data as any).user_id);
      close();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "No se pudo vincular", variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  const copyPwd = async () => {
    if (!tempPwd) return;
    try {
      await navigator.clipboard.writeText(tempPwd.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    }
  };

  const hasAccess = !!subject.userId;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gestionar acceso</DialogTitle>
          <DialogDescription>{subject.name}</DialogDescription>
        </DialogHeader>

        {tempPwd ? (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Esta clave se muestra <strong>una sola vez</strong>. Cópiala y entrégala de forma segura.
              El usuario deberá cambiarla al iniciar sesión.
            </p>
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted">
              <code className="flex-1 font-mono text-base break-all">{tempPwd.password}</code>
              <Button size="sm" variant="outline" onClick={copyPwd}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expira: {new Date(tempPwd.expiresAt).toLocaleString()}
            </p>
            <Button className="w-full" onClick={close}>Cerrar</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Estado de acceso</Label>
              <div className="mt-1">
                {hasAccess ? (
                  <Badge variant="default" className="gap-1">
                    <ShieldCheck className="w-3 h-3" /> Con acceso
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <ShieldAlert className="w-3 h-3" /> Sin acceso
                  </Badge>
                )}
              </div>
            </div>

            {hasAccess ? (
              <Button onClick={handleReset} disabled={resetting} className="w-full">
                {resetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                Generar clave temporal
              </Button>
            ) : subject.operatorId ? (
              <div className="space-y-2">
                <Label htmlFor="link-email">Email del usuario existente</Label>
                <Input
                  id="link-email"
                  type="email"
                  placeholder="usuario@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Solo vincula cuentas existentes. No se crean usuarios nuevos.
                </p>
                <Button onClick={handleLink} disabled={linking || !email.trim()} className="w-full">
                  {linking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                  Vincular cuenta existente
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Este usuario no tiene cuenta de acceso vinculada.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
