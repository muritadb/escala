import { parseBackup, serializeBackup, type AppData } from "@compasso/domain";
export { check, parseBackup, serializeBackup } from "@compasso/domain";
export async function readBackup(file: File): Promise<AppData> {
  if (file.size > 10000000) throw Error("Backup maior que 10 MB");
  return parseBackup(await file.text());
}
export function downloadBackup(data: AppData): void {
  const url = URL.createObjectURL(
    new Blob([serializeBackup(data)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "compasso-backup.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
