"use client";
import { useState, type FormEvent } from "react";
import { mutate, type Row, value } from "@/lib/workflow";
import {
  Button,
  Field,
  Notice,
  SelectInput,
  TextInput,
  TextArea,
  Form,
  Checkbox,
  Fieldset,
} from "./ui";
import { Dialog, DialogClose } from "@/components/ui/overlays";
export type FormField = {
  key: string;
  label: string;
  type?: string;
  options?: { value: string | number; label: string }[];
  required?: boolean;
};
export function WorkflowForm({
  title,
  path,
  method = "POST",
  base = {},
  fields,
  initial = {},
  staff,
  review = false,
  onDone,
  onClose,
}: {
  title: string;
  path: string;
  method?: string;
  base?: Row;
  fields: FormField[];
  initial?: Row;
  staff?: Row[];
  review?: boolean;
  onDone: () => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState<Row>(initial),
    [chosen, setChosen] = useState<Row[]>(
      Array.isArray(initial.staff) ? (initial.staff as Row[]) : [],
    ),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [key, setKey] = useState(() => crypto.randomUUID());
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await mutate(
        path,
        { ...base, ...input, ...(staff !== undefined ? { staff: chosen } : {}) },
        method,
        key,
      );
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="wide"
      title={title}
      busy={busy}
      dirty={dirty}
      footer={
        <>
          <DialogClose>
            <Button variant="ghost" disabled={busy}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="submit" form="workflow-form" busy={busy}>
            Lưu / xác nhận
          </Button>
        </>
      }
    >
      <Form id="workflow-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {error && (
          <div className="sm:col-span-2">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        {fields.map((f) => (
          <Field key={f.key} label={f.label} required={f.required !== false}>
            {f.options ? (
              <SelectInput
                required={f.required !== false}
                value={value(input, f.key)}
                onChange={(e) => {
                  setDirty(true);
                  setKey(crypto.randomUUID());
                  setInput({ ...input, [f.key]: e.target.value });
                }}
              >
                <option value="">Chọn…</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectInput>
            ) : f.type === "textarea" ? (
              <TextArea
                rows={3}
                required={f.required !== false}
                maxLength={10000}
                value={value(input, f.key)}
                onChange={(e) => {
                  setDirty(true);
                  setKey(crypto.randomUUID());
                  setInput({ ...input, [f.key]: e.target.value });
                }}
              />
            ) : (
              <TextInput
                type={f.type ?? "text"}
                step={f.type === "number" ? "0.01" : undefined}
                required={f.required !== false}
                maxLength={f.type === "number" ? undefined : 500}
                value={value(input, f.key)}
                onChange={(e) => {
                  setDirty(true);
                  setKey(crypto.randomUUID());
                  setInput({ ...input, [f.key]: e.target.value });
                }}
              />
            )}
          </Field>
        ))}
        {staff !== undefined && (
          <Fieldset
            className="space-y-2 sm:col-span-2"
            legend="Nhân viên được phân công"
            legendClassName="font-semibold"
          >
            {staff.map((s) => {
              const sid = Number(s.id),
                item = chosen.find((c) => Number(c.staffId) === sid);
              return (
                <div key={sid} className="flex flex-wrap gap-4">
                  <Checkbox
                    checked={!!item}
                    onChange={(e) => {
                      setDirty(true);
                      setKey(crypto.randomUUID());
                      setChosen(
                        e.target.checked
                          ? [...chosen, { staffId: sid, canReview: false }]
                          : chosen.filter((c) => Number(c.staffId) !== sid),
                      );
                    }}
                    label={
                      <>
                        {" "}
                        {value(s, "fullName")} · {value(s, "role")}
                      </>
                    }
                  />
                  {review && item && (
                    <Checkbox
                      checked={!!item.canReview}
                      onChange={(e) => {
                        setDirty(true);
                        setKey(crypto.randomUUID());
                        setChosen(
                          chosen.map((c) =>
                            Number(c.staffId) === sid ? { ...c, canReview: e.target.checked } : c,
                          ),
                        );
                      }}
                      label={<> Được duyệt kết quả</>}
                    />
                  )}
                </div>
              );
            })}
          </Fieldset>
        )}
      </Form>
    </Dialog>
  );
}
