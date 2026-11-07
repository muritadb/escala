import type { AppData, Assignments } from "./types";
import { range, add, dow } from "./dates";
import { allowed, overlap, need } from "./rules";
export function validate(
  s: AppData,
  m: string,
  a: Assignments = s.assignments,
): string[] {
  const errors: string[] = [],
    days = range(m),
    ps = s.people.filter((p) => p.active);
  for (const p of ps) {
    for (let i = 0; i < days.length; i += 7) {
      const n = days.slice(i, i + 7).filter((d) => a[d]?.[p.id]).length;
      if (n !== 5)
        errors.push(p.name + ": " + n + "/5 dias na semana de " + days[i]);
    }
    for (const d of days) {
      const t = a[d]?.[p.id];
      if (t && (!s.shifts.some((x) => x.id === t) || !allowed(p, d, t)))
        errors.push(p.name + ": turno indisponível em " + d);
      if (t && s.operation.days === 6 && dow(d) === s.operation.closed)
        errors.push(d + ": operação fechada");
      if (overlap(a[add(d, -1)]?.[p.id], t, s.shifts))
        errors.push(p.name + ": sobreposição em " + d);
    }
    if (
      overlap(
        a[days[days.length - 1]]?.[p.id],
        a[add(days[days.length - 1], 1)]?.[p.id],
        s.shifts,
      )
    )
      errors.push(p.name + ": sobreposição após o período");
  }
  for (const d of days)
    for (const t of s.shifts) {
      const n = need(s, d, t.id);
      if (n == null || n === "")
        errors.push(d + ", " + t.name + ": informe a cobertura");
      else if (ps.filter((p) => a[d]?.[p.id] === t.id).length < n)
        errors.push(d + ", " + t.name + ": cobertura abaixo de " + n);
    }
  return [...new Set(errors)];
}
