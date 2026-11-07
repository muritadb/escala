import { useEffect, useRef } from "react";
import { useApp } from "../../app/AppContext";
import type { SolveResult, WorkerRequest } from "../../domain/types";
export function useScheduleGenerator() {
  const { state, dispatch, confirm, busy, setBusy } = useApp(),
    worker = useRef<Worker | null>(null);
  useEffect(
    () => () => {
      worker.current?.terminate();
      setBusy(false);
    },
    [setBusy],
  );
  async function generate(timeout: number) {
    if (busy) return;
    if (
      state.draft &&
      !(await confirm("Descartar a revisão atual e gerar outra escala?"))
    )
      return;
    dispatch({ type: "draft", draft: null });
    dispatch({ type: "messages", messages: [] });
    setBusy(true);
    const fail = () => {
      worker.current?.terminate();
      worker.current = null;
      setBusy(false);
      dispatch({
        type: "messages",
        messages: [
          "Falha ao executar o gerador. Recarregue a página e tente novamente.",
        ],
      });
    };
    try {
      const current = new Worker(
        new URL("../../workers/schedule.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current = current;
      current.onmessage = (event: MessageEvent<SolveResult>) => {
        if (worker.current !== current) return;
        current.terminate();
        worker.current = null;
        setBusy(false);
        const result = event.data;
        if (result.status === "feasible") {
          dispatch({ type: "draft", draft: result.assignments });
          dispatch({
            type: "messages",
            messages: [
              "Escala válida encontrada. Revise e salve para substituir a versão anterior.",
            ],
          });
        } else dispatch({ type: "messages", messages: result.errors });
      };
      current.onerror = fail;
      current.onmessageerror = fail;
      current.postMessage({
        state: state.data,
        month: state.month,
        timeout,
      } satisfies WorkerRequest);
    } catch {
      fail();
    }
  }
  function cancel() {
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
    dispatch({
      type: "messages",
      messages: ["Busca cancelada. A escala salva foi preservada."],
    });
  }
  return { generate, cancel, busy };
}
