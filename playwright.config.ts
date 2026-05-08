import { defineConfig, devices } from "@playwright/test";

// Sprint C inicial: rodamos apenas smoke tests da landing pública. Quando
// o setup de banco de testes estiver pronto (criação de usuário ad-hoc +
// limpeza), expandimos para fluxos autenticados (cadastro → onboarding →
// compra → carteira). Por enquanto, evitamos qualquer dependência de
// Supabase/rede para ficar verde em CI sem env vars.
//
// Servidor de teste: usa o build de produção. `webServer.command` sobe o
// `next start` com a porta livre. Precisa do app já buildado — em CI o
// step anterior chama `npm run build`.
const PORT = process.env.PLAYWRIGHT_PORT
  ? Number(process.env.PLAYWRIGHT_PORT)
  : 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
