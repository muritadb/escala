export interface Person {
  id: string;
  name: string;
  active: boolean;
  availability: string[][];
}
export interface Shift {
  id: string;
  name: string;
  start: string;
  end: string;
}
export type Coverage = Record<string, number | "" | undefined>;
export type Assignments = Record<string, Record<string, string>>;
export interface AppData {
  version: 1;
  people: Person[];
  shifts: Shift[];
  operation: { days: 6 | 7; closed: number };
  coverage: Coverage[];
  exceptions: Record<string, Coverage>;
  assignments: Assignments;
}
export type SolveResult =
  | { status: "feasible"; assignments: Assignments }
  | { status: "infeasible" | "timeout" | "error"; errors: string[] };
export interface WorkerRequest {
  state: AppData;
  month: string;
  timeout: number;
}
export type Tab = "escala" | "pessoas" | "turnos" | "cobertura";
export function emptyData(): AppData {
  return {
    version: 1,
    people: [],
    shifts: [],
    operation: { days: 7, closed: 6 },
    coverage: Array.from({ length: 7 }, () => ({})),
    exceptions: {},
    assignments: {},
  };
}
