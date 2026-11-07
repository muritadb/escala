import { test } from "vitest";
import assert from "node:assert/strict";
import { range, dow } from "@compasso/domain";
import { solve } from "@compasso/domain/solver";
import { validate } from "@compasso/domain";
import { overlap } from "@compasso/domain";
import { check } from "../../src/infrastructure/backup";
import { removeShift } from "@compasso/domain";
import type { AppData } from "@compasso/domain";
function state(n = 3): AppData {
  return {
    version: 1,
    people: Array.from({ length: n }, (_, i) => ({
      id: "p" + i,
      name: "Pessoa " + i,
      active: true,
      availability: Array.from({ length: 7 }, () => ["a"]),
    })),
    shifts: [{ id: "a", name: "Manhã", start: "08:00", end: "16:00" }],
    operation: { days: 7, closed: 6 },
    coverage: Array.from({ length: 7 }, () => ({ a: 1 })),
    exceptions: {},
    assignments: {},
  };
}
test("semanas completas entre meses e anos", () => {
  const ds = range("2027-01");
  assert.equal(ds[0], "2026-12-28");
  assert.equal(ds.at(-1), "2027-01-31");
  assert.equal(ds.length % 7, 0);
});
test("operação 7 dias, 5 dias por pessoa, cobertura e revisão imutável", () => {
  const s = state(),
    before = JSON.stringify(s),
    r = solve(s, "2026-11");
  assert.equal(r.status, "feasible");
  assert.deepEqual(validate(s, "2026-11", r.assignments), []);
  assert.equal(JSON.stringify(s), before);
});
test("operação 6 dias mantém domingo fechado", () => {
  const s = state();
  s.operation.days = 6;
  const r = solve(s, "2026-11");
  assert.equal(r.status, "feasible");
  for (const [d, v] of Object.entries(r.assignments))
    if (dow(d) === 6) assert.ok(Object.values(v).every((t) => !t));
});
test("cobertura ausente impede geração; zero é válido", () => {
  const s = state(1);
  s.coverage[0].a = "";
  assert.equal(solve(s, "2026-11").status, "infeasible");
  s.coverage.forEach((r) => (r.a = 0));
  assert.equal(solve(s, "2026-11").status, "feasible");
});
test("insuficiência e disponibilidade impossível", () => {
  assert.equal(solve(state(1), "2026-11").status, "infeasible");
  const s = state();
  s.people[0].availability = Array.from({ length: 7 }, () => []);
  assert.equal(solve(s, "2026-11").status, "infeasible");
});
test("vários turnos e disponibilidade", () => {
  const s = state(6);
  s.shifts.push({ id: "b", name: "Tarde", start: "16:00", end: "23:00" });
  s.people
    .slice(3)
    .forEach((p) => (p.availability = Array.from({ length: 7 }, () => ["b"])));
  s.coverage.forEach((v) => (v.b = 1));
  const r = solve(s, "2026-11");
  assert.equal(r.status, "feasible");
  assert.deepEqual(validate(s, "2026-11", r.assignments), []);
});
test("sobreposição noturna e fronteira exata", () => {
  const shifts = [
    { id: "n", name: "Noite", start: "22:00", end: "10:00" },
    { id: "a", name: "Manhã", start: "08:00", end: "16:00" },
    { id: "b", name: "Tarde", start: "10:00", end: "18:00" },
  ];
  assert.equal(overlap("n", "a", shifts), true);
  assert.equal(overlap("n", "b", shifts), false);
});
test("datas já salvas de outros meses são fixas", () => {
  const s = state();
  const r = solve(s, "2026-10");
  assert.equal(r.status, "feasible");
  s.assignments = r.assignments;
  const next = solve(s, "2026-11");
  assert.equal(next.status, "feasible");
  for (const [d, v] of Object.entries(r.assignments))
    assert.deepEqual(next.assignments[d], v);
});
test("exceção e ajuste manual inválido são detectados", () => {
  const s = state(),
    r = solve(s, "2026-11");
  if (r.status !== "feasible") throw Error("Escala não encontrada");
  const d = "2026-11-02";
  s.exceptions[d] = { a: 3 };
  r.assignments[d].p0 = "";
  assert.ok(validate(s, "2026-11", r.assignments).length > 0);
});
test("folgas históricas influenciam prioridade", () => {
  const s = state(2);
  s.coverage.forEach((v) => (v.a = 0));
  for (const d of ["2026-10-24", "2026-10-25"])
    s.assignments[d] = { p0: "", p1: "a" };
  const r = solve(s, "2026-11");
  assert.equal(r.status, "feasible");
  assert.equal(r.assignments["2026-11-07"].p1, "");
});
test("limite de busca é distinto de inviabilidade", () => {
  const s = state(20);
  const r = solve(s, "2026-11", { timeout: -1 });
  assert.equal(r.status, "timeout");
});
test("backup válido e rejeição de corrupção", () => {
  const s = state();
  assert.doesNotThrow(() => check(JSON.parse(JSON.stringify(s))));
  assert.throws(() => check({ ...s, version: 2 }));
  for (const mutate of [
    (v: AppData) => (v.people[0].availability = [[]]),
    (v: AppData) => (v.coverage[0].a = -1),
    (v: AppData) => (v.assignments["2026-11-02"] = { p0: "missing" }),
    (v: AppData) => (v.shifts[0].start = "30:00"),
  ]) {
    const v = structuredClone(s);
    mutate(v);
    assert.throws(() => check(v));
  }
});

test("excluir turno limpa referências, preserva outros turnos e mantém backup válido", () => {
  const s = state(2);
  s.shifts.push({ id: "b", name: "Tarde", start: "14:00", end: "18:00" });
  s.people.forEach((p) => p.availability.forEach((day) => day.push("b")));
  s.coverage.forEach((day) => (day.b = 2));
  s.exceptions = { "2026-11-02": { a: 2, b: 1 }, "2026-11-03": { a: 1 } };
  s.assignments = {
    "2026-11-02": { p0: "a", p1: "b" },
    "2026-12-01": { p0: "a", p1: "" },
  };
  const before = JSON.stringify(s),
    next = removeShift(s, "a");
  assert.equal(JSON.stringify(s), before);
  assert.deepEqual(
    next.shifts.map((t) => t.id),
    ["b"],
  );
  assert.ok(
    next.people.every((p) =>
      p.availability.every((day) => day.length === 1 && day[0] === "b"),
    ),
  );
  assert.ok(
    next.coverage.every((day) => !Object.hasOwn(day, "a") && day.b === 2),
  );
  assert.deepEqual(next.exceptions, { "2026-11-02": { b: 1 } });
  assert.deepEqual(next.assignments, {
    "2026-11-02": { p0: "", p1: "b" },
    "2026-12-01": { p0: "", p1: "" },
  });
  assert.doesNotThrow(() => check(next));
  const last = removeShift(next, "b");
  assert.equal(last.shifts.length, 0);
  assert.doesNotThrow(() => check(last));
  assert.equal(removeShift(s, "missing"), s);
});
