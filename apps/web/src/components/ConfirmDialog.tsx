import { useEffect, useRef } from "react";
import { button, primary } from "./styles";
export interface Confirmation {
  message: string;
  resolve: (accepted: boolean) => void;
}
export function ConfirmDialog({
  request,
  onClose,
}: {
  request: Confirmation | null;
  onClose: (accepted: boolean) => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!request) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = dialog.current;
    root?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose(false);
      }
      if (event.key === "Tab") {
        const nodes = root?.querySelectorAll<HTMLButtonElement>("button");
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [request, onClose]);
  if (!request) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="confirm-title" className="mb-3 text-xl font-semibold">
          Confirmar alteração
        </h2>
        <p id="confirm-message" className="mb-6 text-muted">
          {request.message}
        </p>
        <div className="flex justify-end gap-3">
          <button className={button} onClick={() => onClose(false)}>
            Cancelar
          </button>
          <button className={primary} onClick={() => onClose(true)}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
