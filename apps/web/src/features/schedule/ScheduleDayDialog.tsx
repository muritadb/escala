import { useLayoutEffect, useRef } from "react";
import {
  date,
  type Assignments,
  type Person,
  type Shift,
} from "@compasso/domain";
import { button } from "../../components/styles";
import { AssignmentSelect, type GridProps } from "./ScheduleGrid";

export const dayLabel = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeZone: "UTC",
});

interface DayDialogProps extends Pick<GridProps, "busy" | "onEdit"> {
  day: string | null;
  shifts: Shift[];
  people: Person[];
  assignments: Assignments;
  colors: Map<string, string>;
  covered: boolean;
  onClose: () => void;
}

export function ScheduleDayDialog({
  day,
  shifts,
  people,
  assignments,
  colors,
  covered,
  busy,
  onEdit,
  onClose,
}: DayDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const focusPerson = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (day && dialog.current && !dialog.current.open)
      dialog.current.showModal();
  }, [day]);

  useLayoutEffect(() => {
    if (!focusPerson.current || !dialog.current?.open) return;
    const select = Array.from(dialog.current.querySelectorAll("select")).find(
      (item) => item.dataset.personId === focusPerson.current,
    );
    focusPerson.current = null;
    const closedDetails = select?.closest("details:not([open])");
    if (closedDetails) closedDetails.querySelector("summary")?.focus();
    else select?.focus();
  }, [assignments]);

  const groups = new Map<string, Person[]>();
  if (day) {
    for (const person of people) {
      const shift = assignments[day]?.[person.id] || "";
      const group = groups.get(shift);
      if (group) group.push(person);
      else groups.set(shift, [person]);
    }
  }
  const off = groups.get("") ?? [];
  const scheduled = day ? people.length - off.length : 0;

  function rows(group: Person[]) {
    if (!day) return null;
    return group.map((person) => (
      <div
        key={person.id}
        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 border-b border-line px-3 py-2 last:border-b-0 sm:gap-4"
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-full border border-ink/25"
            style={{ backgroundColor: colors.get(person.id) }}
          />
          <span className="min-w-0 wrap-anywhere">{person.name}</span>
        </span>
        <AssignmentSelect
          shifts={shifts}
          day={day}
          person={person}
          value={assignments[day]?.[person.id] || ""}
          busy={busy}
          onEdit={(date, id, shift) => {
            focusPerson.current = id;
            onEdit(date, id, shift);
          }}
        />
      </div>
    ));
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="schedule-day-title"
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-lg border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/55"
    >
      {day && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
            <div>
              <h3
                id="schedule-day-title"
                className="text-lg font-semibold first-letter:uppercase"
              >
                {dayLabel.format(date(day))}
              </h3>
              <p className="text-sm text-muted">
                {scheduled}{" "}
                {scheduled === 1 ? "pessoa escalada" : "pessoas escaladas"}
                {" · "}
                {covered ? "Cobertura atendida" : "Cobertura insuficiente"}
              </p>
            </div>
            <form method="dialog">
              <button className={button}>Fechar</button>
            </form>
          </header>
          <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            {!scheduled && (
              <p className="text-sm text-muted">
                Nenhuma pessoa escalada neste dia.
              </p>
            )}
            {shifts.map((shift) => {
              const group = groups.get(shift.id);
              if (!group?.length) return null;
              return (
                <section
                  key={shift.id}
                  className="rounded-md border border-line"
                >
                  <h4 className="flex flex-wrap items-baseline justify-between gap-1 border-b border-line bg-slate-50 px-3 py-2 text-sm font-semibold">
                    {shift.name}
                    <span className="text-xs font-normal text-muted">
                      {shift.start}–{shift.end} · {group.length}
                    </span>
                  </h4>
                  {rows(group)}
                </section>
              );
            })}
            {off.length > 0 && (
              <details className="rounded-md border border-line">
                <summary className="px-3 py-2 text-sm font-semibold">
                  Folgas ({off.length})
                </summary>
                {rows(off)}
              </details>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
