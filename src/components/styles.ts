export const button =
  "rounded-md border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-100 disabled:opacity-50";
export const primary =
  "rounded-md border border-brand bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50";
export const tableWrap = "overflow-auto rounded-lg border border-line bg-white";
export const shiftColors = [
  "bg-shift-blue",
  "bg-shift-green",
  "bg-shift-amber",
  "bg-shift-purple",
] as const;
export const shiftColor = (index: number) =>
  shiftColors[
    ((index % shiftColors.length) + shiftColors.length) % shiftColors.length
  ];
export const heading = "mb-3 mt-6 text-xl font-semibold";

export function personColor(index: number) {
  return "hsl(" + ((208 + index * 137.508) % 360) + " 68% 85%)";
}
