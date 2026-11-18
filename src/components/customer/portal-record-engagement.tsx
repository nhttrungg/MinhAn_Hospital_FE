"use client";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  ButtonLink,
  Card,
  Field,
  Fieldset,
  Form,
  Notice,
  TextArea,
} from "@/components/ui/primitives";
import { QueryState, useUser } from "@/components/workspace-ui";
import { api, queryString } from "@/lib/api";
import type { PatientReview } from "@/lib/engagement-types";
import type { Encounter } from "@/lib/outpatient";
import { vietnamDate } from "@/lib/outpatient";
import type { Appointment } from "@/lib/types";
import { StarRatingInput } from "@/components/ui/star-rating";
import { ReviewRating } from "./doctor-reviews";

export function EncounterReview({
  encounterId,
  doctorId,
  completedAt,
}: {
  encounterId: number;
  doctorId: number;
  completedAt?: string | null;
}) {
  const me = useUser();
  const cache = useQueryClient();
  const review = useQuery({
    queryKey: ["encounter-review", encounterId, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<PatientReview | null>(`/api/v1/encounters/${encounterId}/review`, { signal }),
  });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now] = useState(() => Date.now());
  const completed = completedAt ? new Date(completedAt).getTime() : now;
  const eligible =
    Number.isFinite(completed) && completed <= now && completed + 30 * 86400000 >= now;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !eligible || !review.isSuccess || review.data) return;
    if (rating < 1 || rating > 5) {
      setError("Chọn từ 1 đến 5 sao trước khi gửi đánh giá.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await api<PatientReview>(`/api/v1/encounters/${encounterId}/review`, {
        method: "POST",
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      cache.setQueryData(["encounter-review", encounterId, me.data?.id], saved);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["encounter-review", encounterId, me.data?.id] }),
        cache.invalidateQueries({ queryKey: ["doctor-reviews", doctorId] }),
        cache.invalidateQueries({ queryKey: ["reviews"] }),
        cache.invalidateQueries({ queryKey: ["doctors"] }),
        cache.invalidateQueries({ queryKey: ["public-doctors"] }),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gửi được đánh giá.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="space-y-4">
      <h2 className="at-section-title">Đánh giá buổi khám</h2>
      <QueryState
        loading={review.isLoading}
        error={review.error}
        retry={() => void review.refetch()}
      />
      {review.data ? (
        <>
          <Notice tone="success">Bạn đã gửi đánh giá cho buổi khám này.</Notice>
          <ReviewRating rating={review.data.rating} />
          {review.data.comment && (
            <p className="whitespace-pre-wrap break-words text-sm">{review.data.comment}</p>
          )}
          {!review.data.visible && (
            <p className="text-sm text-muted">Đánh giá này chưa được công bố trên hồ sơ bác sĩ.</p>
          )}
        </>
      ) : review.isSuccess && !eligible ? (
        <Notice>Bạn có thể đánh giá buổi khám trong vòng 30 ngày kể từ khi hoàn tất.</Notice>
      ) : (
        review.isSuccess && (
          <Form onSubmit={(e) => void submit(e)} busy={busy} className="space-y-4">
            <p className="text-sm text-muted">
              Chia sẻ trải nghiệm của bạn trong vòng 30 ngày sau khám. Mỗi buổi khám được gửi một
              đánh giá.
            </p>
            {error && <Notice tone="error">{error}</Notice>}
            <Fieldset legend="Mức độ hài lòng sau khám (bắt buộc)" className="space-y-2">
              <StarRatingInput
                name={`review-rating-${encounterId}`}
                value={rating}
                disabled={busy}
                onChange={(value) => {
                  setRating(value);
                  setError("");
                }}
              />
            </Fieldset>
            <Field
              label="Nhận xét (không bắt buộc)"
              hint={`${comment.length}/1000 ký tự. Đánh giá có thể được hiển thị trên hồ sơ bác sĩ.`}
            >
              <TextArea
                maxLength={1000}
                rows={4}
                value={comment}
                disabled={busy}
                onChange={(e) => setComment(e.target.value)}
              />
            </Field>
            <Button type="submit" busy={busy} disabled={!rating}>
              Gửi đánh giá
            </Button>
          </Form>
        )
      )}
    </Card>
  );
}

export function PortalRecordEngagement({ id }: { id: number }) {
  const me = useUser();
  const encounter = useQuery({
    queryKey: ["encounter", id, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Encounter>(`/api/v1/encounters/${id}`, { signal }),
  });
  const current = encounter.data;
  const appointment = useQuery({
    queryKey: ["appointment", current?.appointmentId, me.data?.id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<Appointment>(`/api/v1/appointments/${current?.appointmentId}`, { signal }),
    enabled: current?.status === "COMPLETED" && !!current.followUpDate,
  });
  if (current?.status !== "COMPLETED") return null;
  const requestedDate =
    current.followUpDate && current.followUpDate >= vietnamDate()
      ? current.followUpDate
      : vietnamDate();
  return (
    <div className="space-y-5">
      {current.followUpDate && (
        <Card className="space-y-3">
          <h2 className="at-section-title">Hẹn tái khám</h2>
          <p>
            Bác sĩ hẹn {current.patientName} tái khám ngày{" "}
            {current.followUpDate.split("-").reverse().join("/")}.
          </p>
          {current.followUpDate < vietnamDate() && (
            <Notice>Ngày hẹn đã qua. Chọn giờ khám phù hợp từ hôm nay.</Notice>
          )}
          <QueryState
            loading={appointment.isLoading}
            error={appointment.error}
            retry={() => void appointment.refetch()}
          />
          {appointment.isSuccess && (
            <ButtonLink
              href={`/booking${queryString({ doctorId: current.doctorId, serviceId: appointment.data.slot.serviceId, date: requestedDate, patientId: current.patientId, followUp: true })}`}
            >
              Đặt lịch tái khám
            </ButtonLink>
          )}
        </Card>
      )}
      <EncounterReview
        encounterId={id}
        doctorId={current.doctorId}
        completedAt={current.completedAt}
      />
    </div>
  );
}
