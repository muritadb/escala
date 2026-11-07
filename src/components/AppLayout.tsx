import type { ReactNode } from "react";
import { useApp } from "../app/AppContext";
import type { Tab } from "../domain/types";
import { downloadBackup, readBackup } from "../infrastructure/backup";
import { Notice } from "./Notice";
import { button } from "./styles";
const pages: {
  id: Tab;
  icon: string;
  name: string;
  title: string;
  description: string;
}[] = [
  {
    id: "escala",
    icon: "▦",
    name: "Escala mensal",
    title: "Cada dia, uma equipe.",
    description: "Monte a escala e encontre espaço para as folgas.",
  },
  {
    id: "pessoas",
    icon: "♙",
    name: "Pessoas",
    title: "Quem faz acontecer.",
    description:
      "Cadastre a equipe e informe quando cada pessoa pode trabalhar.",
  },
  {
    id: "turnos",
    icon: "◷",
    name: "Turnos",
    title: "O ritmo da operação.",
    description: "Defina os horários que compõem o dia de trabalho.",
  },
  {
    id: "cobertura",
    icon: "▤",
    name: "Operação e cobertura",
    title: "A equipe certa em cada turno.",
    description: "Escolha os dias de funcionamento e a cobertura mínima.",
  },
];
export function AppLayout({ children }: { children: ReactNode }) {
  const { state, dispatch, confirm, busy } = useApp(),
    page = pages.find((p) => p.id === state.tab)!;
  async function navigate(tab: Tab) {
    if (busy || tab === state.tab) return;
    if (
      state.draft &&
      !(await confirm("Descartar a revisão para alterar as configurações?"))
    )
      return;
    dispatch({ type: "tab", tab });
  }
  return (
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col gap-3 bg-sidebar p-5 text-white md:fixed md:inset-y-0 md:w-[230px] md:px-6 md:py-8">
        <a className="text-[34px] font-semibold tracking-[-1.5px]" href="#">
          ◷ compasso
        </a>
        <p className="mb-8 hidden text-blue-100/80 md:block">
          Pessoas e tempo,
          <br />
          em equilíbrio.
        </p>
        <nav
          aria-label="Navegação principal"
          className="flex gap-2 overflow-x-auto md:grid"
        >
          {pages.map((p) => (
            <button
              key={p.id}
              disabled={busy}
              aria-current={state.tab === p.id ? "page" : undefined}
              onClick={() => void navigate(p.id)}
              className={
                "whitespace-nowrap rounded-md px-3 py-3 text-left text-sm hover:bg-[#31536c] " +
                (state.tab === p.id
                  ? "bg-[#31536c] text-white"
                  : "text-blue-100/80")
              }
            >
              <span aria-hidden="true">{p.icon}</span> &nbsp;{p.name}
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden pt-8 text-sm md:block">
          <span
            className={
              "mr-2 inline-block size-2 rounded-full " +
              (state.storageError ? "bg-amber-300" : "bg-emerald-300")
            }
          />
          {state.storageError
            ? "Armazenamento indisponível"
            : "Salvo neste navegador"}
          <small className="mt-2 mb-4 block text-blue-100/80">
            Sem login · dados locais
          </small>
        </div>
        <button className={button} onClick={() => downloadBackup(state.data)}>
          Exportar backup
        </button>
        <label className="rounded-md border border-line bg-white p-3 text-center text-ink">
          Importar backup
          <input
            aria-label="Importar backup"
            type="file"
            disabled={busy}
            accept=".json,application/json"
            className="max-w-full text-xs"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                const data = await readBackup(file);
                if (
                  !(await confirm(
                    "Substituir todos os dados locais pelo backup selecionado? A revisão atual também será descartada.",
                  ))
                )
                  return;
                dispatch({ type: "data", data });
                dispatch({
                  type: "messages",
                  messages: [
                    "Backup importado. Valide as escalas antes de utilizá-las.",
                  ],
                });
              } catch (error) {
                dispatch({
                  type: "messages",
                  messages: [
                    "Importação recusada: " +
                      (error instanceof Error
                        ? error.message
                        : "Arquivo inválido"),
                  ],
                });
              }
            }}
          />
        </label>
      </aside>
      <main className="w-full p-4 md:ml-[230px] md:w-[calc(100%-230px)] md:p-7 xl:p-10">
        <header className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div>
            <p className="text-sm text-muted">
              Organização da equipe / {page.name}
            </p>
            <h1 className="mt-4 mb-2 text-3xl font-semibold tracking-tight lg:text-[38px]">
              {page.title}
            </h1>
            <p className="text-muted">{page.description}</p>
          </div>
          <span className="w-fit whitespace-nowrap rounded-full bg-blue-100/60 px-4 py-2.5 text-xs">
            5 dias de trabalho · 2 de folga
          </span>
        </header>
        <Notice
          messages={state.storageError ? [state.storageError] : []}
          error
        />
        <Notice messages={state.messages} />
        {children}
      </main>
    </div>
  );
}
