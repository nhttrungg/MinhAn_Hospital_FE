"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import {
  Button,
  Card,
  Field,
  Notice,
  TextInput,
  TextArea,
  SelectInput,
  ButtonLink,
  Form,
} from "@/components/ui";
import { StatusBadge } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ui/data-display";
import { Dialog, DialogClose } from "@/components/ui/overlays";
import { QueryState } from "@/components/workspace-ui";
import { KnowledgeContent } from "@/components/customer/knowledge-content";
import type { KnowledgeAdmin } from "@/lib/chatbot-types";
type Draft = { id?: number; slug: string; kind: string; title: string; content: string };
const labels: Record<string, string> = {
  DRAFT: "Bản nháp",
  INDEXING: "Đang lập chỉ mục",
  READY: "Sẵn sàng xuất bản",
  PUBLISHED: "Đã xuất bản",
  RETIRED: "Đã thu hồi",
  FAILED: "Xử lý lỗi",
  QUEUED: "Đang chờ",
  PROCESSING: "Đang xử lý",
  RETRY: "Chờ thử lại",
  COMPLETED: "Hoàn tất",
};
export function KnowledgeAdminPage() {
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["knowledge-admin"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<KnowledgeAdmin[]>("/api/v1/admin/knowledge", { signal }),
    refetchInterval: (q) =>
      q.state.data?.some((d) => ["QUEUED", "PROCESSING", "RETRY"].includes(d.jobStatus ?? ""))
        ? 3000
        : false,
  });
  const [draft, setDraft] = useState<Draft | null>(null),
    [preview, setPreview] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(""),
    [search, setSearch] = useState("");
  async function run(key: string, path: string, method = "POST", body?: unknown) {
    setBusy(key);
    setError("");
    setMessage("");
    try {
      const result = await api<{ message?: string }>(`/api/v1/admin/knowledge${path}`, {
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      setMessage(result.message ?? "Đã cập nhật tài liệu.");
      await cache.invalidateQueries({ queryKey: ["knowledge-admin"] });
      await cache.invalidateQueries({ queryKey: ["chatbot-config"] });
      await cache.invalidateQueries({ queryKey: ["public-knowledge"] });
      if (key === "save") setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thực hiện được.");
    } finally {
      setBusy("");
    }
  }
  function edit(doc?: KnowledgeAdmin) {
    setError("");
    setPreview(false);
    setDraft(
      doc
        ? { id: doc.id, slug: doc.slug, kind: doc.kind, title: doc.title, content: doc.content }
        : { slug: "", kind: "GUIDE", title: "", content: "" },
    );
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (draft) void run("save", draft.id ? `/${draft.id}` : "", draft.id ? "PUT" : "POST", draft);
  }
  const docs =
    query.data?.filter((d) =>
      `${d.title} ${d.slug}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")),
    ) ?? [];
  return (
    <>
      <PageHeader
        eyebrow="Trợ lý khách hàng"
        title="Kho kiến thức"
        description="Duyệt nội dung, lập chỉ mục rồi xuất bản để chatbot có thể trích dẫn."
        actions={
          <>
            <ButtonLink variant="ghost" href="/staff/chatbot">
              Cấu hình AI
            </ButtonLink>
            <Button disabled={!!busy} onClick={() => edit()}>
              Thêm tài liệu
            </Button>
          </>
        }
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {!draft && error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Field label="Tìm tài liệu">
            <TextInput
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tiêu đề hoặc đường dẫn…"
            />
          </Field>
          <Button
            variant="ghost"
            disabled={!!busy}
            busy={busy === "seed"}
            onClick={() => void run("seed", "/seed-specialties")}
          >
            Tạo bản nháp từ chuyên khoa
          </Button>
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {docs.map((d) => (
          <Card key={d.id}>
            <div className="flex justify-between items-start gap-3">
              <div>
                <h2 className="font-semibold">{d.title}</h2>
                <p className="text-xs text-muted mt-1">
                  /huong-dan/{d.slug} · Bản #{d.versionId}
                </p>
              </div>
              <StatusBadge status={d.status}>{labels[d.status] ?? d.status}</StatusBadge>
            </div>
            <p className="text-sm text-muted mt-3 whitespace-pre-line line-clamp-3">{d.content}</p>
            {d.publishedVersionId && d.publishedVersionId !== d.versionId && (
              <p className="text-xs mt-3">
                Bản #{d.publishedVersionId} vẫn đang công khai. Bản mới chưa thay thế nội dung hiện
                tại.
              </p>
            )}
            {d.jobStatus && (
              <p className="text-xs mt-3">
                Chỉ mục: {labels[d.jobStatus] ?? d.jobStatus} · {d.progress}/{d.total} đoạn
                {d.embeddingRevision ? ` · Thế hệ ${d.embeddingRevision}` : ""}
              </p>
            )}
            {d.error && <p className="text-xs text-danger mt-2">{d.error}</p>}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="ghost" disabled={!!busy} onClick={() => edit(d)}>
                Xem / sửa
              </Button>
              <Button
                variant="ghost"
                disabled={!!busy || ["QUEUED", "PROCESSING", "RETRY"].includes(d.jobStatus ?? "")}
                busy={busy === `index-${d.id}`}
                onClick={() => void run(`index-${d.id}`, `/${d.id}/index`)}
              >
                Lập chỉ mục
              </Button>
              {d.status === "READY" && (
                <Button
                  disabled={!!busy}
                  onClick={() => void run(`publish-${d.id}`, `/${d.id}/publish`)}
                >
                  Xuất bản
                </Button>
              )}
              {d.publishedVersionId && (
                <Button
                  variant="danger"
                  disabled={!!busy}
                  onClick={() => void run(`withdraw-${d.id}`, `/${d.id}/withdraw`)}
                >
                  Thu hồi
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {!query.isLoading && !query.error && !docs.length && (
        <Notice>Chưa có tài liệu phù hợp.</Notice>
      )}
      <Dialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
        title={draft?.id ? "Biên tập phiên bản mới" : "Thêm tài liệu"}
        size="wide"
        busy={!!busy}
        footer={
          <>
            <DialogClose>
              <Button variant="ghost" disabled={!!busy}>
                Đóng
              </Button>
            </DialogClose>
            <Button variant="ghost" disabled={!!busy} onClick={() => setPreview(!preview)}>
              {preview ? "Biên tập" : "Xem trước"}
            </Button>
            <Button type="submit" form="knowledge-form" busy={busy === "save"}>
              Lưu bản nháp
            </Button>
          </>
        }
      >
        {draft && (
          <Form id="knowledge-form" onSubmit={save} className="space-y-4">
            {error && <Notice tone="error">{error}</Notice>}
            {preview ? (
              <article>
                <h2 className="font-semibold mb-4">{draft.title}</h2>
                <KnowledgeContent text={draft.content} />
              </article>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Đường dẫn" hint="Chữ thường không dấu, số và dấu gạch ngang.">
                    <TextInput
                      required
                      disabled={!!draft.id}
                      maxLength={180}
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      value={draft.slug}
                      onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                    />
                  </Field>
                  <Field label="Loại nội dung">
                    <SelectInput
                      disabled={!!draft.id}
                      value={draft.kind}
                      onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                    >
                      <option value="GUIDE">Hướng dẫn</option>
                      <option value="FAQ">Hỏi đáp</option>
                      <option value="SPECIALTY">Giới thiệu chuyên khoa</option>
                    </SelectInput>
                  </Field>
                </div>
                <Field label="Tiêu đề">
                  <TextInput
                    required
                    maxLength={200}
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                </Field>
                <Field
                  label="Nội dung"
                  hint="Văn bản/Markdown; chỉ nhập thông tin dành cho khách. Giá và lịch lấy trực tiếp từ hệ thống."
                >
                  <TextArea
                    required
                    rows={14}
                    maxLength={200000}
                    value={draft.content}
                    onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  />
                </Field>
              </>
            )}
          </Form>
        )}
      </Dialog>
    </>
  );
}
