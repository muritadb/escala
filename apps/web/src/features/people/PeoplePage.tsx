import { useState } from "react";
import { useApp } from "../../app/AppContext";
import { weekdays } from "@compasso/domain";
import { primary, tableWrap } from "../../components/styles";
export function PeoplePage() {
  const {
      state: { data },
      update,
    } = useApp(),
    [name, setName] = useState("");
  return (
    <>
      <form
        className="mb-6 flex flex-wrap items-end gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim()) return;
          const saved = await update((next) =>
            next.people.push({
              id: crypto.randomUUID(),
              name: name.trim(),
              active: true,
              availability: Array.from({ length: 7 }, () =>
                next.shifts.map((t) => t.id),
              ),
            }),
          );
          if (saved) setName("");
        }}
      >
        <label>
          Nome da pessoa
          <input
            required
            maxLength={100}
            placeholder="Ex.: Ana Souza"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button className={primary}>Adicionar pessoa</button>
      </form>
      {!data.people.length && (
        <p className="rounded-lg border border-dashed border-line bg-white px-5 py-16 text-center text-muted">
          Ainda não há pessoas cadastradas. Cadastre os turnos primeiro para
          definir a disponibilidade.
        </p>
      )}
      {data.people.map((person) => (
        <section
          key={person.id}
          className="mt-5 rounded-lg border border-line bg-white p-5"
        >
          <div className="mb-5 flex flex-wrap items-end gap-7">
            <label>
              Nome
              <input
                aria-label={"Nome de " + person.name}
                maxLength={100}
                key={person.name}
                defaultValue={person.name}
                onBlur={async (event) => {
                  const input = event.currentTarget;
                  const name = input.value.trim();
                  if (
                    name &&
                    name !== person.name &&
                    (await update((next) => {
                      next.people.find((p) => p.id === person.id)!.name = name;
                    }))
                  )
                    return;
                  input.value = person.name;
                }}
              />
            </label>
            <label className="flex-row items-center pb-2">
              <input
                type="checkbox"
                checked={person.active}
                onChange={(e) =>
                  update((next) => {
                    next.people.find((p) => p.id === person.id)!.active =
                      e.target.checked;
                  })
                }
              />
              Pessoa ativa
            </label>
          </div>
          <div className={tableWrap}>
            <table className="w-full text-center">
              <thead>
                <tr>
                  <th>Disponibilidade</th>
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
                          type="checkbox"
                          aria-label={
                            person.name + " " + shift.name + " " + day
                          }
                          checked={person.availability[index].includes(
                            shift.id,
                          )}
                          onChange={(e) =>
                            update((next) => {
                              const p = next.people.find(
                                (p) => p.id === person.id,
                              )!;
                              p.availability[index] = e.target.checked
                                ? [
                                    ...new Set([
                                      ...p.availability[index],
                                      shift.id,
                                    ]),
                                  ]
                                : p.availability[index].filter(
                                    (t) => t !== shift.id,
                                  );
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
