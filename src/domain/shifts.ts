import type { AppData } from "./types";
export function removeShift(state: AppData, shiftId: string): AppData {
  if (!state.shifts.some((shift) => shift.id === shiftId)) return state;
  const next = structuredClone(state);
  next.shifts = next.shifts.filter((shift) => shift.id !== shiftId);
  for (const person of next.people) {
    person.availability = person.availability.map((day) =>
      day.filter((id) => id !== shiftId),
    );
  }
  for (const day of next.coverage) delete day[shiftId];
  for (const [date, day] of Object.entries(next.exceptions)) {
    delete day[shiftId];
    if (!Object.keys(day).length) delete next.exceptions[date];
  }
  for (const day of Object.values(next.assignments)) {
    for (const personId of Object.keys(day)) {
      if (day[personId] === shiftId) day[personId] = "";
    }
  }
  return next;
}
