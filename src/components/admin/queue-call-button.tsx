"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { Appointment } from "@/lib/types";

export function QueueCallButton({ appointment }: { appointment: Appointment }) {
  const cache = useQueryClient();
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const state = useQuery({
    queryKey: ["queue-call-state", appointment.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<{ callCount: number }>(`/api/v1/queue/${appointment.id}/call-state`, { signal }),
  });
  const called = (state.data?.callCount ?? 0) > 0;
  async function call() {
    setBusy(true);
    try {
      const result = await api<{ callCount: number }>(`/api/v1/queue/${appointment.id}/call`, {
        method: "POST",
      });
      cache.setQueryData(["queue-call-state", appointment.id], result);
      notify(`Đã gọi số ${appointment.queueNumber} vào ${appointment.slot.roomName}.`, "success");
      await cache.invalidateQueries({
        predicate: (query) =>
          ["doctor-queue", "reception-appointments", "public-queue-board"].includes(
            String(query.queryKey[0]),
          ),
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không gọi được số.", "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button
      size="sm"
      variant="ghost"
      busy={busy}
      onClick={() => void call()}
      aria-label={`${called ? "Gọi lại" : "Gọi"} số ${appointment.queueNumber}`}
    >
      <Volume2 size={16} aria-hidden />
      {called ? "Gọi lại" : "Gọi"}
    </Button>
  );
}
