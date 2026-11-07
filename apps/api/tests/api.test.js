import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { emptyData, range, settingsOf } from "@compasso/domain";
import { createApp } from "../dist/app.js";

const month = "2026-11";
const days = range(month);

function sample() {
  return {
    ...emptyData(),
    people: ["a", "b", "c"].map((id) => ({
      id,
      name: id,
      active: true,
      availability: Array.from({ length: 7 }, () => ["day"]),
    })),
    shifts: [{ id: "day", name: "Dia", start: "08:00", end: "18:00" }],
    coverage: Array.from({ length: 7 }, () => ({ day: 1 })),
  };
}

async function request(app, method, url, payload, status = 200) {
  const response = await app.inject({ method, url: "/api" + url, payload });
  assert.equal(response.statusCode, status, response.body);
  return response.json();
}

test("migração, conflito de revisão e persistência após reiniciar", async () => {
  const directory = await mkdtemp(join(tmpdir(), "compasso-api-"));
  const path = join(directory, "test.sqlite");
  let app = createApp({ dbPath: path });
  try {
    const before = await request(app, "GET", "/state");
    assert.equal(before.revision, 0);
    const data = sample();
    const saved = await request(app, "PUT", "/backup", {
      revision: 0,
      mode: "migrate",
      data,
    });
    assert.deepEqual(saved, { revision: 1, data });
    await request(
      app,
      "PUT",
      "/settings",
      { revision: 0, settings: settingsOf(data) },
      409,
    );
    await request(
      app,
      "PUT",
      "/backup",
      { revision: 1, mode: "migrate", data: emptyData() },
      409,
    );
    await app.close();
    app = createApp({ dbPath: path });
    assert.deepEqual(await request(app, "GET", "/state"), saved);
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("gera em worker, valida o rascunho e salva apenas as semanas exibidas", async (t) => {
  const app = createApp({ dbPath: ":memory:" });
  t.after(() => app.close());
  const data = sample();
  const outside = "2027-02-01";
  data.assignments[outside] = { a: "day" };
  await request(app, "PUT", "/backup", { revision: 0, mode: "replace", data });
  const result = await request(
    app,
    "POST",
    "/schedules/" + month + "/generate",
    { revision: 1, timeoutMs: 5000 },
  );
  assert.equal(result.status, "feasible");
  assert.deepEqual((await request(app, "GET", "/state")).data, data);

  const assignments = Object.fromEntries(
    days.map((day) => [day, result.assignments[day]]),
  );
  const url = "/schedules/" + month;
  const invalid = Object.fromEntries(days.map((day) => [day, {}]));
  const { errors } = await request(app, "POST", url + "/validate", {
    revision: 1,
    assignments: invalid,
  });
  assert.ok(errors.length > 0);
  assert.equal(
    (await request(app, "PUT", url, { revision: 1, assignments: invalid }, 422))
      .code,
    "invalid_schedule",
  );
  await request(
    app,
    "PUT",
    url,
    { revision: 1, assignments: { ...assignments, [outside]: {} } },
    400,
  );
  assert.equal((await request(app, "GET", "/state")).revision, 1);

  const saved = await request(app, "PUT", url, { revision: 1, assignments });
  assert.equal(saved.revision, 2);
  assert.deepEqual(saved.data.assignments[outside], data.assignments[outside]);

  const settings = settingsOf(emptyData());
  settings.people = data.people.map((person) => ({
    ...person,
    availability: person.availability.map(() => []),
  }));
  const after = await request(app, "PUT", "/settings", {
    revision: 2,
    settings,
  });
  assert.deepEqual(after.data.assignments[outside], { a: "" });
  assert.ok(
    Object.values(after.data.assignments).every((row) =>
      Object.values(row).every((value) => value === ""),
    ),
  );
});

test("cancelar a requisição sinaliza a busca e libera a próxima execução", async (t) => {
  const started = Promise.withResolvers();
  const cancelled = Promise.withResolvers();
  let runs = 0;
  const app = createApp({
    dbPath: ":memory:",
    generator: async (_data, _month, _timeout, signal) => {
      if (++runs > 1) return { status: "infeasible", errors: ["Teste"] };
      started.resolve();
      await new Promise((_, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        }),
      );
    },
  });
  app.addHook("onRequest", async (request, reply) => {
    if (request.url.endsWith("/generate"))
      reply.raw.once("close", cancelled.resolve);
  });
  t.after(() => app.close());
  const base = await app.listen({ host: "127.0.0.1", port: 0 });
  const controller = new AbortController();
  const pending = fetch(base + "/api/schedules/" + month + "/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: 0, timeoutMs: 30000 }),
    signal: controller.signal,
  });
  await started.promise;
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  await cancelled.promise;
  const result = await request(
    app,
    "POST",
    "/schedules/" + month + "/generate",
    { revision: 0, timeoutMs: 5000 },
  );
  assert.equal(result.status, "infeasible");
  assert.equal(runs, 2);
});

test("recusa gravações de origens externas e backups inválidos", async (t) => {
  const app = createApp({ dbPath: ":memory:" });
  t.after(() => app.close());
  const response = await app.inject({
    method: "PUT",
    url: "/api/backup",
    headers: { origin: "https://example.com" },
    payload: { revision: 0, mode: "replace", data: sample() },
  });
  assert.equal(response.statusCode, 403);
  await request(
    app,
    "PUT",
    "/backup",
    { revision: 0, mode: "replace", data: { version: 2 } },
    400,
  );
  assert.equal((await request(app, "GET", "/state")).revision, 0);
});
