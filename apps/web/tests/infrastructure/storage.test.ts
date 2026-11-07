import { test, expect, vi } from "vitest";
import { fixture } from "../fixtures";
import { loadLegacyData } from "../../src/infrastructure/storage";
import {
  parseBackup,
  serializeBackup,
  readBackup,
} from "../../src/infrastructure/backup";
test("lê o formato legado pela mesma chave e preserva a cópia", () => {
  const data = fixture();
  const storage = {
    getItem: vi.fn(() => JSON.stringify(data)),
    setItem: vi.fn(),
  };
  expect(loadLegacyData(storage)).toEqual({ data, error: "" });
  expect(storage.getItem).toHaveBeenCalledWith("compasso-v1");
  expect(storage.setItem).not.toHaveBeenCalled();
});
test("armazenamento vazio não oferece migração", () => {
  expect(loadLegacyData({ getItem: () => null })).toEqual({
    data: null,
    error: "",
  });
});
test("dados corrompidos não são sobrescritos durante a leitura", () => {
  const storage = { getItem: () => "{invalid", setItem: vi.fn() };
  expect(loadLegacyData(storage)).toMatchObject({
    data: null,
    error: expect.stringContaining("ler os dados antigos"),
  });
  expect(storage.setItem).not.toHaveBeenCalled();
});
test("falha de leitura sugere importar um backup", () => {
  expect(
    loadLegacyData({
      getItem: () => {
        throw Error("denied");
      },
    }).error,
  ).toContain("backup JSON");
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
