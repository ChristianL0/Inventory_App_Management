import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

type ToastKind = "success" | "error";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  notify: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((kind: ToastKind, message: string) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  function dismiss(id: number) {
    setToasts((t) => t.filter((item) => item.id !== id));
  }

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[90vw]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`card flex items-start gap-2.5 px-3.5 py-3 text-sm animate-in ${
              t.kind === "success" ? "border-l-4 !border-l-green-500" : "border-l-4 !border-l-red-500"
            }`}
          >
            {t.kind === "success" ? (
              <CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" />
            ) : (
              <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            )}
            <p className="flex-1 text-ink dark:text-paper">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-ink/40 dark:text-paper/40 hover:text-ink dark:hover:text-paper"
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
