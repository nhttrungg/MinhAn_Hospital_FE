"use client";
import { FilterBar } from "@/components/ui/data-display";
import { Disclosure } from "@/components/ui/disclosure";
import {
  Button,
  ButtonLink,
  Label,
  TextInput,
  SelectInput,
  Pager,
} from "@/components/ui/primitives";
import { Clock, Mail, MapPin, Phone, Search, Siren } from "lucide-react";
import Image from "next/image";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRef, useState } from "react";
import {
  useClinic,
  phoneHref,
  useDirectory,
  uniqueDoctors,
  filterDoctors,
  searchText,
  usePublicKnowledge,
} from "@/lib/public-clinic";
import { KnowledgeContent } from "./knowledge-content";
import {
  BookingBanner,
  DoctorCard,
  FilterChip,
  LoadingState,
  PageHeading,
  PublicEmpty,
  SpecialtyCard,
} from "./public-ui";

export { DirectoryDetail } from "./public-detail";

const PAGE_SIZE = 9;

export { CustomerHome } from "./customer-home";

export function DoctorsPage({
  keyword = "",
  specialtyId = 0,
}: {
  keyword?: string;
  specialtyId?: number;
}) {
  const { doctors, specialties } = useDirectory();
  const [search, setSearch] = useState(keyword);
  const [specialty, setSpecialty] = useState(specialtyId);
  const [page, setPage] = useState(0);
  const results = useRef<HTMLDivElement>(null);
  const settledSearch = useDebouncedValue(search);
  const filtered = filterDoctors(doctors.data ?? [], settledSearch, specialty);
  const total = filtered.length;
  const first = page * PAGE_SIZE;
  const activeSpecialty = specialties.data?.find((item) => item.id === specialty);
  const hasFilters = !!search.trim() || specialty !== 0;
  function clear() {
    setSearch("");
    setSpecialty(0);
    setPage(0);
  }
  function changePage(next: number) {
    setPage(next);
    results.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  return (
    <main>
      <PageHeading eyebrow="Đội ngũ bác sĩ" title="Tìm bác sĩ phù hợp với bạn">
        Xem chuyên khoa, dịch vụ và giá khám trước khi lựa chọn.
      </PageHeading>
      <section className="public-container public-section">
        <FilterBar appearance="custom" className="public-filters">
          <Label>
            Tìm bác sĩ hoặc dịch vụ
            <TextInput
              appearance="custom"
              type="search"
              value={search}
              autoComplete="off"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Tên bác sĩ, dịch vụ…"
            />
          </Label>
          <Label>
            Chuyên khoa
            <SelectInput
              appearance="custom"
              value={specialty}
              onChange={(event) => {
                setSpecialty(Number(event.target.value));
                setPage(0);
              }}
            >
              <option value={0}>Tất cả chuyên khoa</option>
              {specialties.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectInput>
          </Label>
        </FilterBar>
        {hasFilters && (
          <div className="public-chips" aria-label="Bộ lọc đang áp dụng">
            {search.trim() && (
              <FilterChip
                label={`Từ khóa: ${search.trim()}`}
                onRemove={() => {
                  setSearch("");
                  setPage(0);
                }}
              />
            )}
            {specialty !== 0 && (
              <FilterChip
                label={`Chuyên khoa: ${activeSpecialty?.name ?? specialty}`}
                onRemove={() => {
                  setSpecialty(0);
                  setPage(0);
                }}
              />
            )}
            <Button appearance="custom" className="public-chip-clear" type="button" onClick={clear}>
              Xóa tất cả
            </Button>
          </div>
        )}
        <LoadingState
          error={doctors.isError || specialties.isError}
          loading={doctors.isLoading || specialties.isLoading}
          retry={() => {
            void doctors.refetch();
            void specialties.refetch();
          }}
          skeleton="doctor"
          count={6}
        />
        <div ref={results} className="public-results-anchor" />
        {doctors.isSuccess && (
          <p className="public-result-count" aria-live="polite">
            {total} bác sĩ phù hợp
            {total > PAGE_SIZE && ` · Hiển thị ${first + 1}–${Math.min(total, first + PAGE_SIZE)}`}
          </p>
        )}
        <div className="public-doctor-grid">
          {filtered.slice(first, first + PAGE_SIZE).map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} services={doctors.data ?? []} />
          ))}
        </div>
        {doctors.isSuccess && total === 0 && (
          <PublicEmpty
            title="Chưa tìm thấy bác sĩ phù hợp"
            action={
              <Button appearance="public" variant="ghost" onClick={clear}>
                Xóa bộ lọc
              </Button>
            }
          >
            Thử tìm tên khác hoặc chọn tất cả chuyên khoa.
          </PublicEmpty>
        )}
        {total > PAGE_SIZE && (
          <Pager
            appearance="public"
            page={page}
            totalPages={Math.ceil(total / PAGE_SIZE)}
            onPage={changePage}
          />
        )}
      </section>
    </main>
  );
}

