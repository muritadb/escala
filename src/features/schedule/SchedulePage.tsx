import { useApp } from "../../app/AppContext";
import { range } from "../../domain/dates";
import { validate } from "../../domain/validation";
import { button, primary, shiftColor } from "../../components/styles";
import { ScheduleGrid } from "./ScheduleGrid";
import { WeeklySummary } from "./WeeklySummary";
import { useScheduleGenerator } from "./useScheduleGenerator";
export function SchedulePage() {
  const { state, dispatch } = useApp(),
    { data, draft, month } = state,
    { generate, cancel, busy } = useScheduleGenerator(),
    days = range(month),
    assignments = draft || data.assignments,
    people = data.people.filter((p) => p.active);
  function check() {
    const errors = validate(data, month, assignments);
    dispatch({
      type: "messages",
      messages: errors.length
        ? errors
        : ["Escala válida: todas as regras obrigatórias foram atendidas."],
    });
  }
  function edit(day: string, person: string, shift: string) {
    const next = structuredClone(assignments);
    next[day] ??= {};
    next[day][person] = shift;
    dispatch({ type: "draft", draft: next });
    dispatch({ type: "messages", messages: validate(data, month, next) });
  }
  function accept() {
    if (!draft) return;
    const errors = validate(data, month, draft);
    if (errors.length) {
      dispatch({ type: "messages", messages: errors });
      return;
    }
    dispatch({ type: "accept" });
    dispatch({ type: "messages", messages: ["Escala salva."] });
  }
  const grid = { data, assignments, days, busy, onEdit: edit };
  return (
    <>
      <div className="flex flex-col justify-between gap-4 border-t border-line pt-6 xl:flex-row xl:items-end">
        <label>
          Mês da escala
          <input
            type="month"
            disabled={busy || !!draft}
            value={month}
            onChange={(e) => {
              if (/^\d{4}-\d{2}$/.test(e.target.value))
                dispatch({ type: "month", month: e.target.value });
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button className={button} onClick={check}>
            Validar escala
          </button>
          <button
            className={primary}
            disabled={busy}
            onClick={() => void generate(5000)}
          >
            {busy ? "Buscando escala…" : "Gerar escala"}
          </button>
          <button
            className={button}
            disabled={busy}
            onClick={() => void generate(30000)}
          >
            Buscar por 30 s
          </button>
          {busy && (
            <button className={button} onClick={cancel}>
              Cancelar
            </button>
          )}
        </div>
      </div>
      <div className="my-7 flex items-center gap-5 lg:gap-9">
        {[
          [people.length, "Pessoas ativas"],
          [data.shifts.length, "Turnos cadastrados"],
          [data.operation.days + " dias", "Operação semanal"],
        ].map(([value, text]) => (
          <div className="border-r border-line pr-5 lg:pr-9" key={text}>
            <strong className="block text-2xl font-semibold">{value}</strong>
            <span className="mt-1 block text-xs text-muted">{text}</span>
          </div>
        ))}
        <p className="ml-auto hidden text-xs text-muted xl:block">
          Folgas no fim de semana são priorizadas.
          <br />
          Uma pessoa ocupa no máximo um turno por dia.
        </p>
      </div>
      {draft && (
        <div className="mb-6 flex flex-wrap items-center gap-4 border border-blue-200 bg-blue-50 p-5">
          <strong>Escala em revisão</strong>
          <span className="flex-1 text-sm">
            Confira os ajustes antes de substituir a escala salva.
          </span>
          <button className={primary} onClick={accept}>
            Validar e salvar
          </button>
          <button
            className={button}
            onClick={() => {
              dispatch({ type: "draft", draft: null });
              dispatch({ type: "messages", messages: [] });
            }}
          >
            Descartar revisão
          </button>
        </div>
      )}
      {!people.length || !data.shifts.length ? (
        <section className="rounded-lg border border-dashed border-line bg-white px-5 py-16 text-center">
          <div className="text-5xl text-blue-400">▦</div>
          <h2 className="mt-5 text-xl font-semibold">
            Sua próxima escala começa aqui
          </h2>
          <p className="mx-auto my-5 max-w-md text-muted">
            Cadastre os turnos, adicione as pessoas e preencha a cobertura para
            gerar o mês.
          </p>
          <button
            className={primary}
            disabled={busy}
            onClick={() => dispatch({ type: "tab", tab: "turnos" })}
          >
            Cadastrar turnos
          </button>
        </section>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-6 text-xs">
            {data.shifts.map((t, i) => (
              <span key={t.id} className="flex items-center gap-2">
                <i className={"size-3 rounded " + shiftColor(i)} />
                {t.name}
              </span>
            ))}
            <span>○ Folga</span>
          </div>
          <ScheduleGrid
            {...grid}
            days={days.filter((day) => day.startsWith(month))}
          />
          <WeeklySummary {...grid} month={month} />
        </>
      )}
    </>
  );
}
