import { parentPort, workerData } from "node:worker_threads";
import type { AppData, GenerationRequest } from "@compasso/domain";
import { solve } from "@compasso/domain/solver";

const { data, month, timeoutMs } = workerData as {
  data: AppData;
  month: string;
  timeoutMs: GenerationRequest["timeoutMs"];
};
parentPort!.postMessage(solve(data, month, { timeout: timeoutMs }));
