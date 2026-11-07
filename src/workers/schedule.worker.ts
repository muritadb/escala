/// <reference lib="webworker" />
import { solve } from "../domain/solver";
import type { WorkerRequest, SolveResult } from "../domain/types";
declare const self: DedicatedWorkerGlobalScope;
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  let result: SolveResult;
  try {
    result = solve(event.data.state, event.data.month, {
      timeout: event.data.timeout,
    });
  } catch (error) {
    result = {
      status: "error",
      errors: [
        error instanceof Error ? error.message : "Falha ao gerar escala",
      ],
    };
  }
  self.postMessage(result);
};
