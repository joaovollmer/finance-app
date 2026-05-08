import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
    environment: "node",
    // Mantém os testes desconectados de rede: qualquer fetch deve ser
    // mockado explicitamente em cada teste. Vitest não bloqueia rede
    // por padrão, então a regra é convencional — em CI a falta de DNS
    // expõe testes que escaparam.
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
