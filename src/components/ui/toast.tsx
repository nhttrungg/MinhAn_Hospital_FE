"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Toast } from "radix-ui";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastTone = "success" | "error" | "info";
type Notify = (message: string, tone?: ToastTone) => void;
const ToastContext = createContext<Notify>(() => {});
const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone }>({
    message: "",
    tone: "success",
  });
  const [open, setOpen] = useState(false);
  const notify = useCallback<Notify>((message, tone = "success") => {
    setToast({ message, tone });
    setOpen(true);
  }, []);
  const Icon = icons[toast.tone];
  return (
    <ToastContext.Provider value={notify}>
      <Toast.Provider duration={toast.tone === "error" ? 8000 : 4500}>
        {children}
        <Toast.Root
          className="at-toast"
          data-tone={toast.tone}
          type={toast.tone === "error" ? "foreground" : "background"}
          open={open}
          onOpenChange={setOpen}
        >
          <Icon size={20} aria-hidden />
          <Toast.Title>{toast.message}</Toast.Title>
          <Toast.Close aria-label="Đóng thông báo">
            <X size={18} />
          </Toast.Close>
        </Toast.Root>
        <Toast.Viewport className="at-toast-viewport" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
export function useToast() {
  return useContext(ToastContext);
}
