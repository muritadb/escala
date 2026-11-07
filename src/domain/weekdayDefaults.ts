import { add, dow, range } from "./dates";
import { allowed, overlap } from "./rules";
import type { AppData, Assignments } from "./types";

export function weekdayDefaults(data: AppData, month: string): Assignments {
  const { assignments, operation, shifts } = data;
  const people = data.people.filter((person) => person.active);
  const defaults: Assignments = {};
  for (const day of range(month)) {
    const weekday = dow(day);
    if (
      Object.hasOwn(assignments, day) ||
      weekday >= 5 ||
      (operation.days === 6 && weekday === operation.closed)
    )
      continue;

    for (const person of people) {
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
        defaults[day] ??= {};
        defaults[day][person.id] = shift.id;
      }
    }
  }
  return Object.keys(defaults).length
    ? { ...assignments, ...defaults }
    : assignments;
}
