import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Maps the current auth user to their operator record (if any).
 * Returns the operator ID so we can check task ownership.
 */
export function useCurrentOperator() {
  const { user } = useAuth();

  const { data: operatorId = null, isLoading } = useQuery({
    queryKey: ["current-operator", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("operators")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data) return null;
      return data.id;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30,
  });

  return { operatorId, isLoading };
}
