import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatPercent,
  pnl,
} from "@/lib/portfolio/valuation";

describe("formatCurrency", () => {
  it("formata BRL com símbolo R$ e duas casas", () => {
    const out = formatCurrency(1234.5);
    expect(out).toContain("R$");
    expect(out).toContain("1.234,50");
  });

  it("respeita a moeda passada", () => {
    const out = formatCurrency(99.9, "USD");
    expect(out).toContain("US");
    expect(out).toContain("99,90");
  });
});

describe("formatPercent", () => {
  it("prefixa + em valores positivos", () => {
    expect(formatPercent(3.21)).toBe("+3.21%");
  });

  it("preserva o sinal negativo", () => {
    expect(formatPercent(-1.5)).toBe("-1.50%");
  });

  it("mostra 0.00% sem prefixo de sinal", () => {
    expect(formatPercent(0)).toBe("0.00%");
  });
});

describe("pnl", () => {
  it("calcula lucro absoluto e percentual", () => {
    // 10 ações compradas a 20 que sobem para 25:
    // custo 200, mercado 250, lucro 50, +25%.
    const r = pnl(10, 20, 25);
    expect(r.absolute).toBe(50);
    expect(r.percent).toBe(25);
  });

  it("calcula prejuízo (sinal negativo)", () => {
    const r = pnl(5, 100, 80);
    expect(r.absolute).toBe(-100);
    expect(r.percent).toBe(-20);
  });

  it("evita divisão por zero quando o custo é 0", () => {
    const r = pnl(10, 0, 5);
    expect(r.absolute).toBe(50);
    expect(r.percent).toBe(0);
  });
});
