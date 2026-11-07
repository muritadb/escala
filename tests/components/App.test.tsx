import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/app/App";
import { fixture } from "../fixtures";
import { STORAGE_KEY } from "../../src/infrastructure/storage";
import { solve } from "../../src/domain/solver";
import type { WorkerRequest, SolveResult } from "../../src/domain/types";
class FakeWorker {
  static latest: FakeWorker;
  onmessage: ((event: MessageEvent<SolveResult>) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  request!: WorkerRequest;
  terminate = vi.fn();
  constructor() {
    FakeWorker.latest = this;
  }
  postMessage(request: WorkerRequest) {
    this.request = request;
  }
  complete() {
    this.onmessage?.({
      data: solve(this.request.state, this.request.month),
    } as MessageEvent<SolveResult>);
  }
}
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("Worker", FakeWorker);
});
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!);
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
  await user.click(screen.getByRole("button", { name: "Turnos" }));
  await user.type(screen.getByLabelText("Nome do turno"), "Manhã");
  await user.click(screen.getByRole("button", { name: "Adicionar turno" }));
  expect(screen.getByRole("heading", { name: "Manhã" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Pessoas" }));
  await user.type(screen.getByLabelText("Nome da pessoa"), "Ana");
  await user.click(screen.getByRole("button", { name: "Adicionar pessoa" }));
  await waitFor(() => expect(saved().people[0].name).toBe("Ana"));
  expect(saved().people[0].availability[0]).toEqual([saved().shifts[0].id]);
});
test("cancelar exclusão preserva turno; confirmar remove referências", async () => {
  const data = fixture();
  data.assignments = { "2026-11-02": { p0: "a" } };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  const user = userEvent.setup();
  render(<App />);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Gerar escala" }));
  await act(async () => FakeWorker.latest.complete());
  expect(screen.getByText("Escala em revisão")).toBeInTheDocument();
  expect(saved()).toEqual(data);
  await user.click(screen.getByRole("button", { name: "Descartar revisão" }));
  expect(saved()).toEqual(data);
  expect(FakeWorker.latest.terminate).toHaveBeenCalled();
});
test("aceitar revisão válida persiste e recupera a escala ao recarregar", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fixture()));
  const user = userEvent.setup(),
    view = render(<App />);
  await user.click(screen.getByRole("button", { name: "Gerar escala" }));
  await act(async () => FakeWorker.latest.complete());
  await user.click(screen.getByRole("button", { name: "Validar e salvar" }));
  await waitFor(() =>
    expect(Object.keys(saved().assignments).length).toBeGreaterThan(0),
  );
  const before = saved();
  view.unmount();
  render(<App />);
  expect(saved()).toEqual(before);
  expect(screen.queryByText("Escala em revisão")).not.toBeInTheDocument();
  expect(screen.getAllByTitle(/ · Manhã$/).length).toBeGreaterThan(0);
});
test("ajuste manual inválido permanece somente na revisão", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fixture()));
  const user = userEvent.setup();
  render(<App />);
  const cell = await openFirstDay(user);
  await user.selectOptions(cell, (cell as HTMLSelectElement).value ? "" : "a");
  screen.getByRole<HTMLDialogElement>("dialog").open = false;
  expect(screen.getByText("Escala em revisão")).toBeInTheDocument();
  expect(screen.queryByText(/Pendências na validação/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Validar e salvar" }));
  expect(screen.getByText("Escala em revisão")).toBeInTheDocument();
  const summary = screen.getByText(/Pendências na validação/);
  expect(summary.closest("details")).not.toHaveAttribute("open");
  await user.click(summary);
  expect(summary.closest("details")).toHaveAttribute("open");
  expect(saved().assignments).toEqual({});
});
test("navegação pede confirmação para descartar revisão", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fixture()));
  const user = userEvent.setup();
  render(<App />);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Gerar escala" }));
  expect(
    screen.getByRole("button", { name: "Buscando escala…" }),
  ).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(FakeWorker.latest.terminate).toHaveBeenCalled();
  expect(saved()).toEqual(data);
});
test("desmontar tela encerra worker pendente", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fixture()));
  const user = userEvent.setup(),
    view = render(<App />);
  await user.click(screen.getByRole("button", { name: "Gerar escala" }));
  const worker = FakeWorker.latest;
  view.unmount();
  expect(worker.terminate).toHaveBeenCalled();
});
