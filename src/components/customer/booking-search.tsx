"use client";
import { useEffect, useRef } from "react";
import { PageHeader } from "@/components/ui/data-display";
import { Notice, StatusBadge } from "@/components/ui/primitives";
import { useBooking, type BookingProps } from "@/hooks/use-booking";
import {
  BookingStepper,
  NeedStep,
  SlotStep,
  PatientStep,
  ReviewStep,
  BookingSummary,
  BookingSuccess,
} from "./booking-steps";
export function BookingSearch(props: BookingProps) {
  const state = useBooking(props);
  const top = useRef<HTMLDivElement>(null);
  const lastStep = useRef(state.step);
  useEffect(() => {
    if (lastStep.current === state.step) return;
    lastStep.current = state.step;
    top.current?.scrollIntoView({ block: "start" });
  }, [state.step]);
  return (
    <main className="at-public-container at-booking">
      <PageHeader
        eyebrow="Khám tại Minh An"
        title={state.rescheduleId ? "Đổi lịch khám" : "Đặt lịch khám"}
        description="Chọn bác sĩ và thời gian phù hợp. Chúng tôi đồng hành cùng bạn trong từng bước."
        meta={
          state.rescheduleId && state.old.data ? (
            <>
              <span>Lịch hiện tại {state.old.data.code}</span>
              <StatusBadge status={state.old.data.status}>
                {state.old.data.status === "NEEDS_RESCHEDULE" ? "Cần đổi lịch" : "Đã xác nhận"}
              </StatusBadge>
            </>
          ) : undefined
        }
      />
      {state.result ? (
        <BookingSuccess state={state} />
      ) : (
        <>
          <div ref={top} className="at-bk-top">
            <BookingStepper state={state} />
          </div>
          {state.error && (
            <div className="mb-5">
              <Notice tone="error">{state.error}</Notice>
            </div>
          )}
          <div className="at-booking-grid">
            <div>
              {state.step === 1 ? (
                <NeedStep state={state} />
              ) : state.step === 2 ? (
                <SlotStep state={state} />
              ) : state.step === 3 ? (
                <PatientStep state={state} />
              ) : (
                <ReviewStep state={state} />
              )}
            </div>
            <BookingSummary state={state} />
          </div>
        </>
      )}
    </main>
  );
}
