import { parseBackup, type AppData } from "@compasso/domain";

export const STORAGE_KEY = "compasso-v1";

export function loadLegacyData(storage: Pick<Storage, "getItem">): {
  data: AppData | null;
  error: string;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return { data: raw ? parseBackup(raw) : null, error: "" };
  } catch {
    return {
      data: null,
      error:
        "Não foi possível ler os dados antigos deste navegador. Você pode importar um backup JSON.",
    };
  }
}
