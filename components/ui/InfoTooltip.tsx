"use client";

import { useState, type ReactNode } from "react";

export default function InfoTooltip({
  content,
  size = 14,
  className = "",
}: {
  content: ReactNode;
  size?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`relative inline-flex align-middle ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        aria-label="Mais informações"
        className="flex items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-ink-faint transition hover:bg-brand-pastel hover:text-brand"
        style={{ width: size, height: size, lineHeight: 1 }}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-60 -translate-x-1/2 rounded-lg border border-surface-border bg-surface px-3 py-2 text-[11px] font-normal leading-relaxed text-ink shadow-card"
        >
          {content}
        </span>
      )}
    </span>
  );
}

