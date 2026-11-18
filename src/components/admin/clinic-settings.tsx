"use client";
import { invalidateDataGroups } from "@/lib/query-cache";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button, Card, Field, Notice, TextArea, TextInput, Form } from "@/components/ui";
import { DetailList, PageHeader } from "@/components/ui/data-display";
import { Dialog, DialogClose } from "@/components/ui/overlays";
import { QueryState } from "@/components/workspace-ui";
import { Checkbox } from "@/components/ui/primitives";
import { WaitThresholdSettings } from "./operations-parts";
type Settings = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  workingHours: string | null;
  queueDisplayEnabled: boolean;
  queueDisplayMaskNames: boolean;
  remindersEnabled: boolean;
  reminderHoursBefore: number;
  nearExpiryDays: number;
};
const fields = [
  ["name", "Tên cơ sở"],
  ["address", "Địa chỉ"],
  ["phone", "Hotline"],
  ["email", "Email"],
  ["workingHours", "Giờ làm việc"],
] as const;
export function ClinicSettings() {
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["clinic-settings"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Settings>("/api/v1/clinic-settings", { signal }),
  });
  const [draft, setDraft] = useState<Settings | null>(null);
  const [initial, setInitial] = useState<Settings | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function edit() {
    if (!query.data) return;
    const settings = {
      ...query.data,
      queueDisplayEnabled: query.data.queueDisplayEnabled ?? true,
      queueDisplayMaskNames: query.data.queueDisplayMaskNames ?? true,
      remindersEnabled: query.data.remindersEnabled ?? true,
      reminderHoursBefore: query.data.reminderHoursBefore ?? 24,
      nearExpiryDays: query.data.nearExpiryDays ?? 60,
    };
    setDraft(settings);
    setInitial(settings);
    setError("");
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/clinic-settings", { method: "PUT", body: JSON.stringify(draft) });
      setDraft(null);
      setMessage("Đã lưu thông tin cơ sở.");
      await invalidateDataGroups(cache, ["clinic-settings", "public-clinic", "wait-thresholds"]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được cấu hình.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <WaitThresholdSettings />
      <PageHeader
        eyebrow="Hệ thống"
        title="Thông tin cơ sở"
        description="Thông tin liên hệ và giờ hoạt động được hiển thị cho khách hàng."
        actions={
          <Button type="button" disabled={!query.data || !!query.error} onClick={edit}>
            Sửa thông tin
          </Button>
        }
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {message && <Notice tone="success">{message}</Notice>}
      {query.data && (
        <Card>
          <DetailList
            items={[
              ...fields.map(([key, label]) => ({ label, value: query.data![key] })),
              { label: "Màn hình gọi số", value: query.data.queueDisplayEnabled ? "Bật" : "Tắt" },
              { label: "Che tên trên TV", value: query.data.queueDisplayMaskNames ? "Bật" : "Tắt" },
              {
                label: "Nhắc lịch",
                value: query.data.remindersEnabled
                  ? `Trước ${query.data.reminderHoursBefore} giờ`
                  : "Tắt",
              },
              { label: "Cảnh báo hạn thuốc", value: `Trong ${query.data.nearExpiryDays} ngày` },
            ]}
          />
        </Card>
      )}
      <Dialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
        title="Sửa thông tin cơ sở"
        size="wide"
        busy={busy}
        dirty={JSON.stringify(draft) !== JSON.stringify(initial)}
        footer={
          <>
            <DialogClose>
              <Button type="button" variant="ghost" disabled={busy}>
                Hủy
              </Button>
            </DialogClose>
            <Button type="submit" form="clinic-settings-form" busy={busy}>
              Lưu thông tin
            </Button>
          </>
        }
      >
        {draft && (
          <Form id="clinic-settings-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {error && (
              <div className="sm:col-span-2">
                <Notice tone="error">{error}</Notice>
              </div>
            )}
            {fields.map(([key, label]) => (
              <div
                className={
                  key === "name" || key === "address" || key === "workingHours"
                    ? "sm:col-span-2"
                    : ""
                }
                key={key}
              >
                <Field label={label} required={key === "name"}>
                  {key === "workingHours" ? (
                    <TextArea
                      rows={3}
                      maxLength={500}
                      value={draft[key] ?? ""}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value || null })}
                    />
                  ) : (
                    <TextInput
                      required={key === "name"}
                      type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
                      maxLength={
                        key === "name" ? 200 : key === "email" ? 255 : key === "phone" ? 30 : 500
                      }
                      value={draft[key] ?? ""}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    />
                  )}
                </Field>
              </div>
            ))}
            <div className="sm:col-span-2 grid gap-3">
              {(
                [
                  ["queueDisplayEnabled", "Bật màn hình gọi số công khai"],
                  ["queueDisplayMaskNames", "Che tên bệnh nhân trên màn hình TV"],
                  ["remindersEnabled", "Gửi nhắc lịch qua email và thông báo"],
                ] as const
              ).map(([key, label]) => (
                <Checkbox
                  key={key}
                  label={label}
                  checked={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
                />
              ))}
            </div>
            <Field label="Số giờ nhắc trước lịch khám">
              <TextInput
                type="number"
                min={1}
                max={168}
                required
                value={draft.reminderHoursBefore}
                onChange={(e) =>
                  setDraft({ ...draft, reminderHoursBefore: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Số ngày cảnh báo thuốc sắp hết hạn">
              <TextInput
                type="number"
                min={1}
                max={365}
                required
                value={draft.nearExpiryDays}
                onChange={(e) => setDraft({ ...draft, nearExpiryDays: Number(e.target.value) })}
              />
            </Field>
          </Form>
        )}
      </Dialog>
    </>
  );
}
