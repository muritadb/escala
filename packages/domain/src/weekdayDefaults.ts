import { add, dow, range } from "./dates.js";
import { allowed, overlap } from "./rules.js";
import type { AppData, Assignments } from "./types.js";

export function weekdayDefaults(data: AppData, month: string): Assignments {
  const { assignments, operation, shifts } = data;
  const people = data.people.filter((person) => person.active);
  const peopleWithSavedDays = new Set(
    Object.values(assignments).flatMap((day) => Object.keys(day)),
  );
  const defaults: Assignments = {};
  for (const day of range(month)) {
    const weekday = dow(day);
    if (weekday >= 5 || (operation.days === 6 && weekday === operation.closed))
      continue;

    const savedDay = assignments[day];
    for (const person of people) {
      if (savedDay && peopleWithSavedDays.has(person.id)) continue;
      const previous = (defaults[add(day, -1)] ?? assignments[add(day, -1)])?.[
        person.id
      ];
      const next = assignments[add(day, 1)]?.[person.id];
      const shift = shifts.find(
        ({ id }) =>
          allowed(person, day, id) &&
          !overlap(previous, id, shifts) &&
          !overlap(id, next, shifts),
      );
      if (shift) {
        defaults[day] ??= { ...savedDay };
        defaults[day][person.id] = shift.id;
      }
    }
  }
  return Object.keys(defaults).length
    ? { ...assignments, ...defaults }
    : assignments;
}
