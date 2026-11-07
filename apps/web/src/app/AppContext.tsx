import {
  createContext,
  useContext,
  useReducer,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type Dispatch,
} from "react";
import {
  emptyData,
  settingsOf,
  type AppData,
  type Assignments,
  type ImportRequest,
  type StateSnapshot,
} from "@compasso/domain";
import { api, ApiError } from "../infrastructure/api";
import { loadLegacyData } from "../infrastructure/storage";
import { reducer, initialState, type AppState, type Action } from "./reducer";
import { ConfirmDialog, type Confirmation } from "../components/ConfirmDialog";

interface ContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  update: (recipe: (data: AppData) => void) => Promise<boolean>;
  importBackup: (
    data: AppData,
    mode: ImportRequest["mode"],
  ) => Promise<boolean>;
  saveSchedule: (
    month: string,
    assignments: Assignments,
  ) => Promise<string[] | null>;
  confirm: (message: string) => Promise<boolean>;
  reportError: (error: unknown) => void;
  refresh: () => Promise<void>;
  loading: boolean;
  revision: number | null;
  legacy: ReturnType<typeof loadLegacyData>;
  busy: boolean;
  generating: boolean;
  setGenerating: (value: boolean) => void;
}

const Context = createContext<ContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initialState(emptyData()),
  );
  const [legacy] = useState(() =>
    loadLegacyData({ getItem: (key) => window.localStorage.getItem(key) }),
  );
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const writing = useRef(false);
  const [request, setRequest] = useState<Confirmation | null>(null);
  const pending = useRef<Confirmation | null>(null);

  const reportError = useCallback((error: unknown) => {
    dispatch({
      type: "storageError",
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a operação.",
    });
  }, []);

  const receive = useCallback((snapshot: StateSnapshot) => {
    setRevision(snapshot.revision);
    dispatch({ type: "data", data: snapshot.data });
    dispatch({ type: "storageError", error: "" });
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const snapshot = await api.state(signal);
        if (!signal?.aborted) receive(snapshot);
      } catch (error) {
        if (!signal?.aborted) reportError(error);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [receive, reportError],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => () => pending.current?.resolve(false), []);

  const confirm = useCallback(
    (message: string) =>
      new Promise<boolean>((resolve) => {
        pending.current?.resolve(false);
        const next = { message, resolve };
        pending.current = next;
        setRequest(next);
      }),
    [],
  );
  const close = useCallback((accepted: boolean) => {
    pending.current?.resolve(accepted);
    pending.current = null;
    setRequest(null);
  }, []);

  const busy = loading || saving || generating;
  async function refresh() {
    if (
      busy ||
      (state.draft &&
        !(await confirm(
          "Descartar a revisão e carregar os dados salvos no servidor?",
        )))
    )
      return;
    await load();
  }

  async function commit(
    write: (baseRevision: number) => Promise<StateSnapshot>,
  ) {
    if (revision === null || busy || writing.current) return false;
    writing.current = true;
    setSaving(true);
    try {
      receive(await write(revision));
      return true;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.problem.code === "invalid_schedule"
      )
        throw error;
      reportError(error);
      return false;
    } finally {
      writing.current = false;
      setSaving(false);
    }
  }

  function update(recipe: (data: AppData) => void) {
    return commit((revision) => {
      const data = structuredClone(state.data);
      recipe(data);
      return api.settings({ revision, settings: settingsOf(data) });
    });
  }

  function importBackup(data: AppData, mode: ImportRequest["mode"]) {
    return commit((revision) => api.import({ revision, mode, data }));
  }

  async function saveSchedule(month: string, assignments: Assignments) {
    try {
      return (await commit((revision) =>
        api.save(month, revision, assignments),
      ))
        ? []
        : null;
    } catch (error) {
      if (error instanceof ApiError)
        return error.problem.errors ?? [error.message];
      throw error;
    }
  }

  return (
    <Context.Provider
      value={{
        state,
        dispatch,
        update,
        importBackup,
        saveSchedule,
        confirm,
        reportError,
        refresh,
        loading,
        revision,
        legacy,
        busy,
        generating,
        setGenerating,
      }}
    >
      {children}
      <ConfirmDialog request={request} onClose={close} />
    </Context.Provider>
  );
}

export function useApp() {
  const context = useContext(Context);
  if (!context) throw Error("AppProvider ausente");
  return context;
}
