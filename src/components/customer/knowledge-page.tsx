"use client";
import { InlineStatus } from "@/components/ui/data-display";
import { Button, ButtonLink } from "@/components/ui/primitives";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { KnowledgeContent } from "./knowledge-content";
import { LoadingState, PageHeading } from "./public-ui";
import type { Knowledge } from "@/lib/chatbot-types";
export function KnowledgePage({ slug }: { slug: string }) {
  const query = useQuery({
    queryKey: ["public-knowledge", slug],
    queryFn: ({ signal }) =>
      api<Knowledge>(`/api/v1/public/knowledge/${encodeURIComponent(slug)}`, { signal }),
    retry: false,
    staleTime: 60_000,
  });
  const title = query.data?.title ?? "Hướng dẫn khách hàng";
  return (
    <main>
      <PageHeading
        eyebrow="HƯỚNG DẪN KHÁCH HÀNG"
        title={query.error ? "Hướng dẫn khách hàng" : title}
        crumbs={[{ label: "Hỏi đáp", href: "/faq" }, { label: query.data?.title ?? "Hướng dẫn" }]}
      />
      <div className="public-container public-section public-article-section">
        {query.isLoading ? (
          <LoadingState error={false} loading skeleton="text" retry={() => {}} />
        ) : query.error ? (
          <InlineStatus as="div" tone="error" className="public-notice public-notice-error">
            <h2>Chưa đọc được hướng dẫn</h2>
            <p>{query.error.message}</p>
            <div className="public-inline-actions">
              <Button appearance="public" variant="primary" onClick={() => void query.refetch()}>
                Thử lại
              </Button>
              <ButtonLink appearance="public" variant="text" href="/faq">
                Xem tất cả hỏi đáp →
              </ButtonLink>
            </div>
          </InlineStatus>
        ) : (
          query.data && (
            <article className="at-knowledge-article">
              <KnowledgeContent text={query.data.content} />
            </article>
          )
        )}
        <div className="hero-actions">
          <ButtonLink appearance="public" variant="primary" href="/booking">
            Tìm lịch khám →
          </ButtonLink>
          <ButtonLink appearance="public" variant="text" href="/faq">
            Tất cả hỏi đáp →
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
