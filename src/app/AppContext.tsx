import {
  createContext,
  useContext,
  useReducer,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode, Dispatch } from "react";
import type { AppData } from "../domain/types";
import { emptyData } from "../domain/types";
import { loadData, saveData } from "../infrastructure/storage";
import { reducer, initialState } from "./reducer";
import type { AppState, Action } from "./reducer";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { Confirmation } from "../components/ConfirmDialog";
interface ContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  update: (recipe: (data: AppData) => void) => void;
  confirm: (message: string) => Promise<boolean>;
  busy: boolean;
  setBusy: (value: boolean) => void;
}
const Context = createContext<ContextValue | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    try {
      const loaded = loadData(window.localStorage);
      return initialState(loaded.data, loaded.error);
    } catch {
      return initialState(
        emptyData(),
        "Não foi possível acessar o armazenamento deste navegador.",
      );
    }
  });
  const [busy, setBusy] = useState(false),
    [request, setRequest] = useState<Confirmation | null>(null),
    lastData = useRef(state.data),
    pending = useRef<Confirmation | null>(null);
  useEffect(() => {
    if (lastData.current === state.data) return;
    lastData.current = state.data;
    let error: string;
    try {
      error = saveData(window.localStorage, state.data);
    } catch {
      error =
        "Não foi possível salvar neste navegador. Exporte um backup antes de sair.";
    }
    dispatch({ type: "storageError", error });
  }, [state.data]);
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
  const update = (recipe: (data: AppData) => void) => {
    const data = structuredClone(state.data);
    recipe(data);
    dispatch({ type: "data", data });
  };
  return (
    <Context.Provider
      value={{ state, dispatch, update, confirm, busy, setBusy }}
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
