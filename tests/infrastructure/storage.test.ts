import { test, expect, vi } from "vitest";
import { fixture } from "../fixtures";
import {
  loadData,
  saveData,
  STORAGE_KEY,
} from "../../src/infrastructure/storage";
import {
  parseBackup,
  serializeBackup,
  readBackup,
} from "../../src/infrastructure/backup";
import { emptyData } from "../../src/domain/types";
test("lê o formato legado e usa a mesma chave local", () => {
  const data = fixture(),
    storage = { getItem: vi.fn(() => JSON.stringify(data)), setItem: vi.fn() };
  expect(loadData(storage)).toEqual({ data, error: "" });
  expect(storage.getItem).toHaveBeenCalledWith("compasso-v1");
  expect(saveData(storage, data)).toBe("");
  expect(storage.setItem).toHaveBeenCalledWith(
    STORAGE_KEY,
    JSON.stringify(data),
  );
});
test("armazenamento vazio inicia sem dados", () => {
  expect(loadData({ getItem: () => null, setItem: () => {} })).toEqual({
    data: emptyData(),
    error: "",
  });
});
test("dados corrompidos não são sobrescritos durante a leitura", () => {
  const storage = { getItem: () => "{invalid", setItem: vi.fn() };
  expect(loadData(storage).error).toBeTruthy();
  expect(storage.setItem).not.toHaveBeenCalled();
});
test("falhas de leitura e gravação retornam mensagens úteis", () => {
  const storage = {
    getItem: () => {
      throw Error("denied");
    },
    setItem: () => {
      throw Error("quota");
    },
  };
  expect(loadData(storage).error).toContain("recuperar");
  expect(saveData(storage, fixture())).toContain("Exporte um backup");
});
test("exportação e importação preservam dados e rejeitam backups inválidos", () => {
  const data = fixture();
  expect(parseBackup(serializeBackup(data))).toEqual(data);
  expect(() => parseBackup('{"version":2}')).toThrow();
  expect(() =>
    parseBackup(
      JSON.stringify({ ...data, exceptions: { "2026-02-31": { a: 1 } } }),
    ),
  ).toThrow();
});
test("backup acima de 10 MB é recusado antes da leitura", async () => {
  const text = vi.fn();
  await expect(
    readBackup({ size: 10000001, text } as unknown as File),
  ).rejects.toThrow("10 MB");
  expect(text).not.toHaveBeenCalled();
});
