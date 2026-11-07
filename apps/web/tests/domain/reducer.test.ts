import { test, expect } from "vitest";
import { initialState, reducer } from "../../src/app/reducer";
import { fixture } from "../fixtures";
test("editar e descartar revisão preserva a escala salva", () => {
  const data = fixture();
  data.assignments = { "2026-11-02": { p0: "a" } };
  const state = initialState(data);
  const edited = reducer(state, {
    type: "draft",
    draft: { "2026-11-02": { p0: "" } },
  });
  expect(edited.data).toBe(data);
  const discarded = reducer(edited, { type: "draft", draft: null });
  expect(discarded.data.assignments).toEqual(data.assignments);
});
test("receber a escala salva do servidor limpa a revisão", () => {
  const data = fixture(),
    draft = { "2026-11-02": { p0: "a" } };
  const next = reducer(
    { ...initialState(data), draft },
    { type: "data", data: { ...data, assignments: draft } },
  );
  expect(next.data.assignments).toEqual(draft);
  expect(next.draft).toBeNull();
  expect(next.data.people).toEqual(data.people);
});
