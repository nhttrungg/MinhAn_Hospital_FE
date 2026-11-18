"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RatingStars } from "@/components/ui/star-rating";
import styles from "@/components/ui/star-rating.module.css";
import { Card, Pager } from "@/components/ui/primitives";
import { QueryState } from "@/components/workspace-ui";
import { queryString } from "@/lib/api";
import { reviewPage } from "@/lib/engagement-api";
import { formatDateTime } from "@/lib/format";
import type { DoctorRating } from "@/lib/engagement-types";

export function RatingSummary({ ratingAverage, ratingCount }: DoctorRating) {
  const average = Number(ratingAverage);
  const count = Number(ratingCount ?? 0);
  const hasRating =
    count > 0 && ratingAverage != null && Number.isFinite(average) && average >= 1 && average <= 5;
  const score = average.toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return (
    <p
      className={styles.summary}
      aria-label={
        hasRating
          ? `Mức độ hài lòng sau khám: ${score} trên 5 sao, ${count} đánh giá`
          : "Chưa có đánh giá"
      }
    >
      <RatingStars rating={hasRating ? average : 0} />
      {hasRating ? (
        <>
          <strong>{score}/5</strong>
          <span className={styles.count}>· {count.toLocaleString("vi-VN")} đánh giá</span>
        </>
      ) : (
        <span className={styles.count}>Chưa có đánh giá</span>
      )}
    </p>
  );
}

export function ReviewRating({ rating }: { rating: number }) {
  return (
    <span className={styles.summary} aria-label={`${rating} trên 5 sao`}>
      <RatingStars rating={rating} />
      <span>{rating}/5</span>
    </span>
  );
}

export function DoctorReviews({
  doctorId,
  ratingAverage,
  ratingCount,
}: DoctorRating & { doctorId: number }) {
  const [page, setPage] = useState(0);
  const reviews = useQuery({
    queryKey: ["doctor-reviews", doctorId, page],
    queryFn: () =>
      reviewPage(`/api/v1/doctors/${doctorId}/reviews${queryString({ page, size: 10 })}`),
  });
  return (
    <section className="space-y-4" aria-labelledby="doctor-reviews-title">
      <h2 id="doctor-reviews-title" className="at-section-title">
        Mức độ hài lòng sau khám
      </h2>
      <RatingSummary ratingAverage={ratingAverage} ratingCount={ratingCount} />
      <p className="text-sm text-muted">
        Phản hồi từ các lượt khám đã hoàn tất. Điểm trung bình được tính từ các đánh giá công khai,
        mỗi lượt khám một đánh giá.
      </p>
      <QueryState
        loading={reviews.isLoading}
        error={reviews.error}
        retry={() => void reviews.refetch()}
        empty={reviews.isSuccess && !reviews.data.items.length}
        emptyTitle="Chưa có đánh giá được công bố"
        emptyDescription="Đánh giá được gửi từ các lượt khám đã hoàn tất."
      />
      {reviews.data?.items.map((review) => (
        <Card key={review.id} className="space-y-2">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <strong>{review.patientName}</strong>
              <p className="text-xs text-brand">Đã khám tại Minh An</p>
            </div>
            <ReviewRating rating={review.rating} />
          </div>
          {review.comment && (
            <p className="whitespace-pre-wrap break-words text-sm">{review.comment}</p>
          )}
          <p className="text-xs text-muted">{formatDateTime(review.createdAt)}</p>
        </Card>
      ))}
      {reviews.data && reviews.data.totalPages > 1 && (
        <Pager
          page={page}
          onPage={setPage}
          totalPages={reviews.data.totalPages}
          totalElements={reviews.data.totalElements}
        />
      )}
    </section>
  );
}
