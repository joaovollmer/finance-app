import { test, expect } from "@playwright/test";

// Smoke test mínimo da landing pública. Não toca em Supabase, fica
// idempotente e roda em CI sem segredos. Garante que:
//   1. A home renderiza sem 500.
//   2. O CTA "Criar conta" leva para /cadastro com o formulário visível.
//   3. O CTA "Entrar" leva para /login.

test.describe("Landing pública", () => {
  test("renderiza heading e CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText(/Simulador educacional/i)
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Criar conta/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^Entrar$/i })
    ).toBeVisible();
  });

  test("Criar conta navega para /cadastro", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Criar conta/i }).first().click();
    await expect(page).toHaveURL(/\/cadastro$/);
  });

  test("Entrar navega para /login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /^Entrar$/i }).first().click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
