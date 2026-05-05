import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%*?";
  const all = upper + lower + digits + symbols;
  const rand = (set: string) =>
    set[Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 * set.length)];
  const chars = [rand(upper), rand(lower), rand(digits), rand(symbols)];
  for (let i = 0; i < 8; i++) chars.push(rand(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminId = claimsData.claims.sub as string;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const operatorId = body?.operator_id as string | undefined;
    const email = (body?.email as string | undefined)?.trim().toLowerCase();
    if (!operatorId || !email) {
      return new Response(JSON.stringify({ error: "operator_id and email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate operator exists and has no user_id
    const { data: op, error: opErr } = await admin
      .from("operators")
      .select("id, full_name, user_id, farm_id")
      .eq("id", operatorId)
      .maybeSingle();

    if (opErr || !op) {
      return new Response(JSON.stringify({ error: "Operario no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (op.user_id) {
      return new Response(JSON.stringify({ error: "El operario ya tiene cuenta de acceso" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tempPassword = generateTempPassword();

    // Create auth user (auto-confirmed so they can log in immediately)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: op.full_name },
    });
    if (createErr || !created?.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "No se pudo crear la cuenta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = created.user.id;

    // Link operator to new user
    const { error: linkErr } = await admin
      .from("operators")
      .update({ user_id: newUserId })
      .eq("id", operatorId);
    if (linkErr) {
      console.error("link operator error", linkErr);
    }

    // Assign operator's farm to new user (if any)
    if (op.farm_id) {
      await admin.from("user_farms").upsert(
        { user_id: newUserId, farm_id: op.farm_id },
        { onConflict: "user_id,farm_id" },
      ).select();
    }

    // Mark must_change_password
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("temporary_password_flags").upsert(
      {
        user_id: newUserId,
        must_change_password: true,
        expires_at: expiresAt,
        created_by: adminId,
        created_at: new Date().toISOString(),
        used_at: null,
      },
      { onConflict: "user_id" },
    );

    // Audit
    await admin.from("audit_log").insert({
      user_id: adminId,
      action: "create_operator_account",
      target_table: "auth.users",
      target_id: newUserId,
      new_value: { operator_id: operatorId, email, expires_at: expiresAt },
    });

    return new Response(
      JSON.stringify({
        user_id: newUserId,
        email,
        temp_password: tempPassword,
        expires_at: expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
