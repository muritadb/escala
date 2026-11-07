import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/app/App";
import { fixture } from "../fixtures";
import { solve } from "@compasso/domain/solver";
import {
  emptyData,
  removeShift,
  validate,
  type AppData,
  type Assignments,
} from "@compasso/domain";

let dataOnServer: AppData;
let revision: number;
let generation: { complete: () => void; signal: AbortSignal };
let rejectSave: boolean;

beforeEach(() => {
  dataOnServer = emptyData();
  revision = 0;
  rejectSave = false;
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const snapshot = () => Response.json({ data: dataOnServer, revision });
    if (url === "/api/state") return snapshot();
    const body = JSON.parse(init.body as string);
    if (url === "/api/settings") {
      for (const shift of dataOnServer.shifts) {
        if (
          !body.settings.shifts.some(
            (candidate: { id: string }) => candidate.id === shift.id,
          )
        ) {
          dataOnServer = removeShift(dataOnServer, shift.id);
        }
      }
      dataOnServer = { ...dataOnServer, ...body.settings };
      revision++;
      return snapshot();
    }
    const month = url.split("/")[3];
    if (url.endsWith("/generate")) {
      const signal = init.signal!;
      return new Promise<Response>((resolve, reject) => {
        generation = {
          signal,
          complete: () => resolve(Response.json(solve(dataOnServer, month))),
        };
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      });
    }
    const assignments: Assignments = {
      ...dataOnServer.assignments,
      ...body.assignments,
    };
    const errors = validate(dataOnServer, month, assignments);
    if (url.endsWith("/validate")) return Response.json({ errors });
    if (rejectSave)
      return Response.json(
        {
          code: "revision_conflict",
          message: "Os dados mudaram em outra aba.",
        },
        { status: 409 },
      );
    if (errors.length)
      return Response.json(
        {
          code: "invalid_schedule",
          message: "A escala tem pendências.",
          errors,
        },
        { status: 422 },
      );
    dataOnServer = { ...dataOnServer, assignments };
    revision++;
    return snapshot();
  });
});

