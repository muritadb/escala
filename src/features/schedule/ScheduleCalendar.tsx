import { useRef, useState } from "react";
import { button, shiftColor } from "../../components/styles";
import { add, date, dow, weekdays } from "../../domain/dates";
import { need } from "../../domain/rules";
import { AssignmentSelect, type GridProps } from "./ScheduleGrid";

const calendarWeekdays = [weekdays[6], ...weekdays.slice(0, 6)];
const monthLabel = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayLabel = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeZone: "UTC",
});

export function ScheduleCalendar({
  data,
  assignments,
  days,
  busy,
  onEdit,
  month,
}: GridProps & { month: string }) {
  const people = data.people.filter((person) => person.active);
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const editor = useRef<HTMLDialogElement>(null);
  const leading = (dow(days[0]) + 1) % 7;
  const weekCount = Math.ceil((leading + days.length) / 7);
  const coverage = new Map(
    days.map((day) => [
      day,
      data.shifts.every((shift) => {
        const required = need(data, day, shift.id);
        return (
          required !== "" &&
          required != null &&
          people.filter((person) => assignments[day]?.[person.id] === shift.id)
            .length >= required
        );
      }),
    ]),
  );

  return (
    <section className="overflow-hidden rounded-lg border border-[#a9cbd1] bg-[#e7f9fa]">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-[#063b59] px-5 py-5 text-[#effcfd] sm:px-7">
        <div>
          <h2 className="text-xl font-semibold">Calendário de turnos</h2>
          <p className="text-[#c4e7eb] first-letter:uppercase">
            {monthLabel.format(date(days[0]))}
          </p>
        </div>
        <p className="text-sm text-[#d6eef0]">
          Selecione um dia para editar a escala.
        </p>
      </header>
      <div
        className="overflow-x-auto px-3 py-4 sm:px-5"
        role="region"
        aria-label="Calendário mensal"
        tabIndex={0}
      >
        <div className="min-w-[39rem] border-t border-l border-[#a9cbd1]">
          <div className="grid grid-cols-7">
            {calendarWeekdays.map((weekday) => (
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
            const week = Array.from({ length: 7 }, (_, column) =>
              add(month + "-01", weekIndex * 7 + column - leading),
            );
            const lanes = people.flatMap((person) => {
              const bars = [];
              let start = 0;
              while (start < week.length) {
                const day = week[start];
                const shiftId = day.startsWith(month)
                  ? assignments[day]?.[person.id]
                  : undefined;
                const shiftIndex = data.shifts.findIndex(
                  (shift) => shift.id === shiftId,
                );
                if (shiftIndex < 0) {
                  start++;
                  continue;
                }
                let end = start + 1;
                while (
                  end < week.length &&
                  week[end].startsWith(month) &&
                  assignments[week[end]]?.[person.id] === shiftId
                ) {
                  end++;
                }
                bars.push({ start, end, shiftIndex });
                start = end;
              }
              return bars.length ? [{ person, bars }] : [];
            });
            return (
              <div
                key={week[0]}
                className="relative grid min-h-20 grid-cols-7 content-start gap-y-1 pb-2"
              >
                {week.map((day, column) => {
                  const inMonth = day.startsWith(month);
                  const ok = coverage.get(day);
                  return (
                    <div key={day} className="contents">
                      <div
                        aria-hidden="true"
                        className={
                          "pointer-events-none absolute inset-y-0 w-[calc(100%/7)] border-r border-b border-[#a9cbd1] " +
                          (inMonth ? "" : "bg-[#d9eef1]")
                        }
                        style={{ left: (column * 100) / 7 + "%" }}
                      />
                      {inMonth && (
                        <button
                          type="button"
                          className="relative m-1.5 flex items-center justify-between gap-1 rounded-sm px-1.5 py-1 text-left text-sm font-bold hover:bg-[#cfeaed]"
                          style={{ gridColumn: column + 1, gridRow: 1 }}
                          aria-label={
                            "Editar " +
                            dayLabel.format(date(day)) +
                            (ok
                              ? ", cobertura atendida"
                              : ", cobertura insuficiente")
                          }
                          disabled={busy}
                          onClick={() => {
                            setSelectedDay(day);
                            editor.current?.showModal();
                          }}
                        >
                          <time dateTime={day}>{day.slice(8)}</time>
                          <span
                            aria-hidden="true"
                            className={
                              ok ? "text-emerald-800" : "text-orange-800"
                            }
                            title={
                              ok
                                ? "Cobertura atendida"
                                : "Cobertura insuficiente"
                            }
                          >
                            {ok ? "✓" : "!"}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
                {lanes.map(({ person, bars }, lane) =>
                  bars.map(({ start, end, shiftIndex }) => {
                    const text =
                      person.name + " · " + data.shifts[shiftIndex].name;
                    return (
                      <div
                        key={person.id + week[start]}
                        className={
                          "relative mx-1.5 truncate rounded-full border border-ink/25 px-2 py-0.5 text-center text-xs font-semibold " +
                          shiftColor(shiftIndex)
                        }
                        style={{
                          gridColumn: start + 1 + " / " + (end + 1),
                          gridRow: lane + 2,
                        }}
                        title={text}
                      >
                        {text}
                      </div>
                    );
                  }),
                )}
              </div>
            );
          })}
        </div>
      </div>
      <dialog
        ref={editor}
        aria-labelledby="schedule-day-title"
        className="fixed inset-0 m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg border border-line bg-white p-5 text-ink shadow-xl backdrop:bg-ink/55"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 id="schedule-day-title" className="text-lg font-semibold">
              {dayLabel.format(date(selectedDay))}
            </h3>
            <p className="text-sm text-muted">
              {coverage.get(selectedDay)
                ? "Cobertura atendida"
                : "Cobertura insuficiente"}
            </p>
          </div>
          <form method="dialog">
            <button className={button}>Fechar</button>
          </form>
        </div>
        {people.map((person) => (
          <div
            key={person.id}
            className="grid grid-cols-2 items-center gap-3 border-t border-line py-2"
          >
            <span className="min-w-0 wrap-anywhere text-sm font-medium">
              {person.name}
            </span>
            <AssignmentSelect
              shifts={data.shifts}
              day={selectedDay}
              person={person}
              value={assignments[selectedDay]?.[person.id] || ""}
              busy={busy}
              onEdit={onEdit}
            />
          </div>
        ))}
      </dialog>
    </section>
  );
}
