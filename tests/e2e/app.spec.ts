import { test, expect } from "@playwright/test";
import { fixture } from "../fixtures";
import { range } from "../../src/domain/dates";
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
  const initial = page.getByRole("button", { name: "Revisar escala inicial" });
  await expect(initial).toBeVisible();
  const calendar = page.getByRole("region", { name: "Calendário mensal" });
  await expect(calendar.locator("abbr").first()).toHaveText("Seg");
  await expect(calendar.locator("abbr").last()).toHaveText("Dom");
  const firstWeek = calendar.locator("[data-schedule-week]").first();
  await expect(firstWeek.locator("time").first()).toHaveText("26/10");
  await expect(firstWeek.locator("time").last()).toHaveText("01");
  await expect(
    firstWeek.getByRole("button", { name: "Remover Pessoa 0 de 26/10" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remover Pessoa 0 de 02/11" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remover Pessoa 1 de 06/11" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remover Pessoa 0 de 07/11" }),
  ).toHaveCount(0);
  const colorOf = async (index: number) => {
    const bars = page.getByTitle("Pessoa " + index + " · Manhã", {
      exact: true,
    });
    const color = await bars
      .first()
      .evaluate((bar) => getComputedStyle(bar).backgroundColor);
    await expect(bars.nth(1)).toHaveCSS("background-color", color);
    return color;
  };
  const firstColor = await colorOf(0);
  expect(await colorOf(1)).not.toBe(firstColor);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("compasso-v1")!).assignments,
    ),
  ).toEqual({});
  await page.getByRole("button", { name: "Gerar escala", exact: true }).click();
  await expect(page.getByText("Escala em revisão")).toBeVisible();
  expect(await colorOf(0)).toBe(firstColor);
  await page.getByRole("button", { name: "Validar e salvar" }).click();
  await expect(page.getByText("Escala salva.", { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem("compasso-v1"));
  await page.reload();
  await page.getByLabel("Mês da escala").fill("2026-11");
  expect(await page.evaluate(() => localStorage.getItem("compasso-v1"))).toBe(
    saved,
  );
  await page.screenshot({
    path: "test-results/escala-desktop.png",
    fullPage: true,
  });
  const day = page.getByRole("button", { name: /^Editar / }).first();
  await day.click();
  const editor = page.getByRole("dialog");
  const assignment = editor.getByRole("combobox").first();
  await assignment.selectOption((await assignment.inputValue()) ? "" : "a");
  await editor.getByRole("button", { name: "Fechar" }).click();
  await expect(day).toBeFocused();
  await expect(page.getByText("Escala em revisão")).toBeVisible();
  await page.getByRole("button", { name: "Descartar revisão" }).click();
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

test("ajusta faixas entre semanas, preserva outro turno e remove um dia isolado", async ({
  page,
}) => {
  const data = fixture(1);
  data.shifts.push({ id: "b", name: "Tarde", start: "16:00", end: "22:00" });
  data.assignments = {
    ...Object.fromEntries(range("2026-11").map((day) => [day, {}])),
    "2026-11-04": { p0: "a" },
    "2026-11-05": { p0: "a" },
    "2026-11-06": { p0: "a" },
    "2026-11-09": { p0: "b" },
  };
  await page.addInitScript(
    (data) => localStorage.setItem("compasso-v1", JSON.stringify(data)),
    data,
  );
  await page.goto("/");
  await page.getByLabel("Mês da escala").fill("2026-11");

  async function resize(end: string, target: string) {
    const handle = page.getByRole("button", {
      name: "Ajustar fim de Pessoa 0 em " + end,
      exact: true,
    });
    const date = page.locator('time[datetime="' + target + '"]');
    await handle.scrollIntoViewIfNeeded();
    await date.scrollIntoViewIfNeeded();
    const from = (await handle.boundingBox())!;
    const to = (await date.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
      steps: 8,
    });
    await page.mouse.up();
  }

  const remove = (day: string) =>
    page.getByRole("button", {
      name: "Remover Pessoa 0 de " + day,
      exact: true,
    });

  await resize("06/11", "2026-11-10");
  await expect(remove("07/11")).toBeVisible();
  await expect(remove("08/11")).toBeVisible();
  await expect(
    page.getByTitle("Pessoa 0 · Tarde", { exact: true }),
  ).toBeVisible();
  await expect(remove("10/11")).toHaveCount(0);

  await remove("06/11").click();
  await expect(remove("06/11")).toHaveCount(0);
  await expect(remove("05/11")).toBeVisible();
  await expect(remove("07/11")).toBeVisible();

  await resize("08/11", "2026-11-07");
  await expect(remove("08/11")).toHaveCount(0);
  await expect(remove("07/11")).toBeVisible();

  await page
    .getByRole("button", {
      name: "Ajustar início de Pessoa 0 em 04/11",
      exact: true,
    })
    .press("ArrowLeft");
  await expect(remove("03/11")).toBeVisible();

  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("compasso-v1")!),
  );
  expect(saved.assignments).toEqual(data.assignments);
  await page
    .getByRole("button", { name: "Validar escala", exact: true })
    .click();
  await page.getByText(/Pendências na validação/).click();
  await expect(
    page.getByText(
      "Pessoa 0: 4 de 5 dias trabalhados na semana de 02/11 a 08/11",
    ),
  ).toBeVisible();
});
