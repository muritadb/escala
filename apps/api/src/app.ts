import Fastify from "fastify";
import staticFiles from "@fastify/static";
import {
  check,
  range,
  removeShift,
  validate,
  type ApiProblem,
  type AppData,
  type Assignments,
  type Settings,
} from "@compasso/domain";
import { generate, type Generate } from "./generator.js";
import { Store } from "./store.js";

class Problem extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiProblem,
  ) {
    super(body.message);
  }
}

function invalid(message: string): never {
  throw new Problem(400, { code: "invalid_request", message });
}

function conflict(): never {
  throw new Problem(409, {
    code: "revision_conflict",
    message:
      "Os dados mudaram em outra aba. Atualize os dados antes de tentar novamente.",
  });
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid("Envie um objeto JSON válido.");
  return value as Record<string, unknown>;
}

function checked(value: unknown): AppData {
  try {
    check(value);
    return value;
  } catch (error) {
    invalid(error instanceof Error ? error.message : "Dados inválidos.");
  }
}

function monthOf(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value)
  ) {
    invalid("Informe o mês no formato AAAA-MM.");
  }
  return value;
}

function scheduleData(
  current: AppData,
  month: string,
  value: unknown,
): AppData {
  const rows = record(value);
  const days = range(month);
  if (
    Object.keys(rows).length !== days.length ||
    !days.every((day) => Object.hasOwn(rows, day))
  ) {
    invalid("Informe apenas as datas das semanas completas do mês.");
  }
  return checked({
    ...current,
    assignments: { ...current.assignments, ...(rows as Assignments) },
  });
}

interface Options {
  dbPath: string;
  origins?: string[];
  webRoot?: string;
  generator?: Generate;
}

export function createApp({
  dbPath,
  origins = ["http://localhost:5174", "http://127.0.0.1:5174"],
  webRoot,
  generator = generate,
}: Options) {
  const app = Fastify({ bodyLimit: 11_000_000 });
  const store = new Store(dbPath);
  let generating = false;

  app.addHook("onClose", async () => store.close());
  app.addHook("onRequest", async (request, reply) => {
    if (request.hostname !== "localhost" && request.hostname !== "127.0.0.1") {
      throw new Problem(403, {
        code: "forbidden_host",
        message: "Use o endereço local do Compasso.",
      });
    }
    if (!request.url.startsWith("/api/")) return;
    reply.header("Cache-Control", "no-store");
    if (request.method !== "GET" && request.method !== "HEAD") {
      if (request.headers.origin && !origins.includes(request.headers.origin)) {
        throw new Problem(403, {
          code: "forbidden_origin",
          message: "Origem da requisição não permitida.",
        });
      }
      if (
        request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase() !==
        "application/json"
      ) {
        throw new Problem(415, {
          code: "unsupported_media_type",
          message: "Envie os dados como JSON.",
        });
      }
    }
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof Problem)
      return reply.code(error.status).send(error.body);
    if (
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number" &&
      error.statusCode < 500
    ) {
      return reply
        .code(error.statusCode)
        .send({
          code: "invalid_request",
          message:
            error.statusCode === 413
              ? "Arquivo ou dados grandes demais."
              : "Requisição inválida.",
        });
    }
    console.error(error);
    return reply
      .code(500)
      .send({
        code: "server_error",
        message: "O Compasso não conseguiu concluir a operação.",
      });
  });

  function currentFor(body: Record<string, unknown>) {
    const current = store.read();
    if (
      typeof body.revision !== "number" ||
      !Number.isSafeInteger(body.revision) ||
      body.revision < 0
    ) {
      invalid("Informe a revisão dos dados.");
    }
    if (current.revision !== body.revision) conflict();
    return current;
  }

  function save(revision: number, data: AppData) {
    const snapshot = store.write(revision, data);
    if (!snapshot) conflict();
    return snapshot;
  }

  app.get("/api/state", () => store.read());

  app.put("/api/settings", (request) => {
    const body = record(request.body);
    const current = currentFor(body);
    const settings = record(body.settings) as unknown as Settings;
    const { people, shifts, operation, coverage, exceptions } = settings;
    const candidate = checked({
      version: 1,
      people,
      shifts,
      operation,
      coverage,
      exceptions,
      assignments: {},
    });
    const ids = new Set(candidate.shifts.map((shift) => shift.id));
    const cleaned = current.data.shifts.reduce(
      (data, shift) => (ids.has(shift.id) ? data : removeShift(data, shift.id)),
      current.data,
    );
    return save(
      current.revision,
      checked({ ...candidate, assignments: cleaned.assignments }),
    );
  });

  app.put("/api/backup", (request) => {
    const body = record(request.body);
    const current = currentFor(body);
    if (body.mode !== "migrate" && body.mode !== "replace")
      invalid("Modo de importação inválido.");
    if (body.mode === "migrate" && current.revision !== 0) conflict();
    return save(current.revision, checked(body.data));
  });

  app.post<{ Params: { month: string } }>(
    "/api/schedules/:month/validate",
    (request) => {
      const month = monthOf(request.params.month);
      const body = record(request.body);
      const current = currentFor(body);
      return {
        errors: validate(
          current.data,
          month,
          scheduleData(current.data, month, body.assignments).assignments,
        ),
      };
    },
  );

  app.put<{ Params: { month: string } }>("/api/schedules/:month", (request) => {
    const month = monthOf(request.params.month);
    const body = record(request.body);
    const current = currentFor(body);
    const candidate = scheduleData(current.data, month, body.assignments);
    const errors = validate(candidate, month);
    if (errors.length)
      throw new Problem(422, {
        code: "invalid_schedule",
        message: "A escala tem pendências.",
        errors,
      });
    return save(current.revision, candidate);
  });

  app.post<{ Params: { month: string } }>(
    "/api/schedules/:month/generate",
    async (request, reply) => {
      const month = monthOf(request.params.month);
      const body = record(request.body);
      const current = currentFor(body);
      const { timeoutMs } = body;
      if (timeoutMs !== 5000 && timeoutMs !== 30000)
        invalid("A duração da busca deve ser de 5 ou 30 segundos.");
      if (generating)
        throw new Problem(409, {
          code: "generation_busy",
          message: "Já há uma busca em andamento.",
        });

      const controller = new AbortController();
      const abort = () => controller.abort();
      reply.raw.once("close", abort);
      generating = true;
      try {
        const result = await generator(
          current.data,
          month,
          timeoutMs,
          controller.signal,
        );
        if (store.read().revision !== current.revision) conflict();
        return result;
      } catch (error) {
        if (controller.signal.aborted) {
          reply.hijack();
          return;
        }
        throw error;
      } finally {
        generating = false;
        reply.raw.off("close", abort);
      }
    },
  );

  if (webRoot) void app.register(staticFiles, { root: webRoot });
  return app;
}
