import { Worker } from "node:worker_threads";
import type { AppData, GenerationRequest, SolveResult } from "@compasso/domain";

export type Generate = (
  data: AppData,
  month: string,
  timeoutMs: GenerationRequest["timeoutMs"],
  signal: AbortSignal,
) => Promise<SolveResult>;

export const generate: Generate = async (data, month, timeoutMs, signal) => {
  signal.throwIfAborted();
  const worker = new Worker(new URL("./schedule.worker.js", import.meta.url), {
    workerData: { data, month, timeoutMs },
  });
  const result = Promise.withResolvers<SolveResult>();
  const abort = () => result.reject(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () =>
      result.resolve({
        status: "timeout",
        errors: [
          "Limite de tempo atingido. A inviabilidade não foi comprovada.",
        ],
      }),
    timeoutMs + 1000,
  );
  worker.once("message", result.resolve);
  worker.once("error", result.reject);
  worker.once("exit", () =>
    result.reject(new Error("O gerador encerrou sem responder.")),
  );
  try {
    return await result.promise;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    await worker.terminate();
  }
};
