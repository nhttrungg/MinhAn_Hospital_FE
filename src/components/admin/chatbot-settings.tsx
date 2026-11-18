"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Button, Card, Field, Notice, TextInput, ButtonLink, Form } from "@/components/ui";
import { PageHeader } from "@/components/ui/data-display";
import { Checkbox } from "@/components/ui/primitives";
import { QueryState } from "@/components/workspace-ui";
import type { AiConfig } from "@/lib/chatbot-types";

export function ChatbotSettings() {
  const query = useQuery({
    queryKey: ["chatbot-config"],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<AiConfig>("/api/v1/admin/chatbot/config", { signal }),
  });
  return (
    <>
      <PageHeader
        eyebrow="Trợ lý khách hàng"
        title="Cấu hình chatbot"
        description="Kết nối 9router và embedding, kiểm tra Qdrant trước khi bật trợ lý."
        actions={
          <ButtonLink variant="ghost" href="/staff/knowledge">
            Kho kiến thức →
          </ButtonLink>
        }
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && <ConfigForm key={query.data.revision} config={query.data} />}
    </>
  );
}
function ConfigForm({ config }: { config: AiConfig }) {
  const cache = useQueryClient();
  const [form, setForm] = useState({
    chatBaseUrl: config.chatBaseUrl,
    chatModel: config.chatModel,
    chatKey: "",
    embeddingShareChat: config.embeddingShareChat,
    embeddingBaseUrl: config.embeddingBaseUrl,
    embeddingModel: config.embeddingModel,
    embeddingKey: "",
    clearChatKey: false,
    clearEmbeddingKey: false,
  });
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [models, setModels] = useState<string[]>([]),
    [embeddingModels, setEmbeddingModels] = useState<string[]>([]);
  const dirty =
    form.chatBaseUrl !== config.chatBaseUrl ||
    form.chatModel !== config.chatModel ||
    form.embeddingShareChat !== config.embeddingShareChat ||
    form.embeddingBaseUrl !== config.embeddingBaseUrl ||
    form.embeddingModel !== config.embeddingModel ||
    !!form.chatKey ||
    !!form.embeddingKey ||
    form.clearChatKey ||
    form.clearEmbeddingKey;
  async function run(action: string, endpoint: string, body?: unknown, method = "POST") {
    setBusy(action);
    setError("");
    setMessage("");
    try {
      const result = await api<{ message?: string }>(`/api/v1/admin/chatbot/${endpoint}`, {
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      setMessage(result.message ?? "Đã cập nhật cấu hình.");
      await cache.invalidateQueries({ queryKey: ["chatbot-config"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thực hiện được.");
    } finally {
      setBusy("");
    }
  }
  async function loadModels(embedding: boolean) {
    setBusy(embedding ? "models-embedding" : "models-chat");
    setError("");
    try {
      const list = await api<string[]>(`/api/v1/admin/chatbot/models?embedding=${embedding}`);
      (embedding ? setEmbeddingModels : setModels)(list);
      if (!list.length) setMessage("Gateway chưa cung cấp danh sách model; bạn có thể nhập ID.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được model. Bạn có thể nhập ID.");
    } finally {
      setBusy("");
    }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    void run("save", "config", form, "PUT");
  }
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">
              {config.enabled ? "Chatbot đang bật" : "Chatbot đang tắt"}
            </h2>
            <p className="text-sm text-muted">
              Chat: {config.chatReady ? "đã kiểm tra" : "chưa kiểm tra"} · Embedding:{" "}
              {config.embeddingReady ? `${config.dimensions} chiều` : "chưa kiểm tra"} ·{" "}
              {config.indexedPublishedDocuments} tài liệu xuất bản khớp chỉ mục
            </p>
          </div>
          <Button
            disabled={
              !!busy ||
              dirty ||
              (!config.enabled &&
                (!config.chatReady || !config.embeddingReady || !config.indexedPublishedDocuments))
            }
            variant={config.enabled ? "danger" : "primary"}
            onClick={() => void run("enabled", "enabled", { enabled: !config.enabled })}
          >
            {config.enabled ? "Tắt chatbot" : "Bật chatbot"}
          </Button>
        </div>
      </Card>
      {!config.masterKeyReady && (
        <Notice tone="warning">
          Chưa có APP_AI_CONFIG_MASTER_KEY trên backend. Đặt khóa chủ trong môi trường và khởi động
          lại backend trước khi lưu khóa API.
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
      <Form onSubmit={save} className="space-y-5">
        <Card>
          <h2 className="font-semibold mb-4">Kết nối chat qua 9router</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Base URL" hint="Kết thúc /v1; Docker dùng host.docker.internal.">
              <TextInput
                required
                type="url"
                maxLength={500}
                value={form.chatBaseUrl}
                onChange={(e) => setForm({ ...form, chatBaseUrl: e.target.value })}
              />
            </Field>
            <Field label="Model chat" hint="Model phải hỗ trợ công cụ chỉ đọc.">
              <TextInput
                required
                maxLength={200}
                list="chat-models"
                value={form.chatModel}
                onChange={(e) => setForm({ ...form, chatModel: e.target.value })}
              />
            </Field>
            <Field
              label="Khóa API chat"
              hint={
                config.chatKeySet
                  ? "Đã lưu khóa. Để trống để giữ khóa hiện tại."
                  : "Có thể để trống nếu gateway nội bộ không yêu cầu khóa."
              }
            >
              <TextInput
                type="password"
                autoComplete="new-password"
                maxLength={500}
                value={form.chatKey}
                onChange={(e) => setForm({ ...form, chatKey: e.target.value })}
              />
            </Field>
            <div className="self-end">
              <Checkbox
                label="Xóa khóa chat đã lưu"
                checked={form.clearChatKey}
                onChange={(e) => setForm({ ...form, clearChatKey: e.target.checked })}
              />
            </div>
          </div>
          <datalist id="chat-models">
            {models.map((m) => (
              <option value={m} key={m} />
            ))}
          </datalist>
        </Card>
        <Card>
          <h2 className="font-semibold mb-4">Kết nối embedding</h2>
          <Checkbox
            label="Dùng chung URL và khóa của kết nối chat"
            checked={form.embeddingShareChat}
            onChange={(e) => setForm({ ...form, embeddingShareChat: e.target.checked })}
          />
          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            {!form.embeddingShareChat && (
              <>
                <Field label="Base URL embedding">
                  <TextInput
                    required
                    type="url"
                    maxLength={500}
                    value={form.embeddingBaseUrl}
                    onChange={(e) => setForm({ ...form, embeddingBaseUrl: e.target.value })}
                  />
                </Field>
                <Field
                  label="Khóa API embedding"
                  hint={
                    config.embeddingKeySet
                      ? "Đã lưu khóa; để trống để giữ."
                      : "Nhập nếu endpoint yêu cầu khóa."
                  }
                >
                  <TextInput
                    type="password"
                    autoComplete="new-password"
                    maxLength={500}
                    value={form.embeddingKey}
                    onChange={(e) => setForm({ ...form, embeddingKey: e.target.value })}
                  />
                </Field>
                <Checkbox
                  label="Xóa khóa embedding đã lưu"
                  checked={form.clearEmbeddingKey}
                  onChange={(e) => setForm({ ...form, clearEmbeddingKey: e.target.checked })}
                />
              </>
            )}
            <Field
              label="Model embedding"
              hint="Có thể cấu hình sau. RAG cần embedding; thay model cần lập chỉ mục lại tài liệu."
            >
              <TextInput
                list="embedding-models"
                maxLength={200}
                value={form.embeddingModel}
                onChange={(e) => setForm({ ...form, embeddingModel: e.target.value })}
              />
            </Field>
          </div>
          <datalist id="embedding-models">
            {embeddingModels.map((m) => (
              <option value={m} key={m} />
            ))}
          </datalist>
        </Card>
        <Button type="submit" busy={busy === "save"} disabled={!!busy && busy !== "save"}>
          Lưu cấu hình
        </Button>
      </Form>
      <Card>
        <h2 className="font-semibold mb-3">Kiểm tra cấu hình đã lưu</h2>
        {dirty && (
          <p className="text-sm text-muted mb-3">
            Lưu thay đổi trước khi tải model hoặc kiểm tra kết nối.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="ghost"
            disabled={!!busy || dirty}
            busy={busy === "models-chat"}
            onClick={() => void loadModels(false)}
          >
            Tải model chat
          </Button>
          <Button
            variant="ghost"
            disabled={!!busy || dirty}
            busy={busy === "models-embedding"}
            onClick={() => void loadModels(true)}
          >
            Tải model embedding
          </Button>
          <Button
            variant="ghost"
            disabled={!!busy || dirty}
            busy={busy === "test-chat"}
            onClick={() => void run("test-chat", "test-chat")}
          >
            Kiểm tra chat
          </Button>
          <Button
            variant="ghost"
            disabled={!!busy || dirty}
            busy={busy === "test-embedding"}
            onClick={() => void run("test-embedding", "test-embedding")}
          >
            Kiểm tra embedding và Qdrant
          </Button>
        </div>
      </Card>
    </div>
  );
}
