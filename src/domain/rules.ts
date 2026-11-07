import type { AppData, Person, Shift } from "./types";
import { dow } from "./dates";
export const need = (state: AppData, day: string, shift: string) =>
  state.operation.days === 6 && dow(day) === state.operation.closed
    ? 0
    : (state.exceptions[day]?.[shift] ?? state.coverage[dow(day)]?.[shift]);
const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function overlap(
  a: string | undefined,
  b: string | undefined,
  shifts: Shift[],
): boolean {
  const x = shifts.find((t) => t.id === a),
    y = shifts.find((t) => t.id === b);
  return !!(
    x &&
    y &&
    minutes(x.end) <= minutes(x.start) &&
    minutes(x.end) > minutes(y.start)
  );
}
export const allowed = (person: Person, day: string, shift: string) =>
  person.availability[dow(day)]?.includes(shift) ?? false;
