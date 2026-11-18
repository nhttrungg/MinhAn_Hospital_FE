"use client";
import { PageHeader } from "@/components/ui/data-display";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Notification } from "@/lib/outpatient";
import type { PageResult } from "@/lib/types";
import { Button, ButtonLink, Card, Notice, Pager } from "@/components/ui";
import { QueryState, useUser } from "@/components/workspace-ui";

export function NotificationsWorkspace({ portal = false }: { portal?: boolean }) {
  const me = useUser();
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState("");
  const cache = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications", me.data?.id, page],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<PageResult<Notification>>(`/api/v1/notifications?page=${page}&size=20`, { signal }),
    refetchInterval: 30000,
  });
  async function read(id: number) {
    try {
      await api(`/api/v1/notifications/${id}/read`, { method: "POST" });
      await cache.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không cập nhật được thông báo.");
    }
  }
  return (
    <main className="space-y-5">
      <PageHeader
        eyebrow={portal ? "Tài khoản của tôi" : "Hệ thống"}
        title={<>Thông báo</>}
        description="Cập nhật về lịch khám, kết quả cận lâm sàng và nhắc tái khám."
      />
      {message && <Notice tone="error">{message}</Notice>}
      <QueryState
        loading={list.isLoading}
        error={list.error}
        empty={list.data?.content.length === 0}
      />
      {list.data?.content.map((n) => (
        <Card className="space-y-2" key={n.id}>
          <h2 className="font-semibold">
            {n.title} {!n.read && <span className="text-sm text-brand">· Mới</span>}
          </h2>
          <p className="text-sm text-muted">{formatDateTime(n.createdAt)}</p>
          <p className="text-sm">{n.body}</p>
          {n.link?.startsWith("/") && !n.link.startsWith("//") && (
            <ButtonLink href={n.link} variant="ghost">
              Xem chi tiết
            </ButtonLink>
          )}
          {!n.read && (
            <Button variant="ghost" type="button" onClick={() => void read(n.id)}>
              Đánh dấu đã đọc
            </Button>
          )}
        </Card>
      ))}
      <Pager page={page} totalPages={list.data?.totalPages ?? 0} onPage={setPage} />
    </main>
  );
}
