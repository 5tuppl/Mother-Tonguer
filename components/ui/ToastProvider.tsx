"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";

type ToastVariant = "default" | "success" | "error";

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastContextValue {
  notify: (toast: ToastInput) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const notify = React.useCallback((toast: ToastInput) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { ...toast, id }].slice(-4));
  }, []);

  const remove = React.useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4600}>
        {children}
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            className={cn(
              "grid w-full grid-cols-[1fr_auto] items-start gap-3 rounded-app border border-border bg-panel p-4 text-ink shadow-soft data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:slide-in-from-bottom-3 sm:w-[min(92vw,390px)]",
              toast.variant === "success" && "border-success/35",
              toast.variant === "error" && "border-danger/40"
            )}
            onOpenChange={(open) => {
              if (!open) remove(toast.id);
            }}
          >
            <div className="min-w-0">
              <ToastPrimitive.Title className="text-sm font-semibold">{toast.title}</ToastPrimitive.Title>
              {toast.description ? (
                <ToastPrimitive.Description className="mt-1 break-words text-sm leading-5 text-muted">
                  {toast.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close asChild>
              <IconButton label="Dismiss" className="h-8 w-8 border-0 bg-transparent shadow-none">
                <X aria-hidden className="h-4 w-4" />
              </IconButton>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed inset-x-2 bottom-4 z-50 flex max-w-[100vw] flex-col items-end gap-2 p-2 sm:left-auto sm:right-4 sm:w-[420px]" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
