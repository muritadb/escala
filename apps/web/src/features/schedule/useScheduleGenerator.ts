import { useEffect, useRef } from "react";
import { useApp } from "../../app/AppContext";
import { api } from "../../infrastructure/api";

export function useScheduleGenerator() {
  const {
    state,
    revision,
    dispatch,
    confirm,
    busy,
    generating,
    setGenerating,
    reportError,
  } = useApp();
  const active = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (!active.current) return;
      active.current.abort();
      active.current = null;
      setGenerating(false);
    },
    [setGenerating],
  );

  async function generate(timeoutMs: 5000 | 30000) {
    if (busy || revision === null || active.current) return;
    if (
      state.draft &&
      !(await confirm("Descartar a revisão atual e gerar outra escala?"))
    )
      return;
    const controller = new AbortController();
    active.current = controller;
    dispatch({ type: "messages", messages: [] });
    setGenerating(true);
    try {
      const result = await api.generate(
        state.month,
        { revision, timeoutMs },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (result.status === "feasible") {
        dispatch({ type: "draft", draft: result.assignments });
        dispatch({
          type: "messages",
          messages: [
            "Escala válida encontrada. Revise e salve para substituir a versão anterior.",
          ],
        });
      } else dispatch({ type: "messages", messages: result.errors });
    } catch (error) {
      if (!controller.signal.aborted) reportError(error);
    } finally {
      if (active.current === controller) {
        active.current = null;
        setGenerating(false);
      }
    }
  }

  function cancel() {
    if (!active.current) return;
    active.current.abort();
    active.current = null;
    setGenerating(false);
    dispatch({
      type: "messages",
      messages: ["Busca cancelada. A escala salva foi preservada."],
    });
  }

  return { generate, cancel, generating };
}
