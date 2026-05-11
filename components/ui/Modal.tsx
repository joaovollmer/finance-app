"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Largura máxima do diálogo. Default: max-w-2xl. */
  maxWidth?: string;
}

// Modal didático reutilizável (Sprint v1.2-B). Fundo desfocado, foco
// preso via overflow:hidden no body, dispensa em Esc/clique fora.
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-2xl",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foco inicial no container para Esc funcionar e leitores de tela
    // anunciarem o título.
    requestAnimationFrame(() => ref.current?.focus());

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-6"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px] transition"
        tabIndex={-1}
      />
      <div
        ref={ref}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-2xl focus:outline-none`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-surface-border-light bg-surface px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2
              id="modal-title"
              className="text-[17px] font-extrabold text-ink"
              style={{ letterSpacing: "-0.02em" }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface text-ink-muted transition hover:bg-surface-muted hover:text-ink"
          >
            ✕
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4 text-[13px] leading-relaxed text-ink">
          {children}
        </div>
      </div>
    </div>
  );
}
