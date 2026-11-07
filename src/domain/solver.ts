import type { AppData, Person, SolveResult } from "./types";
import { range, add, dow } from "./dates";
import { allowed, overlap, need } from "./rules";
import { validate } from "./validation";
export function solve(
  s: AppData,
  m: string,
  { timeout = 5000 }: { timeout?: number } = {},
): SolveResult {
  const days = range(m),
    ps = s.people.filter((p) => p.active),
    a = structuredClone(s.assignments),
    end = Date.now() + timeout;
  let timed = false,
    nodes = 0;
  if (!ps.length || !s.shifts.length)
    return {
      status: "infeasible",
      errors: ["Cadastre pessoas ativas e turnos."],
    };
  for (const d of days)
    for (const t of s.shifts)
      if (need(s, d, t.id) == null || need(s, d, t.id) === "")
        return {
          status: "infeasible",
          errors: ["Preencha a cobertura de " + t.name + " em " + d],
        };
  const fixed = (d: string) =>
    !d.startsWith(m) && Object.hasOwn(s.assignments, d);
  for (let w = 0; w < days.length; w += 7) {
    const total = days
      .slice(w, w + 7)
      .reduce(
        (n, d) =>
          n + s.shifts.reduce((v, t) => v + Number(need(s, d, t.id)), 0),
        0,
      );
    if (total > ps.length * 5)
      return {
        status: "infeasible",
        errors: [
          "A cobertura semanal exige " +
            total +
            " dias de trabalho; a equipe oferece " +
            ps.length * 5 +
            ".",
        ],
      };
  }
  const tasks: { p: Person; week: string[] }[] = [];
  for (let w = 0; w < days.length; w += 7) {
    const order = [...ps].sort(
      (x, y) =>
        x.availability.flat().length - y.availability.flat().length ||
        Object.entries(a).filter(
          ([d, v]) => d < days[w] && dow(d) >= 5 && !v[x.id],
        ).length -
          Object.entries(a).filter(
            ([d, v]) => d < days[w] && dow(d) >= 5 && !v[y.id],
          ).length,
    );
    for (const p of order) tasks.push({ p, week: days.slice(w, w + 7) });
  }
  const counts = Object.fromEntries(
    days.map((d) => [d, Object.fromEntries(s.shifts.map((t) => [t.id, 0]))]),
  );
  const search = (i: number): boolean => {
    if (++nodes % 128 === 0 && Date.now() > end) timed = true;
    if (timed) return false;
    if (i === tasks.length) return true;
    if (i % ps.length === 0) {
      const start = tasks[i].week[0],
        hist = (p: Person) =>
          Object.entries(a).filter(
            ([d, v]) =>
              d < start && dow(d) >= 5 && Object.hasOwn(v, p.id) && !v[p.id],
          ).length;
      const group = tasks
        .slice(i, i + ps.length)
        .sort(
          (x, y) =>
            x.p.availability.flat().length - y.p.availability.flat().length ||
            hist(x.p) - hist(y.p),
        );
      tasks.splice(i, ps.length, ...group);
    }
    const { p, week } = tasks[i],
      pattern: string[] = [];
    const history = Object.entries(a).filter(
      ([d, v]) => d < week[0] && dow(d) >= 5 && !v[p.id],
    ).length;
    const visit = (k: number, n: number): boolean => {
      if (++nodes % 128 === 0 && Date.now() > end) timed = true;
      if (timed || n > 5 || n + 7 - k < 5) return false;
      if (k === 7) {
        if (n !== 5) return false;
        const old = week.map((d) => a[d]?.[p.id]);
        for (let j = 0; j < 7; j++) {
          a[week[j]] ??= {};
          a[week[j]][p.id] = pattern[j];
        }
        if (search(i + 1)) return true;
        for (let j = 0; j < 7; j++) {
          if (old[j] === undefined) delete a[week[j]][p.id];
          else a[week[j]][p.id] = old[j];
        }
        return false;
      }
      const d = week[k];
      let opts = fixed(d)
        ? [s.assignments[d][p.id] || ""]
        : ["", ...s.shifts.filter((t) => allowed(p, d, t.id)).map((t) => t.id)];
      opts = opts.filter(
        (t) =>
          !t ||
          (allowed(p, d, t) &&
            !(s.operation.days === 6 && dow(d) === s.operation.closed)),
      );
      opts.sort((x, y) => {
        const score = (t: string) =>
          t
            ? (counts[d][t] < Number(need(s, d, t)) ? 100 : 0) +
              (dow(d) < 5 ? 10 : 0)
            : dow(d) >= 5
              ? 8 - history * 0.02
              : 0;
        return score(y) - score(x);
      });
      for (const t of opts) {
        if (overlap(k ? pattern[k - 1] : a[add(d, -1)]?.[p.id], t, s.shifts))
          continue;
        if (
          k === 6 &&
          overlap(t, a[add(d, 1)]?.[p.id], s.shifts) &&
          !days.includes(add(d, 1))
        )
          continue;
        pattern[k] = t;
        if (t) counts[d][t]++;
        const remaining = tasks
          .slice(i + 1)
          .filter((v) => v.week[0] === week[0]);
        const possible = s.shifts.every(
          (sh) =>
            counts[d][sh.id] +
              remaining.filter(
                (v) =>
                  allowed(v.p, d, sh.id) &&
                  (!fixed(d) || s.assignments[d][v.p.id] === sh.id),
              ).length >=
            Number(need(s, d, sh.id)),
        );
        if (possible && visit(k + 1, n + Number(!!t))) return true;
        if (t) counts[d][t]--;
      }
      return false;
    };
    return visit(0, 0);
  };
  if (!search(0))
    return {
      status: timed ? "timeout" : "infeasible",
      errors: [
        timed
          ? "Limite de tempo atingido. A inviabilidade não foi comprovada. Tente uma busca de 30 segundos."
          : "Não existe escala com estas restrições. Revise cobertura, disponibilidade e datas preservadas.",
      ],
    };
  const errors = validate(s, m, a);
  return errors.length
    ? { status: "infeasible", errors }
    : { status: "feasible", assignments: a };
}
