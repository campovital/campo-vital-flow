import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Guard that forces users with an active temporary password
 * to change it before navigating anywhere except /reset-password and /auth.
 */
export function TempPasswordGuard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mustChange, setMustChange] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setMustChange(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("temporary_password_flags")
          .select("must_change_password, expires_at, used_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!active) return;
        const needs =
          !!data &&
          data.must_change_password === true &&
          !data.used_at &&
          new Date(data.expires_at).getTime() > Date.now();
        setMustChange(needs);
      } catch {
        // silent: don't block on errors
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !mustChange) return;
    const allowed = ["/reset-password", "/auth"];
    if (!allowed.includes(location.pathname)) {
      navigate("/reset-password?forced=1", { replace: true });
    }
  }, [user, mustChange, location.pathname, navigate]);

  return null;
}
