import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { useApp } from "../app/AppContext";
import { api } from "../infrastructure/api";
import { downloadBackup, readBackup } from "../infrastructure/backup";

const item =
  "w-full rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-slate-100 disabled:opacity-50";

export function BackupMenu({ collapsed }: { collapsed: boolean }) {
  const { busy, revision, confirm, importBackup, dispatch, reportError } =
    useApp();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      )
        setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  function closeAndFocus() {
    setOpen(false);
    trigger.current?.focus();
  }

  async function exportBackup() {
    closeAndFocus();
    try {
      downloadBackup((await api.state()).data);
    } catch (error) {
      reportError(error);
    }
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    closeAndFocus();
    try {
      const data = await readBackup(file);
      if (
        !(await confirm(
          "Substituir todos os dados locais pelo backup selecionado? A revisão atual também será descartada.",
        ))
      )
        return;
      if (!(await importBackup(data, "replace"))) return;
      dispatch({
        type: "messages",
        messages: ["Backup importado. Valide as escalas antes de utilizá-las."],
      });
    } catch (error) {
      dispatch({
        type: "messages",
        messages: [
          "Importação recusada: " +
            (error instanceof Error ? error.message : "Arquivo inválido"),
        ],
      });
    }
  }

  return (
    <div
      ref={container}
      className="relative"
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          closeAndFocus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        title="Configurações"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
        className={
          "flex min-h-11 w-full items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-blue-100 hover:bg-[#31536c] focus-visible:outline-blue-200 " +
          (collapsed ? "md:justify-center md:px-0 " : "") +
          (open ? "bg-[#31536c]" : "")
        }
      >
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
        <span className={collapsed ? "md:sr-only" : undefined}>
          Configurações
        </span>
      </button>
      <div
        id={menuId}
        hidden={!open}
        className={
          "absolute top-full left-0 z-30 mt-2 w-52 max-w-[calc(100vw-2.5rem)] rounded-lg border border-line bg-white p-1.5 text-ink shadow-lg md:top-auto md:bottom-0 md:left-full md:mt-0 " +
          (collapsed ? "md:ml-4" : "md:ml-8")
        }
      >
        <button
          type="button"
          className={item}
          disabled={revision === null}
          onClick={() => void exportBackup()}
        >
          Exportar backup
        </button>
        <button
          type="button"
          className={item}
          disabled={busy || revision === null}
          onClick={() => input.current?.click()}
        >
          Importar backup
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        aria-label="Arquivo de backup"
        disabled={busy || revision === null}
        hidden
        onChange={(event) => void selectFile(event)}
      />
    </div>
  );
}
