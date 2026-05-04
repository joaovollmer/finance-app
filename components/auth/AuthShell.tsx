import LogoMark from "@/components/ui/LogoMark";
import type { ReactNode } from "react";

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen overflow-hidden bg-surface-muted">
      <aside
        className="relative hidden flex-1 flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{ background: "var(--brand)" }}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {[20, 40, 60, 80].map((x) => (
            <line
              key={`v${x}`}
              x1={x}
              y1="0"
              x2={x}
              y2="100"
              stroke="white"
              strokeWidth="0.15"
              opacity="0.12"
            />
          ))}
          {[20, 40, 60, 80].map((y) => (
            <line
              key={`h${y}`}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="white"
              strokeWidth="0.15"
              opacity="0.12"
            />
          ))}
          <polyline
            points="5,72 18,58 30,65 45,42 60,50 75,30 90,22 100,18"
            fill="none"
            stroke="white"
            strokeWidth="0.6"
            opacity="0.25"
            strokeLinejoin="round"
          />
          <polyline
            points="5,72 18,58 30,65 45,42 60,50 75,30 90,22 100,18 100,100 5,100 Z"
            fill="white"
            opacity="0.05"
          />
        </svg>

        <div className="relative z-10 flex items-center gap-3">
          <LogoMark size={38} variant="white" />
          <span
            className="text-xl font-extrabold"
            style={{ letterSpacing: "-0.02em" }}
          >
            O Investidor
          </span>
        </div>

        <div className="relative z-10">
          <div className="mb-5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
            Plataforma de investimentos
          </div>
          <h1
            className="mb-5 text-5xl font-extrabold leading-[1.1]"
            style={{ letterSpacing: "-0.04em" }}
          >
            Invista com
            <br />
            <span className="text-white/60">inteligência.</span>
          </h1>
          <p className="max-w-[380px] text-base leading-relaxed text-white/70">
            Acompanhe sua carteira, analise ativos e execute operações
            simuladas com clareza e confiança — sem risco financeiro.
          </p>

          <div className="mt-10 flex gap-8">
            {[
              { label: "Ativos disponíveis", value: "8.000+" },
              { label: "Mercados", value: "B3 + EUA" },
              { label: "Fundamentos", value: "em tempo real" },
            ].map((s) => (
              <div key={s.label}>
                <div
                  className="text-xl font-extrabold"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {s.value}
                </div>
                <div className="mt-0.5 text-xs text-white/55">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-[13px] font-medium text-white/85">
            <span aria-hidden>◈</span>
            Cotações ao vivo via Yahoo Finance + BCB
          </div>
        </div>
      </aside>

      <section className="flex flex-1 items-center justify-center bg-surface px-6 py-12 lg:flex-[0_0_460px]">
        <div className="w-full max-w-[360px]">{children}</div>
      </section>
    </div>
  );
}
