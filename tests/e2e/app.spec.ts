import { test, expect } from "@playwright/test";
import { fixture } from "../fixtures";
test("produção: dados legados, quatro telas, cores e geração no worker", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((data) => {
    if (!localStorage.getItem("compasso-v1"))
      localStorage.setItem("compasso-v1", JSON.stringify(data));
  }, fixture());
  await page.goto("/");
  await page.getByLabel("Mês da escala").fill("2026-11");
  await page.getByRole("button", { name: "Gerar escala", exact: true }).click();
  await expect(page.getByText("Escala em revisão")).toBeVisible();
  await expect(page.locator("select.bg-shift-blue").first()).toHaveCSS(
    "background-color",
    "rgb(210, 232, 253)",
  );
  await page.getByRole("button", { name: "Validar e salvar" }).click();
  await expect(page.getByText("Escala salva.", { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem("compasso-v1"));
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem("compasso-v1"))).toBe(
    saved,
  );
  await page.screenshot({
    path: "test-results/escala-desktop.png",
    fullPage: true,
  });
  for (const [name, title] of [
    ["Pessoas", "Quem faz acontecer."],
    ["Turnos", "O ritmo da operação."],
    ["Operação e cobertura", "A equipe certa em cada turno."],
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await page.screenshot({
      path:
        "test-results/" +
        (name === "Pessoas"
          ? "pessoas"
          : name === "Turnos"
            ? "turnos"
            : "cobertura") +
        "-desktop.png",
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Turnos", exact: true }).click();
  await page.getByRole("button", { name: "Excluir turno Manhã" }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Manhã", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("celular: quatro telas sem transbordamento da página", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    (data) => localStorage.setItem("compasso-v1", JSON.stringify(data)),
    fixture(),
  );
  await page.goto("/");
  for (const [name, title] of [
    ["Escala mensal", "Cada dia, uma equipe."],
    ["Pessoas", "Quem faz acontecer."],
    ["Turnos", "O ritmo da operação."],
    ["Operação e cobertura", "A equipe certa em cada turno."],
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path:
        "test-results/" +
        (name === "Pessoas"
          ? "pessoas"
          : name === "Turnos"
            ? "turnos"
            : name === "Escala mensal"
              ? "escala"
              : "cobertura") +
        "-mobile.png",
      fullPage: true,
    });
  }
});
