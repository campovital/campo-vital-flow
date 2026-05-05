import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "No tienes permisos" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json(401, { error: "No tienes permisos" });

    const adminId = claimsData.claims.sub as string;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json(403, { error: "No tienes permisos" });

    const body = await req.json().catch(() => ({}));
    const operatorId = body?.operator_id as string | undefined;
    const email = (body?.email as string | undefined)?.trim().toLowerCase();
    if (!operatorId || !email) return json(400, { error: "Faltan datos (operator_id, email)" });

    // Look up user by email via admin API
    let foundUser: { id: string; email?: string } | null = null;
    let page = 1;
    while (page < 20) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return json(500, { error: "No se pudo buscar el usuario" });
      const u = data.users.find((x) => (x.email || "").toLowerCase() === email);
      if (u) { foundUser = { id: u.id, email: u.email || undefined }; break; }
      if (data.users.length < 200) break;
      page++;
    }
    if (!foundUser) return json(404, { error: "El usuario no existe" });

    // Check if operator already has access
    const { data: op } = await admin
      .from("operators")
      .select("id, user_id, farm_id")
      .eq("id", operatorId)
      .maybeSingle();
    if (!op) return json(404, { error: "Operario no encontrado" });
    if (op.user_id) return json(409, { error: "Ya tiene acceso" });

    // Make sure no other operator already uses this user_id
    const { data: dup } = await admin
      .from("operators")
      .select("id")
      .eq("user_id", foundUser.id)
      .maybeSingle();
    if (dup) return json(409, { error: "Ese usuario ya está vinculado a otro operario" });

    const { error: updErr } = await admin
      .from("operators")
      .update({ user_id: foundUser.id })
      .eq("id", operatorId);
    if (updErr) return json(500, { error: "No se pudo vincular" });

    // Best-effort: ensure user has access to operator's farm
    if (op.farm_id) {
      await admin
        .from("user_farms")
        .upsert({ user_id: foundUser.id, farm_id: op.farm_id }, { onConflict: "user_id,farm_id" });
    }

    await admin.from("audit_log").insert({
      user_id: adminId,
      action: "link_operator_user",
      target_table: "operators",
      target_id: operatorId,
      new_value: { user_id: foundUser.id, email },
    });

    return json(200, { success: true, user_id: foundUser.id, email });
  } catch (e) {
    console.error(e);
    return json(500, { error: "No se pudo vincular" });
  }
});
