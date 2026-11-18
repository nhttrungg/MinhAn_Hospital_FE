"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Appointment } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { appointmentLabels } from "@/lib/outpatient";
import { ScanPanel, DocumentButton } from "@/components/workflow-tools";
import { Button, Notice } from "@/components/ui";
import { Dialog } from "@/components/ui/overlays";
export function ReceptionScan() {
  const [selected, setSelected] = useState<Appointment | null>(null),
    [justChecked, setJustChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const cache = useQueryClient();
  return (
    <>
      <ScanPanel
        expected="APPOINTMENT"
        onResolved={(result) => {
          setJustChecked(false);
          setSelected(result.data as Appointment);
          setError("");
        }}
      />
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="Đối chiếu và tiếp nhận"
        size="wide"
        busy={busy}
      >
        {selected && (
          <div className="space-y-4">
            <p>
              <strong>{selected.patientName}</strong> · {selected.code}
            </p>
            <p>
              {selected.slot.doctorName} · {selected.slot.roomName} ·{" "}
              {formatDateTime(selected.slot.startsAt)}
            </p>
            <p>
              {appointmentLabels[selected.status]}
              {selected.queueNumber ? ` · Số thứ tự ${selected.queueNumber}` : ""}
            </p>
            {error && <Notice tone="error">{error}</Notice>}
            {selected.status === "CONFIRMED" ? (
              <Button
                busy={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    setSelected(
                      await api<Appointment>(`/api/v1/appointments/${selected.id}/check-in`, {
                        method: "POST",
                      }),
                    );
                    setJustChecked(true);
                    await cache.invalidateQueries({ queryKey: ["reception-appointments"] });
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Không tiếp nhận được.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Xác nhận tiếp nhận và in
              </Button>
            ) : (
              ["CHECKED_IN", "COMPLETED"].includes(selected.status) && (
                <DocumentButton
                  autoOpen={justChecked}
                  type="EXAMINATION_TICKET"
                  sourceId={selected.id}
                  label="In phiếu khám / in lại"
                />
              )
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
