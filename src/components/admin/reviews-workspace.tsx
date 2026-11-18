"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  ButtonLink,
  Card,
  Field,
  Notice,
  Pager,
  SearchInput,
  SelectInput,
  StatusBadge,
} from "@/components/ui/primitives";
import { EmptyState, FilterBar, PageHeader } from "@/components/ui/data-display";
import { ConfirmDialog } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import { QueryState, useUser } from "@/components/workspace-ui";
import { api, queryString } from "@/lib/api";
import type { StaffReview } from "@/lib/engagement-types";
import { reviewPage } from "@/lib/engagement-api";
import { formatDateTime } from "@/lib/format";
import { uniqueDoctors, useDirectory } from "@/lib/public-clinic";
import { ReviewRating } from "@/components/customer/doctor-reviews";

export function ReviewsWorkspace() {
  const me = useUser();
  const admin = me.data?.userType === "STAFF" && me.data.roles.includes("ADMIN");
  const { doctors } = useDirectory();
  const cache = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [visible, setVisible] = useState("");
  const [doctorId, setDoctorId] = useState(0);
  const [reasonCode, setReasonCode] = useState("");
  const [selected, setSelected] = useState<StaffReview | null>(null);
  const reviews = useQuery({
    queryKey: ["reviews", page, q, visible, doctorId],
    queryFn: () =>
      reviewPage<StaffReview>(
        `/api/v1/reviews/search${queryString({ page, size: 20, q, visible: visible ? visible === "true" : null, doctorId: doctorId || null })}`,
      ),
    enabled: admin,
  });
  const doctorName = (review: StaffReview) =>
    review.doctorName ||
    doctors.data?.find((d) => d.id === review.doctorId)?.fullName ||
    `Bác sĩ #${review.doctorId}`;
  const rows = reviews.data?.items ?? [];
  if (me.isLoading || me.error)
    return <QueryState loading={me.isLoading} error={me.error} retry={() => void me.refetch()} />;
  if (!admin)
    return (
      <EmptyState
        title="Bạn không có quyền quản lý đánh giá"
        description="Chức năng này dành cho quản trị viên phòng khám."
      />
    );
  return (
    <>
      <PageHeader
        eyebrow="Chất lượng dịch vụ"
        title="Quản lý đánh giá"
        description="Đọc phản hồi sau khám và quyết định hiển thị trên hồ sơ bác sĩ."
      />
      <Notice>
        Ẩn đánh giá sẽ gỡ đánh giá khỏi trang công khai. Bệnh nhân vẫn xem được đánh giá đã gửi của
        mình. Giữ phản hồi tiêu cực hợp lệ; chỉ ẩn nội dung vi phạm chính sách. Mọi thay đổi phải
        ghi rõ lý do.
      </Notice>
      <ButtonLink href="/staff/audit" variant="ghost">
        Xem nhật ký kiểm duyệt
      </ButtonLink>
      <FilterBar
        onClear={() => {
          setQ("");
          setVisible("");
          setDoctorId(0);
          setPage(0);
        }}
      >
        <Field label="Tìm đánh giá">
          <SearchInput
            placeholder="Tên bệnh nhân hoặc nhận xét"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </Field>
        <Field label="Bác sĩ">
          <SelectInput
            value={doctorId}
            onChange={(e) => {
              setDoctorId(Number(e.target.value));
              setPage(0);
            }}
          >
            <option value={0}>Tất cả bác sĩ</option>
            {uniqueDoctors(doctors.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Hiển thị">
          <SelectInput
            value={visible}
            onChange={(e) => {
              setVisible(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tất cả</option>
            <option value="true">Đang công khai</option>
            <option value="false">Đang ẩn</option>
          </SelectInput>
        </Field>
      </FilterBar>
      <QueryState
        loading={reviews.isLoading}
        error={reviews.error}
        retry={() => void reviews.refetch()}
        empty={reviews.isSuccess && !rows.length}
        emptyTitle="Không có đánh giá phù hợp"
        emptyDescription="Thử xóa bộ lọc hoặc chọn bác sĩ khác."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((review) => (
          <Card key={review.id} className="space-y-3">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-semibold">{review.patientName}</h2>
              <StatusBadge tone={review.visible ? "success" : "neutral"}>
                {review.visible ? "Đang công khai" : "Đang ẩn"}
              </StatusBadge>
            </div>
            <p className="text-sm">
              {doctorName(review)} · {formatDateTime(review.createdAt)}
            </p>
            <ReviewRating rating={review.rating} />
            <p className="whitespace-pre-wrap break-words text-sm">
              {review.comment || "Bệnh nhân chỉ gửi số sao."}
            </p>
            <Button
              variant={review.visible ? "danger" : "primary"}
              onClick={() => {
                setReasonCode(review.visible ? "" : "RESTORE");
                setSelected(review);
              }}
            >
              {review.visible ? "Ẩn đánh giá" : "Công khai đánh giá"}
            </Button>
          </Card>
        ))}
      </div>
      {reviews.data && (
        <Pager
          page={page}
          totalPages={reviews.data.totalPages}
          totalElements={reviews.data.totalElements}
          onPage={setPage}
        />
      )}
      <ConfirmDialog
        key={selected ? `${selected.id}:${selected.visible}` : "closed"}
        reason
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.visible ? "Ẩn đánh giá?" : "Công khai đánh giá?"}
        danger={!!selected?.visible}
        description={`${selected?.patientName ?? "Bệnh nhân"} · ${selected?.rating ?? 0}/5 sao. Thao tác thay đổi nội dung hiển thị trên hồ sơ bác sĩ.`}
        actionLabel={selected?.visible ? "Ẩn đánh giá" : "Công khai đánh giá"}
        onConfirm={async (reason) => {
          if (!reasonCode) throw new Error("Chọn loại vi phạm trước khi ẩn đánh giá.");
          if (!selected) return;
          await api(`/api/v1/reviews/${selected.id}/visibility`, {
            method: "POST",
            body: JSON.stringify({ visible: !selected.visible, reasonCode, reason: reason.trim() }),
          });
          await Promise.all(
            [
              "reviews",
              "doctor-reviews",
              "public-doctors",
              "doctors",
              "encounter-review",
              "audit",
            ].map((key) => cache.invalidateQueries({ queryKey: [key] })),
          );
          toast(selected.visible ? "Đã ẩn đánh giá." : "Đã công khai đánh giá.");
        }}
      >
        {selected?.visible ? (
          <Field label="Loại vi phạm" required>
            <SelectInput value={reasonCode} onChange={(event) => setReasonCode(event.target.value)}>
              <option value="">Chọn loại vi phạm</option>
              <option value="SPAM">Spam hoặc quảng cáo</option>
              <option value="OFFENSIVE">Nội dung xúc phạm hoặc quấy rối</option>
              <option value="PERSONAL_INFORMATION">Lộ thông tin cá nhân</option>
              <option value="UNRELATED">Nội dung không liên quan buổi khám</option>
              <option value="FRAUDULENT">Có bằng chứng giả mạo đánh giá</option>
            </SelectInput>
          </Field>
        ) : (
          <p className="text-sm text-muted">
            Ghi lý do khôi phục công khai đánh giá. Điểm sao gốc được giữ nguyên.
          </p>
        )}
        <p className="text-sm text-muted">
          Điểm thấp hoặc lời góp ý tiêu cực hợp lệ không phải lý do để ẩn. Lý do được lưu cùng người
          thực hiện và thời điểm trong nhật ký.
        </p>
      </ConfirmDialog>
    </>
  );
}
