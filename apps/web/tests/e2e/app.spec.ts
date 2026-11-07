import { test as base, expect, type APIRequestContext } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "../../../api/dist/app.js";
import type { AppData, StateSnapshot } from "@compasso/domain";
import { fixture } from "../fixtures";
import { range } from "@compasso/domain";
const test = base.extend({
  baseURL: async ({ browserName }, use) => {
    const directory = await mkdtemp(
      join(tmpdir(), "compasso-e2e-" + browserName + "-"),
    );
    const origins: string[] = [];
    const app = createApp({
      dbPath: join(directory, "test.sqlite"),
      webRoot: fileURLToPath(new URL("../../dist", import.meta.url)),
      origins,
    });
    try {
      const url = await app.listen({ host: "127.0.0.1", port: 0 });
      origins.push(url);
      await use(url);
    } finally {
      await app.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
});

async function snapshot(request: APIRequestContext): Promise<StateSnapshot> {
  const response = await request.get("/api/state");
  expect(response.ok()).toBe(true);
  return response.json();
}

async function seed(request: APIRequestContext, data: AppData) {
  const response = await request.put("/api/backup", {
    data: { revision: 0, mode: "replace", data },
  });
  expect(response.ok()).toBe(true);
}

test("produção: dados legados, quatro telas, cores e geração no worker", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((data) => {
    if (!localStorage.getItem("compasso-v1"))
      localStorage.setItem("compasso-v1", JSON.stringify(data));
  }, fixture());
  await page.goto("/");
  const legacy = await page.evaluate(() => localStorage.getItem("compasso-v1"));
  await page
    .getByRole("button", { name: "Importar dados deste navegador" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar" })
    .click();
  await expect(page.getByText("Dados do navegador importados.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("compasso-v1"))).toBe(
    legacy,
  );
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
  expect((await snapshot(request)).data.assignments).toEqual({});
  await page.getByRole("button", { name: "Gerar escala", exact: true }).click();
  await expect(page.getByText("Escala em revisão")).toBeVisible();
  expect(await colorOf(0)).toBe(firstColor);
  await page.getByRole("button", { name: "Validar e salvar" }).click();
  await expect(page.getByText("Escala salva.", { exact: true })).toBeVisible();
  const saved = await snapshot(request);
  await page.reload();
  await page.getByLabel("Mês da escala").fill("2026-11");
  expect(await snapshot(request)).toEqual(saved);
  expect(await page.evaluate(() => localStorage.getItem("compasso-v1"))).toBe(
    legacy,
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
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(request, fixture());
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
  request,
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
  await seed(request, data);
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

  expect((await snapshot(request)).data.assignments).toEqual(data.assignments);
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

test("inclui a pessoa recém-cadastrada na segunda de uma escala salva", async ({
  page,
  request,
}) => {
  const data = fixture(1);
  data.assignments = Object.fromEntries(
    range("2026-11").map((day) => [
      day,
      { p0: day === "2026-11-03" ? "a" : "" },
    ]),
  );
  await seed(request, data);
  await page.goto("/");
  await page.getByRole("button", { name: "Pessoas", exact: true }).click();
  await page.getByLabel("Nome da pessoa").fill("Bruna");
  await page.getByRole("button", { name: "Adicionar pessoa" }).click();
  await page
    .getByRole("button", { name: "Escala mensal", exact: true })
    .click();
  await page.getByLabel("Mês da escala").fill("2026-11");

  const remove = (person: string, day: string) =>
    page.getByRole("button", {
      name: "Remover " + person + " de " + day,
      exact: true,
    });
  await expect(remove("Bruna", "02/11")).toBeVisible();
  await expect(remove("Bruna", "06/11")).toBeVisible();
  await expect(remove("Bruna", "07/11")).toHaveCount(0);
  await expect(remove("Pessoa 0", "02/11")).toHaveCount(0);
  await expect(remove("Pessoa 0", "03/11")).toBeVisible();
  expect((await snapshot(request)).data.assignments).toEqual(data.assignments);
});

test("recolhe a barra no desktop e libera espaço para o calendário", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1024, height: 912 });
  await seed(request, fixture());
  await page.goto("/");
  const main = page.getByRole("main");
  const toggle = page.locator('[aria-controls="sidebar-navigation"]');
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(main).toHaveCSS("margin-left", "72px");

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(main).toHaveCSS("margin-left", "230px");

  await toggle.press("Enter");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAccessibleName("Expandir barra lateral");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(main).toHaveCSS("margin-left", "72px");
  await expect(
    page.getByRole("button", { name: "Exportar backup" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/barra-recolhida.png" });

  await page.getByRole("button", { name: "Pessoas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Quem faz acontecer." }),
  ).toBeVisible();
  await toggle.click();
  await expect(main).toHaveCSS("margin-left", "230px");

  await page.setViewportSize({ width: 1024, height: 912 });
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(main).toHaveCSS("margin-left", "230px");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toBeHidden();
  await expect(main).toHaveCSS("margin-left", "0px");
});

test("importa um backup de 50 funcionários e valida a escala após recarregar", async ({
  page,
  request,
}) => {
  const data = fixture(50);
  const days = range("2026-11");
  data.assignments = Object.fromEntries(
    days.map((day, index) => [
      day,
      Object.fromEntries(
        data.people.map((person, personIndex) => [
          person.id,
          (index + personIndex) % 7 < 2 ? "" : "a",
        ]),
      ),
    ]),
  );
  await page.goto("/");
  await page.getByLabel("Importar backup").setInputFiles({
    name: "compasso-50-funcionarios.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar" })
    .click();
  await expect(
    page.getByText("Backup importado. Valide as escalas antes de utilizá-las."),
  ).toBeVisible();
  expect((await snapshot(request)).data).toEqual(data);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar backup" }).click(),
  ]);
  expect(JSON.parse(await readFile((await download.path())!, "utf8"))).toEqual(
    data,
  );
  await page.reload();
  await page.getByLabel("Mês da escala").fill("2026-11");
  await page.getByRole("button", { name: "Validar escala" }).click();
  await expect(
    page.getByText(
      "Escala válida: todas as regras obrigatórias foram atendidas.",
    ),
  ).toBeVisible();
});
