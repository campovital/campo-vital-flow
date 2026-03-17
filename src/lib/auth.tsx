import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/offline/network";

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

type AuthCacheSnapshot = {
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  cachedAt: number;
};

type StoredSessionPayload =
  | Session
  | {
      currentSession?: Session | null;
      session?: Session | null;
    };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TIMEOUT_MS = 2000;
const AUTH_CACHE_KEY = "gulupa_auth_snapshot";

function readAuthSnapshot(): AuthCacheSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthCacheSnapshot;
  } catch {
    return null;
  }
}

function writeAuthSnapshot(partial: Partial<AuthCacheSnapshot>) {
  if (typeof window === "undefined") return;

  try {
    const current = readAuthSnapshot();
    const next: AuthCacheSnapshot = {
      session: partial.session ?? current?.session ?? null,
      profile: partial.profile ?? current?.profile ?? null,
      roles: partial.roles ?? current?.roles ?? [],
      cachedAt: Date.now(),
    };

    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }
}

function clearAuthSnapshot() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
  } catch {
    // Ignore storage errors
  }
}

function isSession(value: unknown): value is Session {
  return Boolean(
    value &&
      typeof value === "object" &&
      "access_token" in value &&
      "refresh_token" in value &&
      "user" in value
  );
}

function readStoredSession(): Session | null {
  if (typeof window === "undefined") return null;

  try {
    const key = Object.keys(localStorage).find(
      (item) => item.startsWith("sb-") && item.endsWith("-auth-token")
    );

    if (!key) return null;

    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredSessionPayload;
    let session: Session | null = null;

    if (isSession(parsed)) {
      session = parsed;
    } else if (parsed && typeof parsed === "object" && "currentSession" in parsed) {
      session = parsed.currentSession ?? null;
    } else if (parsed && typeof parsed === "object" && "session" in parsed) {
      session = parsed.session ?? null;
    }

    return session?.user ? session : null;
  } catch {
    return null;
  }
}

function getBootstrappedAuth() {
  const snapshot = readAuthSnapshot();
  const session = readStoredSession() ?? snapshot?.session ?? null;

  return {
    session,
    user: session?.user ?? null,
    profile: snapshot?.profile ?? null,
    roles: snapshot?.roles ?? [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const bootstrap = useMemo(() => getBootstrappedAuth(), []);
  const [user, setUser] = useState<User | null>(bootstrap.user);
  const [session, setSession] = useState<Session | null>(bootstrap.session);
  const [profile, setProfile] = useState<Profile | null>(bootstrap.profile);
  const [roles, setRoles] = useState<AppRole[]>(bootstrap.roles);
  const [isLoading, setIsLoading] = useState(!bootstrap.user);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        const nextProfile = data as Profile;
        setProfile(nextProfile);
        writeAuthSnapshot({ profile: nextProfile });
      }
    } catch {
      // Network failure – keep cached profile if available
    }
  }, []);

  const fetchRoles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (!error && data) {
        const nextRoles = data.map((r) => r.role as AppRole);
        setRoles(nextRoles);
        writeAuthSnapshot({ roles: nextRoles });
      }
    } catch {
      // Network failure – keep cached roles if available
    }
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const nextUser = nextSession?.user ?? null;

      setSession(nextSession);
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setRoles([]);
        if (event === "SIGNED_OUT") {
          clearAuthSnapshot();
          setIsOfflineMode(false);
        }
        setIsLoading(false);
        return;
      }

      setIsOfflineMode(false);
      setIsLoading(false);
      writeAuthSnapshot({ session: nextSession });

      setTimeout(() => {
        fetchProfile(nextUser.id);
        fetchRoles(nextUser.id);
      }, 0);
    });

    if (bootstrap.user) {
      setTimeout(() => {
        fetchProfile(bootstrap.user.id);
        fetchRoles(bootstrap.user.id);
      }, 0);
    }

    withTimeout(
      supabase.auth.getSession(),
      AUTH_TIMEOUT_MS,
      "Tiempo de espera agotado validando la sesión"
    )
      .then(({ data: { session: liveSession } }) => {
        const liveUser = liveSession?.user ?? null;

        setSession(liveSession);
        setUser(liveUser);
        setIsOfflineMode(false);

        if (liveUser) {
          writeAuthSnapshot({ session: liveSession });
          fetchProfile(liveUser.id);
          fetchRoles(liveUser.id);
        } else {
          clearAuthSnapshot();
          setProfile(null);
          setRoles([]);
        }

        setIsLoading(false);
      })
      .catch(() => {
        const fallback = getBootstrappedAuth();

        setSession(fallback.session);
        setUser(fallback.user);
        setProfile(fallback.profile);
        setRoles(fallback.roles);
        setIsOfflineMode(true);
        setIsLoading(false);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [bootstrap.user, fetchProfile, fetchRoles]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setIsOfflineMode(false);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);
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
    try {
      await supabase.auth.signOut();
    } catch {
      // Clear local state even if remote sign-out is unavailable
    }

    clearAuthSnapshot();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
    setIsOfflineMode(false);
    setIsLoading(false);
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
