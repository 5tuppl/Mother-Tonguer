"use client";

import * as React from "react";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";
import { useAppStore } from "@/lib/store";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const accentTokens = {
  blue: {
    accent: "0 102 204",
    red: "213 28 47",
    gold: "244 190 52"
  },
  red: {
    accent: "213 28 47",
    red: "213 28 47",
    gold: "244 190 52"
  },
  gold: {
    accent: "202 138 4",
    red: "213 28 47",
    gold: "244 190 52"
  }
};

function ThemeRuntime() {
  const theme = useAppStore((state) => state.theme);
  const accent = useAppStore((state) => state.accent);

  React.useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const resolvedTheme =
        theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
      root.dataset.theme = resolvedTheme;
      const tokens = accentTokens[accent];
      root.style.setProperty("--accent", tokens.accent);
      root.style.setProperty("--accent-red", tokens.red);
      root.style.setProperty("--accent-gold", tokens.gold);
    };

    apply();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [accent, theme]);

  return null;
}

function PwaRegistrar() {
  const { notify } = useToast();
  const online = useOnlineStatus();
  const wasOffline = React.useRef(false);

  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "HISTORY_SYNCED") {
        notify({ title: "History synced", description: "Хадгалсан орчуулга синк хийгдлээ.", variant: "success" });
      }
    };

    import("workbox-window")
      .then(({ Workbox }) => {
        if (!active) return;
        const workbox = new Workbox("/sw.js");
        workbox.addEventListener("installed", (event) => {
          if (event.isUpdate) {
            notify({ title: "Updated", description: "Шинэ хувилбар бэлэн боллоо.", variant: "success" });
          }
        });
        return workbox.register();
      })
      .catch(() => undefined);

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [notify]);

  React.useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      notify({ title: "Offline", description: "Офлайнаар хадгалсан хэллэгүүд нээгдэнэ." });
      return;
    }
    if (wasOffline.current) {
      notify({ title: "Back online", description: "Шууд орчуулга дахин ажиллана.", variant: "success" });
      wasOffline.current = false;
    }
  }, [notify, online]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ThemeRuntime />
      <PwaRegistrar />
      {children}
    </ToastProvider>
  );
}
