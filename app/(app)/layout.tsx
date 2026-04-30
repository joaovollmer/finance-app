import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-surface-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/carteira" className="text-lg font-semibold text-brand">
            finance-app
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/carteira"
              className="text-slate-700 hover:text-brand"
            >
              Carteira
            </Link>
            <Link
              href="/mercado"
              className="text-slate-700 hover:text-brand"
            >
              Mercado
            </Link>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">{user.email}</span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
