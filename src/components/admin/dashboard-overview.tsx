"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEventStream } from "@/hooks/use-event-stream";
import type { DashboardOverview as Overview } from "@/lib/realtime";
import { Button } from "@/components/ui";
import { QueryState } from "@/components/workspace-ui";
import styles from "./dashboard-overview.module.css";

const Charts = dynamic(() => import("./dashboard-charts"), {
  ssr: false,
  loading: () => <p>Đang tải biểu đồ…</p>,
});
export function DashboardOverview({ userId }: { userId: number }) {
  const [days, setDays] = useState(7);
  const cache = useQueryClient();
  const stream = useEventStream(
    `/api/v1/realtime/stream?identity=${userId}`,
    () => void cache.invalidateQueries({ queryKey: ["dashboard-overview", userId] }),
  );
  const data = useQuery({
    queryKey: ["dashboard-overview", userId, days],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Overview>(`/api/v1/dashboard/overview?days=${days}`, { signal }),
    refetchInterval: stream.polling ? 10000 : 30000,
  });
  return (
    <section className={styles.overview} aria-label="Dashboard theo vai trò">
      <div className={styles.heading}>
        <div>
          <h2>Hoạt động phòng khám</h2>
          <p>
            {stream.connected ? "Cập nhật trực tuyến" : "Tự động cập nhật"} ·{" "}
            {data.data &&
              new Date(data.data.generatedAt).toLocaleTimeString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                hour: "2-digit",
                minute: "2-digit",
              })}
          </p>
        </div>
        <div role="group" aria-label="Kỳ báo cáo">
          {[7, 30].map((value) => (
            <Button
              key={value}
              variant={days === value ? "primary" : "ghost"}
              aria-pressed={days === value}
              onClick={() => setDays(value)}
            >
              {value} ngày
            </Button>
          ))}
          <Button variant="ghost" busy={data.isFetching} onClick={() => void data.refetch()}>
            Làm mới số liệu
          </Button>
        </div>
      </div>
      <QueryState loading={data.isPending} error={data.error} retry={() => void data.refetch()} />
      {data.data && !data.error && (
        <>
          <div className={styles.kpis}>
            {data.data.kpis.map((kpi) => (
              <article key={kpi.key} className={styles.kpi}>
                <h3>{kpi.label}</h3>
                <p>
                  <strong>
                    {Number(kpi.value).toLocaleString("vi-VN", {
                      maximumFractionDigits: kpi.unit === "VND" ? 0 : 1,
                    })}
                  </strong>{" "}
                  <span>{kpi.unit}</span>
                </p>
                {kpi.previous !== null && (
                  <small>
                    {kpi.changePercent === null
                      ? "Chưa có số liệu kỳ trước"
                      : `${kpi.changePercent > 0 ? "▲" : kpi.changePercent < 0 ? "▼" : "—"} ${Math.abs(kpi.changePercent)}% so với kỳ trước`}
                    <span> · Kỳ trước: {Number(kpi.previous).toLocaleString("vi-VN")}</span>
                  </small>
                )}
              </article>
            ))}
          </div>
          <Charts data={data.data} />
        </>
      )}
    </section>
  );
}
