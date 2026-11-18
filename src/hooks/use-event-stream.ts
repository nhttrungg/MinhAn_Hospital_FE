"use client";

import { useEffect, useRef, useState } from "react";

const eventTypes = [
  "ready",
  "queue.updated",
  "encounter.updated",
  "billing.updated",
  "payment.updated",
  "notification.updated",
  "pharmacy.updated",
  "diagnostic.updated",
];
export type StreamState = "connecting" | "connected" | "reconnecting" | "polling" | "offline";

/** Streams carry invalidations. Reconnect always reloads REST snapshots, so no replay is needed. */
export function useEventStream(url: string | null, onEvent: (type: string, data: unknown) => void) {
  const callback = useRef(onEvent);
  const [state, setState] = useState<StreamState>("connecting");
  useEffect(() => {
    callback.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    if (!url || typeof EventSource === "undefined") return;
    let disposed = false;
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let lastSeen = Date.now();
    function close() {
      source?.close();
      source = null;
    }
    function retry() {
      if (disposed) return;
      close();
      clearTimeout(retryTimer);
      failures += 1;
      setState(navigator.onLine ? (failures >= 3 ? "polling" : "reconnecting") : "offline");
      if (!navigator.onLine) return;
      retryTimer = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(failures - 1, 5)));
    }
    function connect() {
      if (disposed) return;
      clearTimeout(retryTimer);
      close();
      lastSeen = Date.now();
      try {
        const stream = new EventSource(url!, { withCredentials: true });
        source = stream;
        stream.onopen = () => {
          if (disposed || source !== stream) return;
          lastSeen = Date.now();
          failures = 0;
          setState("connected");
          callback.current("reconnected", {});
        };
        stream.onerror = () => {
          if (source === stream) retry();
        };
        stream.addEventListener("ping", () => {
          lastSeen = Date.now();
        });
        eventTypes.forEach((type) =>
          stream.addEventListener(type, (event) => {
            if (disposed || source !== stream) return;
            lastSeen = Date.now();
            try {
              callback.current(type, JSON.parse((event as MessageEvent<string>).data));
            } catch {
              /* malformed frames do not tear down a healthy stream */
            }
          }),
        );
      } catch {
        retry();
      }
    }
    const online = () => {
      if (!disposed) {
        failures = 0;
        connect();
      }
    };
    const offline = () => {
      close();
      clearTimeout(retryTimer);
      setState("offline");
    };
    // Authentication changes dispose the old user's stream immediately. The protected
    // layout/query cache remounts the next user's workspace and opens a fresh connection.
    const authChanged = () => {
      if (url?.startsWith("/api/v1/realtime/")) {
        disposed = true;
        close();
        clearTimeout(retryTimer);
        setState("offline");
      }
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("antam-auth-changed", authChanged);
    const watchdog = setInterval(() => {
      if (source && Date.now() - lastSeen > 55000) retry();
    }, 10000);
    if (navigator.onLine) connect();
    else retryTimer = setTimeout(offline, 0);
    return () => {
      disposed = true;
      close();
      clearTimeout(retryTimer);
      clearInterval(watchdog);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("antam-auth-changed", authChanged);
    };
  }, [url]);
  return {
    state,
    connected: state === "connected",
    polling:
      state === "polling" || state === "offline" || !url || typeof EventSource === "undefined",
  };
}
