import { useRef, type ChangeEvent } from "react";
import { useApp } from "../../app/AppContext";
import { button, primary } from "../../components/styles";
import { api } from "../../infrastructure/api";
import { downloadBackup, readBackup } from "../../infrastructure/backup";

export function SettingsPage() {
  const { busy, revision, confirm, importBackup, dispatch, reportError } =
    useApp();
  const input = useRef<HTMLInputElement>(null);

  async function exportBackup() {
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
    <section
      aria-labelledby="backup-title"
      className="max-w-3xl overflow-hidden rounded-lg border border-line bg-white"
    >
      <header className="border-b border-line bg-slate-50 px-5 py-4 sm:px-6">
        <h2 id="backup-title" className="text-lg font-semibold">
          Backups
        </h2>
        <p className="mt-1 text-sm text-muted">
          Crie uma cópia dos dados locais ou restaure um arquivo do Compasso.
        </p>
      </header>
      <div className="divide-y divide-line">
        <div className="flex flex-col items-start gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="font-semibold">Baixar uma cópia</h3>
            <p className="mt-1 text-sm text-muted">
              Exporta os cadastros e as escalas salvas em um arquivo JSON.
            </p>
          </div>
          <button
            type="button"
            className={primary + " shrink-0"}
            disabled={revision === null}
            onClick={() => void exportBackup()}
          >
            Exportar backup
          </button>
        </div>
        <div className="flex flex-col items-start gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="font-semibold">Restaurar dados</h3>
            <p className="mt-1 text-sm text-muted">
              Após a confirmação, os dados do arquivo substituem os dados
              salvos.
            </p>
          </div>
          <button
            type="button"
            className={button + " shrink-0"}
            disabled={busy || revision === null}
            onClick={() => input.current?.click()}
          >
            Importar backup
          </button>
        </div>
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
    </section>
  );
}
