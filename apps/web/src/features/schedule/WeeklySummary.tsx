import type { GridProps } from "./ScheduleGrid";
import { ScheduleGrid } from "./ScheduleGrid";
import { label } from "@compasso/domain";
export function WeeklySummary(props: GridProps & { month: string }) {
  const people = props.data.people.filter((p) => p.active);
  return (
    <details className="mt-6">
      <summary className="py-3 font-semibold">
        Totais semanais e dias complementares
      </summary>
      <p className="mb-3 text-muted">
        As semanas vão de segunda a domingo. Datas de outros meses já salvas são
        preservadas na geração.
      </p>
      {props.days
        .filter((_, i) => i % 7 === 0)
        .map((day) => (
          <div key={day} className="flex flex-wrap gap-5 py-3 text-sm">
            <b className="min-w-36">Semana de {label(day)}</b>
            {people.map((p) => (
              <span key={p.id}>
                {p.name}:{" "}
                {
                  props.days
                    .slice(props.days.indexOf(day), props.days.indexOf(day) + 7)
                    .filter((d) => props.assignments[d]?.[p.id]).length
                }
                /5
              </span>
            ))}
          </div>
        ))}
      <ScheduleGrid
        {...props}
        days={props.days.filter((day) => !day.startsWith(props.month))}
      />
    </details>
  );
}
