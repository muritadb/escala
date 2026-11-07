import type { KeyboardEvent, PointerEvent } from "react";
import { label } from "@compasso/domain";
import type { ResizeRange } from "./scheduleResize";

interface ScheduleBarProps {
  days: string[];
  person: string;
  shift: string;
  color: string;
  column: number;
  row: number;
  busy: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
  onRemove: (day: string) => void;
  onGrab: (
    event: PointerEvent<HTMLButtonElement>,
    day: string,
    edge: ResizeRange["edge"],
  ) => void;
  onResizeKey: (
    event: KeyboardEvent<HTMLButtonElement>,
    day: string,
    edge: ResizeRange["edge"],
  ) => void;
}

export function ScheduleBar({
  days,
  person,
  shift,
  color,
  column,
  row,
  busy,
  continuesBefore,
  continuesAfter,
  onRemove,
  onGrab,
  onResizeKey,
}: ScheduleBarProps) {
  const text = person + " · " + shift;

  function handle(day: string, edge: ResizeRange["edge"]) {
    const title =
      (edge === "start" ? "Ajustar início de " : "Ajustar fim de ") +
      person +
      " em " +
      label(day);
    return (
      <button
        type="button"
        disabled={busy}
        aria-label={title}
        title={title + ". Arraste ou use as setas."}
        className={
          "absolute inset-y-0 z-10 grid w-6 touch-none cursor-ew-resize place-items-center text-ink hover:bg-white/60 " +
          (edge === "start"
            ? "left-0 rounded-l-full"
            : "right-0 rounded-r-full")
        }
        onPointerDown={(event) => onGrab(event, day, edge)}
        onKeyDown={(event) => onResizeKey(event, day, edge)}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none size-4"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 8h12M5 5 2 8l3 3m6-6 3 3-3 3" />
        </svg>
      </button>
    );
  }

  return (
    <div
      className="relative isolate mx-1 rounded-full border border-ink/25"
      style={{
        gridColumn: column + " / span " + days.length,
        gridRow: row,
        backgroundColor: color,
      }}
      title={text}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(" + days.length + ", minmax(0, 1fr))",
        }}
      >
        {days.map((day) => {
          const title = "Remover " + person + " de " + label(day);
          return (
            <button
              key={day}
              type="button"
              disabled={busy}
              className="min-h-7 cursor-pointer first:rounded-l-full last:rounded-r-full hover:bg-white/60 focus-visible:z-10"
              aria-label={title}
              title={title}
              onClick={() => onRemove(day)}
            />
          );
        })}
      </div>
      <span className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 truncate text-center text-xs font-semibold">
        {text}
      </span>
      {!continuesBefore && handle(days[0], "start")}
      {!continuesAfter && handle(days[days.length - 1], "end")}
    </div>
  );
}
