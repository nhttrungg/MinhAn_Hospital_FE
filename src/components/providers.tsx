"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { ChatProvider } from "@/components/customer/chat-provider";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    function changed() {
      browserQueryClient?.clear();
    }
    function expired() {
      if (browserQueryClient?.getQueryData(["me"])) changed();
      if (
        window.location.pathname.startsWith("/staff") ||
        window.location.pathname.startsWith("/portal")
      ) {
        browserQueryClient?.clear();
        const entry = window.location.pathname.startsWith("/staff") ? "/login/staff" : "/login";
        window.location.replace(
          `${entry}?next=${encodeURIComponent(window.location.pathname + window.location.search)}&expired=1`,
        );
      }
    }
    window.addEventListener("antam-auth-changed", changed);
    window.addEventListener("antam-session-expired", expired);
    window.addEventListener("antam-remote-logout", expired);
    return () => {
      window.removeEventListener("antam-auth-changed", changed);
      window.removeEventListener("antam-session-expired", expired);
      window.removeEventListener("antam-remote-logout", expired);
    };
  }, []);
  return (
    <QueryClientProvider client={getQueryClient()}>
      <ChatProvider>
        <ToastProvider>{children}</ToastProvider>
      </ChatProvider>
    </QueryClientProvider>
  );
}
