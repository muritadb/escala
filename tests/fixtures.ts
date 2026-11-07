import type { AppData } from "../src/domain/types";
export function fixture(n = 3): AppData {
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
