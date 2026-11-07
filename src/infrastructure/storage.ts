import { emptyData } from "../domain/types";
import type { AppData } from "../domain/types";
import { parseBackup } from "./backup";
export const STORAGE_KEY = "compasso-v1";
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function loadData(storage: StoragePort): {
  data: AppData;
  error: string;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return { data: raw ? parseBackup(raw) : emptyData(), error: "" };
  } catch {
    return {
      data: emptyData(),
      error:
        "Não foi possível recuperar os dados. Importe um backup ou revise o armazenamento.",
    };
  }
}
export function saveData(storage: StoragePort, data: AppData): string {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return "";
  } catch {
    return "Não foi possível salvar neste navegador. Exporte um backup antes de sair.";
  }
}
