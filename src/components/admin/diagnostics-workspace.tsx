"use client";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { api, allOptions } from "@/lib/api";
import { mutate, rows, value, number, labels, binary, type Row } from "@/lib/workflow";
import {
  Button,
  Card,
  Field,
  Notice,
  SelectInput,
  TextInput,
  TextArea,
  Form,
  StatusBadge,
} from "@/components/ui";
import { PageHeader, DataTable } from "@/components/ui/data-display";
import { Dialog, DialogClose, ConfirmDialog } from "@/components/ui/overlays";
import { QueryState, useUser } from "@/components/workspace-ui";
import { DocumentButton, ScanPanel, QrButton } from "@/components/workflow-tools";
import { WorkflowForm, type FormField } from "@/components/workflow-form";
type FormSpec = {
  title: string;
  path: string;
  method?: string;
  base?: Row;
  initial?: Row;
  fields: FormField[];
  staff?: Row[];
  review?: boolean;
};
export function DiagnosticsWorkspace({
  encounterId,
  encounterRevision = 0,
  onChanged,
  portal = false,
  canOrder = true,
}: {
  canOrder?: boolean;
  encounterId?: number;
  encounterRevision?: number;
  onChanged?: () => void;
  portal?: boolean;
}) {
  const me = useUser(),
    admin = me.data?.roles.includes("ADMIN"),
    lab = me.data?.roles.includes("LAB_TECH"),
    doctor = me.data?.roles.includes("DOCTOR"),
    cache = useQueryClient();
  const [room, setRoom] = useState(""),
    [selected, setSelected] = useState<Row | null>(null),
    [form, setForm] = useState<FormSpec | null>(null),
    [editor, setEditor] = useState<{ order: Row; definitions: Row[] } | null>(null),
    [definitions, setDefinitions] = useState<{ serviceId: number; rows: Row[] } | null>(null),
    [message, setMessage] = useState(""),
    [confirm, setConfirm] = useState<{
      path: string;
      revision: number;
      title: string;
      reason?: boolean;
      body?: Row;
    } | null>(null);
  const roomsQuery = useQuery({
    queryKey: ["diagnostic-rooms", me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Row[]>("/api/v1/diagnostics/rooms", { signal }),
    enabled: !portal,
  });
  const rid = Number(room || roomsQuery.data?.[0]?.id || 0);
  const services = useQuery({
    queryKey: ["diagnostic-services"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<Row>("/api/v1/catalog/services?active=true", { signal }),
    enabled: !!admin || !!doctor,
  });
  const staff = useQuery({
    queryKey: ["workflow-staff"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      allOptions<Row>("/api/v1/staff-accounts", { signal }),
    enabled: !!admin,
  });
  const list = useQuery({
    queryKey: ["diagnostics", encounterId, rid, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Row[]>(
        `/api/v1/diagnostics/orders?${encounterId ? `encounterId=${encounterId}` : portal ? "" : `roomId=${rid}`}`,
        { signal },
      ),
    enabled: portal || !!encounterId || rid > 0,
    refetchInterval: 15000,
  });
  function refresh() {
    void cache.invalidateQueries({ queryKey: ["diagnostics"] });
    onChanged?.();
  }
  async function run(action: () => Promise<void>) {
    setMessage("");
    try {
      await action();
      refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không thực hiện được.");
    }
  }
  async function select(id: number) {
    setSelected(await api<Row>(`/api/v1/diagnostics/orders/${id}`));
  }
  useEffect(() => {
    if (!encounterId) return;
    const match = window.location.hash.match(/^#diagnostic-(\d+)$/);
    if (!match) return;
    let alive = true;
    void api<Row>(`/api/v1/diagnostics/orders/${match[1]}`)
      .then((result) => {
        if (alive) setSelected(result);
      })
      .catch((e) => {
        if (alive) setMessage(e.message);
      });
    return () => {
      alive = false;
    };
  }, [encounterId]);
  const cols: ColumnDef<Row>[] = [
    {
      header: "Bệnh nhân / chỉ định",
      cell: ({ row }) => (
        <>
          {value(row.original, "patient_name")}
          <small>CD{value(row.original, "id")}</small>
        </>
      ),
    },
    {
      header: "Dịch vụ / phòng",
      cell: ({ row }) => (
        <>
          {value(row.original, "service_name")}
          <small>{value(row.original, "room_name")}</small>
        </>
      ),
    },
    {
      header: "Trạng thái",
      cell: ({ row }) => (
        <StatusBadge status={value(row.original, "status")}>
          {labels[value(row.original, "status")]}
        </StatusBadge>
      ),
    },
    {
      header: "Thao tác",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void run(() => select(number(row.original, "id")))}
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];
  const currentResult = rows(selected, "results")[0];
  return (
    <section className="space-y-4">
      {!encounterId && !portal ? (
        <PageHeader
          title="Xét nghiệm và cận lâm sàng"
          eyebrow="Chẩn đoán"
          description="Nhận chỉ định đã thu tiền, lấy hoặc nhận mẫu, nhập kết quả rồi gửi duyệt. Bệnh nhân chỉ xem được sau khi công bố."
        />
      ) : (
        <h2 className="text-lg font-semibold">Chỉ định và kết quả cận lâm sàng</h2>
      )}
      {message && <Notice tone="error">{message}</Notice>}
      {!portal && (
        <>
          {!encounterId && <QueryState loading={roomsQuery.isLoading} error={roomsQuery.error} />}
          <div className="flex flex-wrap items-end gap-3">
            {!encounterId && (
              <Field label="Phòng thực hiện">
                <SelectInput
                  value={rid || ""}
                  onChange={(e) => {
                    setRoom(e.target.value);
                    setSelected(null);
                  }}
                >
                  {roomsQuery.data?.map((r) => (
                    <option key={number(r, "id")} value={number(r, "id")}>
                      {value(r, "name")}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            )}
            {doctor && canOrder && encounterId && (
              <Button
                disabled={services.isLoading || roomsQuery.isLoading}
                onClick={() =>
                  setForm({
                    title: "Tạo chỉ định cận lâm sàng",
                    path: "/api/v1/diagnostics/orders",
                    base: { encounterId, revision: encounterRevision },
                    fields: [
                      {
                        key: "serviceId",
                        label: "Dịch vụ xét nghiệm / hình ảnh",
                        options:
                          services.data
                            ?.filter((s) => ["LAB", "IMAGING"].includes(value(s, "category")))
                            .map((s) => ({ value: number(s, "id"), label: value(s, "name") })) ??
                          [],
                      },
                      {
                        key: "roomId",
                        label: "Phòng thực hiện",
                        options:
                          roomsQuery.data?.map((r) => ({
                            value: number(r, "id"),
                            label: value(r, "name"),
                          })) ?? [],
                      },
                      {
                        key: "notes",
                        label: "Ghi chú chỉ định",
                        type: "textarea",
                        required: false,
                      },
                    ],
                  })
                }
              >
                Thêm chỉ định
              </Button>
            )}
            {admin && rid > 0 && (
              <Button
                disabled={staff.isLoading}
                variant="ghost"
                onClick={() =>
                  void run(async () => {
                    const assigned = await api<Row[]>(`/api/v1/diagnostics/rooms/${rid}/staff`);
                    setForm({
                      title: "Phân công phòng và quyền duyệt",
                      path: `/api/v1/diagnostics/rooms/${rid}/staff`,
                      method: "PUT",
                      fields: [],
                      staff:
                        staff.data
                          ?.filter(
                            (s) =>
                              Array.isArray(s.roles) &&
                              s.roles.includes("LAB_TECH") &&
                              s.active === true &&
                              s.accountStatus === "ACTIVE",
                          )
                          .map((s) => ({ ...s, role: "LAB_TECH" })) ?? [],
                      review: true,
                      initial: {
                        staff: assigned.map((s) => ({
                          staffId: s.staff_id,
                          canReview: !!number(s, "can_review"),
                        })),
                      },
                    });
                  })
                }
              >
                Phân công / quyền duyệt
              </Button>
            )}
            {admin && (
              <Field label="Cấu hình chỉ số dịch vụ">
                <SelectInput
                  value=""
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id)
                      void run(async () =>
                        setDefinitions({
                          serviceId: id,
                          rows: await api<Row[]>(`/api/v1/diagnostics/definitions/${id}`),
                        }),
                      );
                  }}
                >
                  <option value="">Chọn dịch vụ…</option>
                  {services.data
                    ?.filter((s) => ["LAB", "IMAGING"].includes(value(s, "category")))
                    .map((s) => (
                      <option key={number(s, "id")} value={number(s, "id")}>
                        {value(s, "name")}
                      </option>
                    ))}
                </SelectInput>
              </Field>
            )}
          </div>
        </>
      )}
      {lab && !encounterId && (
        <ScanPanel
          onResolved={(r) => {
            const data = r.data as Row;
            if (value(r, "kind") === "DIAGNOSTIC") setSelected(data);
            else if (value(r, "kind") === "SAMPLE")
              void run(() => select(number(data, "order_id")));
            else setMessage("Cần QR chỉ định hoặc mẫu xét nghiệm.");
          }}
        />
      )}
      <QueryState
        loading={list.isLoading}
        error={list.error}
        retry={() => void list.refetch()}
        empty={list.data?.length === 0}
        emptyTitle={
          encounterId
            ? "Chưa có chỉ định"
            : portal
              ? "Chưa có kết quả cận lâm sàng"
              : "Phòng chưa có chỉ định"
        }
        emptyDescription={
          encounterId
            ? "Thêm chỉ định khi cần xét nghiệm hoặc chẩn đoán hình ảnh. Bệnh nhân đóng tiền chỉ định trước khi phòng nhận mẫu."
            : portal
              ? "Kết quả hiện ở đây sau khi phòng cận lâm sàng công bố."
              : "Chỉ định đã thu tiền của phòng này sẽ hiện để tiếp nhận mẫu."
        }
      />
      {!!list.data?.length && (
        <DataTable className="at-catalog-table" fitColumns data={list.data} columns={cols} />
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="Chi tiết chỉ định và kết quả"
        size="wide"
        description={selected ? `CD${selected.id} · ${selected.patient_name}` : undefined}
      >
        {selected && (
          <div className="space-y-4">
            <p>
              {value(selected, "service_name")} · {value(selected, "room_name")} ·{" "}
              {labels[value(selected, "status")]}
            </p>
            <p>Thanh toán: {labels[value(selected.invoice as Row, "status")]}</p>
            {message && <Notice tone="error">{message}</Notice>}
            <div className="flex flex-wrap gap-2">
              {!portal && (
                <>
                  <QrButton
                    kind="DIAGNOSTIC"
                    sourceId={number(selected, "id")}
                    label="QR chỉ định"
                  />
                  <DocumentButton
                    type="DIAGNOSTIC_ORDER"
                    sourceId={number(selected, "id")}
                    label="In phiếu chỉ định"
                  />
                </>
              )}
              {lab && value(selected, "status") === "ISSUED" && (
                <Button
                  onClick={() =>
                    setConfirm({
                      path: `/api/v1/diagnostics/orders/${selected.id}/accept`,
                      revision: number(selected, "revision"),
                      title: "Xác nhận tiếp nhận chỉ định",
                    })
                  }
                >
                  Tiếp nhận
                </Button>
              )}
              {lab &&
                ["ACCEPTED", "IN_PROGRESS"].includes(value(selected, "status")) &&
                value(selected, "category") === "LAB" && (
                  <Button
                    onClick={() =>
                      setConfirm({
                        path: `/api/v1/diagnostics/orders/${selected.id}/collect`,
                        revision: number(selected, "revision"),
                        title: "Ghi nhận lấy mẫu",
                      })
                    }
                  >
                    Lấy mẫu / lấy lại
                  </Button>
                )}
              {doctor && !["COMPLETED", "CANCELLED"].includes(value(selected, "status")) && (
                <Button
                  variant="danger"
                  onClick={() =>
                    setConfirm({
                      path: `/api/v1/diagnostics/orders/${selected.id}/cancel`,
                      revision: number(selected, "revision"),
                      title: "Hủy chỉ định",
                      reason: true,
                    })
                  }
                >
                  Hủy chỉ định
                </Button>
              )}
            </div>
            {rows(selected, "samples").map((sample) => (
              <Card key={number(sample, "id")}>
                <p>
                  Mẫu MAU{value(sample, "id")} · {labels[value(sample, "status")]} ·{" "}
                  {value(sample, "collected_at")}
                </p>
                <p>{value(sample, "rejected_reason")}</p>
                <QrButton kind="SAMPLE" sourceId={number(sample, "id")} label="QR mẫu" />
                {lab && value(sample, "status") === "COLLECTED" && (
                  <Button
                    variant="danger"
                    onClick={() =>
                      setConfirm({
                        path: `/api/v1/diagnostics/orders/${selected.id}/reject-sample`,
                        revision: number(selected, "revision"),
                        title: "Từ chối mẫu",
                        reason: true,
                        body: { sampleId: sample.id },
                      })
                    }
                  >
                    Từ chối mẫu
                  </Button>
                )}
              </Card>
            ))}
            {lab &&
              ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(value(selected, "status")) &&
              value(currentResult, "status") !== "SUBMITTED" && (
                <Button
                  onClick={() =>
                    void run(async () =>
                      setEditor({
                        order: selected,
                        definitions: await api<Row[]>(
                          `/api/v1/diagnostics/definitions/${selected.service_id}`,
                        ),
                      }),
                    )
                  }
                >
                  {value(currentResult, "status") === "PUBLISHED"
                    ? "Bổ sung kết quả"
                    : "Nhập / sửa kết quả"}
                </Button>
              )}
            {rows(selected, "results").map((result) => (
              <Card key={number(result, "id")}>
                <h3 className="font-semibold">
                  Kết quả v{value(result, "version")} · {labels[value(result, "status")]}
                </h3>
                <DataTable
                  data={rows(result, "measurements")}
                  columns={[
                    { header: "Chỉ số", accessorKey: "name" },
                    { header: "Kết quả", accessorKey: "value" },
                    { header: "Đơn vị", accessorKey: "unit" },
                    { header: "Tham chiếu", accessorKey: "referenceRange" },
                    { header: "Ghi chú", accessorKey: "flag" },
                  ]}
                />
                <p className="whitespace-pre-wrap">{value(result, "description")}</p>
                <p className="whitespace-pre-wrap">{value(result, "conclusion")}</p>
                {value(result, "reason") && <p>Lý do bổ sung: {value(result, "reason")}</p>}
                <p className="text-sm">
                  Thực hiện: {value(result, "author_name")} · Duyệt:{" "}
                  {value(result, "reviewer_name")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {value(result, "status") === "PUBLISHED" && (
                    <DocumentButton
                      type="DIAGNOSTIC_RESULT"
                      sourceId={number(result, "id")}
                      label="In kết quả"
                    />
                  )}
                  {lab && value(result, "status") === "DRAFT" && (
                    <DocumentButton
                      draft
                      type="DIAGNOSTIC_RESULT"
                      sourceId={number(result, "id")}
                      label="Xem PDF nháp"
                    />
                  )}
                  {lab && value(result, "status") === "DRAFT" && (
                    <Button
                      onClick={() =>
                        setConfirm({
                          path: `/api/v1/diagnostics/results/${result.id}/submit`,
                          revision: number(result, "revision"),
                          title: "Gửi kết quả duyệt",
                        })
                      }
                    >
                      Gửi duyệt
                    </Button>
                  )}
                  {lab &&
                    number(
                      roomsQuery.data?.find((r) => number(r, "id") === number(selected, "room_id")),
                      "can_review",
                    ) === 1 &&
                    value(result, "status") === "SUBMITTED" && (
                      <>
                        <Button
                          onClick={() =>
                            setConfirm({
                              path: `/api/v1/diagnostics/results/${result.id}/publish`,
                              revision: number(result, "revision"),
                              title: "Duyệt và công bố kết quả",
                            })
                          }
                        >
                          Duyệt / công bố
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setConfirm({
                              path: `/api/v1/diagnostics/results/${result.id}/return`,
                              revision: number(result, "revision"),
                              title: "Trả lại kết quả để sửa",
                              reason: true,
                            })
                          }
                        >
                          Trả sửa
                        </Button>
                      </>
                    )}
                </div>
                {rows(result, "attachments").map((a) => (
                  <Button
                    key={number(a, "id")}
                    variant="ghost"
                    onClick={() =>
                      void run(async () => {
                        const url = URL.createObjectURL(
                          await binary(`/api/v1/diagnostics/attachments/${a.id}`),
                        );
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = value(a, "filename");
                        link.click();
                        setTimeout(() => URL.revokeObjectURL(url), 10000);
                      })
                    }
                  >
                    {value(a, "filename")}
                  </Button>
                ))}
                {lab && value(result, "status") === "DRAFT" && (
                  <Field label="Đính kèm PDF / ảnh (tối đa 10 MB)">
                    <TextInput
                      type="file"
                      accept="application/pdf,image/png,image/jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          void run(async () => {
                            const body = new FormData();
                            body.set("file", file);
                            body.set("revision", value(result, "revision"));
                            await api(`/api/v1/diagnostics/results/${result.id}/attachments`, {
                              method: "POST",
                              body,
                            });
                            await select(number(selected, "id"));
                          });
                      }}
                    />
                  </Field>
                )}
              </Card>
            ))}
          </div>
        )}
      </Dialog>
      {form && <WorkflowForm {...form} onClose={() => setForm(null)} onDone={refresh} />}
      {editor && (
        <ResultEditor
          key={number(editor.order, "id")}
          {...editor}
          onClose={() => setEditor(null)}
          onDone={() => {
            refresh();
            void select(number(editor.order, "id"));
          }}
        />
      )}
      {definitions && <DefinitionsEditor {...definitions} onClose={() => setDefinitions(null)} />}
      <ConfirmDialog
        key={confirm?.path ?? "none"}
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={confirm?.title ?? "Xác nhận"}
        description="Đối chiếu bệnh nhân, chỉ định và nội dung trước khi xác nhận."
        actionLabel="Xác nhận"
        reason={confirm?.reason}
        onConfirm={async (reason) => {
          if (!confirm) return;
          await mutate(confirm.path, { revision: confirm.revision, reason, ...confirm.body });
          refresh();
          if (selected) await select(number(selected, "id"));
        }}
      />
    </section>
  );
}
function ResultEditor({
  order,
  definitions,
  onDone,
  onClose,
}: {
  order: Row;
  definitions: Row[];
  onDone: () => void;
  onClose: () => void;
}) {
  const result = rows(order, "results")[0],
    draft = value(result, "status") === "DRAFT";
  const [description, setDescription] = useState(draft ? value(result, "description") : ""),
    [conclusion, setConclusion] = useState(draft ? value(result, "conclusion") : ""),
    [reason, setReason] = useState(""),
    [values, setValues] = useState(
      definitions.map((d) => {
        const old = rows(result, "measurements").find((m) => value(m, "name") === value(d, "name"));
        return {
          definitionId: d.id,
          value: draft ? value(old, "value") : "",
          flag: draft ? value(old, "flag") : "",
        };
      }),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [dirty, setDirty] = useState(false);
  function change() {
    setDirty(true);
    setKey(crypto.randomUUID());
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Nhập kết quả cận lâm sàng"
      size="wide"
      busy={busy}
      dirty={dirty}
      footer={
        <>
          <DialogClose>
            <Button variant="ghost">Hủy</Button>
          </DialogClose>
          <Button form="result-form" type="submit" busy={busy}>
            Lưu nháp
          </Button>
        </>
      }
    >
      <Form
        id="result-form"
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await mutate(
              `/api/v1/diagnostics/orders/${order.id}/result`,
              {
                revision: draft ? result.revision : 0,
                previousVersion: result?.version ?? 0,
                measurements: values.filter((v) => v.value.trim()),
                description,
                conclusion,
                reason,
              },
              "PUT",
              key,
            );
            onDone();
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Không lưu được.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && <Notice tone="error">{error}</Notice>}
        {definitions.map((d, i) => (
          <div key={number(d, "id")} className="grid gap-3 sm:grid-cols-2">
            <Field
              label={`${value(d, "name")} · ${value(d, "unit")} · tham chiếu ${value(d, "reference_range")}`}
            >
              <TextInput
                value={values[i].value}
                onChange={(e) => {
                  change();
                  setValues(values.map((v, j) => (j === i ? { ...v, value: e.target.value } : v)));
                }}
                maxLength={200}
              />
            </Field>
            <Field label="Ghi chú chỉ số">
              <TextInput
                value={values[i].flag}
                onChange={(e) => {
                  change();
                  setValues(values.map((v, j) => (j === i ? { ...v, flag: e.target.value } : v)));
                }}
                maxLength={200}
              />
            </Field>
          </div>
        ))}
        <Field label="Mô tả">
          <TextArea
            rows={4}
            value={description}
            onChange={(e) => {
              change();
              setDescription(e.target.value);
            }}
            maxLength={10000}
          />
        </Field>
        <Field label="Kết luận">
          <TextArea
            rows={4}
            value={conclusion}
            onChange={(e) => {
              change();
              setConclusion(e.target.value);
            }}
            maxLength={10000}
          />
        </Field>
        {result && !draft && (
          <Field label="Lý do bổ sung" required>
            <TextArea
              required
              value={reason}
              onChange={(e) => {
                change();
                setReason(e.target.value);
              }}
              maxLength={500}
            />
          </Field>
        )}
      </Form>
    </Dialog>
  );
}
function DefinitionsEditor({
  serviceId,
  rows: initial,
  onClose,
}: {
  serviceId: number;
  rows: Row[];
  onClose: () => void;
}) {
  const [items, setItems] = useState(
      initial.map((d) => ({
        name: value(d, "name"),
        unit: value(d, "unit"),
        referenceRange: value(d, "reference_range"),
      })),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Chỉ số và khoảng tham chiếu"
      size="wide"
      dirty={dirty}
      busy={busy}
      footer={
        <>
          <DialogClose>
            <Button variant="ghost">Hủy</Button>
          </DialogClose>
          <Button type="submit" form="definitions" busy={busy}>
            Lưu
          </Button>
        </>
      }
    >
      <Form
        id="definitions"
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await mutate(
              `/api/v1/diagnostics/definitions/${serviceId}`,
              { measurements: items },
              "PUT",
            );
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Không lưu được.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && <Notice tone="error">{error}</Notice>}
        {items.map((row, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-4">
            {(["name", "unit", "referenceRange"] as const).map((key) => (
              <Field
                key={key}
                label={
                  { name: "Tên chỉ số", unit: "Đơn vị", referenceRange: "Khoảng tham chiếu" }[key]
                }
              >
                <TextInput
                  required={key === "name"}
                  value={row[key]}
                  onChange={(e) => {
                    setDirty(true);
                    setItems(items.map((v, j) => (j === i ? { ...v, [key]: e.target.value } : v)));
                  }}
                  maxLength={200}
                />
              </Field>
            ))}
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setDirty(true);
                setItems(items.filter((_, j) => i !== j));
              }}
            >
              Bỏ dòng
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          type="button"
          onClick={() => {
            setDirty(true);
            setItems([...items, { name: "", unit: "", referenceRange: "" }]);
          }}
        >
          Thêm chỉ số
        </Button>
      </Form>
    </Dialog>
  );
}
