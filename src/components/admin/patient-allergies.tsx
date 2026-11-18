"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PatientAllergy } from "@/lib/clinical-safety";
import { Button, Field, TextInput, SelectInput, Form, Notice } from "@/components/ui";
import { QueryState } from "@/components/workspace-ui";
import { ConfirmDialog } from "@/components/ui/overlays";

export function PatientAllergies({
  patientId,
  editable = true,
}: {
  patientId: number;
  editable?: boolean;
}) {
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["patient-allergies", patientId],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<PatientAllergy[]>(`/api/v1/patients/${patientId}/allergies`, { signal }),
  });
  const [editing, setEditing] = useState<PatientAllergy | null>(null);
  const [ingredient, setIngredient] = useState("");
  const [reaction, setReaction] = useState("");
  const [severity, setSeverity] = useState("MODERATE");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [removing, setRemoving] = useState<PatientAllergy | null>(null);
  async function run(action: () => Promise<unknown>, propagate = false) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setEditing(null);
      setIngredient("");
      setReaction("");
      setSeverity("MODERATE");
      setRemoving(null);
      await cache.invalidateQueries({ queryKey: ["patient-allergies", patientId] });
      await cache.invalidateQueries({ queryKey: ["prescription-safety"] });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không cập nhật được dị ứng.");
      if (propagate) throw e;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Dị ứng có cấu trúc</h2>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {message && <Notice tone="error">{message}</Notice>}
      {query.data?.map((a) => (
        <div
          id={`allergy-${a.id}`}
          key={a.id}
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <strong>{a.ingredient}</strong>
          <span>
            {a.reaction || "Chưa ghi phản ứng"} · {a.severity}
          </span>
          {editable && (
            <>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setEditing(a);
                  setIngredient(a.ingredient);
                  setReaction(a.reaction ?? "");
                  setSeverity(a.severity);
                }}
              >
                Sửa
              </Button>
              <Button type="button" variant="danger" disabled={busy} onClick={() => setRemoving(a)}>
                Xóa
              </Button>
            </>
          )}
        </div>
      ))}
      {query.data?.length === 0 && (
        <p className="text-sm text-muted">
          Chưa khai báo dị ứng có cấu trúc. Cần hỏi lại bệnh nhân.
        </p>
      )}
      {editable && (
        <Form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() =>
              api(`/api/v1/patients/${patientId}/allergies${editing ? `/${editing.id}` : ""}`, {
                method: editing ? "PUT" : "POST",
                body: JSON.stringify({
                  ingredient,
                  reaction,
                  severity,
                  revision: editing?.revision ?? 0,
                }),
              }),
            );
          }}
        >
          <Field label="Hoạt chất dị ứng">
            <TextInput
              required
              maxLength={200}
              value={ingredient}
              onChange={(e) => setIngredient(e.target.value)}
            />
          </Field>
          <Field label="Phản ứng">
            <TextInput
              maxLength={300}
              value={reaction}
              onChange={(e) => setReaction(e.target.value)}
            />
          </Field>
          <Field label="Mức độ">
            <SelectInput value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="MILD">Nhẹ</option>
              <option value="MODERATE">Vừa</option>
              <option value="MAJOR">Nặng</option>
            </SelectInput>
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={busy}>
              {editing ? "Lưu dị ứng" : "Thêm dị ứng"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  setIngredient("");
                  setReaction("");
                }}
              >
                Hủy sửa
              </Button>
            )}
          </div>
        </Form>
      )}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Xóa dị ứng đã ghi nhận"
        description={removing?.ingredient ?? ""}
        actionLabel="Xóa dị ứng"
        danger
        onConfirm={() =>
          run(
            () =>
              api(
                `/api/v1/patients/${patientId}/allergies/${removing?.id}?revision=${removing?.revision}`,
                { method: "DELETE" },
              ),
            true,
          )
        }
      />
    </section>
  );
}
