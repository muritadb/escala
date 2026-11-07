import type { AppData, Assignments, Tab } from "@compasso/domain";
import { currentMonth } from "@compasso/domain";
export interface AppState {
  data: AppData;
  draft: Assignments | null;
  tab: Tab;
  month: string;
  messages: string[];
  storageError: string;
}
export type Action =
  | { type: "data"; data: AppData }
  | { type: "draft"; draft: Assignments | null }
  | { type: "tab"; tab: Tab; keepDraft?: boolean }
  | { type: "month"; month: string }
  | { type: "messages"; messages: string[] }
  | { type: "storageError"; error: string };
export function initialState(data: AppData, error = ""): AppState {
  return {
    data,
    draft: null,
    tab: "escala",
    month: currentMonth(),
    messages: [],
    storageError: error,
  };
}
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "data":
      return { ...state, data: action.data, draft: null };
    case "draft":
      return { ...state, draft: action.draft };
    case "tab":
      return {
        ...state,
        tab: action.tab,
        draft: action.keepDraft ? state.draft : null,
        messages: [],
      };
    case "month":
      return { ...state, month: action.month, messages: [] };
    case "messages":
      return { ...state, messages: action.messages };
    case "storageError":
      return { ...state, storageError: action.error };
  }
}
