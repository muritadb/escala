import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { personColor } from "../../components/styles";
import { add, date, label, need, weekdays } from "@compasso/domain";
import type { GridProps } from "./ScheduleGrid";
import { dayLabel, ScheduleDayDialog } from "./ScheduleDayDialog";

import { ScheduleBar } from "./ScheduleBar";
import {
  getResizeRange,
  resizedDays,
  type ResizeRange,
} from "./scheduleResize";

const monthLabel = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
export const WEEK_LANE_LIMIT = 4;

export function ScheduleCalendar({
  data,
  assignments,
  days,
  busy,
  onEdit,
  month,
  onEditDays,
}: GridProps & {
  month: string;
  onEditDays: (days: string[], person: string, shift: string) => void;
}) {
  const colors = new Map(
    data.people.map((person, index) => [person.id, personColor(index)]),
  );
  const people = data.people.filter((person) => person.active);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const weekCount = days.length / 7;
  const shiftsById = new Map(data.shifts.map((shift) => [shift.id, shift]));
  const daily = new Map(
    days.map((day) => {
      const scheduled = new Set<string>();
      const counts = new Map<string, number>();
      for (const person of people) {
        const shift = assignments[day]?.[person.id];
        if (!shift || !shiftsById.has(shift)) continue;
        scheduled.add(person.id);
        counts.set(shift, (counts.get(shift) ?? 0) + 1);
      }
      const covered = data.shifts.every((shift) => {
        const required = need(data, day, shift.id);
        return (
          typeof required === "number" &&
          (counts.get(shift.id) ?? 0) >= required
        );
      });
      return [day, { scheduled, covered }] as const;
    }),
  );

  const calendar = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; range: ResizeRange } | null>(null);
  const [preview, setPreview] = useState<ReturnType<typeof resizedDays> | null>(
    null,
  );

  function dayAtPointer(event: PointerEvent<HTMLDivElement>) {
    const week = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-schedule-week]");
    if (!week || !event.currentTarget.contains(week)) return null;
    const bounds = week.getBoundingClientRect();
    const column = Math.min(
      6,
      Math.max(
        0,
        Math.floor(((event.clientX - bounds.left) / bounds.width) * 7),
      ),
    );
    return days.indexOf(add(week.dataset.scheduleWeek!, column));
  }

  function clearDrag(pointerId: number) {
    if (drag.current?.pointerId !== pointerId) return;
    drag.current = null;
    setPreview(null);
  }

  function applyResize(range: ResizeRange, index: number) {
    const change = resizedDays(days, range, index);
    if (!busy && change.dates.length) {
      onEditDays(change.dates, range.person, change.shift);
    }
  }

  function startDrag(
    event: PointerEvent<HTMLButtonElement>,
    person: string,
    shift: string,
    day: string,
    edge: ResizeRange["edge"],
  ) {
    if (busy || event.button !== 0 || drag.current || !calendar.current) return;
    calendar.current.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      range: getResizeRange(days, assignments, person, shift, day, edge),
    };
  }

  function resizeWithKeyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    person: string,
    shift: string,
    day: string,
    edge: ResizeRange["edge"],
  ) {
    if (
      drag.current ||
      (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
    )
      return;
    event.preventDefault();
    const index = days.indexOf(day) + (event.key === "ArrowLeft" ? -1 : 1);
    applyResize(
      getResizeRange(days, assignments, person, shift, day, edge),
      index,
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[#a9cbd1] bg-[#e7f9fa]">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-[#063b59] px-5 py-5 text-[#effcfd] sm:px-7">
        <div>
          <h2 className="text-xl font-semibold">Calendário de turnos</h2>
          <p className="text-[#c4e7eb] first-letter:uppercase">
            {monthLabel.format(date(month + "-01"))}
          </p>
        </div>
        <p className="text-sm text-[#d6eef0]">
          Selecione uma data para ver ou editar a equipe do dia.
          <span className="hidden md:inline">
            {" "}
            Arraste as pontas das faixas para ajustar os dias.
          </span>
        </p>
      </header>
      <div
        className="px-2 py-3 sm:px-5 sm:py-4"
        ref={calendar}
        onPointerMove={(event) => {
          const active = drag.current;
          if (active?.pointerId !== event.pointerId) return;
          const index = dayAtPointer(event);
          setPreview(
            index === null ? null : resizedDays(days, active.range, index),
          );
        }}
        onPointerUp={(event) => {
          const active = drag.current;
          if (active?.pointerId !== event.pointerId) return;
          const index = dayAtPointer(event);
          clearDrag(event.pointerId);
          if (index !== null) applyResize(active.range, index);
        }}
        onPointerCancel={(event) => clearDrag(event.pointerId)}
        onLostPointerCapture={(event) => clearDrag(event.pointerId)}
        onKeyDown={(event) => {
          const active = drag.current;
          if (event.key !== "Escape" || !active) return;
          event.preventDefault();
          clearDrag(active.pointerId);
          event.currentTarget.releasePointerCapture(active.pointerId);
        }}
        role="region"
        aria-label="Calendário mensal"
        tabIndex={0}
      >
        <div className="border-t border-l border-[#a9cbd1]">
          <div className="grid grid-cols-7">
            {weekdays.map((weekday) => (
              <div
                key={weekday}
                className="border-r border-b border-[#a9cbd1] px-1 py-3 text-center text-xs font-bold uppercase tracking-wide"
              >
                <abbr title={weekday} className="no-underline">
                  {weekday.slice(0, 3)}
                </abbr>
              </div>
            ))}
          </div>
          {Array.from({ length: weekCount }, (_, weekIndex) => {
            const week = days.slice(weekIndex * 7, (weekIndex + 1) * 7);
            const lanes = people
              .filter((person) =>
                week.some((day) => daily.get(day)?.scheduled.has(person.id)),
              )
              .slice(0, WEEK_LANE_LIMIT)
              .map((person) => {
                const bars = [];
                let start = 0;
                while (start < week.length) {
                  const day = week[start];
                  const shiftId = assignments[day]?.[person.id];
                  const shift = shiftId && shiftsById.get(shiftId);
                  if (!shift) {
                    start++;
                    continue;
                  }
                  let end = start + 1;
                  while (
                    end < week.length &&
                    assignments[week[end]]?.[person.id] === shiftId
                  ) {
                    end++;
                  }
                  bars.push({ start, end, shift });
                  start = end;
                }
                return { person, bars };
              });
            return (
              <div
                key={week[0]}
                data-schedule-week={week[0]}
                className="relative grid grid-cols-7 content-start md:min-h-20 md:gap-y-1 md:pb-2"
              >
                {week.map((day, column) => {
                  const inMonth = day.startsWith(month);
                  const { scheduled, covered } = daily.get(day)!;
                  const hidden =
                    scheduled.size -
                    lanes.filter(({ person }) => scheduled.has(person.id))
                      .length;
                  const inPreview = preview?.dates.includes(day);
                  return (
                    <div key={day} className="contents">
                      <div
                        aria-hidden="true"
                        className={
                          "pointer-events-none absolute inset-y-0 w-[calc(100%/7)] border-r border-b border-[#a9cbd1] " +
                          (inMonth ? "" : "bg-[#d9eef1]") +
                          (inPreview
                            ? preview?.shift
                              ? " bg-emerald-200/80"
                              : " bg-amber-200/80"
                            : "")
                        }
                        style={{ left: (column * 100) / 7 + "%" }}
                      />
                      <button
                        type="button"
                        className="relative m-0.5 grid min-h-14 grid-cols-[minmax(0,1fr)_auto] content-center items-center gap-x-0.5 rounded-sm px-0.5 py-1 text-xs font-bold tabular-nums hover:bg-[#cfeaed] focus-visible:z-10 md:m-1.5 md:min-h-10 md:px-1.5 md:text-left md:text-sm"
                        style={{ gridColumn: column + 1, gridRow: 1 }}
                        aria-label={
                          "Editar " +
                          dayLabel.format(date(day)) +
                          (covered
                            ? ", cobertura atendida"
                            : ", cobertura insuficiente") +
                          ", " +
                          scheduled.size +
                          (scheduled.size === 1
                            ? " pessoa escalada"
                            : " pessoas escaladas")
                        }
                        aria-haspopup="dialog"
                        disabled={busy}
                        onClick={() => setSelectedDay(day)}
                      >
                        <time
                          dateTime={day}
                          className={
                            "col-span-2 md:col-span-1 " +
                            (inMonth ? "" : "text-muted")
                          }
                        >
                          {inMonth ? day.slice(8) : label(day)}
                        </time>
                        <span
                          aria-hidden="true"
                          className="text-xs font-semibold text-muted md:hidden"
                        >
                          {scheduled.size}
                        </span>
                        <span
                          aria-hidden="true"
                          className={
                            covered ? "text-emerald-800" : "text-orange-800"
                          }
                          title={
                            covered
                              ? "Cobertura atendida"
                              : "Cobertura insuficiente"
                          }
                        >
                          {covered ? "✓" : "!"}
                        </span>
                        {hidden > 0 && (
                          <span
                            aria-hidden="true"
                            title={hidden + " além das faixas visíveis"}
                            className="col-span-2 hidden w-fit rounded bg-[#cfeaed] px-1.5 text-xs font-semibold text-ink md:inline-flex"
                          >
                            +{hidden}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
                <div className="hidden md:contents">
                  {lanes.map(({ person, bars }, lane) =>
                    bars.map(({ start, end, shift }) => {
                      const first = week[start];
                      const last = week[end - 1];
                      const previous = add(first, -1);
                      const next = add(last, 1);
                      return (
                        <ScheduleBar
                          key={person.id + first}
                          days={week.slice(start, end)}
                          person={person.name}
                          shift={shift.name}
                          color={colors.get(person.id)!}
                          column={start + 1}
                          row={lane + 2}
                          busy={busy}
                          continuesBefore={
                            previous >= days[0] &&
                            assignments[previous]?.[person.id] === shift.id
                          }
                          continuesAfter={
                            next <= days[days.length - 1] &&
                            assignments[next]?.[person.id] === shift.id
                          }
                          onRemove={(day) => onEdit(day, person.id, "")}
                          onGrab={(event, day, edge) =>
                            startDrag(event, person.id, shift.id, day, edge)
                          }
                          onResizeKey={(event, day, edge) =>
                            resizeWithKeyboard(
                              event,
                              person.id,
                              shift.id,
                              day,
                              edge,
                            )
                          }
                        />
                      );
                    }),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <ScheduleDayDialog
        day={selectedDay}
        shifts={data.shifts}
        people={people}
        assignments={assignments}
        colors={colors}
        covered={selectedDay !== null && !!daily.get(selectedDay)?.covered}
        busy={busy}
        onEdit={onEdit}
        onClose={() => setSelectedDay(null)}
      />
    </section>
  );
}
