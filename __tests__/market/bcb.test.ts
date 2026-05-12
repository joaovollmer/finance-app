import { afterEach, describe, expect, it, vi } from "vitest";
import { convertToBrl } from "@/lib/market/bcb";

// O cache do módulo BCB é singleton dentro do arquivo. Para os testes do
// fetcher (getUsdToBrl) deveríamos importar o módulo dinamicamente e
// resetar o cache entre testes — fica para uma iteração com mocks
// formais. Aqui cobrimos apenas as funções puras (convertToBrl).

describe("convertToBrl", () => {
  it("BRL passa direto", () => {
    expect(convertToBrl(100, "BRL", 5.5)).toBe(100);
  });

  it("USD multiplica pelo câmbio", () => {
    expect(convertToBrl(100, "USD", 5.2)).toBeCloseTo(520, 5);
  });

  it("moeda desconhecida não tenta converter (passa por baixo)", () => {
    // Decisão de produto: hoje só BRL/USD são tratados. Outras moedas
    // voltam como o input. Quando adicionarmos EUR/GBP, este teste
    // precisa mudar — sirva como aviso explícito.
    expect(convertToBrl(50, "EUR", 5)).toBe(50);
  });
});

describe("BCB getUsdToBrl (fetch mockado)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("parseia o último valor da série SGS-1", async () => {
    const payload = JSON.stringify([
      { data: "06/05/2026", valor: "5.0123" },
      { data: "07/05/2026", valor: "5.1234" },
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => payload,
      })) as unknown as typeof fetch
    );

    const { getUsdToBrl } = await import("@/lib/market/bcb");
    const r = await getUsdToBrl();

    expect(r.pair).toBe("USDBRL");
    expect(r.rate).toBeCloseTo(5.1234, 4);
    expect(r.date).toBe("07/05/2026");
    expect(r.source).toBe("BCB-PTAX");
  });

  it("propaga erro quando o BCB devolve 5xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503 })) as unknown as typeof fetch
    );

    const { getUsdToBrl } = await import("@/lib/market/bcb");
    await expect(getUsdToBrl()).rejects.toThrow(/503/);
  });

  it("levanta erro legível quando BCB retorna XML em vez de JSON (regressão do bug do cron)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          '<?xml version="1.0" encoding="UTF-8"?><html>maintenance</html>',
      })) as unknown as typeof fetch
    );

    const { getUsdToBrl } = await import("@/lib/market/bcb");
    await expect(getUsdToBrl()).rejects.toThrow(/XML\/HTML/);
  });
});
