import { useState } from "react";
import { useApp } from "../../app/AppContext";
import { removeShift } from "../../domain/shifts";
import { primary, shiftColor } from "../../components/styles";
export function ShiftsPage() {
  const {
      state: { data },
      update,
      dispatch,
      confirm,
    } = useApp(),
    [name, setName] = useState(""),
    [start, setStart] = useState("08:00"),
    [end, setEnd] = useState("16:00");
  return (
    <>
      <form
        className="mb-6 flex flex-wrap items-end gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          update((next) => {
            const shift = {
              id: crypto.randomUUID(),
              name: name.trim(),
              start,
              end,
            };
            next.shifts.push(shift);
            next.people.forEach((p) =>
              p.availability.forEach((day) => day.push(shift.id)),
            );
          });
          setName("");
        }}
      >
        <label>
          Nome do turno
          <input
            required
            maxLength={40}
            placeholder="Ex.: Manhã"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Início
          <input
            required
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          Término
          <input
            required
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <button className={primary}>Adicionar turno</button>
      </form>
      <p className="mb-6 text-muted">
        Se o término for igual ou anterior ao início, o turno termina no dia
        seguinte. Novos turnos ficam disponíveis para todas as pessoas.
      </p>
      <div className="flex flex-wrap gap-5">
        {data.shifts.map((shift, index) => (
          <section
            key={shift.id}
            className="min-w-[220px] rounded-lg border border-line bg-white p-6"
          >
            <i
              aria-hidden="true"
              className={"inline-block h-2 w-8 rounded " + shiftColor(index)}
            />
            <h2 className="mt-6 mb-3 text-xl font-semibold">{shift.name}</h2>
            <p className="mb-5 text-muted">
              {shift.start} — {shift.end}
              {shift.end <= shift.start ? " (+1 dia)" : ""}
            </p>
            <button
              aria-label={"Excluir turno " + shift.name}
              className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50"
              onClick={async () => {
                if (
                  !(await confirm(
                    'Excluir o turno "' +
                      shift.name +
                      '"? Ele será removido da disponibilidade, da cobertura e de todas as escalas salvas. Os dias atribuídos a ele ficarão como folga. Será necessário revisar as escalas afetadas.',
                  ))
                )
                  return;
                dispatch({ type: "data", data: removeShift(data, shift.id) });
                dispatch({
                  type: "messages",
                  messages: [
                    'Turno "' +
                      shift.name +
                      '" excluído. Revise e valide as escalas afetadas antes de utilizá-las.',
                  ],
                });
              }}
            >
              Excluir turno
            </button>
          </section>
        ))}
      </div>
      {!data.shifts.length && (
        <p className="text-muted">Nenhum turno cadastrado.</p>
      )}
    </>
  );
}
