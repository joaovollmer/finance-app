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
      className="ml-2 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:bg-surface-muted"
    >
      Sair
    </button>
  );
}
