import { useMemo, useState } from "react";
import { useApp } from "../../app/AppContext";
import { range } from "@compasso/domain";
import { weekdayDefaults } from "@compasso/domain";
import { api } from "../../infrastructure/api";
import { button, primary, personColor } from "../../components/styles";
import { Notice } from "../../components/Notice";
import { ScheduleCalendar, WEEK_LANE_LIMIT } from "./ScheduleCalendar";
import { WeeklySummary } from "./WeeklySummary";
import { useScheduleGenerator } from "./useScheduleGenerator";
export function SchedulePage() {
  const { state, dispatch, revision, busy, saveSchedule, reportError } =
      useApp(),
    { data, draft, month } = state,
    { generate, cancel, generating } = useScheduleGenerator(),
    days = range(month),
    people = data.people.filter((p) => p.active);
  const initial = useMemo(() => weekdayDefaults(data, month), [data, month]);
  const assignments = draft ?? initial;
  const showInitial = !draft && initial !== data.assignments;
  const [validation, setValidation] = useState<{
    month: string;
    assignments: typeof assignments;
    errors: string[];
  } | null>(null);
  const errors =
    validation?.month === month && validation.assignments === assignments
      ? validation.errors
      : [];

  async function check() {
    if (revision === null) return;
    try {
      const { errors } = await api.validate(month, revision, assignments);
      setValidation({ month, assignments, errors });
      dispatch({
        type: "messages",
        messages: errors.length
          ? []
          : ["Escala válida: todas as regras obrigatórias foram atendidas."],
      });
    } catch (error) {
      reportError(error);
    }
  }
  function editDays(dates: string[], person: string, shift: string) {
    const next = structuredClone(assignments);
    for (const day of dates) {
      next[day] ??= {};
      next[day][person] = shift;
    }
    dispatch({ type: "draft", draft: next });
    setValidation(null);
    dispatch({ type: "messages", messages: [] });
  }
  async function accept() {
    if (!draft) return;
    const errors = await saveSchedule(month, draft);
    if (!errors) return;
    if (errors.length) {
      setValidation({ month, assignments: draft, errors });
      dispatch({ type: "messages", messages: [] });
    } else dispatch({ type: "messages", messages: ["Escala salva."] });
  }
  const grid = {
    data,
    assignments,
    days,
    busy,
    onEdit: (day: string, person: string, shift: string) =>
      editDays([day], person, shift),
  };
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
              if (/^\d{4}-\d{2}$/.test(e.target.value)) {
                setValidation(null);
                dispatch({ type: "month", month: e.target.value });
              }
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button className={button} disabled={busy} onClick={check}>
            Validar escala
          </button>
          <button
            className={primary}
            disabled={busy}
            onClick={() => void generate(5000)}
          >
            {generating ? "Buscando escala…" : "Gerar escala"}
          </button>
          <button
            className={button}
            disabled={busy}
            onClick={() => void generate(30000)}
          >
            Buscar por 30 s
          </button>
          {generating && (
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
      {showInitial && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-white px-4 py-3">
          <p className="text-sm text-muted">
            Sugestão inicial de segunda a sexta, conforme a disponibilidade.
          </p>
          <button
            className={button}
            disabled={busy}
            onClick={() => dispatch({ type: "draft", draft: initial })}
          >
            Revisar escala inicial
          </button>
        </div>
      )}
      {draft && (
        <div className="mb-6 flex flex-wrap items-center gap-4 border border-blue-200 bg-blue-50 p-5">
          <strong>Escala em revisão</strong>
          <span className="flex-1 text-sm">
            Confira os ajustes antes de substituir a escala salva.
          </span>
          <button className={primary} disabled={busy} onClick={accept}>
            Validar e salvar
          </button>
          <button
            className={button}
            disabled={busy}
            onClick={() => {
              dispatch({ type: "draft", draft: null });
              dispatch({ type: "messages", messages: [] });
            }}
          >
            Descartar revisão
          </button>
        </div>
      )}
      {errors.length > 0 && !busy && (
        <details className="mb-4 rounded-md border border-amber-200 bg-amber-50">
          <summary className="px-4 py-3 text-sm font-semibold text-amber-900">
            Pendências na validação ({errors.length})
          </summary>
          <Notice messages={errors} />
        </details>
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
            {people.length <= WEEK_LANE_LIMIT &&
              data.people.map(
                (person, index) =>
                  person.active && (
                    <span
                      key={person.id}
                      className="hidden items-center gap-2 md:flex"
                    >
                      <i
                        className="size-3 rounded border border-ink/25"
                        style={{ backgroundColor: personColor(index) }}
                      />
                      {person.name}
                    </span>
                  ),
              )}
            <span className="md:hidden">
              Os números abaixo das datas indicam quantas pessoas estão
              escaladas.
            </span>
            {people.length > WEEK_LANE_LIMIT && (
              <span className="hidden md:inline">
                Até quatro faixas por semana. Abra a data para ver a equipe
                completa.
              </span>
            )}
            <span>Datas com dia e mês completam a semana.</span>
          </div>
          <ScheduleCalendar
            {...grid}
            key={month}
            month={month}
            onEditDays={editDays}
          />
          <WeeklySummary {...grid} month={month} />
        </>
      )}
    </>
  );
}
