import { useAuth } from "@/lib/auth";

/**
 * Returns true when the current user has the "consulta" role,
 * meaning all write operations should be disabled in the UI.
 */
export function useReadOnly(): boolean {
  const { isConsulta } = useAuth();
  return isConsulta;
}
