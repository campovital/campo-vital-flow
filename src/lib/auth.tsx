import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "agronoma" | "operario" | "consulta";

interface Profile {
  id: string;
  full_name: string;
  role: AppRole;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  /** True when auth failed due to network/backend unavailability */
  isOfflineMode: boolean;
  isAdmin: boolean;
  isAgronoma: boolean;
  isOperario: boolean;
  isConsulta: boolean;
  canManage: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TIMEOUT_MS = 2000; // 2s max wait for getSession

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch {
      // Network failure – ignore
    }
  }, []);

  const fetchRoles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (!error && data) {
        setRoles(data.map((r) => r.role as AppRole));
      }
    } catch {
      // Network failure – ignore
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsOfflineMode(false);

        // Defer profile fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchRoles(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
      }
    );

    // THEN check for existing session with timeout
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), AUTH_TIMEOUT_MS);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      setIsLoading(false);
    }).catch(() => {
      // Network/backend unreachable → enter offline mode
      clearTimeout(timeout);
      setIsOfflineMode(true);
      setIsLoading(false);
    });

    // Fallback: if timeout triggers before promise settles, enter offline mode
    const fallbackTimeout = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          setIsOfflineMode(true);
          return false;
        }
        return prev;
      });
    }, AUTH_TIMEOUT_MS + 100);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
      clearTimeout(fallbackTimeout);
    };
  }, [fetchProfile, fetchRoles]);


  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  };

  const isAdmin = roles.includes("admin");
  const isAgronoma = roles.includes("agronoma");
  const isOperario = roles.includes("operario");
  const isConsulta = roles.includes("consulta");
  const canManage = isAdmin || isAgronoma;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        isOfflineMode,
        isAdmin,
        isAgronoma,
        isOperario,
        isConsulta,
        canManage,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
