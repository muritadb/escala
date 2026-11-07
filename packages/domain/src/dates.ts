export const weekdays = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];
export const date = (value: string) => new Date(value + "T12:00:00Z");
export const add = (value: string, days: number) => {
  const result = date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};
export const dow = (value: string) => (date(value).getUTCDay() + 6) % 7;
export const label = (value: string) =>
  value.slice(8) + "/" + value.slice(5, 7);
export const currentMonth = () =>
  new Date().toLocaleDateString("sv-SE").slice(0, 7);
export function range(month: string): string[] {
  const first = month + "-01",
    lastDate = date(first);
  lastDate.setUTCMonth(lastDate.getUTCMonth() + 1);
  lastDate.setUTCDate(0);
  const last = lastDate.toISOString().slice(0, 10),
    end = add(last, 6 - dow(last)),
    days: string[] = [];
  for (let day = add(first, -dow(first)); day <= end; day = add(day, 1))
    days.push(day);
  return days;
}