const saved = () => dataOnServer;
async function ready() {
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Turnos" })).toBeEnabled(),
  );
}
async function openFirstDay(user: ReturnType<typeof userEvent.setup>) {
  const editor = screen.getByRole<HTMLDialogElement>("dialog", {
    hidden: true,
  });
  // jsdom exposes the open attribute but does not implement showModal.
  Object.defineProperty(editor, "showModal", {
    value: () => {
      editor.open = true;
    },
  });
  await user.click(screen.getAllByRole("button", { name: /^Editar / })[0]);
  return within(screen.getByRole("dialog")).getAllByRole("combobox")[0];
}
test("cadastra turno e pessoa usando a interface", async () => {
  const user = userEvent.setup();
  render(<App />);
  await ready();
  await user.click(screen.getByRole("button", { name: "Turnos" }));
  await user.type(screen.getByLabelText("Nome do turno"), "Manhã");
  await user.click(screen.getByRole("button", { name: "Adicionar turno" }));
  expect(
    await screen.findByRole("heading", { name: "Manhã" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Pessoas" }));
  await user.type(screen.getByLabelText("Nome da pessoa"), "Ana");
  await user.click(screen.getByRole("button", { name: "Adicionar pessoa" }));
  await waitFor(() => expect(saved().people[0].name).toBe("Ana"));
  expect(saved().people[0].availability[0]).toEqual([saved().shifts[0].id]);
});
test("cancelar exclusão preserva turno; confirmar remove referências", async () => {
  const data = fixture();
  data.assignments = { "2026-11-02": { p0: "a" } };
  dataOnServer = data;
  const user = userEvent.setup();
  render(<App />);
  await ready();
  await user.click(screen.getByRole("button", { name: "Turnos" }));
  await user.click(screen.getByRole("button", { name: "Excluir turno Manhã" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Cancelar",
    }),
  );
  expect(screen.getByRole("heading", { name: "Manhã" })).toBeInTheDocument();
  expect(saved()).toEqual(data);
  await user.click(screen.getByRole("button", { name: "Excluir turno Manhã" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Confirmar",
    }),
  );
  await waitFor(() => expect(saved().shifts).toHaveLength(0));
  expect(saved().assignments["2026-11-02"].p0).toBe("");
  expect(screen.getByText("Nenhum turno cadastrado.")).toBeInTheDocument();
});
test("geração fica em revisão e descartar mantém dados salvos", async () => {
  const data = fixture();
  dataOnServer = data;
  const user = userEvent.setup();
  render(<App />);
  await ready();
  await user.click(screen.getByRole("button", { name: "Gerar escala" }));
  await act(async () => generation.complete());
  expect(screen.getByText("Escala em revisão")).toBeInTheDocument();
  expect(saved()).toEqual(data);
  await user.click(screen.getByRole("button", { name: "Descartar revisão" }));
  expect(saved()).toEqual(data);
});
test("aceitar revisão válida persiste e recupera a escala ao recarregar", async () => {
  dataOnServer = fixture();
  const user = userEvent.setup(),
    view = render(<App />);
  await ready();
  await user.click(screen.getByRole("button", { name: "Gerar escala" }));
  await act(async () => generation.complete());
  await user.click(screen.getByRole("button", { name: "Validar e salvar" }));
  await waitFor(() =>
    expect(Object.keys(saved().assignments).length).toBeGreaterThan(0),
  );
  const before = saved();
  view.unmount();
  render(<App />);
  await ready();
  expect(saved()).toEqual(before);
  expect(screen.queryByText("Escala em revisão")).not.toBeInTheDocument();
  expect(screen.getAllByTitle(/ · Manhã$/).length).toBeGreaterThan(0);
});
test("ajuste manual inválido permanece somente na revisão", async () => {
  dataOnServer = fixture();
  const user = userEvent.setup();
  render(<App />);
  await ready();
  const cell = await openFirstDay(user);
  await user.selectOptions(cell, (cell as HTMLSelectElement).value ? "" : "a");
  screen.getByRole<HTMLDialogElement>("dialog").open = false;
  expect(screen.getByText("Escala em revisão")).toBeInTheDocument();
  expect(screen.queryByText(/Pendências na validação/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Validar e salvar" }));
  expect(screen.getByText("Escala em revisão")).toBeInTheDocument();
  const summary = await screen.findByText(/Pendências na validação/);
  expect(summary.closest("details")).not.toHaveAttribute("open");
  await user.click(summary);
  expect(summary.closest("details")).toHaveAttribute("open");
  expect(saved().assignments).toEqual({});
});
test("navegação pede confirmação para descartar revisão", async () => {
  dataOnServer = fixture();
  const user = userEvent.setup();
  render(<App />);
  await ready();
  const cell = await openFirstDay(user);
  await user.selectOptions(cell, (cell as HTMLSelectElement).value ? "" : "a");
  screen.getByRole<HTMLDialogElement>("dialog").open = false;
  await user.click(screen.getByRole("button", { name: "Turnos" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Cancelar",
    }),
  );
  expect(screen.getByText("Escala em revisão")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Turnos" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Confirmar",
    }),
  );
  expect(
    screen.getByRole("heading", { name: "O ritmo da operação." }),
  ).toBeInTheDocument();
});
test("cancelar busca encerra worker e mantém escala salva", async () => {
  const data = fixture();
  dataOnServer = data;
  const user = userEvent.setup();
  render(<App />);
  await ready();
  await user.click(screen.getByRole("button", { name: "Gerar escala" }));
  expect(
    screen.getByRole("button", { name: "Buscando escala…" }),
  ).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(generation.signal.aborted).toBe(true);
  expect(saved()).toEqual(data);
});
test("desmontar tela encerra worker pendente", async () => {
  dataOnServer = fixture();
  const user = userEvent.setup(),
    view = render(<App />);
  await ready();
  await user.click(screen.getByRole("button", { name: "Gerar escala" }));
  view.unmount();
  expect(generation.signal.aborted).toBe(true);
});

test("conflito ao salvar mantém o rascunho na tela", async () => {
  dataOnServer = fixture();
  rejectSave = true;
  const user = userEvent.setup();
  render(<App />);
  await ready();
  await user.click(screen.getByRole("button", { name: "Gerar escala" }));
  await act(async () => generation.complete());
  await user.click(screen.getByRole("button", { name: "Validar e salvar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "mudaram em outra aba",
  );
  expect(screen.getByText("Escala em revisão")).toBeInTheDocument();
  expect(saved().assignments).toEqual({});
});
