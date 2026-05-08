import type { NewsItem } from "@/lib/market/news";

const RTF = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

function relativeFromNow(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return RTF.format(diffSec, "second");
  if (abs < 3600) return RTF.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return RTF.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return RTF.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 365)
    return RTF.format(Math.round(diffSec / (86400 * 30)), "month");
  return RTF.format(Math.round(diffSec / (86400 * 365)), "year");
}

export default function NewsPanel({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Sem notícias recentes disponíveis para este ativo.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((n) => (
        <li
          key={`${n.link}-${n.publishedAt}`}
          className="rounded-xl border border-surface-border-light bg-surface-muted p-3.5 transition hover:border-brand-border"
        >
          <a
            href={n.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3"
          >
            {n.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={n.thumbnail}
                alt=""
                className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold text-ink">
                {n.title}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] font-medium text-ink-faint">
                <span className="truncate">{n.publisher}</span>
                <span aria-hidden>·</span>
                <span>{relativeFromNow(n.publishedAt)}</span>
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
