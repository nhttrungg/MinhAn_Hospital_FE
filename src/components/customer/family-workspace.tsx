"use client";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  ButtonLink,
  Card,
  Field,
  Form,
  Notice,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/ui/primitives";
import { DetailList, PageHeader } from "@/components/ui/data-display";
import { ConfirmDialog, Dialog, DialogClose } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import { QueryState } from "@/components/workspace-ui";
import { useFamilyPatients } from "@/hooks/use-family-patients";
import { api } from "@/lib/api";
import type { FamilyInput, FamilyPatient } from "@/lib/engagement-types";
import { vietnamDate } from "@/lib/outpatient";

const blank = {
  fullName: "",
  relationship: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  allergies: "",
  medicalHistory: "",
};
type FamilyForm = typeof blank;
function formValues(p: FamilyPatient): FamilyForm {
  return Object.fromEntries(
    Object.keys(blank).map((key) => [key, p[key as keyof FamilyPatient] ?? ""]),
  ) as FamilyForm;
}

export function FamilyWorkspace() {
  const { family } = useFamilyPatients();
  const cache = useQueryClient();
  const toast = useToast();
  const [editor, setEditor] = useState<{ patient: FamilyPatient | null } | null>(null);
  const [form, setForm] = useState(blank);
  const [initial, setInitial] = useState(blank);
  const [remove, setRemove] = useState<FamilyPatient | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function open(patient: FamilyPatient | null) {
    const next = patient ? formValues(patient) : blank;
    setForm(next);
    setInitial(next);
    setError("");
    setEditor({ patient });
  }
  function field(key: keyof FamilyForm, value: string) {
    setForm((old) => ({ ...old, [key]: value }));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.relationship.trim()) {
      setError("Nhập họ tên và mối quan hệ.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body: FamilyInput = {
        ...form,
        fullName: form.fullName.trim(),
        relationship: form.relationship.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        address: form.address.trim() || null,
        allergies: form.allergies.trim() || null,
        medicalHistory: form.medicalHistory.trim() || null,
      };
      await api(`/api/v1/patients/me/family${editor?.patient ? `/${editor.patient.id}` : ""}`, {
        method: editor?.patient ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      await cache.invalidateQueries({ queryKey: ["patient-family"] });
      setEditor(null);
      toast("Đã lưu hồ sơ người thân.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được hồ sơ.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="space-y-5">
      <PageHeader
        eyebrow="Chăm sóc gia đình"
        title="Hồ sơ người thân"
        description="Quản lý thông tin người thân, đặt khám và theo dõi từng hồ sơ."
        actions={<Button onClick={() => open(null)}>Thêm người thân</Button>}
      />
      <QueryState
        loading={family.isLoading}
        error={family.error}
        retry={() => void family.refetch()}
        empty={family.isSuccess && !family.data.length}
        emptyTitle="Chưa có hồ sơ người thân"
        emptyDescription="Thêm người thân để chọn hồ sơ của họ khi đặt lịch khám."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {family.data?.map((p) => (
          <Card key={p.id} className="space-y-4">
            <h2 className="at-section-title">
              {p.fullName}
              <small>{p.relationship}</small>
            </h2>
            <DetailList
              items={[
                { label: "Mã hồ sơ", value: p.code },
                { label: "Ngày sinh", value: p.dateOfBirth?.split("-").reverse().join("/") },
                { label: "Điện thoại", value: p.phone },
                { label: "Dị ứng", value: p.allergies || "Chưa khai báo" },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              {p.active && <ButtonLink href={`/booking?patientId=${p.id}`}>Đặt khám</ButtonLink>}
              <Button variant="ghost" onClick={() => open(p)}>
                Sửa hồ sơ
              </Button>
              <Button variant="danger" onClick={() => setRemove(p)}>
                Gỡ người thân
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Dialog
        open={!!editor}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
        busy={busy}
        dirty={JSON.stringify(form) !== JSON.stringify(initial)}
        size="wide"
        title={editor?.patient ? "Sửa hồ sơ người thân" : "Thêm người thân"}
        description="Thông tin được dùng khi đặt lịch và tiếp nhận khám."
        footer={
          <>
            <DialogClose>
              <Button variant="ghost" disabled={busy}>
                Đóng
              </Button>
            </DialogClose>
            <Button type="submit" form="family-form" busy={busy}>
              Lưu hồ sơ
            </Button>
          </>
        }
      >
        <Form id="family-form" onSubmit={(e) => void save(e)} busy={busy} className="space-y-4">
          {error && <Notice tone="error">{error}</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Họ và tên" required>
              <TextInput
                required
                maxLength={200}
                value={form.fullName}
                onChange={(e) => field("fullName", e.target.value)}
              />
            </Field>
            <Field
              label="Mối quan hệ"
              required
              hint="Ví dụ: Con, Mẹ, Cha, Vợ / Chồng (tối đa 30 ký tự)"
            >
              <TextInput
                required
                maxLength={30}
                value={form.relationship}
                onChange={(e) => field("relationship", e.target.value)}
              />
            </Field>
            <Field label="Ngày sinh">
              <TextInput
                type="date"
                max={vietnamDate()}
                value={form.dateOfBirth}
                onChange={(e) => field("dateOfBirth", e.target.value)}
              />
            </Field>
            <Field label="Giới tính">
              <SelectInput value={form.gender} onChange={(e) => field("gender", e.target.value)}>
                <option value="">Chưa khai báo</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </SelectInput>
            </Field>
            <Field label="Điện thoại">
              <TextInput
                type="tel"
                maxLength={20}
                value={form.phone}
                onChange={(e) => field("phone", e.target.value)}
              />
            </Field>
            <Field label="Email">
              <TextInput
                type="email"
                maxLength={255}
                value={form.email}
                onChange={(e) => field("email", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Địa chỉ">
            <TextInput
              maxLength={500}
              value={form.address}
              onChange={(e) => field("address", e.target.value)}
            />
          </Field>
          <Field label="Dị ứng">
            <TextArea
              maxLength={5000}
              value={form.allergies}
              onChange={(e) => field("allergies", e.target.value)}
            />
          </Field>
          <Field label="Tiền sử bệnh">
            <TextArea
              maxLength={5000}
              value={form.medicalHistory}
              onChange={(e) => field("medicalHistory", e.target.value)}
            />
          </Field>
        </Form>
      </Dialog>
      <ConfirmDialog
        open={!!remove}
        onOpenChange={(open) => {
          if (!open) setRemove(null);
        }}
        danger
        title="Gỡ hồ sơ người thân?"
        description={`Gỡ ${remove?.fullName ?? "người thân"} khỏi danh sách quản lý của bạn.`}
        actionLabel="Gỡ người thân"
        onConfirm={async () => {
          if (!remove) return;
          await api(`/api/v1/patients/me/family/${remove.id}`, { method: "DELETE" });
          await Promise.all(
            ["patient-family", "appointments", "records", "billing", "waitlist"].map((key) =>
              cache.invalidateQueries({ queryKey: [key] }),
            ),
          );
          toast("Đã gỡ hồ sơ người thân.");
        }}
      />
    </main>
  );
}
