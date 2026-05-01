import type { ReactNode } from "react";

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card border border-surface-border bg-surface p-6 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2
                className="text-base font-bold text-ink"
                style={{ letterSpacing: "-0.01em" }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
  icon?: ReactNode;
}) {
  const valueColor =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-negative"
        : "text-ink";
  const bg =
    tone === "positive"
      ? "bg-positive-pastel"
      : tone === "negative"
        ? "bg-negative-pastel"
        : "bg-brand-pastel";

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-surface-border bg-surface px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
          {label}
        </span>
        {icon && (
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm ${bg}`}
            aria-hidden
          >
            {icon}
          </div>
        )}
      </div>
      <div
        className={`tabular text-2xl font-bold ${valueColor}`}
        style={{ letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-ink-faint">{hint}</div>}
    </div>
  );
}

export function Badge({
  value,
  pct,
}: {
  value: number;
  pct?: number;
}) {
  const pos = value >= 0;
  const display = pct !== undefined ? Math.abs(pct).toFixed(2) + "%" : null;
  return (
    <span
      className={`tabular inline-flex items-center gap-1 rounded-md px-2 py-[3px] text-xs font-semibold ${pos ? "bg-positive-pastel text-positive" : "bg-negative-pastel text-negative"}`}
    >
      <span aria-hidden>{pos ? "▲" : "▼"}</span> {display ?? Math.abs(value).toFixed(2)}
    </span>
  );
}
