import { createClient } from "@supabase/supabase-js";

// Cliente admin com service role — usado APENAS em rotas server-side seguras
// (cron, webhooks). Bypassa RLS, então nunca deve ser exposto ao cliente.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
