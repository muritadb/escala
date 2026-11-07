import type { AppData, Assignments, Person, Shift } from "@compasso/domain";
import { label } from "@compasso/domain";
import { shiftColor, tableWrap } from "../../components/styles";

export interface GridProps {
  data: AppData;
  assignments: Assignments;
  days: string[];
  busy: boolean;
  onEdit: (day: string, person: string, shift: string) => void;
}

export function AssignmentSelect({
  shifts,
  day,
  person,
  value,
  busy,
  onEdit,
}: Pick<GridProps, "busy" | "onEdit"> & {
  shifts: Shift[];
  day: string;
  person: Person;
  value: string;
}) {
  return (
    <select
      aria-label={person.name + " em " + day}
      data-person-id={person.id}
      disabled={busy}
      value={value}
      onChange={(event) => onEdit(day, person.id, event.target.value)}
      className={
        "w-full min-w-20 cursor-pointer text-sm " +
        (value
          ? shiftColor(shifts.findIndex((shift) => shift.id === value))
          : "")
      }
    >
      <option value="">Folga</option>
      {shifts.map((shift) => (
        <option key={shift.id} value={shift.id}>
          {shift.name}
        </option>
      ))}
    </select>
  );
}

export function ScheduleGrid({
  data,
  assignments,
  days,
  busy,
  onEdit,
}: GridProps) {
  const people = data.people.filter((person) => person.active);
  return (
    <div className={tableWrap}>
      <table className="w-full text-center">
        <thead>
          <tr>
            <th>Data complementar</th>
            {people.map((person) => (
              <th key={person.id}>{person.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day}>
              <th>{label(day)}</th>
              {people.map((person) => (
                <td key={person.id}>
                  <AssignmentSelect
                    shifts={data.shifts}
                    day={day}
                    person={person}
                    value={assignments[day]?.[person.id] || ""}
                    busy={busy}
                    onEdit={onEdit}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
