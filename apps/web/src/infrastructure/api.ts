import {
  range,
  type ApiProblem,
  type Assignments,
  type GenerationRequest,
  type GenerationResponse,
  type ImportRequest,
  type SettingsRequest,
  type StateSnapshot,
  type ValidationResponse,
} from "@compasso/domain";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ApiProblem,
  ) {
    super(problem.message);
  }
}

async function request<T>(
  path: string,
  method = "GET",
  body?: object,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      method,
      signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(
      "Não foi possível conectar ao servidor local do Compasso.",
      { cause: error },
    );
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    const problem =
      typeof payload?.message === "string"
        ? payload
        : {
            code: "unavailable",
            message:
              "O servidor local do Compasso não respondeu como esperado.",
          };
    throw new ApiError(response.status, problem);
  }
  return payload as T;
}

function scheduleBody(
  month: string,
  revision: number,
  assignments: Assignments,
) {
  return {
    revision,
    assignments: Object.fromEntries(
      range(month).map((day) => [day, assignments[day] ?? {}]),
    ),
  };
}

export const api = {
  state: (signal?: AbortSignal) =>
    request<StateSnapshot>("/state", "GET", undefined, signal),
  settings: (body: SettingsRequest) =>
    request<StateSnapshot>("/settings", "PUT", body),
  import: (body: ImportRequest) =>
    request<StateSnapshot>("/backup", "PUT", body),
  generate: (month: string, body: GenerationRequest, signal: AbortSignal) =>
    request<GenerationResponse>(
      "/schedules/" + month + "/generate",
      "POST",
      body,
      signal,
    ),
  validate: (month: string, revision: number, assignments: Assignments) =>
    request<ValidationResponse>(
      "/schedules/" + month + "/validate",
      "POST",
      scheduleBody(month, revision, assignments),
    ),
  save: (month: string, revision: number, assignments: Assignments) =>
    request<StateSnapshot>(
      "/schedules/" + month,
      "PUT",
      scheduleBody(month, revision, assignments),
    ),
};
