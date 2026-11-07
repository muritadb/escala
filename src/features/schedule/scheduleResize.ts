import type { Assignments } from "../../domain/types";

export interface ResizeRange {
  person: string;
  shift: string;
  edge: "start" | "end";
  start: number;
  end: number;
  min: number;
  max: number;
}

export function getResizeRange(
  days: string[],
  assignments: Assignments,
  person: string,
  shift: string,
  day: string,
  edge: ResizeRange["edge"],
): ResizeRange {
  const assigned = (index: number) => assignments[days[index]]?.[person];
  let start = days.indexOf(day);
  let end = start;
  while (start > 0 && assigned(start - 1) === shift) start--;
  while (end < days.length - 1 && assigned(end + 1) === shift) end++;

  let min = start;
  let max = end;
  while (min > 0 && (!assigned(min - 1) || assigned(min - 1) === shift)) min--;
  while (
    max < days.length - 1 &&
    (!assigned(max + 1) || assigned(max + 1) === shift)
  )
    max++;

  return { person, shift, edge, start, end, min, max };
}

export function resizedDays(
  days: string[],
  range: ResizeRange,
  target: number,
) {
  const { edge, start, end, min, max, shift } = range;
  const boundary =
    edge === "start"
      ? Math.max(min, Math.min(end, target))
      : Math.max(start, Math.min(max, target));
  const original = edge === "start" ? start : end;
  const expanding =
    edge === "start" ? boundary < original : boundary > original;
  const first = Math.min(original, boundary) + Number(edge === "end");
  const last = Math.max(original, boundary) + Number(edge === "end");
  return { dates: days.slice(first, last), shift: expanding ? shift : "" };
}
