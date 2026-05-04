import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";
import LogoMark, { Wordmark } from "@/components/ui/LogoMark";
import NavLink from "@/components/ui/NavLink";

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

  const initials = (user.email ?? "??")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface">
        <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-6">
          <Link href="/carteira" className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <Wordmark size={17} />
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink href="/carteira" label="Carteira" />
            <NavLink href="/mercado" label="Mercado" />
            <NavLink href="/mercado/renda-fixa" label="Renda Fixa" />
            <span className="mx-2 h-5 w-px bg-surface-border" />
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-pastel text-[13px] font-semibold text-brand"
              title={user.email ?? ""}
            >
              {initials}
            </div>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] animate-fade-up px-6 py-8">
        {children}
      </main>
    </div>
  );
}
