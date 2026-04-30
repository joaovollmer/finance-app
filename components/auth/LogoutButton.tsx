"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <button
      onClick={handleLogout}
      className="rounded-md border border-surface-border px-3 py-1 text-sm text-slate-700 transition hover:bg-surface-muted"
    >
      Sair
    </button>
  );
}