export function SpecialtiesPage() {
  const { doctors, specialties } = useDirectory();
  const [search, setSearch] = useState("");
  const people = uniqueDoctors(doctors.data ?? []);
  const query = searchText(search);
  const shown = (specialties.data ?? []).filter((item) =>
    searchText(`${item.name} ${item.description ?? ""}`).includes(query),
  );
  return (
    <main>
      <PageHeading eyebrow="Chuyên khoa" title="Chăm sóc phù hợp với nhu cầu của bạn">
        Tìm hiểu chuyên khoa và lựa chọn bác sĩ để bắt đầu đặt lịch.
      </PageHeading>
      <section className="public-container public-section">
        <FilterBar
          appearance="custom"
          className="public-filters public-filters-single"
          label="Tìm chuyên khoa"
        >
          <Label>
            Tìm chuyên khoa
            <TextInput
              appearance="custom"
              type="search"
              value={search}
              autoComplete="off"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tên chuyên khoa…"
            />
          </Label>
        </FilterBar>
        <LoadingState
          error={specialties.isError || doctors.isError}
          loading={specialties.isLoading || doctors.isLoading}
          retry={() => {
            void specialties.refetch();
            void doctors.refetch();
          }}
          skeleton="specialty"
          count={6}
        />
        {specialties.isSuccess && (
          <p className="public-result-count" aria-live="polite">
            {shown.length} chuyên khoa
          </p>
        )}
        <div className="public-specialty-grid">
          {shown.map((item) => (
            <SpecialtyCard
              key={item.id}
              specialty={item}
              count={people.filter((doctor) => doctor.specialtyId === item.id).length}
            />
          ))}
        </div>
        {specialties.isSuccess && shown.length === 0 && (
          <PublicEmpty
            title={
              specialties.data.length === 0
                ? "Chưa có chuyên khoa được công bố"
                : "Không tìm thấy chuyên khoa phù hợp"
            }
            action={
              search ? (
                <Button appearance="public" variant="ghost" onClick={() => setSearch("")}>
                  Xóa bộ lọc
                </Button>
              ) : undefined
            }
          >
            {specialties.data.length === 0
              ? "Vui lòng quay lại sau hoặc liên hệ cơ sở để được hỗ trợ."
              : "Thử tìm bằng tên khác."}
          </PublicEmpty>
        )}
      </section>
      <BookingBanner />
    </main>
  );
}

export function AboutPage() {
  const clinic = useClinic();
  const { doctors, specialties } = useDirectory();
  const doctorCount = uniqueDoctors(doctors.data ?? []).length;
  return (
    <main>
      <PageHeading eyebrow="Về Minh An" title="Đồng hành cùng sức khỏe của bạn">
        {clinic.data?.name ?? "Bệnh viện Minh An"}
      </PageHeading>
      <section className="public-container public-section public-about-grid">
        <div className="public-about-image">
          <Image
            src="/images/clinic/about-facility.jpg"
            alt="Không gian sảnh tiếp đón sáng và thân thiện tại Bệnh viện Minh An"
            fill
            sizes="(max-width: 760px) 100vw, 45vw"
          />
        </div>
        <div>
          <p className="public-eyebrow">CHỦ ĐỘNG CHĂM SÓC SỨC KHỎE</p>
          <h2>
            Mỗi lần thăm khám,
            <br />
            thêm một sự an tâm.
          </h2>
          <p className="public-prose">
            Minh An giúp bạn tìm hiểu chuyên khoa, lựa chọn bác sĩ và đặt khoảng khám phù hợp trước
            khi đến cơ sở. Thông tin dịch vụ, giá khám và lịch hẹn được tập hợp để bạn dễ dàng theo
            dõi.
          </p>
          <p className="public-prose">
            Từ bước đặt lịch đến tiếp nhận, bạn có thể xem lại lịch hẹn trong tài khoản. Đội ngũ tại
            cơ sở hỗ trợ hồ sơ và hướng dẫn các bước tiếp theo của buổi khám.
          </p>
          {(specialties.isSuccess || doctors.isSuccess) && (
            <dl className="public-stats">
              {specialties.isSuccess && (
                <div>
                  <dt>Chuyên khoa</dt>
                  <dd>{specialties.data.length}</dd>
                </div>
              )}
              {doctors.isSuccess && (
                <div>
                  <dt>Bác sĩ</dt>
                  <dd>{doctorCount}</dd>
                </div>
              )}
            </dl>
          )}
          <div className="public-inline-actions">
            <ButtonLink appearance="public" variant="primary" href="/booking">
              Đặt lịch khám
            </ButtonLink>
            <ButtonLink appearance="public" variant="ghost" href="/doctors">
              Tìm hiểu đội ngũ bác sĩ →
            </ButtonLink>
          </div>
        </div>
      </section>
      <BookingBanner />
    </main>
  );
}

