import type { AppData, Assignments, SolveResult } from "./types.js";

export type Settings = Omit<AppData, "version" | "assignments">;

export interface StateSnapshot {
  revision: number;
  data: AppData;
}

export interface SettingsRequest {
  revision: number;
  settings: Settings;
}

export interface ScheduleRequest {
  revision: number;
  assignments: Assignments;
}

export interface GenerationRequest {
  revision: number;
  timeoutMs: 5000 | 30000;
}

export type GenerationResponse = SolveResult;

export interface ImportRequest {
  revision: number;
  mode: "replace" | "migrate";
  data: AppData;
}

export interface ValidationResponse {
  errors: string[];
}

export interface ApiProblem {
  code: string;
  message: string;
  errors?: string[];
}

export function settingsOf(data: AppData): Settings {
  const { people, shifts, operation, coverage, exceptions } = data;
  return { people, shifts, operation, coverage, exceptions };
}
