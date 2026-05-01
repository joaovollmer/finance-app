"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-brand-pastel text-brand"
          : "text-ink-muted hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