export function ContactPage() {
  const clinic = useClinic();
  const address = clinic.data?.address;
  const emergency = clinic.data?.contactPhones?.find((contact) => contact.code === "EMERGENCY");
  return (
    <main>
      <PageHeading eyebrow="Liên hệ" title="Kết nối với Minh An">
        Thông tin cơ sở và hướng dẫn để chuẩn bị cho buổi khám.
      </PageHeading>
      <section className="public-container public-section">
        <LoadingState
          error={clinic.isError}
          loading={clinic.isLoading}
          retry={() => {
            void clinic.refetch();
          }}
          skeleton="text"
        />
        {clinic.data && (
          <div className="public-contact-grid">
            <article>
              <span className="public-contact-icon" aria-hidden="true">
                <MapPin size={22} />
              </span>
              <span className="public-eyebrow">ĐỊA ĐIỂM</span>
              <h2>{clinic.data.name}</h2>
              <p>{address || "Địa chỉ chưa được công bố."}</p>
              {address && (
                <ButtonLink
                  appearance="custom"
                  className="public-text-link"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Chỉ đường trên bản đồ →<span className="sr-only"> (mở tab mới)</span>
                </ButtonLink>
              )}
            </article>
            <article>
              <span className="public-contact-icon" aria-hidden="true">
                <Phone size={22} />
              </span>
              <span className="public-eyebrow">THÔNG TIN LIÊN HỆ</span>
              <h2>Trao đổi với cơ sở</h2>
              <p>
                {clinic.data.phone ? (
                  <a href={phoneHref(clinic.data.phone)}>
                    <Phone size={14} aria-hidden="true" /> Hotline: {clinic.data.phone}
                  </a>
                ) : (
                  "Số điện thoại chưa được công bố."
                )}
              </p>
              {clinic.data.contactPhones?.map((contact) => (
                <p key={contact.code}>
                  <a href={phoneHref(contact.phone)}>
                    <Phone size={14} aria-hidden="true" /> {contact.label}: {contact.phone}
                  </a>
                </p>
              ))}
              <p>
                {clinic.data.email ? (
                  <a href={`mailto:${clinic.data.email}`}>
                    <Mail size={14} aria-hidden="true" /> {clinic.data.email}
                  </a>
                ) : (
                  "Email liên hệ chưa được công bố."
                )}
              </p>
              {clinic.data.website && (
                <p>
                  <a href={clinic.data.website} target="_blank" rel="noopener noreferrer">
                    Website bệnh viện ↗
                  </a>
                </p>
              )}
            </article>
            <article>
              <span className="public-contact-icon" aria-hidden="true">
                <Clock size={22} />
              </span>
              <span className="public-eyebrow">THỜI GIAN LÀM VIỆC</span>
              <h2>Giờ làm việc và khám BHYT</h2>
              <p>
                {clinic.data.workingHours || "Xem các khoảng khám đã công bố trên trang đặt lịch."}
              </p>
              <ButtonLink appearance="public" variant="text" href="/booking">
                Xem lịch khám →
              </ButtonLink>
            </article>
          </div>
        )}
        <div className="public-contact-extra">
          <div className="public-contact-visual">
            <div className="public-contact-photo">
              <Image
                src="/images/clinic/contact-clinic.jpg"
                alt="Quầy hướng dẫn và tư vấn khách hàng tại Bệnh viện Minh An"
                fill
                sizes="(max-width: 760px) 100vw, 420px"
              />
            </div>
            <div className="public-map">
              <MapPin size={28} aria-hidden="true" />
              <div>
                <strong>Vị trí cơ sở & Đón tiếp</strong>
                <p>
                  {address || "Địa chỉ chưa được công bố."} · Khu vực tiếp nhận tại tầng 1 luôn có
                  nhân viên hướng dẫn thủ tục khám và bảo hiểm y tế.
                </p>
              </div>
              {address && (
                <ButtonLink
                  appearance="public"
                  variant="ghost"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mở Google Maps
                  <span className="sr-only"> (mở tab mới)</span>
                </ButtonLink>
              )}
            </div>
          </div>
          <div className="public-emergency">
            <Siren size={26} aria-hidden="true" />
            <div>
              <strong>Trường hợp khẩn cấp</strong>
              <p>
                Gọi cấp cứu (24/24):{" "}
                <a href={phoneHref(emergency?.phone ?? "115")}>{emergency?.phone ?? "115"}</a> hoặc
                đến cơ sở cấp cứu gần nhất. Lịch hẹn trực tuyến không dành cho tình huống nguy kịch.
              </p>
            </div>
          </div>
        </div>
        <div className="public-help">
          <h2>Bạn cần hướng dẫn đặt lịch?</h2>
          <p>Xem các câu hỏi thường gặp về tài khoản, lịch hẹn và tiếp nhận.</p>
          <ButtonLink appearance="public" variant="ghost" href="/faq">
            Xem hướng dẫn →
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}

export function FaqPage() {
  const knowledge = usePublicKnowledge();
  const [search, setSearch] = useState("");
  const all = knowledge.data?.filter((item) => item.kind === "FAQ") ?? [];
  const query = searchText(search);
  const faqs = query
    ? all.filter((item) => searchText(`${item.title} ${item.content}`).includes(query))
    : all;
  return (
    <main>
      <PageHeading
        eyebrow="Hỏi đáp"
        title="Chúng tôi có thể giúp gì cho bạn?"
        actions={
          <ButtonLink appearance="public" variant="primary" href="/huong-dan/huong-dan-khach-hang">
            Cẩm nang sử dụng →
          </ButtonLink>
        }
      >
        Hướng dẫn tài khoản, lịch hẹn, người thân, thanh toán và theo dõi sau khám.
      </PageHeading>
      <section className="public-container public-section public-faq">
        <LoadingState
          error={knowledge.isError}
          loading={knowledge.isLoading}
          retry={() => void knowledge.refetch()}
          skeleton="text"
        />
        {all.length > 0 && (
          <div className="public-faq-search">
            <Search size={18} aria-hidden="true" />
            <Label className="sr-only" htmlFor="faq-search">
              Tìm câu hỏi
            </Label>
            <TextInput
              appearance="custom"
              id="faq-search"
              type="search"
              value={search}
              autoComplete="off"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm câu hỏi, ví dụ: đặt lịch, hủy lịch…"
            />
          </div>
        )}
        {query && all.length > 0 && (
          <p className="public-result-count" aria-live="polite">
            {faqs.length} câu hỏi phù hợp
          </p>
        )}
        {faqs.map((item, index) => (
          <Disclosure
            title={
              <>
                {item.title}
                <span aria-hidden="true">+</span>
              </>
            }
            key={item.id}
            open={query ? true : index === 0}
          >
            <KnowledgeContent text={item.content} />
            <ButtonLink appearance="public" variant="text" href={`/huong-dan/${item.slug}`}>
              Mở hướng dẫn →
            </ButtonLink>
          </Disclosure>
        ))}
        {!knowledge.isLoading && !knowledge.isError && !faqs.length && (
          <PublicEmpty
            title={all.length ? "Không tìm thấy câu hỏi phù hợp" : "Chưa có câu hỏi được công bố"}
            action={
              search ? (
                <Button appearance="public" variant="ghost" onClick={() => setSearch("")}>
                  Xóa bộ lọc
                </Button>
              ) : undefined
            }
          >
            {all.length
              ? "Thử tìm bằng từ khóa khác hoặc liên hệ cơ sở."
              : "Vui lòng quay lại sau hoặc liên hệ cơ sở để được hỗ trợ."}
          </PublicEmpty>
        )}
        <div className="public-help">
          <h2>Bạn đã sẵn sàng đặt lịch?</h2>
          <p>Tìm bác sĩ và chọn khoảng khám phù hợp với lịch của bạn.</p>
          <ButtonLink appearance="public" variant="primary" href="/booking">
            Tìm lịch khám ↗
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
