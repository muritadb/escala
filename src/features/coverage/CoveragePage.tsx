import { useState } from "react";
import { useApp } from "../../app/AppContext";
import { weekdays, label } from "../../domain/dates";
import { button, heading, tableWrap } from "../../components/styles";
export function CoveragePage() {
  const {
      state: { data },
      update,
    } = useApp(),
    [day, setDay] = useState(""),
    [shift, setShift] = useState(data.shifts[0]?.id || ""),
    [count, setCount] = useState(0);
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <label>
          Dias de operação
          <select
            value={data.operation.days}
            onChange={(e) =>
              update((next) => {
                next.operation.days = Number(e.target.value) as 6 | 7;
              })
            }
          >
            <option value={7}>7 dias por semana</option>
            <option value={6}>6 dias por semana</option>
          </select>
        </label>
        {data.operation.days === 6 && (
          <label>
            Dia fechado
            <select
              value={data.operation.closed}
              onChange={(e) =>
                update((next) => {
                  next.operation.closed = Number(e.target.value);
                })
              }
            >
              {weekdays.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <h2 className={heading}>Cobertura semanal</h2>
      <p className="mb-4 text-muted">
        Quantidade mínima por turno. Preencha inclusive os dias complementares
        do mês. Use zero quando não houver demanda.
      </p>
      <div className={tableWrap}>
        <table className="w-full text-center">
          <thead>
            <tr>
              <th>Turno</th>
              {weekdays.map((day) => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.shifts.map((shift) => (
              <tr key={shift.id}>
                <th>{shift.name}</th>
                {weekdays.map((day, index) => (
                  <td key={day}>
                    <input
                      className="w-20"
                      aria-label={shift.name + " " + day}
                      type="number"
                      min={0}
                      step={1}
                      disabled={
                        data.operation.days === 6 &&
                        index === data.operation.closed
                      }
                      value={data.coverage[index][shift.id] ?? ""}
                      onChange={(e) => {
                        if (!e.target.checkValidity()) return;
                        const count = e.target.value;
                        update((next) => {
                          next.coverage[index][shift.id] =
                            count === "" ? "" : Number(count);
                        });
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className={heading}>Exceções por data</h2>
      <form
        className="mb-6 flex flex-wrap items-end gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!shift) return;
          update((next) => {
            next.exceptions[day] ??= {};
            next.exceptions[day][shift] = count;
          });
        }}
      >
        <label>
          Data
          <input
            required
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <label>
          Turno
          <select
            required
            value={shift}
            onChange={(e) => setShift(e.target.value)}
          >
            {data.shifts.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mínimo
          <input
            className="w-24"
            required
            type="number"
            min={0}
            step={1}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <button disabled={!data.shifts.length} className={button}>
          Salvar exceção
        </button>
      </form>
      {Object.entries(data.exceptions)
        .sort()
        .flatMap(([day, row]) =>
          Object.entries(row).map(([shift, count]) => (
            <div
              key={day + shift}
              className="flex flex-wrap items-center gap-5 border-b border-line py-3"
            >
              <span>
                {label(day)}/{day.slice(0, 4)} ·{" "}
                {data.shifts.find((t) => t.id === shift)?.name} · {count}{" "}
                pessoa(s)
              </span>
              <button
                className={button + " ml-auto"}
                aria-label={
                  "Remover exceção " +
                  day +
                  " " +
                  data.shifts.find((t) => t.id === shift)?.name
                }
                onClick={() =>
                  update((next) => {
                    delete next.exceptions[day][shift];
                    if (!Object.keys(next.exceptions[day]).length)
                      delete next.exceptions[day];
                  })
                }
              >
                Remover
              </button>
            </div>
          )),
        )}
    </>
  );
}
