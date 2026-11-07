import type { AppData } from "../domain/types";
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !["__proto__", "constructor", "prototype"].includes(value)
  );
}
const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value + "T12:00:00Z")) &&
  new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value;
export function check(value: unknown): asserts value is AppData {
  if (
    !record(value) ||
    value.version !== 1 ||
    !Array.isArray(value.people) ||
    !Array.isArray(value.shifts) ||
    !Array.isArray(value.coverage) ||
    value.coverage.length !== 7 ||
    !record(value.operation) ||
    ![6, 7].includes(Number(value.operation.days)) ||
    typeof value.operation.days !== "number" ||
    !Number.isInteger(value.operation.closed) ||
    Number(value.operation.closed) < 0 ||
    Number(value.operation.closed) > 6 ||
    !record(value.exceptions) ||
    !record(value.assignments)
  )
    throw Error("Formato de backup inválido");
  const shifts = new Set<string>(),
    people = new Set<string>();
  for (const shift of value.shifts) {
    if (
      !record(shift) ||
      !validId(shift.id) ||
      shifts.has(shift.id) ||
      typeof shift.name !== "string" ||
      !shift.name.trim() ||
      typeof shift.start !== "string" ||
      typeof shift.end !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.end)
    )
      throw Error("Turno inválido");
    shifts.add(shift.id);
  }
  for (const person of value.people) {
    if (
      !record(person) ||
      !validId(person.id) ||
      people.has(person.id) ||
      typeof person.name !== "string" ||
      !person.name.trim() ||
      typeof person.active !== "boolean" ||
      !Array.isArray(person.availability) ||
      person.availability.length !== 7 ||
      !person.availability.every(
        (day) =>
          Array.isArray(day) &&
          day.every((id) => typeof id === "string" && shifts.has(id)),
      )
    )
      throw Error("Pessoa inválida");
    people.add(person.id);
  }
  for (const row of [...value.coverage, ...Object.values(value.exceptions)]) {
    if (!record(row)) throw Error("Cobertura inválida");
    for (const [id, count] of Object.entries(row))
      if (
        !shifts.has(id) ||
        !(
          count === "" ||
          (typeof count === "number" && Number.isInteger(count) && count >= 0)
        )
      )
        throw Error("Cobertura inválida");
  }
  for (const day of Object.keys(value.exceptions))
    if (!validDate(day)) throw Error("Data de exceção inválida");
  for (const [day, row] of Object.entries(value.assignments)) {
    if (!validDate(day) || !record(row)) throw Error("Data inválida");
    for (const [id, shift] of Object.entries(row))
      if (
        !people.has(id) ||
        typeof shift !== "string" ||
        (shift !== "" && !shifts.has(shift))
      )
        throw Error("Atribuição inválida");
  }
}
export function parseBackup(text: string): AppData {
  const value: unknown = JSON.parse(text);
  check(value);
  return value;
}
export function serializeBackup(data: AppData): string {
  return JSON.stringify(data, null, 2);
}
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
