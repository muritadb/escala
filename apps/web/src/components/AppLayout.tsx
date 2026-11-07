import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useApp } from "../app/AppContext";
import type { Tab } from "@compasso/domain";
import { Notice } from "./Notice";
import { button } from "./styles";
interface Page {
  id: Tab;
  icon: ReactNode;
  name: string;
  title: string;
  description: string;
}

const pages: Page[] = [
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
const settingsPage: Page = {
  id: "configuracoes",
  name: "Configurações",
  title: "Configurações",
  description: "Gerencie os backups do Compasso.",
  icon: (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 3h4l.6 2.5 1.5.9 2.5-.8 2 3.5-1.9 1.7v2l1.9 1.7-2 3.5-2.5-.8-1.5.9-.6 2.5h-4l-.6-2.5-1.5-.9-2.5.8-2-3.5 1.9-1.7v-2L3.4 9.1l2-3.5 2.5.8 1.5-.9L10 3Z" />
      <circle cx="12" cy="11.8" r="3" />
    </svg>
  ),
};

const compactSidebarQuery = "(768px <= width < 1280px)";

function subscribeToSidebarSize(onChange: () => void) {
  const media = window.matchMedia?.(compactSidebarQuery);
  media?.addEventListener("change", onChange);
  return () => media?.removeEventListener("change", onChange);
}

function isCompactSidebarSize() {
  return window.matchMedia?.(compactSidebarQuery).matches ?? false;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const {
      state,
      dispatch,
      confirm,
      busy,
      revision,
      legacy,
      refresh,
      importBackup,
    } = useApp(),
    page =
      state.tab === settingsPage.id
        ? settingsPage
        : pages.find((p) => p.id === state.tab)!;
  const compactByDefault = useSyncExternalStore(
    subscribeToSidebarSize,
    isCompactSidebarSize,
  );
  const [sidebarOverride, setSidebarOverride] = useState<boolean | null>(null);
  const collapsed = sidebarOverride ?? compactByDefault;
  const compactText = collapsed ? "md:sr-only" : "";
  const toggleLabel = collapsed
    ? "Expandir barra lateral"
    : "Recolher barra lateral";

  async function navigate(tab: Tab) {
    if (busy || tab === state.tab) return;
    const keepDraft =
      tab === "configuracoes" ||
      (state.tab === "configuracoes" && tab === "escala");
    if (
      state.draft &&
      !keepDraft &&
      !(await confirm("Descartar a revisão para alterar as configurações?"))
    )
      return;
    dispatch({ type: "tab", tab, keepDraft });
  }
  function navigationButton(p: Page) {
    return (
      <button
        type="button"
        key={p.id}
        disabled={busy || revision === null}
        title={p.name}
        aria-current={state.tab === p.id ? "page" : undefined}
        onClick={() => void navigate(p.id)}
        className={
          "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-3 text-left text-sm hover:bg-[#31536c] focus-visible:outline-blue-200 " +
          (collapsed ? "md:justify-center md:px-0 md:text-lg " : "") +
          (state.tab === p.id ? "bg-[#31536c] text-white" : "text-blue-100/80")
        }
      >
        <span aria-hidden="true" className="shrink-0">
          {p.icon}
        </span>
        <span className={compactText}>{p.name}</span>
      </button>
    );
  }

  return (
    <div
      className={
        "min-h-screen md:flex " +
        (collapsed ? "[--sidebar-width:72px]" : "[--sidebar-width:230px]")
      }
    >
      <aside
        className={
          "flex flex-col gap-3 bg-sidebar p-5 text-white md:fixed md:inset-y-0 md:w-(--sidebar-width) md:pt-4 md:pb-8 " +
          (collapsed ? "md:px-3" : "md:px-6")
        }
      >
        <div
          className={
            "flex flex-col items-start gap-1 " +
            (collapsed ? "md:items-center" : "")
          }
        >
          <button
            type="button"
            aria-controls="sidebar-navigation"
            aria-expanded={!collapsed}
            aria-label={toggleLabel}
            title={toggleLabel}
            onClick={() => setSidebarOverride(!collapsed)}
            className={
              "hidden size-8 shrink-0 place-items-center rounded-md text-blue-100 hover:bg-[#31536c] focus-visible:outline-blue-200 md:grid " +
              (collapsed ? "" : "self-end")
            }
          >
            <svg
              aria-hidden="true"
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M9 5v14" />
              <path d={collapsed ? "m13 9 3 3-3 3" : "m16 9-3 3 3 3"} />
            </svg>
          </button>
          <a
            className="flex items-center gap-1 whitespace-nowrap text-[28px] font-semibold tracking-[-1.5px]"
            href="#"
            aria-label="Compasso"
          >
            <span aria-hidden="true">◷</span>
            <span className={compactText}>compasso</span>
          </a>
        </div>
        <p
          className={
            "mb-8 hidden text-blue-100/80 " + (collapsed ? "" : "md:block")
          }
        >
          Pessoas e tempo,
          <br />
          em equilíbrio.
        </p>
        <nav
          id="sidebar-navigation"
          aria-label="Navegação principal"
          className="flex gap-2 overflow-x-auto md:grid md:overflow-visible"
        >
          {pages.map(navigationButton)}
        </nav>
        <div
          className={
            "mt-auto hidden pt-8 text-sm md:block " +
            (collapsed ? "md:text-center" : "")
          }
          title={
            state.storageError || revision === null
              ? "Verifique os dados locais"
              : "Salvo no banco local"
          }
        >
          <span
            className={
              "inline-block size-2 rounded-full " +
              (collapsed ? "" : "mr-2 ") +
              (state.storageError || revision === null
                ? "bg-amber-300"
                : "bg-emerald-300")
            }
          />
          <span className={compactText}>
            {state.storageError || revision === null
              ? "Verifique os dados locais"
              : "Salvo no banco local"}
          </span>
          <small className={"mt-2 mb-4 block text-blue-100/80 " + compactText}>
            Sem login · dados locais
          </small>
        </div>
        <nav aria-label="Configurações do aplicativo" className="grid">
          {navigationButton(settingsPage)}
        </nav>
      </aside>
      <main className="w-full p-4 md:ml-(--sidebar-width) md:w-[calc(100%-var(--sidebar-width))] md:p-7 xl:p-10">
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
          {state.tab !== "configuracoes" && (
            <span className="w-fit whitespace-nowrap rounded-full bg-blue-100/60 px-4 py-2.5 text-xs">
              5 dias de trabalho · 2 de folga
            </span>
          )}
        </header>
        <Notice
          messages={state.storageError ? [state.storageError] : []}
          error
        />
        {state.storageError && (
          <button
            className={button + " mb-4"}
            disabled={busy}
            onClick={() => void refresh()}
          >
            {revision === null ? "Tentar novamente" : "Atualizar dados"}
          </button>
        )}
        {revision === 0 && legacy.data && (
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <p>Há dados de uma versão anterior neste navegador.</p>
            <button
              className={button}
              disabled={busy}
              onClick={async () => {
                if (
                  !legacy.data ||
                  !(await confirm(
                    "Importar os dados deste navegador para o banco local?",
                  ))
                )
                  return;
                if (await importBackup(legacy.data, "migrate")) {
                  dispatch({
                    type: "messages",
                    messages: ["Dados do navegador importados."],
                  });
                }
              }}
            >
              Importar dados deste navegador
            </button>
          </div>
        )}
        {revision === 0 && (
          <Notice messages={legacy.error ? [legacy.error] : []} />
        )}
        <Notice messages={state.messages} />
        {children}
      </main>
    </div>
  );
}
