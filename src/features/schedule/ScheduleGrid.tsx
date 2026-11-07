import type { AppData, Assignments } from "../../domain/types";
import { dow, weekdays } from "../../domain/dates";
import { need } from "../../domain/rules";
import { shiftColor, tableWrap } from "../../components/styles";
export interface GridProps {
  data: AppData;
  assignments: Assignments;
  days: string[];
  busy: boolean;
  onEdit: (day: string, person: string, shift: string) => void;
  complementary?: boolean;
}
export function ScheduleGrid({
  data,
  assignments,
  days,
  busy,
  onEdit,
  complementary = false,
}: GridProps) {
  const people = data.people.filter((p) => p.active);
  function cell(day: string, person: string) {
    const shift = assignments[day]?.[person] || "";
    return (
      <select
        aria-label={people.find((p) => p.id === person)?.name + " em " + day}
        disabled={busy}
        value={shift}
        onChange={(e) => onEdit(day, person, e.target.value)}
        className={
          "w-[76px] cursor-pointer !border-transparent !px-1 !text-xs " +
          (shift
            ? shiftColor(data.shifts.findIndex((t) => t.id === shift))
            : "!bg-transparent")
        }
      >
        <option value="">Folga</option>
        {data.shifts.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    );
  }
  if (complementary)
    return (
      <div className={tableWrap}>
        <table className="w-full text-center">
          <thead>
            <tr>
              <th>Data complementar</th>
              {people.map((p) => (
                <th key={p.id}>{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day}>
                <th>
                  {day.slice(8)}/{day.slice(5, 7)}
                </th>
                {people.map((p) => (
                  <td key={p.id}>{cell(day, p.id)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <div className={tableWrap}>
      <table className="w-full text-center">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-32 border-r border-line">
              Pessoa / dia
            </th>
            {days.map((day) => (
              <th
                key={day}
                className={"min-w-20 " + (dow(day) >= 5 ? "bg-slate-100" : "")}
              >
                <small className="mb-1 block text-xs font-normal">
                  {weekdays[dow(day)].slice(0, 3)}
                </small>
                {day.slice(8)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id}>
              <th className="sticky left-0 z-10 border-r border-line !bg-white">
                {p.name}
              </th>
              {days.map((day) => (
                <td
                  key={day}
                  className={"!px-1 " + (dow(day) >= 5 ? "bg-slate-100" : "")}
                >
                  {cell(day, p.id)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th className="sticky left-0 z-10 border-r border-line">
              Cobertura
            </th>
            {days.map((day) => {
              const ok = data.shifts.every((t) => {
                const n = need(data, day, t.id);
                return (
                  n !== "" &&
                  n != null &&
                  people.filter((p) => assignments[day]?.[p.id] === t.id)
                    .length >= n
                );
              });
              return (
                <td
                  key={day}
                  aria-label={
                    day +
                    (ok ? " cobertura atendida" : " cobertura insuficiente")
                  }
                  className={
                    ok ? "text-emerald-700" : "bg-orange-50 text-orange-700"
                  }
                >
                  {ok ? "✓" : "!"}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
