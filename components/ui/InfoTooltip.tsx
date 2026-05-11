"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

// Tooltip educacional reutilizado em /carteira, /ativo, /mercado/renda-fixa.
// Hover abre; clique trava aberto (útil em touch). Esc ou clique fora fecha.
// Pino acima do botão quando há espaço, abaixo caso contrário — evita
// cortar fora da viewport em mobile. A11y: button[role=button], descrição
// referenciada por aria-describedby.

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
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;

    function reposition() {
      const wrap = wrapRef.current;
      const pop = popRef.current;
      if (!wrap || !pop) return;
      const rect = wrap.getBoundingClientRect();
      const popH = pop.offsetHeight || 90;
      const spaceBelow = window.innerHeight - rect.bottom;
      const next: "top" | "bottom" = spaceBelow < popH + 16 ? "top" : "bottom";
      setPlacement(next);
    }

    reposition();

    function onDown(e: MouseEvent | TouchEvent) {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className={`relative inline-flex align-middle ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Mais informações"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        className="flex items-center justify-center rounded-full border border-surface-border-light bg-surface text-[10px] font-bold text-ink-faint transition hover:border-brand-border hover:bg-brand-pastel hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
        style={{ width: size, height: size, lineHeight: 1 }}
      >
        ?
      </button>
      {open && (
        <span
          ref={popRef}
          role="tooltip"
          id={id}
          className={`pointer-events-none absolute left-1/2 z-50 w-64 max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-surface-border bg-surface px-3.5 py-2.5 text-left text-[12px] font-normal leading-[1.55] tracking-normal text-ink shadow-card normal-case ${
            placement === "bottom"
              ? "top-full mt-2"
              : "bottom-full mb-2"
          }`}
          style={{
            // Garante que o conteúdo herde tipografia neutra mesmo dentro
            // de headers em uppercase / tracking-[0.05em] — culpado do
            // visual ruim antes do redesign.
            letterSpacing: "0",
            textTransform: "none",
          }}
        >
          <span
            aria-hidden
            className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border border-surface-border bg-surface ${
              placement === "bottom"
                ? "top-[-5px] border-b-0 border-r-0"
                : "bottom-[-5px] border-l-0 border-t-0"
            }`}
          />
          {content}
        </span>
      )}
    </span>
  );
}
